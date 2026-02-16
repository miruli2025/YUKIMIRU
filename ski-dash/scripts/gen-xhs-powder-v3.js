/**
 * 粉雪预警卡片 v3 — 爆款风格，热血沸腾
 * Usage: node scripts/gen-xhs-powder-v3.js [YYYY-MM-DD] [page]
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

if (pageResorts.length === 0) { console.log(`Page ${pageNum} empty`); db.close(); process.exit(0); }

const maxSnow = powder[0].new_snow_cm;

// Date display
const days = ['日', '一', '二', '三', '四', '五', '六'];
const dateObj = new Date(dateArg + 'T00:00:00+09:00');
const dayOfWeek = days[dateObj.getDay()];
const mm = parseInt(dateArg.slice(5,7));
const dd = parseInt(dateArg.slice(8,10));

function resortRowHtml(r, rank) {
  const info = RESORT_INFO[r.resort_id] || { nameJa: r.resort_id, nameEn: '', region: '?', area: '?' };
  const barPct = Math.min(r.new_snow_cm / maxSnow * 100, 100);
  const isTop3 = rank <= 3;
  const snowSize = isTop3 ? '32px' : '26px';
  const rankColors = { 1: '#f472b6', 2: '#c4b5fd', 3: '#a78bfa' };
  const rankColor = rankColors[rank] || '#e879f9';
  const tempColor = r.temp_mid_c <= -8 ? '#2563eb' : r.temp_mid_c <= -5 ? '#3b82f6' : '#6366f1';
  
  // Glow intensity based on snow amount
  const glowOpacity = Math.min(0.15 + (r.new_snow_cm / maxSnow) * 0.25, 0.4);
  
  return `
    <div class="row ${isTop3 ? 'row-hot' : ''}" style="--glow:${glowOpacity}">
      <div class="rank" style="color:${rankColor}">${rank}</div>
      <div class="main">
        <div class="top-line">
          <div class="names">
            <span class="name-ja">${info.nameJa}</span>
            <span class="name-en">${info.nameEn}</span>
          </div>
          <div class="snow-big" style="font-size:${snowSize}">
            ${r.new_snow_cm}<span class="snow-unit">cm</span>
          </div>
        </div>
        <div class="bar-wrap">
          <div class="bar-bg"><div class="bar-fill ${isTop3 ? 'bar-hot' : ''}" style="width:${barPct}%"></div></div>
          <span class="pill">${info.region}</span>
        </div>
        <div class="stats">
          <span style="color:${tempColor}">🌡 ${r.temp_mid_c}°C</span>
          <span>💨 ${r.wind_speed_top}km/h</span>
          <span>⛰ ${r.snow_base_cm}cm积雪</span>
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
    background:#f8f5ff;
    color:#1e1b4b; overflow:hidden; position:relative;
  }
  
  /* Dramatic bg gradient */
  body::before {
    content:''; position:absolute; top:0; left:0; right:0; bottom:0;
    background:
      radial-gradient(ellipse at 20% 0%, rgba(236,72,153,0.12) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 0%, rgba(168,85,247,0.08) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 100%, rgba(186,230,253,0.2) 0%, transparent 50%),
      linear-gradient(180deg, #fdf2f8 0%, #f5f3ff 50%, #f0f9ff 100%);
    z-index:0;
  }
  
  /* Floating snow particles */
  body::after {
    content:''; position:absolute; top:0; left:0; right:0; bottom:0;
    background-image:
      radial-gradient(4px 4px at 5% 8%, rgba(236,72,153,0.15), transparent),
      radial-gradient(3px 3px at 15% 20%, rgba(168,85,247,0.1), transparent),
      radial-gradient(5px 5px at 25% 5%, rgba(186,230,253,0.3), transparent),
      radial-gradient(3px 3px at 40% 15%, rgba(236,72,153,0.1), transparent),
      radial-gradient(6px 6px at 55% 3%, rgba(255,255,255,0.6), transparent),
      radial-gradient(4px 4px at 70% 12%, rgba(168,85,247,0.12), transparent),
      radial-gradient(5px 5px at 85% 8%, rgba(186,230,253,0.25), transparent),
      radial-gradient(3px 3px at 95% 18%, rgba(236,72,153,0.1), transparent),
      radial-gradient(4px 4px at 35% 95%, rgba(168,85,247,0.08), transparent),
      radial-gradient(3px 3px at 65% 92%, rgba(186,230,253,0.15), transparent);
    pointer-events:none; z-index:0;
  }
  
  .container {
    position:relative; z-index:1;
    padding:32px 36px 24px;
    height:100%; display:flex; flex-direction:column;
  }
  
  /* ===== HEADER — 爆款感 ===== */
  .header { text-align:center; margin-bottom:20px; }
  
  .fire-line {
    font-size:16px; letter-spacing:4px; color:#f472b6;
    font-weight:700; margin-bottom:6px;
  }
  
  .title {
    font-size:52px; font-weight:900; line-height:1.15;
    color:#fff;
    text-shadow: none;
  }
  .title .emoji { 
    font-size:46px;
  }
  .title .hot {
    background:linear-gradient(135deg, #ec4899, #a855f7, #ec4899);
    -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  }
  
  .subtitle {
    font-size:22px; color:#6b7280; margin-top:6px; font-weight:500;
  }
  .subtitle .highlight {
    color:#f472b6; font-weight:900; font-size:26px;
  }
  
  .date-line {
    margin-top:10px; display:flex; justify-content:center; gap:12px; align-items:center;
  }
  .date-pill {
    background:linear-gradient(135deg, rgba(236,72,153,0.2), rgba(168,85,247,0.2));
    border:1px solid rgba(236,72,153,0.4);
    border-radius:16px; padding:4px 16px;
    font-size:17px; font-weight:700; color:#f472b6;
  }
  .count-pill {
    background:rgba(56,189,248,0.12);
    border:1px solid rgba(56,189,248,0.3);
    border-radius:16px; padding:4px 14px;
    font-size:15px; color:#38bdf8; font-weight:600;
  }
  
  /* ===== LIST ===== */
  .list { flex:1; display:flex; flex-direction:column; gap:7px; }
  
  .row {
    display:flex; align-items:center; gap:12px;
    padding:11px 16px;
    background:rgba(255,255,255,0.7);
    border-radius:14px;
    border:1px solid rgba(236,72,153,0.08);
    backdrop-filter:blur(10px);
    transition:all 0.3s;
  }
  .row-hot {
    background:rgba(255,255,255,0.85);
    border-color:rgba(236,72,153,0.25);
    box-shadow: 0 4px 16px rgba(236,72,153, var(--glow));
  }
  
  .rank {
    font-size:32px; font-weight:900;
    min-width:40px; text-align:center;
    text-shadow: 0 0 15px currentColor;
  }
  
  .main { flex:1; }
  
  .top-line { display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; }
  .names { display:flex; flex-direction:column; }
  .name-ja { font-size:22px; font-weight:800; color:#1e1b4b; }
  .name-en { font-size:12px; color:#9ca3af; margin-top:1px; }
  
  .snow-big {
    font-weight:900; color:#1e1b4b;
    text-shadow: none;
  }
  .snow-unit { font-size:16px; color:#a855f7; font-weight:700; }
  
  .bar-wrap { display:flex; align-items:center; gap:10px; margin-bottom:5px; }
  .bar-bg {
    flex:1; height:20px; background:rgba(0,0,0,0.04);
    border-radius:6px; overflow:hidden;
  }
  .bar-fill {
    height:100%;
    background:linear-gradient(90deg, #c084fc, #a78bfa, #93c5fd);
    border-radius:6px;
  }
  .bar-hot {
    background:linear-gradient(90deg, #a855f7, #ec4899, #f472b6) !important;
    box-shadow: 0 0 10px rgba(236,72,153,0.4);
  }
  
  .pill {
    font-size:12px; padding:2px 10px; border-radius:8px;
    background:rgba(168,85,247,0.08); color:#7c3aed;
    white-space:nowrap;
  }
  
  .stats {
    display:flex; gap:14px; font-size:14px; font-weight:500; color:#6b7280;
  }
  
  /* ===== FOOTER ===== */
  .footer {
    text-align:center; padding-top:12px;
    border-top:1px solid rgba(0,0,0,0.06);
  }
  .footer-cta {
    font-size:16px; font-weight:700; color:#f472b6;
    margin-bottom:4px;
  }
  .footer-src { font-size:12px; color:#9ca3af; }
</style></head><body>
<div class="container">
  <div class="header">
    <div class="fire-line">🔥 POWDER ALERT 🔥</div>
    <div class="title">
      <span class="emoji">❄️</span> <span class="hot">粉雪大爆发</span> <span class="emoji">❄️</span>
    </div>
    <div class="subtitle">
      最高新雪 <span class="highlight">${maxSnow}cm</span>！不冲等啥
    </div>
    <div class="date-line">
      <span class="date-pill">📅 ${mm}月${dd}日 星期${dayOfWeek}</span>
      <span class="count-pill">🎿 ${powder.length}个雪场达标</span>
    </div>
  </div>
  
  <div class="list">
    ${pageResorts.map((r, i) => resortRowHtml(r, (pageNum - 1) * PER_PAGE + i + 1)).join('')}
  </div>
  
  <div class="footer">
    <div class="footer-cta">${pageNum < totalPages ? `还有${powder.length - pageNum * PER_PAGE}个雪场 → 滑动看下一页` : '冲就完了 🎿✨'}</div>
    <div class="footer-src">数据来源: snow-forecast.com | yukimiru.jp</div>
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
