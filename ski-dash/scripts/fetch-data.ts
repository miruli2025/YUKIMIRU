/**
 * Data fetch script - scrapes Snow-Forecast for all resorts
 * Usage: npx tsx scripts/fetch-data.ts
 */

import { resorts } from '../src/data/resorts';
import { scrapeSnowForecast } from '../src/lib/scraper/snow-forecast';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'ski-dash.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');

// Create tables — no UNIQUE constraint, keep all historical records
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS daily_forecasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resort_id TEXT NOT NULL,
    date TEXT NOT NULL,
    new_snow_cm REAL DEFAULT 0,
    snow_base_cm REAL DEFAULT 0,
    temp_top_c REAL DEFAULT 0,
    temp_mid_c REAL DEFAULT 0,
    temp_bottom_c REAL DEFAULT 0,
    wind_speed_top REAL DEFAULT 0,
    wind_speed_mid REAL DEFAULT 0,
    weather_condition TEXT DEFAULT 'unknown',
    weather_icon TEXT DEFAULT '',
    freezing_level_m REAL DEFAULT 0,
    precip_mm REAL DEFAULT 0,
    fetched_at TEXT NOT NULL
  );
`);

// Index for fast "latest per resort+date" queries
sqlite.exec(`
  CREATE INDEX IF NOT EXISTS idx_forecast_resort_date
  ON daily_forecasts(resort_id, date, fetched_at DESC);
`);

// Drop old UNIQUE constraint if migrating from previous schema
// (SQLite can't drop constraints, but new inserts will just append)

const insert = sqlite.prepare(`
  INSERT INTO daily_forecasts (resort_id, date, new_snow_cm, snow_base_cm, temp_top_c, temp_mid_c, temp_bottom_c, wind_speed_top, wind_speed_mid, weather_condition, weather_icon, freezing_level_m, precip_mm, fetched_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

async function main() {
  console.log(`[fetch] Starting data fetch for ${resorts.length} resorts...`);
  let success = 0;
  let failed = 0;

  for (const resort of resorts) {
    console.log(`[fetch] ${resort.id} (${resort.snowForecastSlug})...`);
    try {
      const forecasts = await scrapeSnowForecast(resort.snowForecastSlug, resort.id);
      
      for (const f of forecasts) {
        insert.run(
          f.resortId, f.date, f.newSnowCm, f.snowBaseCm,
          f.tempTopC, f.tempMidC, f.tempBottomC,
          f.windSpeedTop, f.windSpeedMid,
          f.weatherCondition, f.weatherIcon,
          f.freezingLevelM, f.precipMm, f.fetchedAt
        );
      }
      
      console.log(`  ✓ ${forecasts.length} days saved`);
      success++;
    } catch (err) {
      console.error(`  ✗ Failed:`, err);
      failed++;
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 2500 + Math.random() * 2000));
  }

  console.log(`\n[fetch] Done! Success: ${success}, Failed: ${failed}`);
  sqlite.close();
}

main().catch(console.error);
