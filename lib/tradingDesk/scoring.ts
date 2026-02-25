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

  const recencyPenalty = recencyMinutes == null ? 0.1 : recencyMinutes > 120 ? clamp((recencyMinutes - 120) / 600) : 0;
  if (recencyMinutes != null && recencyMinutes > 180) flags.push("stale_prints");

  // Risk preference: low risk penalizes volatility proxies harder
  const riskMult = risk === "low" ? 1.25 : risk === "high" ? 0.85 : 1.0;

  // Penalties for low volume / tiny spread
  const lowVolPenalty = volume1h < 5_000 ? clamp((5_000 - volume1h) / 5_000) : 0;
  if (volume1h < 5_000) flags.push("low_volume");

  const tinySpreadPenalty = spreadGp < 20 ? clamp((20 - spreadGp) / 20) : 0;
  if (spreadGp < 20) flags.push("tiny_spread");

  // Final score
  let score =
    0.35 * gph +
    0.25 * fill +
    0.25 * (1 - spreadPctPenalty) +
    0.15 * limitScore;

  score -= riskMult * (0.25 * lowVolPenalty + 0.15 * tinySpreadPenalty + 0.25 * spreadPctPenalty + 0.15 * recencyPenalty);

  score = clamp(score);

  return { score, gpPerHourProxy, recommendedQty, targetStakeGp, flags };
}
