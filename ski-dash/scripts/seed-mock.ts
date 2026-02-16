/**
 * Seed mock forecast data for development/demo
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { resorts } from '../src/data/resorts';

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
    fetched_at TEXT NOT NULL,
    UNIQUE(resort_id, date)
  );
`);

const upsert = sqlite.prepare(`
  INSERT INTO daily_forecasts (resort_id, date, new_snow_cm, snow_base_cm, temp_top_c, temp_mid_c, temp_bottom_c, wind_speed_top, wind_speed_mid, weather_condition, weather_icon, freezing_level_m, precip_mm, fetched_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(resort_id, date) DO UPDATE SET
    new_snow_cm=excluded.new_snow_cm, snow_base_cm=excluded.snow_base_cm,
    temp_top_c=excluded.temp_top_c, temp_mid_c=excluded.temp_mid_c, temp_bottom_c=excluded.temp_bottom_c,
    wind_speed_top=excluded.wind_speed_top, wind_speed_mid=excluded.wind_speed_mid,
    weather_condition=excluded.weather_condition, weather_icon=excluded.weather_icon,
    freezing_level_m=excluded.freezing_level_m, precip_mm=excluded.precip_mm,
    fetched_at=excluded.fetched_at
`);

const conditions = ['clear', 'cloud', 'light-snow', 'heavy-snow', 'light-snow', 'cloud', 'rain'] as const;
const now = new Date();
const fetchedAt = now.toISOString();

// Deterministic but varied mock data per resort
function hash(s: string, seed: number): number {
  let h = seed;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
  return h;
}

const insertMany = sqlite.transaction(() => {
  for (const resort of resorts) {
    for (let dayOffset = 0; dayOffset < 6; dayOffset++) {
      const d = new Date(now);
      d.setDate(d.getDate() + dayOffset);
      const date = d.toISOString().split('T')[0];
      
      const h = hash(resort.id, dayOffset * 7 + 42);
      const elevFactor = (resort.elevationTop - 500) / 2000; // 0-1 based on elevation
      
      const newSnow = Math.round(((h % 30) * elevFactor + (dayOffset === 1 ? 8 : 0)) * 10) / 10;
      const snowBase = Math.round(80 + elevFactor * 200 + (h % 50));
      const tempMid = Math.round((-2 - elevFactor * 8 + (h % 6) - 3) * 10) / 10;
      const tempTop = Math.round((tempMid - 3 - (h % 3)) * 10) / 10;
      const tempBottom = Math.round((tempMid + 3 + (h % 3)) * 10) / 10;
      const windTop = 10 + (h % 35);
      const windMid = Math.max(5, windTop - 10 - (h % 10));
      const condIdx = (h + dayOffset) % conditions.length;
      const condition = conditions[condIdx];
      const freezing = 800 + (h % 1200);
      const precip = condition.includes('snow') ? 2 + (h % 8) : condition === 'rain' ? 5 + (h % 10) : 0;

      upsert.run(
        resort.id, date, newSnow, snowBase,
        tempTop, tempMid, tempBottom,
        windTop, windMid,
        condition, '',
        freezing, precip, fetchedAt
      );
    }
  }
});

insertMany();
console.log(`✓ Seeded mock data for ${resorts.length} resorts × 6 days`);
sqlite.close();
