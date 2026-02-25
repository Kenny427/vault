import "server-only";

export type DeskRisk = "low" | "med" | "high";

export type TradingDeskOpportunity = {
  itemId: number;
  name: string;
  icon: string;
  members: boolean;

  mid: number;
  buyPrice: number;
  sellPrice: number;

  spreadGp: number;
  spreadPct: number;

  volume1h: number;
  buyLimit: number | null;

  recencyMinutes: number | null;

  // sizing
  recommendedQty: number;
  targetStakeGp: number;

  // scoring
  score: number;
  gpPerHourProxy: number;
  flags: string[];
};

function clamp(n: number, a = 0, b = 1) {
  return Math.max(a, Math.min(b, n));
}

function logNorm(x: number, ref: number) {
  return clamp(Math.log(1 + x) / Math.log(1 + ref));
}

export function scoreBalanced(params: {
  mid: number;
  spreadGp: number;
  spreadPct: number;
  volume1h: number;
  buyLimit: number | null;
  stakePerSlot: number;
  risk: DeskRisk;
  recencyMinutes: number | null;
}): {
  score: number;
  gpPerHourProxy: number;
  recommendedQty: number;
  targetStakeGp: number;
  flags: string[];
} {
  const {
    mid,
    spreadGp,
    spreadPct,
    volume1h,
    buyLimit,
    stakePerSlot,
    risk,
    recencyMinutes,
  } = params;

  const flags: string[] = [];

  const targetStakeGp = Math.max(0, Math.floor(stakePerSlot));
  const maxQtyByStake = mid > 0 ? Math.floor(targetStakeGp / mid) : 0;
  const maxQtyByLimit = buyLimit ?? maxQtyByStake;
  const recommendedQty = Math.max(0, Math.min(maxQtyByStake, maxQtyByLimit));

  // fill proxy: volume-based
  const fill = logNorm(volume1h, 250_000); // tune: 250k trades/hr ~= very liquid

  // buy-limit friendliness for large stack
  const maxPositionGp = (buyLimit ?? 0) * mid;
  const limitScore = buyLimit == null ? 0.35 : clamp(maxPositionGp / Math.max(1, targetStakeGp));

  // GP/hour proxy: spread * qty * cycles/hr
  const feeFactor = 0.98; // slippage buffer
  const gpPerCycle = Math.max(0, spreadGp) * recommendedQty * feeFactor;
  const cyclesPerHourProxy = 0.25 + 0.75 * fill; // Balanced caps churn
  const gpPerHourProxy = gpPerCycle * cyclesPerHourProxy;
  const gph = logNorm(gpPerHourProxy, 10_000_000); // 10m gp/hr ref; tune

  // Stability proxy (MVP): penalize extreme spread% and stale prints
  // Real stability will come from timeseries in v2.
  const spreadPctPenalty = spreadPct > 0.03 ? clamp((spreadPct - 0.03) / 0.10) : 0; // >3% starts getting spicy
  if (spreadPct > 0.06) flags.push("high_spread_pct");

  const recencyPenalty =
    recencyMinutes == null ? 0.1 : recencyMinutes > 120 ? clamp((recencyMinutes - 120) / 600) : 0;
  if (recencyMinutes != null && recencyMinutes > 180) flags.push("stale_prints");

  // Risk preference: low risk penalizes volatility proxies harder
  const riskMult = risk === "low" ? 1.25 : risk === "high" ? 0.85 : 1.0;

  // Penalties for low volume / tiny spread
  const lowVolPenalty = volume1h < 5_000 ? clamp((5_000 - volume1h) / 5_000) : 0;
  if (volume1h < 5_000) flags.push("low_volume");

  const tinySpreadPenalty = spreadGp < 20 ? clamp((20 - spreadGp) / 20) : 0;
  if (spreadGp < 20) flags.push("tiny_spread");

  // Final score
  let score = 0.35 * gph + 0.25 * fill + 0.25 * (1 - spreadPctPenalty) + 0.15 * limitScore;

  score -=
    riskMult *
    (0.25 * lowVolPenalty +
      0.15 * tinySpreadPenalty +
      0.25 * spreadPctPenalty +
      0.15 * recencyPenalty);

  score = clamp(score);

  return { score, gpPerHourProxy, recommendedQty, targetStakeGp, flags };
}

