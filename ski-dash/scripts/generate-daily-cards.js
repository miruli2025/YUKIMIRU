#!/usr/bin/env node
/**
 * Dynamic Xiaohongshu card generator
 * Reads resort data from TS file + forecast from SQLite, scores, and generates 6 PNG cards.
 * Usage: node scripts/generate-daily-cards.js [YYYY-MM-DD]
 */
const puppeteer = require('puppeteer-core');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// ── 1. Parse resort data from TypeScript file ──

function parseResorts() {
  const tsPath = path.join(__dirname, '..', 'src', 'data', 'resorts.ts');
  const src = fs.readFileSync(tsPath, 'utf-8');

  const resorts = [];
  // Match each { ... } block in the array
  const blockRe = /\{[^}]+?id:\s*'([^']+)'[^}]*\}/gs;
  let m;
  while ((m = blockRe.exec(src)) !== null) {
    const b = m[0];
    const get = (key) => {
      const r = new RegExp(`${key}:\\s*'([^']*)'`);
      const rm = b.match(r);
      return rm ? rm[1] : '';
    };
    const getNum = (key) => {
      const r = new RegExp(`${key}:\\s*([\\d.]+)`);
      const rm = b.match(r);
      return rm ? parseFloat(rm[1]) : 0;
    };
    const getBool = (key) => {
      const r = new RegExp(`${key}:\\s*(true|false)`);
      const rm = b.match(r);
      return rm ? rm[1] === 'true' : false;
    };

    resorts.push({
      id: get('id'),
      name: get('name'),
      nameJa: get('nameJa'),
      region: get('region'),
      area: get('area'),
      driveTimeMin: getNum('driveTimeMin'),
      driveDistanceKm: getNum('driveDistanceKm'),
      liftPassPrice: getNum('liftPassPrice'),
      hasNightSkiing: getBool('hasNightSkiing'),
      hasDirectBus: getBool('hasDirectBus'),
      trailCount: getNum('trailCount'),
      difficultyBeginner: getNum('difficultyBeginner'),
      difficultyIntermediate: getNum('difficultyIntermediate'),
      difficultyAdvanced: getNum('difficultyAdvanced'),
    });
  }
  return resorts;
}

// ── 2. Read forecast data from SQLite ──

function readForecasts(date) {
  const dbPath = path.join(__dirname, '..', 'data', 'ski-dash.db');
  const db = new Database(dbPath, { readonly: true });
  const rows = db.prepare('SELECT * FROM daily_forecasts WHERE date = ?').all(date);
  db.close();
  const map = {};
  for (const r of rows) map[r.resort_id] = r;
  return map;
}

// ── 3. Scoring ──

const weatherEmojiMap = {
  'clear': '☀️', 'cloud': '☁️', 'light-snow': '🌨️', 'heavy-snow': '❄️', 'rain': '🌧️',
};

function weatherEmoji(condition) {
  return weatherEmojiMap[condition] || '☁️';
}

function weatherLabel(condition) {
  const labels = { 'clear': '晴', 'cloud': '多云', 'light-snow': '小雪', 'heavy-snow': '大雪', 'rain': '雨' };
  return labels[condition] || '多云';
}

function freshSnowScore(newSnow) { return Math.min(100, (newSnow || 0) * 5); }
function depthScore(base) { return Math.min(100, (base || 0) / 4); }

function weatherScore(condition, wind, temp) {
  const base = { 'clear': 90, 'cloud': 75, 'light-snow': 70, 'heavy-snow': 40, 'rain': 20 };
  let s = base[condition] ?? 60;
  if (wind > 30) s -= 20;
  else if (wind > 20) s -= 10;
  if (temp < -15) s -= 10;
  return Math.max(0, s);
}

function valueScore(price) {
  if (price <= 4000) return 100;
  if (price <= 5000) return 85;
  if (price <= 6000) return 75;
  if (price <= 7000) return 65;
  if (price <= 8000) return 55;
  if (price <= 10000) return 40;
  return 30;
}

