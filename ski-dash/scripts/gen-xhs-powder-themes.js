/**
 * 粉雪预警卡片 — 3种配色方案对比
 * Usage: node scripts/gen-xhs-powder-themes.js [YYYY-MM-DD]
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

// === 3 THEMES ===
const themes = {
  // A: 冰蓝清爽 — 浅蓝底，白霜卡片，冰蓝强调
  iceblue: {
    name: 'A 冰蓝清爽',
    bodyBg: '#eef6ff',
    bgGradient: `radial-gradient(ellipse at 30% 0%, rgba(56,189,248,0.12) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 0%, rgba(99,102,241,0.08) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 100%, rgba(224,242,254,0.4) 0%, transparent 50%),
      linear-gradient(180deg, #e0f2fe 0%, #eef6ff 40%, #f0f9ff 100%)`,
    textColor: '#0f172a',
    tagColor: '#0284c7', tagBg: 'rgba(14,165,233,0.12)', tagBorder: 'rgba(14,165,233,0.3)',
    titleGrad: 'linear-gradient(135deg, #0284c7, #6366f1, #0ea5e9)',
    subtitleColor: '#475569',
    highlightColor: '#0284c7',
    datePillBg: 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(99,102,241,0.15))',
    datePillBorder: 'rgba(14,165,233,0.35)', datePillColor: '#0284c7',
    countPillBg: 'rgba(99,102,241,0.1)', countPillBorder: 'rgba(99,102,241,0.25)', countPillColor: '#6366f1',
    rowBg: 'rgba(255,255,255,0.75)', rowBorder: 'rgba(14,165,233,0.08)',
    rowHotBg: 'rgba(255,255,255,0.9)', rowHotBorder: 'rgba(14,165,233,0.2)',
    rowHotShadowColor: '14,165,233',
    rankColors: { 1: '#0284c7', 2: '#6366f1', 3: '#8b5cf6' }, rankDefault: '#0ea5e9',
    nameColor: '#0f172a', nameEnColor: '#94a3b8',
    snowUnitColor: '#0284c7',
    barBg: 'rgba(0,0,0,0.04)',
    barFill: 'linear-gradient(90deg, #7dd3fc, #38bdf8, #0ea5e9)',
    barHot: 'linear-gradient(90deg, #6366f1, #0ea5e9, #38bdf8)',
    barHotShadow: 'rgba(14,165,233,0.3)',
    pillBg: 'rgba(14,165,233,0.08)', pillColor: '#0284c7',
    statsColor: '#64748b',
    tempColors: ['#1d4ed8', '#2563eb', '#4f46e5'],
    ctaColor: '#0284c7',
    srcColor: '#94a3b8',
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  // B: 暖阳活力 — 奶白底，暖黄橘点缀，活泼感
  warmglow: {
    name: 'B 暖阳活力',
    bodyBg: '#fffbf0',
    bgGradient: `radial-gradient(ellipse at 20% 0%, rgba(251,191,36,0.1) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 0%, rgba(249,115,22,0.08) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 100%, rgba(254,243,199,0.3) 0%, transparent 50%),
      linear-gradient(180deg, #fef9ee 0%, #fffbf0 40%, #fff7ed 100%)`,
    textColor: '#1c1917',
    tagColor: '#ea580c', tagBg: 'rgba(249,115,22,0.1)', tagBorder: 'rgba(249,115,22,0.3)',
    titleGrad: 'linear-gradient(135deg, #ea580c, #d97706, #dc2626)',
    subtitleColor: '#57534e',
    highlightColor: '#ea580c',
    datePillBg: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,88,12,0.15))',
    datePillBorder: 'rgba(249,115,22,0.35)', datePillColor: '#ea580c',
    countPillBg: 'rgba(217,119,6,0.1)', countPillBorder: 'rgba(217,119,6,0.25)', countPillColor: '#b45309',
    rowBg: 'rgba(255,255,255,0.7)', rowBorder: 'rgba(249,115,22,0.06)',
    rowHotBg: 'rgba(255,255,255,0.9)', rowHotBorder: 'rgba(249,115,22,0.2)',
    rowHotShadowColor: '249,115,22',
    rankColors: { 1: '#ea580c', 2: '#d97706', 3: '#b45309' }, rankDefault: '#f59e0b',
    nameColor: '#1c1917', nameEnColor: '#a8a29e',
    snowUnitColor: '#ea580c',
    barBg: 'rgba(0,0,0,0.04)',
    barFill: 'linear-gradient(90deg, #fcd34d, #fbbf24, #f59e0b)',
    barHot: 'linear-gradient(90deg, #f97316, #ef4444, #fbbf24)',
    barHotShadow: 'rgba(249,115,22,0.3)',
    pillBg: 'rgba(217,119,6,0.08)', pillColor: '#b45309',
    statsColor: '#78716c',
    tempColors: ['#1d4ed8', '#2563eb', '#4338ca'],
    ctaColor: '#ea580c',
    srcColor: '#a8a29e',
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  // C: 深蓝质感 — 深蓝底，毛玻璃卡片，冷酷高级感
  deepblue: {
    name: 'C 深蓝质感',
    bodyBg: '#0c1222',
    bgGradient: `radial-gradient(ellipse at 30% 0%, rgba(56,189,248,0.08) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 10%, rgba(99,102,241,0.06) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 100%, rgba(30,58,138,0.15) 0%, transparent 50%),
      linear-gradient(180deg, #0f1729 0%, #0c1222 50%, #0a0f1e 100%)`,
    textColor: '#e2e8f0',
    tagColor: '#38bdf8', tagBg: 'rgba(56,189,248,0.12)', tagBorder: 'rgba(56,189,248,0.35)',
    titleGrad: 'linear-gradient(135deg, #38bdf8, #818cf8, #38bdf8)',
    subtitleColor: '#94a3b8',
    highlightColor: '#38bdf8',
    datePillBg: 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(129,140,248,0.15))',
    datePillBorder: 'rgba(56,189,248,0.3)', datePillColor: '#38bdf8',
    countPillBg: 'rgba(129,140,248,0.1)', countPillBorder: 'rgba(129,140,248,0.25)', countPillColor: '#818cf8',
    rowBg: 'rgba(255,255,255,0.04)', rowBorder: 'rgba(56,189,248,0.08)',
    rowHotBg: 'rgba(255,255,255,0.07)', rowHotBorder: 'rgba(56,189,248,0.2)',
    rowHotShadowColor: '56,189,248',
    rankColors: { 1: '#38bdf8', 2: '#818cf8', 3: '#a78bfa' }, rankDefault: '#7dd3fc',
    nameColor: '#f1f5f9', nameEnColor: '#64748b',
    snowUnitColor: '#38bdf8',
    barBg: 'rgba(255,255,255,0.06)',
    barFill: 'linear-gradient(90deg, #1e3a5f, #1e40af, #3b82f6)',
    barHot: 'linear-gradient(90deg, #6366f1, #38bdf8, #7dd3fc)',
    barHotShadow: 'rgba(56,189,248,0.3)',
    pillBg: 'rgba(56,189,248,0.08)', pillColor: '#7dd3fc',
    statsColor: '#64748b',
    tempColors: ['#60a5fa', '#7dd3fc', '#a5b4fc'],
    ctaColor: '#38bdf8',
    srcColor: '#475569',
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
};

const dateArg = process.argv[2] || (() => { const d = new Date(Date.now() + 9*3600000); return d.toISOString().slice(0,10); })();

const db = new Database(path.join(__dirname, '..', 'data', 'ski-dash.db'));
const rows = db.prepare(`SELECT resort_id, date, new_snow_cm, snow_base_cm, temp_top_c, temp_mid_c, wind_speed_top FROM daily_forecasts WHERE date = ? ORDER BY fetched_at DESC`).all(dateArg);
const seen = new Set();
const deduped = rows.filter(r => { if (seen.has(r.resort_id)) return false; seen.add(r.resort_id); return true; });
const powder = deduped.filter(r => r.new_snow_cm >= 15).sort((a, b) => b.new_snow_cm - a.new_snow_cm);
if (powder.length === 0) { console.log('No powder'); db.close(); process.exit(0); }

const PER_PAGE = 7;
const pageResorts = powder.slice(0, PER_PAGE);
const maxSnow = powder[0].new_snow_cm;

const days = ['日', '一', '二', '三', '四', '五', '六'];
const dateObj = new Date(dateArg + 'T00:00:00+09:00');
const dayOfWeek = days[dateObj.getDay()];
const mm = parseInt(dateArg.slice(5,7));
const dd = parseInt(dateArg.slice(8,10));

function buildHtml(t) {
  function rowHtml(r, rank) {
    const info = RESORT_INFO[r.resort_id] || { nameJa: r.resort_id, nameEn: '', region: '?', area: '?' };
    const barPct = Math.min(r.new_snow_cm / maxSnow * 100, 100);
    const isTop3 = rank <= 3;
    const snowSize = isTop3 ? '32px' : '26px';
    const rc = t.rankColors[rank] || t.rankDefault;
    const tc = r.temp_mid_c <= -8 ? t.tempColors[0] : r.temp_mid_c <= -5 ? t.tempColors[1] : t.tempColors[2];
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
        </div>
        <div class="stats">
          <span style="color:${tc}">🌡 ${r.temp_mid_c}°C</span>
          <span>💨 ${r.wind_speed_top}km/h</span>
          <span>⛰ ${r.snow_base_cm}cm积雪</span>
        </div>
      </div>
    </div>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700;900&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:900px;height:1200px;font-family:'Noto Sans SC','Noto Sans CJK SC',sans-serif;background:${t.bodyBg};color:${t.textColor};overflow:hidden;position:relative}
  body::before{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:${t.bgGradient};z-index:0}
  .container{position:relative;z-index:1;padding:32px 36px 24px;height:100%;display:flex;flex-direction:column}
  .header{text-align:center;margin-bottom:20px}
  .fire-line{font-size:16px;letter-spacing:4px;color:${t.tagColor};font-weight:700;margin-bottom:6px}
  .title{font-size:50px;font-weight:900;line-height:1.15}
  .title .emoji{font-size:44px}
  .title .hot{background:${t.titleGrad};-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  .subtitle{font-size:22px;color:${t.subtitleColor};margin-top:6px;font-weight:500}
  .subtitle .hl{color:${t.highlightColor};font-weight:900;font-size:26px}
  .date-line{margin-top:10px;display:flex;justify-content:center;gap:12px;align-items:center}
  .date-pill{background:${t.datePillBg};border:1px solid ${t.datePillBorder};border-radius:16px;padding:4px 16px;font-size:17px;font-weight:700;color:${t.datePillColor}}
  .count-pill{background:${t.countPillBg};border:1px solid ${t.countPillBorder};border-radius:16px;padding:4px 14px;font-size:15px;color:${t.countPillColor};font-weight:600}
  .list{flex:1;display:flex;flex-direction:column;gap:7px}
  .row{display:flex;align-items:center;gap:12px;padding:11px 16px;background:${t.rowBg};border-radius:14px;border:1px solid ${t.rowBorder};backdrop-filter:blur(10px)}
  .row-hot{background:${t.rowHotBg};border-color:${t.rowHotBorder};box-shadow:0 4px 16px rgba(${t.rowHotShadowColor},var(--glow))}
  .rank{font-size:32px;font-weight:900;min-width:40px;text-align:center}
  .main{flex:1}
  .top-line{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px}
  .names{display:flex;flex-direction:column}
  .name-ja{font-size:22px;font-weight:800;color:${t.nameColor}}
  .name-en{font-size:12px;color:${t.nameEnColor};margin-top:1px}
  .snow-big{font-weight:900;color:${t.nameColor}}
  .snow-unit{font-size:16px;color:${t.snowUnitColor};font-weight:700}
  .bar-wrap{display:flex;align-items:center;gap:10px;margin-bottom:5px}
  .bar-bg{flex:1;height:20px;background:${t.barBg};border-radius:6px;overflow:hidden}
  .bar-fill{height:100%;background:${t.barFill};border-radius:6px}
  .bar-hot{background:${t.barHot}!important;box-shadow:0 0 10px ${t.barHotShadow}}
  .pill{font-size:12px;padding:2px 10px;border-radius:8px;background:${t.pillBg};color:${t.pillColor};white-space:nowrap}
  .stats{display:flex;gap:14px;font-size:14px;font-weight:500;color:${t.statsColor}}
  .footer{text-align:center;padding-top:12px;border-top:1px solid ${t.borderTopColor}}
  .footer-cta{font-size:16px;font-weight:700;color:${t.ctaColor};margin-bottom:4px}
  .footer-src{font-size:12px;color:${t.srcColor}}
  .theme-tag{position:absolute;top:12px;right:16px;font-size:13px;color:${t.statsColor};opacity:0.5}
</style></head><body>
<div class="container">
  <div class="theme-tag">${t.name}</div>
  <div class="header">
    <div class="fire-line">🔥 POWDER ALERT 🔥</div>
    <div class="title"><span class="emoji">❄️</span> <span class="hot">粉雪大爆发</span> <span class="emoji">❄️</span></div>
    <div class="subtitle">最高新雪 <span class="hl">${maxSnow}cm</span>！不冲等啥</div>
    <div class="date-line">
      <span class="date-pill">📅 ${mm}月${dd}日 星期${dayOfWeek}</span>
      <span class="count-pill">🎿 ${powder.length}个雪场达标</span>
    </div>
  </div>
  <div class="list">${pageResorts.map((r, i) => rowHtml(r, i + 1)).join('')}</div>
  <div class="footer">
    <div class="footer-cta">冲就完了 🎿✨</div>
    <div class="footer-src">数据来源: snow-forecast.com | yukimiru.jp</div>
  </div>
</div>
</body></html>`;
}

async function generate() {
  const outDir = path.join(__dirname, '..', 'public', 'cards');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser', headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--font-render-hinting=none'],
  });

  for (const [key, theme] of Object.entries(themes)) {
    const page = await browser.newPage();
    await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 2 });
    await page.setContent(buildHtml(theme), { waitUntil: 'networkidle0' });
    const outPath = path.join(outDir, `powder-${dateArg}-${key}.png`);
    await page.screenshot({ path: outPath, type: 'png' });
    console.log(`→ ${outPath}`);
    await page.close();
  }

  await browser.close();
  db.close();
  console.log('Done! 3 themes generated.');
}

generate().catch(err => { console.error(err); process.exit(1); });
