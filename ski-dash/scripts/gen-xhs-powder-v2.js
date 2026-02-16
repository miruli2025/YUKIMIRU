/**
 * 粉雪预警卡片 v2 — 大字版，每页10个雪场
 * Usage: node scripts/gen-xhs-powder-v2.js [YYYY-MM-DD] [page]
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const RESORT_INFO = {
  'kiroro': { nameJa: '喜乐乐', nameEn: 'Kiroro', region: '小樽', area: 'hokkaido' },
  'kagura': { nameJa: '神乐', nameEn: 'Kagura', region: '汤泽', area: 'tokyo' },
  'gala-yuzawa': { nameJa: 'GALA汤泽', nameEn: 'GALA Yuzawa', region: '汤泽', area: 'tokyo' },
  'nakayama-toge': { nameJa: '中山峠', nameEn: 'Nakayama Toge', region: '札幌', area: 'hokkaido' },
  'mount-racey': { nameJa: '瑞穗山', nameEn: 'Mount Racey', region: '夕张', area: 'hokkaido' },
  'sapporo-kokusai': { nameJa: '札幌国际', nameEn: 'Sapporo Kokusai', region: '札幌', area: 'hokkaido' },
  'niseko-hanazono': { nameJa: '二世古花园', nameEn: 'Niseko Hanazono', region: '二世古', area: 'hokkaido' },
  'niseko-annupuri': { nameJa: '二世古安努普利', nameEn: 'Niseko Annupuri', region: '二世古', area: 'hokkaido' },
  'niseko-village': { nameJa: '二世古村', nameEn: 'Niseko Village', region: '二世古', area: 'hokkaido' },
  'niseko-grand-hirafu': { nameJa: '二世古比罗夫', nameEn: 'Niseko Grand Hirafu', region: '二世古', area: 'hokkaido' },
  'niseko-moiwa': { nameJa: '二世古莫伊瓦', nameEn: 'Niseko Moiwa', region: '二世古', area: 'hokkaido' },
  'furano': { nameJa: '富良野', nameEn: 'Furano', region: '富良野', area: 'hokkaido' },
  'kandatsu-kogen': { nameJa: '神立高原', nameEn: 'Kandatsu Kogen', region: '汤泽', area: 'tokyo' },
  'snow-cruise-onze': { nameJa: '雪巡航ONZE', nameEn: 'Snow Cruise ONZE', region: '小樽', area: 'hokkaido' },
  'otaru-tenguyama': { nameJa: '小樽天狗山', nameEn: 'Otaru Tenguyama', region: '小樽', area: 'hokkaido' },
  'teine': { nameJa: '手稻', nameEn: 'Teine', region: '札幌', area: 'hokkaido' },
  'naeba': { nameJa: '苗场', nameEn: 'Naeba', region: '汤泽', area: 'tokyo' },
  'rusutsu': { nameJa: '留寿都', nameEn: 'Rusutsu', region: '留寿都', area: 'hokkaido' },
  'asarigawa-onsen': { nameJa: '朝里川温泉', nameEn: 'Asarigawa Onsen', region: '小樽', area: 'hokkaido' },
  'asahidake': { nameJa: '旭岳', nameEn: 'Asahidake', region: '旭川', area: 'hokkaido' },
  'nozawa-onsen': { nameJa: '野泽温泉', nameEn: 'Nozawa Onsen', region: '长野北部', area: 'tokyo' },
  'hakuba-happo-one': { nameJa: '白马八方尾根', nameEn: 'Hakuba Happo-One', region: '白马', area: 'tokyo' },
  'hakuba-goryu': { nameJa: '白马五龙', nameEn: 'Hakuba Goryu', region: '白马', area: 'tokyo' },
  'maiko': { nameJa: '舞子', nameEn: 'Maiko', region: '汤泽', area: 'tokyo' },
  'ishiuchi-maruyama': { nameJa: '石打丸山', nameEn: 'Ishiuchi Maruyama', region: '汤泽', area: 'tokyo' },
  'sugadaira-kogen': { nameJa: '菅平高原', nameEn: 'Sugadaira Kogen', region: '长野北部', area: 'tokyo' },
  'okushiga-kogen': { nameJa: '奥志贺高原', nameEn: 'Okushiga Kogen', region: '志贺高原', area: 'tokyo' },
  'shiga-kogen-yokoteyama': { nameJa: '志贺高原横手山', nameEn: 'Shiga Yokoteyama', region: '志贺高原', area: 'tokyo' },
  'marunuma-kogen': { nameJa: '丸沼高原', nameEn: 'Marunuma Kogen', region: '群马', area: 'tokyo' },
  'kawaba': { nameJa: '川场', nameEn: 'Kawaba', region: '群马', area: 'tokyo' },
  'fujiten': { nameJa: '富士天', nameEn: 'Fujiten', region: '山梨', area: 'tokyo' },
  'hodaigi': { nameJa: '宝台树', nameEn: 'Hodaigi', region: '群马', area: 'tokyo' },
  'tsumagoi': { nameJa: '嬬恋', nameEn: 'Tsumagoi', region: '群马', area: 'tokyo' },
  'kusatsu-onsen': { nameJa: '草津温泉', nameEn: 'Kusatsu Onsen', region: '群马', area: 'tokyo' },
  'tanigawadake-tenjindaira': { nameJa: '谷川岳天神平', nameEn: 'Tanigawadake', region: '群马', area: 'tokyo' },
  'karuizawa-prince': { nameJa: '轻井泽王子', nameEn: 'Karuizawa Prince', region: '长野南部', area: 'tokyo' },
  'sahoro': { nameJa: '佐幌', nameEn: 'Sahoro', region: '十胜', area: 'hokkaido' },
  'tomamu': { nameJa: '星野TOMAMU', nameEn: 'Hoshino Tomamu', region: '十胜', area: 'hokkaido' },
  'kamui-ski-links': { nameJa: '神威滑雪场', nameEn: 'Kamui Ski Links', region: '旭川', area: 'hokkaido' },
};

const dateArg = process.argv[2] || (() => { const d = new Date(Date.now() + 9*3600000); return d.toISOString().slice(0,10); })();
const pageNum = parseInt(process.argv[3] || '1');

const db = new Database(path.join(__dirname, '..', 'data', 'ski-dash.db'));
const rows = db.prepare(`
  SELECT resort_id, date, new_snow_cm, snow_base_cm, temp_top_c, temp_mid_c, wind_speed_top, weather_condition
  FROM daily_forecasts WHERE date = ? ORDER BY fetched_at DESC
`).all(dateArg);

const seen = new Set();
const deduped = rows.filter(r => { if (seen.has(r.resort_id)) return false; seen.add(r.resort_id); return true; });
const powder = deduped.filter(r => r.new_snow_cm >= 15).sort((a, b) => b.new_snow_cm - a.new_snow_cm);

if (powder.length === 0) { console.log('No powder for', dateArg); db.close(); process.exit(0); }

const PER_PAGE = 7;
const pageResorts = powder.slice((pageNum - 1) * PER_PAGE, pageNum * PER_PAGE);
const totalPages = Math.ceil(powder.length / PER_PAGE);

if (pageResorts.length === 0) { console.log(`Page ${pageNum} empty (total ${totalPages} pages)`); db.close(); process.exit(0); }

const maxSnow = powder[0].new_snow_cm;

function resortRowHtml(r, rank) {
  const info = RESORT_INFO[r.resort_id] || { nameJa: r.resort_id, nameEn: r.resort_id, region: '?', area: '?' };
  const barPct = Math.min(r.new_snow_cm / maxSnow * 100, 100);
  const tempColor = r.temp_mid_c <= -8 ? '#60a5fa' : r.temp_mid_c <= -5 ? '#7dd3fc' : r.temp_mid_c <= -3 ? '#a5f3fc' : '#fbbf24';
  const areaEmoji = info.area === 'hokkaido' ? '🏔' : '🗼';
  const windKmh = r.wind_speed_top;
  
  return `
    <div class="row">
      <div class="rank">${rank}</div>
      <div class="info">
        <div class="name-line">
          <span class="name">${info.nameJa}</span>
          <span class="name-en">${info.nameEn || ''}</span>
          <span class="pill">${info.region}</span>
          <span class="area-icon">${areaEmoji}</span>
        </div>
        <div class="bar-line">
          <div class="bar-bg">
            <div class="bar-fill" style="width:${barPct}%"></div>
          </div>
          <span class="snow-num">${r.new_snow_cm}cm</span>
        </div>
        <div class="detail-line">
          <span class="detail-item" style="color:${tempColor}">🌡 ${r.temp_mid_c}°C</span>
          <span class="detail-item">💨 ${windKmh}km/h</span>
          <span class="detail-item">⛰ 积雪${r.snow_base_cm}cm</span>
        </div>
      </div>
    </div>`;
}

const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:900px; height:1200px;
    font-family:'Noto Sans SC','Noto Sans CJK SC',sans-serif;
    background:linear-gradient(180deg,#0a0a1a 0%,#111128 30%,#0d1b2a 100%);
    color:#e2e8f0; overflow:hidden; position:relative;
  }
  body::before {
    content:''; position:absolute; top:0;left:0;right:0;bottom:0;
    background-image:
      radial-gradient(2px 2px at 10% 15%,rgba(255,255,255,0.3),transparent),
      radial-gradient(3px 3px at 50% 5%,rgba(255,255,255,0.2),transparent),
      radial-gradient(2px 2px at 85% 10%,rgba(255,255,255,0.25),transparent);
    pointer-events:none; z-index:0;
  }
  .container {
    position:relative; z-index:1;
    padding:36px 40px 28px;
    height:100%; display:flex; flex-direction:column;
  }
  .header { text-align:center; margin-bottom:24px; }
  .tag {
    display:inline-block;
    background:linear-gradient(135deg,rgba(239,68,68,0.25),rgba(234,88,12,0.25));
    border:1px solid rgba(239,68,68,0.5);
    border-radius:20px; padding:5px 18px;
    font-size:15px; font-weight:700; color:#fca5a5;
    letter-spacing:3px; margin-bottom:10px;
  }
  .title {
    font-size:48px; font-weight:900;
    background:linear-gradient(135deg,#60a5fa,#38bdf8,#22d3ee);
    -webkit-background-clip:text; -webkit-text-fill-color:transparent;
    line-height:1.2;
  }
  .date {
    font-size:22px; color:#94a3b8; margin-top:8px; font-weight:500;
  }
  .page-info {
    font-size:14px; color:#475569; margin-top:6px;
  }
  
  .list { flex:1; display:flex; flex-direction:column; gap:6px; }
  
  .row {
    display:flex; align-items:center; gap:14px;
    padding:10px 16px;
    background:rgba(255,255,255,0.035);
    border-radius:12px;
    border:1px solid rgba(255,255,255,0.06);
  }
  .rank {
    font-size:28px; font-weight:900; color:#22d3ee;
    min-width:38px; text-align:center;
  }
  .info { flex:1; }
  .name-line { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
  .name { font-size:22px; font-weight:700; white-space:nowrap; }
  .name-en { font-size:13px; color:#64748b; white-space:nowrap; }
  .pill {
    font-size:13px; padding:2px 10px; border-radius:8px;
    background:rgba(255,255,255,0.08); color:#94a3b8;
  }
  .area-icon { font-size:16px; }
  
  .bar-line { display:flex; align-items:center; gap:10px; margin-bottom:5px; }
  .bar-bg {
    flex:1; height:26px; background:rgba(255,255,255,0.06);
    border-radius:8px; overflow:hidden;
  }
  .bar-fill {
    height:100%;
    background:linear-gradient(90deg,rgba(56,189,248,0.5),rgba(34,211,238,0.85));
    border-radius:8px; min-width:20px;
  }
  .snow-num {
    font-size:22px; font-weight:900; color:#22d3ee;
    min-width:70px; text-align:right;
  }
  
  .detail-line { display:flex; gap:16px; }
  .detail-item { font-size:15px; font-weight:500; color:#94a3b8; }
  
  .footer {
    text-align:center; padding-top:14px;
    border-top:1px solid rgba(255,255,255,0.06);
  }
  .footer-text { font-size:13px; color:#475569; }
</style></head><body>
<div class="container">
  <div class="header">
    <div class="tag">⚠️ POWDER ALERT</div>
    <div class="title">日本滑雪 ❄️ 粉雪情报</div>
    <div class="date">2026年2月18日 星期三</div>
    ${totalPages > 1 ? `<div class="page-info">${pageNum} / ${totalPages}</div>` : ''}
  </div>
  <div class="list">
    ${pageResorts.map((r, i) => resortRowHtml(r, (pageNum - 1) * PER_PAGE + i + 1)).join('')}
  </div>
  <div class="footer">
    <div class="footer-text">数据来源: snow-forecast.com | yukimiru.jp</div>
  </div>
</div>
</body></html>`;

async function generate() {
  const outDir = path.join(__dirname, '..', 'public', 'cards');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--font-render-hinting=none'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const outPath = path.join(outDir, `powder-${dateArg}-p${pageNum}.png`);
  await page.screenshot({ path: outPath, type: 'png' });
  console.log(`→ ${outPath}`);
  await browser.close();
  db.close();
}

generate().catch(err => { console.error(err); process.exit(1); });