function accessScoreTokyo(driveMin) {
  if (driveMin <= 90) return 100;
  if (driveMin <= 120) return 80;
  if (driveMin <= 150) return 65;
  if (driveMin <= 180) return 50;
  if (driveMin <= 240) return 35;
  return 20;
}

function accessScoreHokkaido(distKm, hasDirectBus) {
  let s;
  if (distKm < 50) s = 100;
  else if (distKm < 80) s = 80;
  else if (distKm < 120) s = 60;
  else if (distKm < 170) s = 40;
  else s = 20;
  if (hasDirectBus) s = Math.min(100, s + 15);
  return s;
}

function varietyScore(trails) {
  if (trails >= 30) return 90;
  if (trails >= 20) return 75;
  if (trails >= 15) return 65;
  if (trails >= 10) return 55;
  return 40;
}

function scoreResort(resort, forecast, area) {
  const f = forecast || {};
  const newSnow = f.new_snow_cm || 0;
  const snowBase = f.snow_base_cm || 0;
  const tempMid = f.temp_mid_c || 0;
  const windMid = f.wind_speed_mid || 0;
  const wCond = f.weather_condition || 'cloud';

  const scores = {
    freshSnow: freshSnowScore(newSnow),
    snowDepth: depthScore(snowBase),
    weather: weatherScore(wCond, windMid, tempMid),
    value: valueScore(resort.liftPassPrice),
    access: area === 'hokkaido'
      ? accessScoreHokkaido(resort.driveDistanceKm, resort.hasDirectBus)
      : accessScoreTokyo(resort.driveTimeMin),
    variety: varietyScore(resort.trailCount),
  };

  const w = area === 'hokkaido'
    ? { freshSnow: 0.30, snowDepth: 0.15, weather: 0.20, value: 0.15, access: 0.05, variety: 0.15 }
    : { freshSnow: 0.25, snowDepth: 0.10, weather: 0.20, value: 0.15, access: 0.15, variety: 0.15 };

  const total = Object.keys(w).reduce((sum, k) => sum + w[k] * scores[k], 0);

  return {
    resort,
    forecast: f,
    scores,
    totalScore: Math.round(total * 10) / 10,
    // Convenience fields for templates
    newSnow, snowBase, tempMid, windMid, wCond,
    weatherEmoji: weatherEmoji(wCond),
    weatherLabel: weatherLabel(wCond),
  };
}

// ── 4. Recommendation reasons ──

function getRecommendReasons(scored) {
  const templates = [
    // 0: snow
    [
      (s) => `今日新雪${s.newSnow}cm，粉雪天堂就是这里！✨`,
      (s) => `${s.newSnow}cm新雪已就位，冲就完了🏂`,
      (s) => `新雪${s.newSnow}cm降临，不去亏一个亿❄️`,
    ],
    // 1: value
    [
      (s) => `雪票¥${s.resort.liftPassPrice.toLocaleString()}还要啥自行车，冲！💰`,
      (s) => `性价比之王，¥${s.resort.liftPassPrice.toLocaleString()}滑到爽🎿`,
      (s) => `花小钱办大事，¥${s.resort.liftPassPrice.toLocaleString()}就能拿下💸`,
    ],
    // 2: access
    [
      (s) => `${(s.resort.driveTimeMin / 60).toFixed(1)}h就到，说走就走的滑雪之旅🚗`,
      (s) => `距离超近只要${(s.resort.driveTimeMin / 60).toFixed(1)}h，周末轻松往返✌️`,
      (s) => `车程仅${(s.resort.driveTimeMin / 60).toFixed(1)}h，睡到自然醒再出发😴`,
    ],
    // 3: weather
    [
      (s) => `今天天气绝了，能见度拉满的好日子☀️`,
      (s) => `蓝天白雪的完美搭配，拍照绝绝子📸`,
      (s) => `天公作美，今天是绝佳的滑雪日🌤️`,
    ],
    // 4: overall
    [
      (s) => `综合评分${s.totalScore}分，今天的MVP非它莫属🏆`,
      (s) => `全方位高分选手，闭眼选都不会错👑`,
      (s) => `今日最强推荐，各项指标都在线🔥`,
    ],
    // 5: variety
    [
      (s) => `${s.resort.trailCount}条雪道任你挑，从早滑到晚都不腻🎯`,
      (s) => `雪道超多共${s.resort.trailCount}条，新手老鸟都能找到快乐⛷️`,
      (s) => `${s.resort.trailCount}条道等你解锁，滑雪就像开盲盒🎁`,
    ],
  ];

  const reasons = [];
  const used = new Set();

  for (let i = 0; i < Math.min(3, scored.length); i++) {
    const s = scored[i];
    let bestCat = 4;
    if (s.newSnow >= 10 && !used.has(0)) bestCat = 0;
    else if (s.scores.value >= 70 && !used.has(1)) bestCat = 1;
    else if (s.resort.driveTimeMin <= 150 && !used.has(2)) bestCat = 2;
    else if (s.scores.weather >= 70 && !used.has(3)) bestCat = 3;
    else if (s.resort.trailCount >= 20 && !used.has(5)) bestCat = 5;
    else {
      for (const c of [4, 0, 1, 2, 3, 5]) {
        if (!used.has(c)) { bestCat = c; break; }
      }
    }
    used.add(bestCat);
    reasons.push(templates[bestCat][i](s));
  }
  return reasons;
}

