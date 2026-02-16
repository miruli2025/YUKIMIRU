import { NextResponse } from 'next/server';
import { getForecastsByResort } from '@/lib/db/data-source';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resortId = searchParams.get('resortId');

  if (!resortId) {
    return NextResponse.json({ error: 'resortId required' }, { status: 400 });
  }

  const allForecasts = getForecastsByResort(resortId);

  // Keep only the latest fetched_at per date
  const seen = new Set<string>();
  const forecasts = allForecasts.filter(f => {
    if (seen.has(f.date)) return false;
    seen.add(f.date);
    return true;
  });

  return NextResponse.json({ resortId, forecasts });
}
