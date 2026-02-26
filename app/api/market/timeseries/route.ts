import { NextResponse } from 'next/server';

import { getTimeSeries, type TimeSeriesStep } from '@/lib/market/osrsWiki';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const idRaw = searchParams.get('id');
  const timestepRaw = searchParams.get('timestep') as TimeSeriesStep | null;

  const id = idRaw ? Number(idRaw) : NaN;
  const timestep = timestepRaw ?? '5m';

  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'Missing/invalid id' }, { status: 400 });
  }

  if (!['5m', '1h', '6h', '24h'].includes(timestep)) {
    return NextResponse.json({ error: 'Invalid timestep' }, { status: 400 });
  }

  try {
    const data = await getTimeSeries({ id, timestep });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load timeseries' },
      { status: 502 },
    );
  }
}
