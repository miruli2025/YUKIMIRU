import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'ski-dash.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

// Initialize tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS forecasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resort_id TEXT NOT NULL,
    date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
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

  CREATE INDEX IF NOT EXISTS idx_daily_resort_date ON daily_forecasts(resort_id, date);
  CREATE INDEX IF NOT EXISTS idx_forecasts_resort_date ON forecasts(resort_id, date);
`);

export { schema };
