import { NextResponse } from "next/server";
import { get1h, getLatest, getMapping } from "@/lib/tradingDesk/wikiClient";
import { scoreBalanced, type DeskRisk, type TradingDeskOpportunity } from "@/lib/tradingDesk/scoring";

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

      const mid = Math.round((avgHigh + avgLow) / 2);
      const spreadGp = Math.max(0, avgHigh - avgLow);
      const spreadPct = mid > 0 ? spreadGp / mid : 0;
      const volume1h = (rec.highPriceVolume ?? 0) + (rec.lowPriceVolume ?? 0);

      const l = latest[String(it.id)];
      const lastTime = Math.max(l?.highTime ?? 0, l?.lowTime ?? 0);
      const recencyMinutes = lastTime ? Math.round((now - lastTime * 1000) / 60000) : null;

      const scored = scoreBalanced({
        mid,
        spreadGp,
        spreadPct,
        volume1h,
        buyLimit: it.limit,
        stakePerSlot,
        risk,
        recencyMinutes,
      });

      // Hard filters for MVP Balanced (reduce garbage)
      if (scored.recommendedQty <= 0) continue;
      if (volume1h < 3000) continue;
      if (spreadGp < 10) continue;
      if (spreadPct > 0.20) continue;

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

    opportunities.sort((a, b) => b.score - a.score);

    const body = {
      params: { budgetGp, slots, limit, risk },
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
