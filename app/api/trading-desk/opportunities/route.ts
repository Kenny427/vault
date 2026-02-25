import { NextResponse } from "next/server";
import { get1h, getLatest, getMapping } from "@/lib/tradingDesk/wikiClient";
import {
  scoreLiquidityFirst,
  scoreMeanReversionSimple,
  type DeskRisk,
  type TradingDeskOpportunity,
} from "@/lib/tradingDesk/scoring";

export const runtime = "nodejs";

function toInt(v: string | null, fallback: number) {
  const n = v == null ? NaN : Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function toRisk(v: string | null): DeskRisk {
  if (v === "low" || v === "med" || v === "high") return v;
  return "med";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const budgetGp = toInt(url.searchParams.get("budgetGp"), 10_000_000_000);
    const slots = Math.max(1, Math.min(24, toInt(url.searchParams.get("slots"), 8)));
    const limit = Math.max(5, Math.min(200, toInt(url.searchParams.get("limit"), 40)));
    const risk = toRisk(url.searchParams.get("risk"));

    const strategyRaw = (url.searchParams.get("strategy") || "liquidity").toLowerCase();
    const strategy =
      strategyRaw === "mean-reversion" || strategyRaw === "mean_reversion" || strategyRaw === "mean"
        ? "mean-reversion"
        : "liquidity";

    const stakePerSlot = Math.floor(budgetGp / slots);

    const [mapping, oneH, latest] = await Promise.all([getMapping(), get1h(), getLatest()]);

    // Candidate set: take items with 1h data and non-null avgHigh/avgLow.
    // We'll score all, then slice top N.
    const now = Date.now();

    const opportunities: TradingDeskOpportunity[] = [];

    for (const it of mapping) {
      const rec = oneH[String(it.id)];
      if (!rec) continue;
      const avgHigh = rec.avgHighPrice ?? null;
      const avgLow = rec.avgLowPrice ?? null;
      if (!avgHigh || !avgLow || avgHigh <= 0 || avgLow <= 0) continue;

      // Skip items without a GE buy limit.
      if (it.limit == null || it.limit <= 0) continue;

      const volume1h = (rec.highPriceVolume ?? 0) + (rec.lowPriceVolume ?? 0);

      const l = latest[String(it.id)];
      const lastTime = Math.max(l?.highTime ?? 0, l?.lowTime ?? 0);
      const recencyMinutes = lastTime ? Math.round((now - lastTime * 1000) / 60000) : null;

      // Avoid ultra-cheap items where 10b budget makes sizing silly and fill-risk huge
      const avgMid = Math.round((avgHigh + avgLow) / 2);
      if (avgMid < 800) continue;

      if (strategy === "mean-reversion") {
        // Simple mean reversion heuristic: entry from latest low (if present), revert to 1h avgHigh.
        const entry = l?.low && l.low > 0 ? l.low : avgLow;
        const revert = avgHigh;
        if (entry <= 0 || revert <= 0) continue;

        const expectedEdgePct = (revert - entry) / Math.max(1, entry);
        // Require a meaningful edge; avoid extreme outliers.
        if (expectedEdgePct < 0.04) continue;
        if (expectedEdgePct > 0.35) continue;

        // Mean-reversion needs liquidity to enter/exit.
        if (volume1h < 8_000) continue;

        const scored = scoreMeanReversionSimple({
          entryPrice: entry,
          revertPrice: revert,
          volume1h,
          buyLimit: it.limit,
          stakePerSlot,
          risk,
          recencyMinutes,
        });

        if (scored.recommendedQty <= 0) continue;

        const spreadGp = Math.max(0, revert - entry);
        const mid = Math.round((revert + entry) / 2);
        const spreadPct = mid > 0 ? spreadGp / mid : 0;

        opportunities.push({
          itemId: it.id,
          name: it.name,
          icon: it.icon,
          members: it.members,
          buyLimit: it.limit,
          mid,
          buyPrice: entry,
          sellPrice: revert,
          spreadGp,
          spreadPct,
          volume1h,
          recencyMinutes,
          recommendedQty: scored.recommendedQty,
          targetStakeGp: scored.targetStakeGp,
          score: scored.score,
          gpPerHourProxy: Math.round(scored.gpPerHourProxy),
          flags: [...scored.flags, `edge_${Math.round(scored.expectedEdgePct * 100)}pct`],
        });
      } else {
        // Liquidity-first spread capture (default)
        const mid = avgMid;
        const spreadGp = Math.max(0, avgHigh - avgLow);
        const spreadPct = mid > 0 ? spreadGp / mid : 0;

        const scored = scoreLiquidityFirst({
          mid,
          spreadGp,
          spreadPct,
          volume1h,
          buyLimit: it.limit,
          stakePerSlot,
          risk,
          recencyMinutes,
        });

        if (scored.recommendedQty <= 0) continue;

        // Liquidity: volume must be high enough to plausibly fill our suggested size.
        const minVolume1h = Math.max(15_000, Math.min(300_000, scored.recommendedQty * 3));
        if (volume1h < minVolume1h) continue;

        // Avoid micro-spreads and extreme spread% (often unstable / stale or bait)
        if (spreadGp < 20) continue;
        if (spreadPct > 0.12) continue;

        opportunities.push({
          itemId: it.id,
          name: it.name,
          icon: it.icon,
          members: it.members,
          buyLimit: it.limit,
          mid,
          buyPrice: avgLow,
          sellPrice: avgHigh,
          spreadGp,
          spreadPct,
          volume1h,
          recencyMinutes,
          recommendedQty: scored.recommendedQty,
          targetStakeGp: scored.targetStakeGp,
          score: scored.score,
          gpPerHourProxy: Math.round(scored.gpPerHourProxy),
          flags: scored.flags,
        });
      }
    }

    opportunities.sort((a, b) => b.score - a.score);

    const body = {
      params: { budgetGp, slots, limit, risk, strategy },
      opportunities: opportunities.slice(0, limit),
    };

    return NextResponse.json(body, {
      headers: {
        // cache our API at the edge for short periods
        "Cache-Control": "s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