export function scoreLiquidityFirst(params: {
  mid: number;
  spreadGp: number;
  spreadPct: number;
  volume1h: number;
  buyLimit: number | null;
  stakePerSlot: number;
  risk: DeskRisk;
  recencyMinutes: number | null;
}): {
  score: number;
  gpPerHourProxy: number;
  recommendedQty: number;
  targetStakeGp: number;
  flags: string[];
} {
  const { mid, spreadGp, spreadPct, volume1h, buyLimit, stakePerSlot, risk, recencyMinutes } = params;

  const flags: string[] = ["liquidity_first"];

  const targetStakeGp = Math.max(0, Math.floor(stakePerSlot));
  const maxQtyByStake = mid > 0 ? Math.floor(targetStakeGp / mid) : 0;
  const maxQtyByLimit = buyLimit ?? maxQtyByStake;
  const recommendedQty = Math.max(0, Math.min(maxQtyByStake, maxQtyByLimit));

  const fill = logNorm(volume1h, 300_000);

  const maxPositionGp = (buyLimit ?? 0) * mid;
  const limitScore = buyLimit == null ? 0.35 : clamp(maxPositionGp / Math.max(1, targetStakeGp));

  const feeFactor = 0.98;
  const gpPerCycle = Math.max(0, spreadGp) * recommendedQty * feeFactor;
  // Liquidity-first assumes higher churn when volume is strong
  const cyclesPerHourProxy = 0.4 + 1.1 * fill;
  const gpPerHourProxy = gpPerCycle * cyclesPerHourProxy;
  const gph = logNorm(gpPerHourProxy, 12_000_000);

  // Prefer tighter spreads for more reliable execution
  const spreadPctPenalty = spreadPct > 0.02 ? clamp((spreadPct - 0.02) / 0.10) : 0;
  if (spreadPct > 0.05) flags.push("high_spread_pct");

  const recencyPenalty =
    recencyMinutes == null ? 0.15 : recencyMinutes > 90 ? clamp((recencyMinutes - 90) / 600) : 0;
  if (recencyMinutes != null && recencyMinutes > 150) flags.push("stale_prints");

  const riskMult = risk === "low" ? 1.2 : risk === "high" ? 0.9 : 1.0;

  const lowVolPenalty = volume1h < 10_000 ? clamp((10_000 - volume1h) / 10_000) : 0;
  if (volume1h < 10_000) flags.push("low_volume");

  const tinySpreadPenalty = spreadGp < 15 ? clamp((15 - spreadGp) / 15) : 0;
  if (spreadGp < 15) flags.push("tiny_spread");

  let score = 0.45 * fill + 0.25 * gph + 0.2 * (1 - spreadPctPenalty) + 0.1 * limitScore;

  score -= riskMult * (0.35 * lowVolPenalty + 0.15 * tinySpreadPenalty + 0.25 * spreadPctPenalty + 0.15 * recencyPenalty);
  score = clamp(score);

  return { score, gpPerHourProxy, recommendedQty, targetStakeGp, flags };
}

export function scoreMeanReversionSimple(params: {
  entryPrice: number;
  revertPrice: number;
  volume1h: number;
  buyLimit: number | null;
  stakePerSlot: number;
  risk: DeskRisk;
  recencyMinutes: number | null;
}): {
  score: number;
  gpPerHourProxy: number;
  recommendedQty: number;
  targetStakeGp: number;
  flags: string[];
  expectedEdgePct: number;
} {
  const { entryPrice, revertPrice, volume1h, buyLimit, stakePerSlot, risk, recencyMinutes } = params;

  const flags: string[] = ["mean_reversion"];

  const targetStakeGp = Math.max(0, Math.floor(stakePerSlot));
  const maxQtyByStake = entryPrice > 0 ? Math.floor(targetStakeGp / entryPrice) : 0;
  const maxQtyByLimit = buyLimit ?? maxQtyByStake;
  const recommendedQty = Math.max(0, Math.min(maxQtyByStake, maxQtyByLimit));

  const fill = logNorm(volume1h, 250_000);

  const expectedEdgePct = entryPrice > 0 ? (revertPrice - entryPrice) / entryPrice : 0;
  const edge = clamp(expectedEdgePct / 0.20); // 20% edge ~= max

  const recencyPenalty =
    recencyMinutes == null ? 0.15 : recencyMinutes > 180 ? clamp((recencyMinutes - 180) / 900) : 0;
  if (recencyMinutes != null && recencyMinutes > 240) flags.push("stale_prints");

  const riskMult = risk === "low" ? 1.25 : risk === "high" ? 0.9 : 1.0;

  const lowVolPenalty = volume1h < 8_000 ? clamp((8_000 - volume1h) / 8_000) : 0;
  if (volume1h < 8_000) flags.push("low_volume");

  const feeFactor = 0.98;
  const potGp = Math.max(0, revertPrice - entryPrice) * recommendedQty * feeFactor;
  const gpPerHourProxy = potGp / 24;

  let score = 0.45 * edge + 0.35 * fill + 0.2 * logNorm(potGp, 50_000_000);
  score -= riskMult * (0.35 * lowVolPenalty + 0.2 * recencyPenalty);
  score = clamp(score);

  return { score, gpPerHourProxy, recommendedQty, targetStakeGp, flags, expectedEdgePct };
}
