/**
 * Daily pipeline: fetch data + powder alert
 * Usage: npx tsx scripts/daily-pipeline.ts
 * 
 * 1. Runs fetch-data (scrape 42 resorts × 6 days → DB)
 * 2. Checks powder conditions for tomorrow (24h new snow ≥20cm, temp ≤-3°C, wind <15m/s)
 * 3. Outputs powder alert JSON to stdout for the caller to handle
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

// --- Step 1: Fetch data ---
async function fetchAll(): Promise<{ success: number; failed: number }> {
  console.error(`[fetch] Starting data fetch for ${resorts.length} resorts...`);
  let success = 0;
  let failed = 0;

  for (const resort of resorts) {
    console.error(`[fetch] ${resort.id} (${resort.snowForecastSlug})...`);
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
      console.error(`  ✓ ${forecasts.length} days saved`);
      success++;
    } catch (err) {
      console.error(`  ✗ Failed:`, err);
      failed++;
    }
    await new Promise(r => setTimeout(r, 2500 + Math.random() * 2000));
  }

  console.error(`[fetch] Done! Success: ${success}, Failed: ${failed}`);
  return { success, failed };
}

// --- Step 2: Powder check ---
interface PowderAlert {
  resortId: string;
  nameJa: string;
  region: string;
  area: string;
  date: string;
  newSnowCm: number;
  tempTopC: number;
  windSpeedTop: number;
  snowBaseCm: number;
  weatherCondition: string;
}

function checkPowder(): PowderAlert[] {
  // Check next 3 days for powder conditions
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000); // JST
  const alerts: PowderAlert[] = [];

  const query = sqlite.prepare(`
    SELECT resort_id, date, new_snow_cm, snow_base_cm, temp_top_c, wind_speed_top, weather_condition
    FROM daily_forecasts
    WHERE resort_id = ? AND date = ?
    ORDER BY fetched_at DESC
    LIMIT 1
  `);

  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + dayOffset);
    const dateStr = checkDate.toISOString().slice(0, 10);

    for (const resort of resorts) {
      const row = query.get(resort.id, dateStr) as any;
      if (!row) continue;

      const { new_snow_cm, temp_top_c, wind_speed_top } = row;

      // Powder conditions: new snow ≥20cm AND temp ≤-3°C AND wind <15m/s
      if (new_snow_cm >= 20 && temp_top_c <= -3 && wind_speed_top < 15) {
        alerts.push({
          resortId: resort.id,
          nameJa: resort.nameJa,
          region: resort.region,
          area: resort.area,
          date: dateStr,
          newSnowCm: new_snow_cm,
          tempTopC: temp_top_c,
          windSpeedTop: wind_speed_top,
          snowBaseCm: row.snow_base_cm,
          weatherCondition: row.weather_condition,
        });
      }
    }
  }

  // Sort by new snow descending
  alerts.sort((a, b) => b.newSnowCm - a.newSnowCm);
  return alerts;
}

function formatPowderMessage(alerts: PowderAlert[]): string | null {
  if (alerts.length === 0) return null;

  // Group by date
  const byDate = new Map<string, PowderAlert[]>();
  for (const a of alerts) {
    if (!byDate.has(a.date)) byDate.set(a.date, []);
    byDate.get(a.date)!.push(a);
  }

  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayStr = now.toISOString().slice(0, 10);

  let msg = '❄️ 粉雪预警 ❄️\n';

  for (const [date, dateAlerts] of byDate) {
    const label = date === todayStr ? '今天' :
      date === new Date(now.getTime() + 86400000).toISOString().slice(0, 10) ? '明天' :
      date === new Date(now.getTime() + 172800000).toISOString().slice(0, 10) ? '后天' : date;

    msg += `\n📅 ${label}（${date}）\n`;

    // Split by area
    const tokyo = dateAlerts.filter(a => a.area === 'tokyo');
    const hokkaido = dateAlerts.filter(a => a.area === 'hokkaido');

    if (tokyo.length > 0) {
      msg += '\n🗼 东京周边:\n';
      for (const a of tokyo) {
        msg += `  ⛷ ${a.nameJa}（${a.region}）— 新雪${a.newSnowCm}cm｜${a.tempTopC}°C｜风${a.windSpeedTop}m/s\n`;
      }
    }
    if (hokkaido.length > 0) {
      msg += '\n🏔 北海道:\n';
      for (const a of hokkaido) {
        msg += `  ⛷ ${a.nameJa}（${a.region}）— 新雪${a.newSnowCm}cm｜${a.tempTopC}°C｜风${a.windSpeedTop}m/s\n`;
      }
    }
  }

  msg += '\n条件: 24h新雪≥20cm + 气温≤-3°C + 风速<15m/s';
  msg += '\n数据来源: snow-forecast.com | yukimiru.jp';

  return msg;
}

// --- Step 3: Export JSON for Vercel ---
function exportJsonForVercel() {
  console.error('[export] Exporting forecasts.json for Vercel...');
  const rows = sqlite.prepare('SELECT * FROM daily_forecasts ORDER BY date, resort_id').all();
  const jsonPath = path.join(process.cwd(), 'data', 'forecasts.json');
  fs.writeFileSync(jsonPath, JSON.stringify(rows));
  console.error(`[export] Exported ${rows.length} rows to forecasts.json`);
  return rows.length;
}

// --- Step 4: Git push to trigger Vercel redeploy ---
function gitPushToVercel(): boolean {
  const { execSync } = require('child_process');
  try {
    const cwd = process.cwd();
    execSync('git add data/forecasts.json', { cwd, stdio: 'pipe' });
    
    // Check if there are changes to commit
    const status = execSync('git diff --cached --name-only', { cwd, stdio: 'pipe' }).toString().trim();
    if (!status) {
      console.error('[git] No changes to commit');
      return false;
    }
    
    const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const dateStr = now.toISOString().slice(0, 10);
    execSync(`git commit -m "data: update forecasts ${dateStr}"`, { cwd, stdio: 'pipe' });
    execSync('git push origin main', { cwd, stdio: 'pipe', timeout: 30000 });
    console.error('[git] Pushed to GitHub → Vercel will redeploy');
    return true;
  } catch (err: any) {
    console.error('[git] Push failed:', err.message);
    return false;
  }
}

// --- Main ---
async function main() {
  const { success, failed } = await fetchAll();

  // Export JSON + push to GitHub for Vercel
  const exportedRows = exportJsonForVercel();
  const pushed = gitPushToVercel();

  const alerts = checkPowder();
  const message = formatPowderMessage(alerts);

  // Output structured result as JSON on stdout
  const result = {
    fetch: { success, failed, total: resorts.length },
    export: { rows: exportedRows, pushed },
    powder: {
      alertCount: alerts.length,
      alerts,
      message,
    },
    timestamp: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString(),
  };

  console.log(JSON.stringify(result));
  sqlite.close();
}

main().catch(err => {
  console.error('[pipeline] Fatal error:', err);
  process.exit(1);
});
