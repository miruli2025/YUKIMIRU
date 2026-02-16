/**
 * 粉雪预警 小红书3:4卡片生成器
 * Usage: node scripts/gen-xhs-powder.js [YYYY-MM-DD]
 * Generates a powder alert card for resorts with significant new snow
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Resort name mapping
const RESORT_INFO = {
  'kiroro': { nameJa: 'Kiroro', region: '小樽', area: 'hokkaido' },
  'kagura': { nameJa: '神乐', region: '汤泽', area: 'tokyo' },
  'gala-yuzawa': { nameJa: 'GALA汤泽', region: '汤泽', area: 'tokyo' },
  'nakayama-toge': { nameJa: '中山峠', region: '札幌', area: 'hokkaido' },
  'mount-racey': { nameJa: 'Mount Racey', region: '夕张', area: 'hokkaido' },
  'sapporo-kokusai': { nameJa: '札幌国际', region: '札幌', area: 'hokkaido' },
  'niseko-hanazono': { nameJa: '二世古HANAZONO', region: '二世古', area: 'hokkaido' },
  'niseko-annupuri': { nameJa: '二世古安努普利', region: '二世古', area: 'hokkaido' },
  'niseko-village': { nameJa: '二世古Village', region: '二世古', area: 'hokkaido' },
  'niseko-grand-hirafu': { nameJa: '二世古Grand Hirafu', region: '二世古', area: 'hokkaido' },
  'niseko-moiwa': { nameJa: '二世古Moiwa', region: '二世古', area: 'hokkaido' },
  'furano': { nameJa: '富良野', region: '富良野', area: 'hokkaido' },
  'kandatsu-kogen': { nameJa: '神立高原', region: '汤泽', area: 'tokyo' },
  'snow-cruise-onze': { nameJa: 'Snow Cruise ONZE', region: '小樽', area: 'hokkaido' },
  'otaru-tenguyama': { nameJa: '小樽天狗山', region: '小樽', area: 'hokkaido' },
  'teine': { nameJa: 'Teine', region: '札幌', area: 'hokkaido' },
  'naeba': { nameJa: '苗场', region: '汤泽', area: 'tokyo' },
  'rusutsu': { nameJa: '留寿都', region: '留寿都', area: 'hokkaido' },
  'asarigawa-onsen': { nameJa: '朝里川温泉', region: '小樽', area: 'hokkaido' },
  'asahidake': { nameJa: '旭岳', region: '旭川', area: 'hokkaido' },
  'nozawa-onsen': { nameJa: '野泽温泉', region: '长野北部', area: 'tokyo' },
  'hakuba-happo-one': { nameJa: '白马八方尾根', region: '白马', area: 'tokyo' },
  'hakuba-goryu': { nameJa: '白马五龙', region: '白马', area: 'tokyo' },
  'maiko': { nameJa: '舞子', region: '汤泽', area: 'tokyo' },
  'ishiuchi-maruyama': { nameJa: '石打丸山', region: '汤泽', area: 'tokyo' },
  'sugadaira-kogen': { nameJa: '菅平高原', region: '长野北部', area: 'tokyo' },
  'okushiga-kogen': { nameJa: '奥志贺高原', region: '志贺高原', area: 'tokyo' },
  'shiga-kogen-yokoteyama': { nameJa: '志贺高原·横手山', region: '志贺高原', area: 'tokyo' },
  'marunuma-kogen': { nameJa: '丸沼高原', region: '群马', area: 'tokyo' },
  'kawaba': { nameJa: '川场', region: '群马', area: 'tokyo' },
  'fujiten': { nameJa: '富士天', region: '山梨', area: 'tokyo' },
  'hodaigi': { nameJa: '宝台树', region: '群马', area: 'tokyo' },
  'tsumagoi': { nameJa: '嬬恋', region: '群马', area: 'tokyo' },
  'kusatsu-onsen': { nameJa: '草津温泉', region: '群马', area: 'tokyo' },
  'tanigawadake-tenjindaira': { nameJa: '谷川岳天神平', region: '群马', area: 'tokyo' },
  'karuizawa-prince': { nameJa: '轻井泽王子', region: '长野南部', area: 'tokyo' },
  'sahoro': { nameJa: '佐�的�的', region: '十�的', area: 'hokkaido' },
  'tomamu': { nameJa: '星野TOMAMU', region: '十胜', area: 'hokkaido' },
  'kamui-ski-links': { nameJa: 'KAMUI SKI LINKS', region: '旭川', area: 'hokkaido' },
};

const dateArg = process.argv[2];
const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
const targetDate = dateArg || now.toISOString().slice(0, 10);

// Read DB
const db = new Database(path.join(__dirname, '..', 'data', 'ski-dash.db'));
const rows = db.prepare(`
  SELECT resort_id, date, new_snow_cm, snow_base_cm, temp_top_c, temp_mid_c, wind_speed_top, weather_condition
  FROM daily_forecasts
  WHERE date = ?
  ORDER BY fetched_at DESC
`).all(targetDate);

// Dedup
const seen = new Set();
const deduped = rows.filter(r => { if (seen.has(r.resort_id)) return false; seen.add(r.resort_id); return true; });

// Filter: new snow >= 15cm (generous threshold for card display)
const powder = deduped
  .filter(r => r.new_snow_cm >= 15)
  .sort((a, b) => b.new_snow_cm - a.new_snow_cm);

if (powder.length === 0) {
  console.log('No powder alerts for', targetDate);
  db.close();
  process.exit(0);
}

// Split by area
const hokkaido = powder.filter(r => (RESORT_INFO[r.resort_id] || {}).area === 'hokkaido');
const tokyo = powder.filter(r => (RESORT_INFO[r.resort_id] || {}).area === 'tokyo');

// Day of week
const days = ['日', '月', '火', '水', '木', '金', '土'];
const dateObj = new Date(targetDate + 'T00:00:00+09:00');
const dayOfWeek = days[dateObj.getDay()];
const displayDate = `${parseInt(targetDate.slice(5,7))}/${parseInt(targetDate.slice(8,10))}（${dayOfWeek}）`;

function snowBar(cm, max) {
  const pct = Math.min(cm / max * 100, 100);
  return pct;
}

function resortRow(r, maxSnow) {
  const info = RESORT_INFO[r.resort_id] || { nameJa: r.resort_id, region: '?' };
  const barPct = snowBar(r.new_snow_cm, maxSnow);
  const tempColor = r.temp_mid_c <= -8 ? '#60a5fa' : r.temp_mid_c <= -5 ? '#7dd3fc' : r.temp_mid_c <= -3 ? '#a5f3fc' : '#fbbf24';
  const windKmh = r.wind_speed_top;
  const windWarn = windKmh >= 50 ? '🌬️' : windKmh >= 30 ? '💨' : '';
  
  return `
    <div class="resort-row">
      <div class="resort-left">
        <span class="resort-name">${info.nameJa}</span>
        <span class="region-pill">${info.region}</span>
      </div>
      <div class="resort-right">
        <div class="snow-bar-container">
          <div class="snow-bar" style="width: ${barPct}%"></div>
          <span class="snow-value">${r.new_snow_cm}cm</span>
        </div>
        <div class="meta">
          <span class="temp" style="color:${tempColor}">${r.temp_mid_c}°C</span>
          <span class="wind">${windWarn}${windKmh}km/h</span>
          <span class="base">积雪${r.snow_base_cm}cm</span>
        </div>
      </div>
    </div>`;
}

function buildSection(title, emoji, resorts, maxSnow) {
  if (resorts.length === 0) return '';
  return `
    <div class="section">
      <div class="section-title">${emoji} ${title}</div>
      ${resorts.map(r => resortRow(r, maxSnow)).join('')}
    </div>`;
}

const maxSnow = powder[0].new_snow_cm;

const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700;900&display=swap');
  
  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  body {
    width: 900px; height: 1200px;
    font-family: 'Noto Sans SC', 'Noto Sans CJK SC', sans-serif;
    background: linear-gradient(180deg, #0a0a1a 0%, #111128 30%, #0d1b2a 100%);
    color: #e2e8f0;
    overflow: hidden;
    position: relative;
  }
  
  /* Decorative snow dots */
  body::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background-image: 
      radial-gradient(2px 2px at 10% 15%, rgba(255,255,255,0.3), transparent),
      radial-gradient(2px 2px at 30% 8%, rgba(255,255,255,0.2), transparent),
      radial-gradient(3px 3px at 50% 20%, rgba(255,255,255,0.15), transparent),
      radial-gradient(2px 2px at 70% 12%, rgba(255,255,255,0.25), transparent),
      radial-gradient(2px 2px at 85% 18%, rgba(255,255,255,0.2), transparent),
      radial-gradient(2px 2px at 15% 95%, rgba(255,255,255,0.15), transparent),
      radial-gradient(2px 2px at 90% 88%, rgba(255,255,255,0.2), transparent);
    pointer-events: none; z-index: 0;
  }
  
  .container {
    position: relative; z-index: 1;
    padding: 40px 36px 30px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .header {
    text-align: center;
    margin-bottom: 28px;
  }
  
  .alert-badge {
    display: inline-block;
    background: linear-gradient(135deg, rgba(239,68,68,0.3), rgba(234,88,12,0.3));
    border: 1px solid rgba(239,68,68,0.5);
    border-radius: 20px;
    padding: 6px 20px;
    font-size: 14px;
    font-weight: 700;
    color: #fca5a5;
    letter-spacing: 2px;
    margin-bottom: 12px;
  }
  
  .title {
    font-size: 42px;
    font-weight: 900;
    background: linear-gradient(135deg, #60a5fa, #38bdf8, #22d3ee);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    line-height: 1.2;
  }
  
  .subtitle {
    font-size: 20px;
    color: #94a3b8;
    margin-top: 8px;
  }
  
  .date-badge {
    display: inline-block;
    background: rgba(34,211,238,0.1);
    border: 1px solid rgba(34,211,238,0.3);
    border-radius: 12px;
    padding: 4px 14px;
    font-size: 16px;
    color: #22d3ee;
    margin-top: 10px;
  }
  
  .content { flex: 1; overflow: hidden; }
  
  .section { margin-bottom: 20px; }
  
  .section-title {
    font-size: 18px;
    font-weight: 700;
    color: #94a3b8;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(148,163,184,0.15);
  }
  
  .resort-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    margin-bottom: 4px;
    background: rgba(255,255,255,0.03);
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.05);
  }
  
  .resort-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 200px;
  }
  
  .resort-name {
    font-size: 16px;
    font-weight: 700;
    white-space: nowrap;
  }
  
  .region-pill {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 8px;
    background: rgba(255,255,255,0.07);
    color: #94a3b8;
    white-space: nowrap;
  }
  
  .resort-right {
    flex: 1;
    margin-left: 12px;
  }
  
  .snow-bar-container {
    position: relative;
    height: 22px;
    background: rgba(255,255,255,0.05);
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 4px;
  }
  
  .snow-bar {
    height: 100%;
    background: linear-gradient(90deg, rgba(56,189,248,0.6), rgba(34,211,238,0.8));
    border-radius: 6px;
    min-width: 30px;
  }
  
  .snow-value {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    text-shadow: 0 1px 3px rgba(0,0,0,0.5);
  }
  
  .meta {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: #64748b;
  }
  
  .meta .temp { font-weight: 600; }
  
  .footer {
    text-align: center;
    padding-top: 16px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  
  .footer-note {
    font-size: 12px;
    color: #475569;
    margin-top: 4px;
  }
  
  .criteria {
    display: inline-block;
    font-size: 11px;
    color: #64748b;
    background: rgba(255,255,255,0.03);
    border-radius: 8px;
    padding: 4px 12px;
    margin-bottom: 6px;
  }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="alert-badge">⚠️ POWDER ALERT</div>
    <div class="title">❄️ 粉雪预警 ❄️</div>
    <div class="subtitle">大雪来袭，粉雪日确定！</div>
    <div class="date-badge">📅 ${displayDate}</div>
  </div>
  
  <div class="content">
    ${buildSection('北海道', '🏔', hokkaido, maxSnow)}
    ${buildSection('东京周边', '🗼', tokyo, maxSnow)}
  </div>
  
  <div class="footer">
    <div class="criteria">触发条件: 24h新雪 ≥ 15cm</div>
    <div class="footer-note">数据来源: snow-forecast.com | yukimiru.jp</div>
  </div>
</div>
</body></html>`;

async function generate() {
  const outDir = path.join(__dirname, '..', 'public', 'cards');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  const outPath = path.join(outDir, `powder-${targetDate}.png`);
  await page.screenshot({ path: outPath, type: 'png' });
  console.log(`→ ${outPath}`);
  
  await browser.close();
  db.close();
  console.log('Done!');
}

generate().catch(err => { console.error(err); process.exit(1); });
