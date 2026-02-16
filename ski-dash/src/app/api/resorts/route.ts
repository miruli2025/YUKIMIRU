import { NextResponse } from 'next/server';
import { getResortsByArea } from '@/data/resorts';
import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { scoreResorts } from '@/lib/scoring/recommend';
import { DailyForecast } from '@/lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const now = new Date();
  const jstDate = new Date(now.getTime() + 9 * 3600000).toISOString().split('T')[0];
  const date = searchParams.get('date') || jstDate;
  const area = (searchParams.get('area') || 'tokyo') as 'tokyo' | 'hokkaido';

  const areaResorts = getResortsByArea(area);

  // Get all forecasts for the date, ordered by fetched_at DESC
  const forecastRows = db
    .select()
    .from(schema.dailyForecasts)
    .where(eq(schema.dailyForecasts.date, date))
    .orderBy(desc(schema.dailyForecasts.fetchedAt))
    .all();

  // Keep only the latest fetched_at per resort_id
  const forecastMap = new Map<string, DailyForecast>();
  for (const row of forecastRows) {
    if (forecastMap.has(row.resortId)) continue; // already have newer
    forecastMap.set(row.resortId, {
      resortId: row.resortId,
      date: row.date,
      newSnowCm: row.newSnowCm ?? 0,
      snowBaseCm: row.snowBaseCm ?? 0,
      tempTopC: row.tempTopC ?? 0,
      tempMidC: row.tempMidC ?? 0,
      tempBottomC: row.tempBottomC ?? 0,
      windSpeedTop: row.windSpeedTop ?? 0,
      windSpeedMid: row.windSpeedMid ?? 0,
      weatherCondition: row.weatherCondition ?? 'unknown',
      weatherIcon: row.weatherIcon ?? '',
      freezingLevelM: row.freezingLevelM ?? 0,
      precipMm: row.precipMm ?? 0,
      fetchedAt: row.fetchedAt,
    });
  }

  const scores = scoreResorts(areaResorts, forecastMap, date, area);

  return NextResponse.json({
    date,
    area,
    hasForecast: forecastMap.size > 0,
    resorts: scores,
  });
}
