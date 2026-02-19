/**
 * Local-side script: fetch data from snow-forecast.com → output JSON to stdout
 * Usage: npx tsx scripts/fetch-and-export.ts > data.json
 *        npx tsx scripts/fetch-and-export.ts | ssh server "cd ~/.openclaw/workspace/ski-dash && npx tsx scripts/import-data.ts"
 * 
 * No DB dependency — pure fetch + JSON output
 */

import { resorts } from '../src/data/resorts';
import { scrapeSnowForecast } from '../src/lib/scraper/snow-forecast';

interface ForecastRow {
  resortId: string;
  date: string;
  newSnowCm: number;
  snowBaseCm: number;
  tempTopC: number;
  tempMidC: number;
  tempBottomC: number;
  windSpeedTop: number;
  windSpeedMid: number;
  weatherCondition: string;
  weatherIcon: string;
  freezingLevelM: number;
  precipMm: number;
  fetchedAt: string;
}

async function main() {
  const allForecasts: ForecastRow[] = [];
  let success = 0;
  let failed = 0;

  console.error(`[fetch] Starting data fetch for ${resorts.length} resorts...`);

  for (const resort of resorts) {
    console.error(`[fetch] ${resort.id} (${resort.snowForecastSlug})...`);
    try {
      const forecasts = await scrapeSnowForecast(resort.snowForecastSlug, resort.id);
      for (const f of forecasts) {
        allForecasts.push({
          resortId: f.resortId,
          date: f.date,
          newSnowCm: f.newSnowCm,
          snowBaseCm: f.snowBaseCm,
          tempTopC: f.tempTopC,
          tempMidC: f.tempMidC,
          tempBottomC: f.tempBottomC,
          windSpeedTop: f.windSpeedTop,
          windSpeedMid: f.windSpeedMid,
          weatherCondition: f.weatherCondition,
          weatherIcon: f.weatherIcon,
          freezingLevelM: f.freezingLevelM,
          precipMm: f.precipMm,
          fetchedAt: f.fetchedAt,
        });
      }
      console.error(`  ✓ ${forecasts.length} days`);
      success++;
    } catch (err) {
      console.error(`  ✗ Failed:`, err);
      failed++;
    }
    await new Promise(r => setTimeout(r, 2500 + Math.random() * 2000));
  }

  console.error(`[fetch] Done! Success: ${success}, Failed: ${failed}, Rows: ${allForecasts.length}`);

  // Output JSON to stdout
  process.stdout.write(JSON.stringify({ forecasts: allForecasts, meta: { success, failed, total: resorts.length, fetchedAt: new Date().toISOString() } }));
}

main().catch(e => { console.error(e); process.exit(1); });
