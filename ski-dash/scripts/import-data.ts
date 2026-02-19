/**
 * Server-side script: read JSON from stdin → write to SQLite
 * Usage: cat data.json | npx tsx scripts/import-data.ts
 *   or:  npx tsx scripts/fetch-and-export.ts | ssh server "cd ~/.openclaw/workspace/ski-dash && npx tsx scripts/import-data.ts"
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'ski-dash.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');

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

sqlite.exec(`
  CREATE INDEX IF NOT EXISTS idx_forecast_resort_date
  ON daily_forecasts(resort_id, date, fetched_at DESC);
`);

const insert = sqlite.prepare(`
  INSERT INTO daily_forecasts (resort_id, date, new_snow_cm, snow_base_cm, temp_top_c, temp_mid_c, temp_bottom_c, wind_speed_top, wind_speed_mid, weather_condition, weather_icon, freezing_level_m, precip_mm, fetched_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

async function main() {
  // Read all stdin
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf-8');

  let data: any;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('[import] Invalid JSON input');
    process.exit(1);
  }

  const forecasts = data.forecasts;
  if (!Array.isArray(forecasts)) {
    console.error('[import] Expected { forecasts: [...] }');
    process.exit(1);
  }

  console.log(`[import] Importing ${forecasts.length} rows...`);

  const insertMany = sqlite.transaction((rows: any[]) => {
    for (const f of rows) {
      insert.run(
        f.resortId, f.date, f.newSnowCm, f.snowBaseCm,
        f.tempTopC, f.tempMidC, f.tempBottomC,
        f.windSpeedTop, f.windSpeedMid,
        f.weatherCondition, f.weatherIcon,
        f.freezingLevelM, f.precipMm, f.fetchedAt
      );
    }
  });

  insertMany(forecasts);

  console.log(`[import] Done! ${forecasts.length} rows written to DB`);
  console.log(`[import] Meta:`, data.meta || {});

  sqlite.close();
}

main().catch(e => { console.error(e); process.exit(1); });