// ── 5. HTML Templates (exact copy from existing scripts) ──

function buildHTML(title, subtitle, resorts, driveLabel) {
  const cards = resorts.map((s, i) => {
    const r = s.resort;
    const dh = (r.driveTimeMin / 60).toFixed(1);
    return `
    <div class="card ${i === 0 ? 'gold' : ''}">
      <div class="row1">
        <div class="rank-name">
          <span class="rank">${i+1}</span>
          <span class="name">${r.nameJa}</span>
          <span class="pill">${r.region}</span>
        </div>
        <div class="score-block">
          <span class="score">${s.totalScore.toFixed(1)}</span><span class="score-suffix">/100</span>
        </div>
      </div>
      <div class="row2">
        <span class="en-name">${r.name}</span>
        <span class="diff">
          <span class="diff-label">雪道:</span>
          <span class="dot green"></span>${r.difficultyBeginner}%
          <span class="dot red"></span>${r.difficultyIntermediate}%
          <span class="dot black"></span>${r.difficultyAdvanced}%
        </span>
      </div>
      <div class="stats">
        <div class="stat-row">
          <span>🌨️ <strong>${s.newSnow}cm</strong> 新雪</span>
          <span>⛰️ <strong>${s.snowBase}cm</strong> 积雪</span>
        </div>
        <div class="stat-row">
          <span>🌡️ ${s.tempMid}°C ${s.weatherEmoji} ${s.weatherLabel}</span>
          <span>💨 ${s.windMid}km/h</span>
        </div>
        <div class="stat-row">
          <span>🚗 ${dh}h（${driveLabel}出发）</span>
          <span>🎿 ${r.trailCount}条雪道</span>
        </div>
      </div>
      <div class="reason">${s.reason}</div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width: 900px; height: 1200px;
    background: linear-gradient(180deg, #0d1117 0%, #111827 50%, #0f172a 100%);
    font-family: 'Noto Sans SC', sans-serif;
    color: #e2e8f0;
    position: relative;
    overflow: hidden;
  }
  .deco1 { position:absolute; top:-60px; right:-60px; width:360px; height:360px; border-radius:50%; background:rgba(34,211,238,0.05); }
  .deco2 { position:absolute; bottom:-80px; left:-60px; width:320px; height:320px; border-radius:50%; background:rgba(99,102,241,0.05); }
  .container {
    position: relative; z-index: 1;
    display: flex; flex-direction: column;
    justify-content: center;
    height: 100%;
    padding: 0 42px;
  }
  .title { font-size: 44px; font-weight: 900; color: #e2e8f0; margin-bottom: 6px; }
  .subtitle { font-size: 38px; font-weight: 700; color: #22d3ee; margin-bottom: 28px; }
  .card {
    background: rgba(26,28,34,0.9);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 16px;
    padding: 22px 26px 18px;
    margin-bottom: 14px;
  }
  .card.gold { border-color: rgba(184,134,11,0.3); }
  .row1 { display:flex; justify-content:space-between; align-items:baseline; margin-bottom: 4px; }
  .rank-name { display:flex; align-items:baseline; gap:10px; }
  .rank { font-size: 46px; font-weight: 900; color: #22d3ee; line-height: 1; }
  .name { font-size: 34px; font-weight: 700; color: #e2e8f0; }
  .pill {
    font-size: 13px; color: #8e8e93;
    background: rgba(255,255,255,0.08);
    padding: 3px 10px; border-radius: 12px;
    position: relative; top: -2px;
  }
  .score-block { display:flex; align-items:baseline; }
  .score { font-size: 40px; font-weight: 900; color: #22d3ee; }
  .score-suffix { font-size: 17px; color: #64748b; margin-left: 3px; }
  .row2 { display:flex; justify-content:space-between; align-items:center; margin-bottom: 14px; }
  .en-name { font-size: 16px; color: #94a3b8; margin-left: 56px; }
  .diff { font-size: 14px; color: #94a3b8; display:flex; align-items:center; gap: 4px; }
  .diff-label { margin-right: 2px; }
  .dot { display:inline-block; width:11px; height:11px; border-radius:50%; margin-left:6px; }
  .dot.green { background:#34d399; }
  .dot.red { background:#f87171; }
  .dot.black { background:#1e1e22; border:1px solid #666; }
  .stats { margin-bottom: 12px; }
  .stat-row { display:flex; gap: 20px; margin-bottom: 8px; font-size: 20px; color: #a0aec0; }
  .stat-row span { flex: 1; }
  .stat-row strong { color: #22d3ee; font-weight: 700; }
  .reason {
    font-size: 17px; color: #fbbf24;
    padding-top: 10px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .footer {
    font-size: 13px; color: #4a5568;
    text-align: left;
    margin-top: 8px;
  }
</style></head><body>
<div class="deco1"></div><div class="deco2"></div>
<div class="container">
  <div class="title">⛷️ ${title}</div>
  <div class="subtitle">${subtitle}</div>
  ${cards}
  <div class="footer">数据来源: snow-forecast.com | yukimiru.jp</div>
</div>
</body></html>`;
}

function buildListHTML(title, subtitle, pageLabel, resorts, driveLabel) {
  const rows = resorts.map(r => {
    const dh = (r.resort.driveTimeMin / 60).toFixed(1);
    return `
    <div class="row">
      <span class="rank">${r.rank}</span>
      <div class="info">
        <div class="top-line">
          <span class="name">${r.resort.nameJa}</span>
          <span class="en-name">${r.resort.name}</span>
          <span class="pill">${r.resort.region}</span>
        </div>
        <div class="stats-line">
          <span class="st">${r.weatherEmoji}</span>
          <span class="st"><strong>${r.newSnow}cm</strong>新雪</span>
          <span class="st">${r.snowBase}cm积雪</span>
          <span class="st">${r.tempMid}°C</span>
          <span class="st">💨${r.windMid}</span>
          <span class="st">🚗${dh}h</span>
          <span class="st">${r.resort.trailCount}道</span>
          <span class="st diff">雪道 <span class="dg"></span>${r.resort.difficultyBeginner}%<span class="dr"></span>${r.resort.difficultyIntermediate}%<span class="db"></span>${r.resort.difficultyAdvanced}%</span>
          ${r.resort.hasNightSkiing ? '<span class="st night">🌙夜场</span>' : '<span class="st"></span>'}
        </div>
      </div>
      <div class="score-block">
        <span class="score">${r.totalScore.toFixed(1)}</span><span class="score-suffix">/100</span>
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width: 900px; height: 1200px;
    background: linear-gradient(180deg, #0d1117 0%, #111827 50%, #0f172a 100%);
    font-family: 'Noto Sans SC', sans-serif;
    color: #e2e8f0;
    position: relative; overflow: hidden;
  }
  .deco1 { position:absolute; top:-60px; right:-60px; width:360px; height:360px; border-radius:50%; background:rgba(34,211,238,0.05); }
  .deco2 { position:absolute; bottom:-80px; left:-60px; width:320px; height:320px; border-radius:50%; background:rgba(99,102,241,0.05); }
  .container {
    position: relative; z-index: 1;
    display: flex; flex-direction: column;
    justify-content: center;
    height: 100%; padding: 0 42px;
  }
  .header { margin-bottom: 20px; }
  .title { font-size: 38px; font-weight: 900; color: #e2e8f0; margin-bottom: 4px; }
  .subtitle { font-size: 30px; font-weight: 700; color: #22d3ee; margin-bottom: 4px; }
  .page-label { font-size: 15px; color: #64748b; }

  .row {
    display: grid;
    grid-template-columns: 42px 1fr auto;
    align-items: center;
    gap: 10px;
    background: rgba(26,28,34,0.85);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 12px 18px;
    margin-bottom: 8px;
  }
  .rank { font-size: 26px; font-weight: 900; color: #22d3ee; text-align: center; }
  .info { min-width: 0; }
  .top-line { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
  .name { font-size: 20px; font-weight: 700; color: #e2e8f0; white-space: nowrap; }
  .en-name { font-size: 12px; color: #64748b; white-space: nowrap; }
  .pill {
    font-size: 11px; color: #8e8e93;
    background: rgba(255,255,255,0.08);
    padding: 2px 8px; border-radius: 10px;
    white-space: nowrap;
  }
  .stats-line {
    display: grid;
    grid-template-columns: 28px 72px 80px 52px 42px 46px 36px auto 52px;
    gap: 6px;
    font-size: 13px;
    color: #94a3b8;
    align-items: center;
  }
  .stats-line strong { color: #22d3ee; }
  .diff { display:flex; align-items:center; gap:2px; }
  .dg, .dr, .db { display:inline-block; width:8px; height:8px; border-radius:50%; margin-left:4px; margin-right:1px; }
  .dg { background:#34d399; }
  .dr { background:#f87171; }
  .db { background:#1e1e22; border:1px solid #666; }
  .night { color: #fbbf24; }
  .st { white-space: nowrap; }
  .score-block { display: flex; align-items: baseline; flex-shrink: 0; }
  .score { font-size: 28px; font-weight: 900; color: #22d3ee; }
  .score-suffix { font-size: 13px; color: #64748b; margin-left: 2px; }

  .footer { font-size: 13px; color: #4a5568; margin-top: 12px; }
</style></head><body>
<div class="deco1"></div><div class="deco2"></div>
<div class="container">
  <div class="header">
    <div class="title">⛷️ ${title}</div>
    <div class="subtitle">${subtitle}</div>
    <div class="page-label">${pageLabel}</div>
  </div>
  ${rows}
  <div class="footer">数据来源: snow-forecast.com | yukimiru.jp</div>
</div>
</body></html>`;
}

// ── 6. Render ──

async function renderCard(browser, outPath, html) {
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 900, height: 1200 } });
  await page.close();
  console.error('  → ' + outPath);
}

// ── Main ──

async function main() {
  // Default date: tomorrow in JST
  let dateStr = process.argv[2];
  if (!dateStr) {
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 3600000);
    const tomorrow = new Date(jst.getTime() + 86400000);
    dateStr = tomorrow.toISOString().slice(0, 10);
  }

  const [y, m, d] = dateStr.split('-');
  const cnWeekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
  const dayOfWeek = new Date(Date.UTC(+y, +m - 1, +d)).getUTCDay();
  const subtitle = `${y}.${m}.${d} ${cnWeekdays[dayOfWeek]}`;

  // Parse resorts & forecasts
  const allResorts = parseResorts();
  const forecasts = readForecasts(dateStr);

  console.error(`Date: ${dateStr} | Resorts: ${allResorts.length} | Forecasts: ${Object.keys(forecasts).length}`);

  // Score by area
  function scoreArea(area) {
    const areaResorts = allResorts.filter(r => r.area === area);
    const scored = areaResorts.map(r => scoreResort(r, forecasts[r.id], area));
    scored.sort((a, b) => b.totalScore - a.totalScore);
    scored.forEach((s, i) => s.rank = i + 1);
    return scored;
  }

  const tokyoScored = scoreArea('tokyo');
  const hokkaidoScored = scoreArea('hokkaido');

  // Generate reasons for top 3
  const tokyoReasons = getRecommendReasons(tokyoScored.slice(0, 3));
  const hokkaidoReasons = getRecommendReasons(hokkaidoScored.slice(0, 3));

  tokyoScored.slice(0, 3).forEach((s, i) => s.reason = tokyoReasons[i]);
  hokkaidoScored.slice(0, 3).forEach((s, i) => s.reason = hokkaidoReasons[i]);

  // Output dir
  const outDir = path.join(__dirname, '..', 'public', 'cards');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    headless: 'new',
  });

  const cards = {};

  // Tokyo cards
  const tokyoTop3Path = path.join(outDir, `tokyo-${dateStr}.png`);
  await renderCard(browser, tokyoTop3Path,
    buildHTML('东京周边滑雪场情报', subtitle, tokyoScored.slice(0, 3), '东京'));
  cards['tokyo-top3'] = tokyoTop3Path;

  if (tokyoScored.length > 3) {
    const p2 = tokyoScored.slice(3, 13);
    const p2Path = path.join(outDir, `tokyo-${dateStr}-p2.png`);
    await renderCard(browser, p2Path,
      buildListHTML('东京周边滑雪场情报', subtitle, `全部排名 4-${3 + p2.length}位`, p2, '东京'));
    cards['tokyo-p2'] = p2Path;
  }

  if (tokyoScored.length > 13) {
    const p3 = tokyoScored.slice(13);
    const p3Path = path.join(outDir, `tokyo-${dateStr}-p3.png`);
    await renderCard(browser, p3Path,
      buildListHTML('东京周边滑雪场情报', subtitle, `全部排名 14-${13 + p3.length}位`, p3, '东京'));
    cards['tokyo-p3'] = p3Path;
  }

  // Hokkaido cards
  const hokTop3Path = path.join(outDir, `hokkaido-${dateStr}.png`);
  await renderCard(browser, hokTop3Path,
    buildHTML('北海道滑雪场情报', subtitle, hokkaidoScored.slice(0, 3), '新千岁'));
  cards['hokkaido-top3'] = hokTop3Path;

  if (hokkaidoScored.length > 3) {
    const p2 = hokkaidoScored.slice(3, 13);
    const p2Path = path.join(outDir, `hokkaido-${dateStr}-p2.png`);
    await renderCard(browser, p2Path,
      buildListHTML('北海道滑雪场情报', subtitle, `全部排名 4-${3 + p2.length}位`, p2, '新千岁'));
    cards['hokkaido-p2'] = p2Path;
  }

  if (hokkaidoScored.length > 13) {
    const p3 = hokkaidoScored.slice(13);
    const p3Path = path.join(outDir, `hokkaido-${dateStr}-p3.png`);
    await renderCard(browser, p3Path,
      buildListHTML('北海道滑雪场情报', subtitle, `全部排名 14-${13 + p3.length}位`, p3, '新千岁'));
    cards['hokkaido-p3'] = p3Path;
  }

  await browser.close();

  // Output JSON to stdout
  const output = {
    date: dateStr,
    cards,
    tokyo: tokyoScored.slice(0, 3).map(s => ({
      rank: s.rank, name: s.resort.name, nameJa: s.resort.nameJa,
      score: s.totalScore, newSnow: s.newSnow, snowBase: s.snowBase,
      reason: s.reason,
    })),
    hokkaido: hokkaidoScored.slice(0, 3).map(s => ({
      rank: s.rank, name: s.resort.name, nameJa: s.resort.nameJa,
      score: s.totalScore, newSnow: s.newSnow, snowBase: s.snowBase,
      reason: s.reason,
    })),
    totalResorts: { tokyo: tokyoScored.length, hokkaido: hokkaidoScored.length },
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
