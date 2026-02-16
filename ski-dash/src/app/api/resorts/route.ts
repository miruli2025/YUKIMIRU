import { NextResponse } from 'next/server';
import { getResortsByArea } from '@/data/resorts';
import { getForecastsByDate } from '@/lib/db/data-source';
import { scoreResorts } from '@/lib/scoring/recommend';
import { DailyForecast } from '@/lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const now = new Date();
  const jstDate = new Date(now.getTime() + 9 * 3600000).toISOString().split('T')[0];
  const date = searchParams.get('date') || jstDate;
  const area = (searchParams.get('area') || 'tokyo') as 'tokyo' | 'hokkaido';

  const areaResorts = getResortsByArea(area);
  const forecastRows = getForecastsByDate(date);

  // Keep only the latest fetched_at per resort_id
  const forecastMap = new Map<string, DailyForecast>();
  for (const row of forecastRows) {
    const rid = row.resort_id;
    if (forecastMap.has(rid)) continue;
    forecastMap.set(rid, {
      resortId: rid,
      date: row.date,
      newSnowCm: row.new_snow_cm ?? 0,
      snowBaseCm: row.snow_base_cm ?? 0,
      tempTopC: row.temp_top_c ?? 0,
      tempMidC: row.temp_mid_c ?? 0,
      tempBottomC: row.temp_bottom_c ?? 0,
      windSpeedTop: row.wind_speed_top ?? 0,
      windSpeedMid: row.wind_speed_mid ?? 0,
      weatherCondition: row.weather_condition ?? 'unknown',
      weatherIcon: row.weather_icon ?? '',
      freezingLevelM: row.freezing_level_m ?? 0,
      precipMm: row.precip_mm ?? 0,
      fetchedAt: row.fetched_at,
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
