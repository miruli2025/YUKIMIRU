import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq, desc, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resortId = searchParams.get('resortId');

  if (!resortId) {
    return NextResponse.json({ error: 'resortId required' }, { status: 400 });
  }

  // Get latest forecast per date (dedup by fetched_at)
  const allForecasts = db
    .select()
    .from(schema.dailyForecasts)
    .where(eq(schema.dailyForecasts.resortId, resortId))
    .orderBy(desc(schema.dailyForecasts.fetchedAt))
    .all();

  // Keep only the latest fetched_at per date
  const seen = new Set<string>();
  const forecasts = allForecasts.filter(f => {
    if (seen.has(f.date)) return false;
    seen.add(f.date);
    return true;
  });

  return NextResponse.json({ resortId, forecasts });
}
