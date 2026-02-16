/**
 * 粉雪预警卡片 — 暗色粉紫版（定稿）
 * Usage: node scripts/gen-xhs-powder-final.js [YYYY-MM-DD] [page]
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
const rows = db.prepare(`SELECT resort_id, date, new_snow_cm, snow_base_cm, temp_top_c, temp_mid_c, wind_speed_top FROM daily_forecasts WHERE date = ? ORDER BY fetched_at DESC`).all(dateArg);
const seen = new Set();
const deduped = rows.filter(r => { if (seen.has(r.resort_id)) return false; seen.add(r.resort_id); return true; });
const powder = deduped.filter(r => r.new_snow_cm >= 15).sort((a, b) => b.new_snow_cm - a.new_snow_cm);
if (powder.length === 0) { console.log('No powder for', dateArg); db.close(); process.exit(0); }

const PER_PAGE = 7;
const pageResorts = powder.slice((pageNum - 1) * PER_PAGE, pageNum * PER_PAGE);
const totalPages = Math.ceil(powder.length / PER_PAGE);
if (pageResorts.length === 0) { console.log(`Page ${pageNum} empty`); db.close(); process.exit(0); }

const maxSnow = powder[0].new_snow_cm;
const days = ['日', '一', '二', '三', '四', '五', '六'];
// Parse date parts directly to avoid UTC conversion issues
const [yy, mo, da] = dateArg.split('-').map(Number);
const dateObj = new Date(yy, mo - 1, da); // local time
const dayOfWeek = days[dateObj.getDay()];
const yyyy = dateArg.slice(0,4);
const mm = parseInt(dateArg.slice(5,7));
const dd = parseInt(dateArg.slice(8,10));

function rowHtml(r, rank) {
  const info = RESORT_INFO[r.resort_id] || { nameJa: r.resort_id, nameEn: '', region: '?', area: '?' };
  const barPct = Math.min(r.new_snow_cm / maxSnow * 100, 100);
  const isTop3 = rank <= 3;
  const snowSize = isTop3 ? '32px' : '26px';
  const rankColors = { 1: '#f472b6', 2: '#c4b5fd', 3: '#a78bfa' };
  const rc = rankColors[rank] || '#e879f9';
  const tempColor = r.temp_mid_c <= -8 ? '#60a5fa' : r.temp_mid_c <= -5 ? '#7dd3fc' : '#a5f3fc';
  const glow = Math.min(0.12 + (r.new_snow_cm / maxSnow) * 0.2, 0.32);

  return `<div class="row ${isTop3?'row-hot':''}" style="--glow:${glow}">
    <div class="rank" style="color:${rc}">${rank}</div>
    <div class="main">
      <div class="top-line">
        <div class="names"><span class="name-ja">${info.nameJa}</span><span class="name-en">${info.nameEn}</span></div>
        <div class="snow-big" style="font-size:${snowSize}">${r.new_snow_cm}<span class="snow-unit">cm</span></div>
      </div>
      <div class="bar-wrap">
        <div class="bar-bg"><div class="bar-fill ${isTop3?'bar-hot':''}" style="width:${barPct}%"></div></div>
        <span class="pill">${info.region}</span>
        <span class="area-tag">${info.area === 'hokkaido' ? '北海道' : '东京周边'}</span>
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
  *{margin:0;padding:0;box-sizing:border-box}
  body{
    width:900px;height:1200px;
    font-family:'Noto Sans SC','Noto Sans CJK SC',sans-serif;
    background:#0a0a12;color:#e2e8f0;overflow:hidden;position:relative;
  }
  body::before{
    content:'';position:absolute;top:0;left:0;right:0;bottom:0;
    background:
      radial-gradient(ellipse at 20% 0%,rgba(236,72,153,0.18) 0%,transparent 50%),
      radial-gradient(ellipse at 80% 0%,rgba(168,85,247,0.12) 0%,transparent 50%),
      radial-gradient(ellipse at 50% 100%,rgba(56,189,248,0.1) 0%,transparent 50%),
      linear-gradient(180deg,#0f0a1a 0%,#0d0a1e 50%,#070b14 100%);
    z-index:0;
  }
  body::after{
    content:'';position:absolute;top:0;left:0;right:0;bottom:0;
    background-image:
      radial-gradient(3px 3px at 5% 8%,rgba(255,255,255,0.5),transparent),
      radial-gradient(2px 2px at 15% 20%,rgba(255,255,255,0.3),transparent),
      radial-gradient(3px 3px at 25% 5%,rgba(255,255,255,0.4),transparent),
      radial-gradient(2px 2px at 40% 15%,rgba(255,255,255,0.3),transparent),
      radial-gradient(4px 4px at 55% 3%,rgba(255,255,255,0.5),transparent),
      radial-gradient(2px 2px at 70% 12%,rgba(255,255,255,0.35),transparent),
      radial-gradient(3px 3px at 85% 8%,rgba(255,255,255,0.4),transparent),
      radial-gradient(2px 2px at 95% 18%,rgba(255,255,255,0.3),transparent);
    pointer-events:none;z-index:0;
  }
  .container{position:relative;z-index:1;padding:24px 36px 20px;height:100%;display:flex;flex-direction:column}
  
  .header{text-align:center;margin-bottom:10px}
  .fire-line{font-size:16px;letter-spacing:4px;color:#f472b6;font-weight:700;margin-bottom:6px}
  .title{font-size:50px;font-weight:900;line-height:1.15;color:#fff;text-shadow:0 0 40px rgba(236,72,153,0.4),0 0 80px rgba(168,85,247,0.2)}
  .title .emoji{font-size:44px;filter:drop-shadow(0 0 12px rgba(56,189,248,0.6))}
  .title .hot{background:linear-gradient(135deg,#ec4899,#a855f7,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  .subtitle{font-size:22px;color:#cbd5e1;margin-top:6px;font-weight:500}
  .subtitle .hl{color:#f472b6;font-weight:900;font-size:26px}
  
  /* === DATE — 大号显眼 === */
  .date-block{
    margin-top:12px;
    display:flex;justify-content:center;align-items:center;gap:14px;
  }
  .date-big{
    font-size:28px;font-weight:900;
    background:linear-gradient(135deg,rgba(236,72,153,0.2),rgba(168,85,247,0.2));
    border:1.5px solid rgba(236,72,153,0.45);
    border-radius:18px;padding:6px 24px;
    color:#f9a8d4;
    letter-spacing:1px;
  }
  .count-pill{
    background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.3);
    border-radius:16px;padding:5px 16px;font-size:16px;color:#7dd3fc;font-weight:700;
  }
  
  .list{flex:1;display:flex;flex-direction:column;gap:5px}
  .row{
    display:flex;align-items:center;gap:12px;padding:9px 16px;
    background:rgba(255,255,255,0.04);border-radius:14px;
    border:1px solid rgba(255,255,255,0.06);
  }
  .row-hot{
    background:rgba(236,72,153,0.06);border-color:rgba(236,72,153,0.15);
    box-shadow:0 0 20px rgba(236,72,153,var(--glow));
  }
  .rank{font-size:32px;font-weight:900;min-width:40px;text-align:center;text-shadow:0 0 15px currentColor}
  .main{flex:1}
  .top-line{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px}
  .names{display:flex;flex-direction:column}
  .name-ja{font-size:22px;font-weight:800;color:#fff}
  .name-en{font-size:12px;color:#94a3b8;margin-top:1px;font-weight:500}
  .snow-big{font-weight:900;color:#fff;text-shadow:0 0 20px rgba(56,189,248,0.5)}
  .snow-unit{font-size:16px;color:#38bdf8;font-weight:700}
  .bar-wrap{display:flex;align-items:center;gap:10px;margin-bottom:5px}
  .bar-bg{flex:1;height:20px;background:rgba(255,255,255,0.06);border-radius:6px;overflow:hidden}
  .bar-fill{height:100%;background:linear-gradient(90deg,#c084fc,#a78bfa,#93c5fd);border-radius:6px}
  .bar-hot{background:linear-gradient(90deg,#a855f7,#ec4899,#f472b6)!important;box-shadow:0 0 10px rgba(236,72,153,0.4)}
  .pill{font-size:14px;padding:3px 10px;border-radius:8px;background:rgba(255,255,255,0.08);color:#cbd5e1;white-space:nowrap;font-weight:700}
  .area-tag{font-size:14px;padding:3px 10px;border-radius:8px;background:rgba(168,85,247,0.15);color:#c4b5fd;white-space:nowrap;font-weight:700}
  
  /* === STATS — 加粗可见 === */
  .stats{display:flex;gap:14px;font-size:15px;font-weight:700;color:#a1a1aa}
  
  .footer{text-align:center;padding-top:10px;border-top:1px solid rgba(255,255,255,0.06);flex-shrink:0}
  .footer-cta{font-size:16px;font-weight:700;color:#f472b6;margin-bottom:4px}
  .footer-src{font-size:12px;color:#475569}
</style></head><body>
<div class="container">
  <div class="header">
    <div class="fire-line">🔥 POWDER ALERT 🔥</div>
    <div class="title"><span class="emoji">❄️</span> <span class="hot">粉雪大爆发</span> <span class="emoji">❄️</span></div>
    <div class="subtitle">最高新雪 <span class="hl">${maxSnow}cm</span>！不冲等啥</div>
    <div class="date-block">
      <span class="date-big">📅 ${mm}月${dd}日 星期${dayOfWeek}</span>
      <span class="count-pill">🎿 ${powder.length}个雪场达标</span>
    </div>
  </div>
  <div class="list">
    ${pageResorts.map((r, i) => rowHtml(r, (pageNum-1)*PER_PAGE+i+1)).join('')}
  </div>
  <div class="footer">
    <div class="footer-cta">${pageNum < totalPages ? `还有${powder.length - pageNum*PER_PAGE}个雪场 → 滑动看下一页` : '冲就完了 🎿✨'}</div>
    <div class="footer-src">数据来源: snow-forecast.com | yukimiru.com</div>
  </div>
</div>
</body></html>`;

async function generate() {
  const outDir = path.join(__dirname, '..', 'public', 'cards');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath:'/usr/bin/chromium-browser',headless:'new',
    args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--font-render-hinting=none'],
  });
  const page = await browser.newPage();
  await page.setViewport({width:900,height:1200,deviceScaleFactor:2});
  await page.setContent(html,{waitUntil:'networkidle0'});
  const outPath = path.join(outDir,`powder-${dateArg}-p${pageNum}.png`);
  await page.screenshot({path:outPath,type:'png'});
  console.log(`→ ${outPath}`);
  await browser.close();
  db.close();
}
generate().catch(err=>{console.error(err);process.exit(1)});
