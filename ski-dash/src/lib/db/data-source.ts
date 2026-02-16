/**
 * Unified data source: SQLite (VPS) with JSON fallback (Vercel).
 * 
 * On Vercel, better-sqlite3 native bindings won't work reliably,
 * so we fall back to reading data/forecasts.json committed to the repo.
 */

import path from 'path';
import fs from 'fs';

interface ForecastRow {
  resort_id: string;
  date: string;
  new_snow_cm: number;
  snow_base_cm: number;
  temp_top_c: number;
  temp_mid_c: number;
  temp_bottom_c: number;
  wind_speed_top: number;
  wind_speed_mid: number;
  weather_condition: string;
  weather_icon: string;
  freezing_level_m: number;
  precip_mm: number;
  fetched_at: string;
}

let cachedJsonData: ForecastRow[] | null = null;

function loadJsonData(): ForecastRow[] {
  if (cachedJsonData) return cachedJsonData;
  const jsonPath = path.join(process.cwd(), 'data', 'forecasts.json');
  if (!fs.existsSync(jsonPath)) return [];
  cachedJsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  return cachedJsonData!;
}

function tryGetSqliteDb() {
  try {
    const Database = require('better-sqlite3');
    const dbPath = path.join(process.cwd(), 'data', 'ski-dash.db');
    if (!fs.existsSync(dbPath)) return null;
    const db = new Database(dbPath);
    // Quick check: does the table exist and have data?
    const count = db.prepare('SELECT COUNT(*) as c FROM daily_forecasts').get() as any;
    if (count?.c > 0) return db;
    db.close();
    return null;
  } catch {
    return null;
  }
}

let _useSqlite: boolean | null = null;
let _sqliteDb: any = null;

function getSource() {
  if (_useSqlite === null) {
    _sqliteDb = tryGetSqliteDb();
    _useSqlite = _sqliteDb !== null;
  }
  return _useSqlite ? 'sqlite' : 'json';
}

/**
 * Get forecasts for a specific date, latest per resort.
 */
export function getForecastsByDate(date: string): ForecastRow[] {
  if (getSource() === 'sqlite') {
    return _sqliteDb!
      .prepare('SELECT * FROM daily_forecasts WHERE date = ? ORDER BY fetched_at DESC')
      .all(date);
  }
  // JSON fallback: filter by date, sort by fetched_at desc
  return loadJsonData()
    .filter(r => r.date === date)
    .sort((a, b) => b.fetched_at.localeCompare(a.fetched_at));
}

/**
 * Get forecasts for a specific resort, latest per date.
 */
export function getForecastsByResort(resortId: string): ForecastRow[] {
  if (getSource() === 'sqlite') {
    return _sqliteDb!
      .prepare('SELECT * FROM daily_forecasts WHERE resort_id = ? ORDER BY fetched_at DESC')
      .all(resortId);
  }
  return loadJsonData()
    .filter(r => r.resort_id === resortId)
    .sort((a, b) => b.fetched_at.localeCompare(a.fetched_at));
}

export function getDataSourceType() {
  return getSource();
}
