/**
 * Generate full ranking list pages (pages 2 & 3) for Xiaohongshu cards
 * Compact row style matching page 1 design
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

// Full rankings from scoring (ranks 4+ for page 2/3)
const tokyoAll = [
  { rank:1, nameJa:'富士天', name:'Fujiten', region:'山梨', score:69.6, newSnow:2, snowBase:0, tempMid:-2.8, windMid:10, weather:'🌨️', driveTimeMin:90, trailCount:7, night:true, diffBeg:50, diffInt:35, diffAdv:15 },
  { rank:2, nameJa:'丸沼高原', name:'Marunuma Kogen', region:'群马', score:63.3, newSnow:0, snowBase:0, tempMid:-5.8, windMid:10, weather:'☀️', driveTimeMin:150, trailCount:13, night:false, diffBeg:35, diffInt:40, diffAdv:25 },
  { rank:3, nameJa:'川场', name:'Kawaba', region:'群马', score:62.3, newSnow:0, snowBase:0, tempMid:-5.7, windMid:10, weather:'☀️', driveTimeMin:150, trailCount:12, night:false, diffBeg:25, diffInt:45, diffAdv:30 },
  { rank:4, nameJa:'菅平高原', name:'Sugadaira Kogen', region:'长野北部', score:61.1, newSnow:0, snowBase:0, tempMid:-4.2, windMid:10, weather:'☁️', driveTimeMin:150, trailCount:36, night:true, diffBeg:40, diffInt:40, diffAdv:20 },
  { rank:5, nameJa:'GALA汤泽', name:'GALA Yuzawa', region:'汤泽', score:60.3, newSnow:0, snowBase:0, tempMid:-3.2, windMid:10, weather:'🌨️', driveTimeMin:120, trailCount:16, night:false, diffBeg:35, diffInt:40, diffAdv:25 },
  { rank:6, nameJa:'野泽温泉', name:'Nozawa Onsen', region:'长野北部', score:59.8, newSnow:0, snowBase:255, tempMid:-3.8, windMid:10, weather:'☁️', driveTimeMin:180, trailCount:36, night:true, diffBeg:30, diffInt:40, diffAdv:30 },
  { rank:7, nameJa:'苗场', name:'Naeba', region:'汤泽', score:58.5, newSnow:0, snowBase:250, tempMid:-4.5, windMid:15, weather:'🌨️', driveTimeMin:150, trailCount:24, night:true, diffBeg:30, diffInt:40, diffAdv:30 },
  { rank:8, nameJa:'舞子', name:'Maiko', region:'汤泽', score:57.2, newSnow:0, snowBase:0, tempMid:-0.7, windMid:10, weather:'☁️', driveTimeMin:120, trailCount:26, night:true, diffBeg:40, diffInt:40, diffAdv:20 },
  { rank:9, nameJa:'石打丸山', name:'Ishiuchi Maruyama', region:'汤泽', score:56.8, newSnow:0, snowBase:0, tempMid:-0.7, windMid:10, weather:'☁️', driveTimeMin:120, trailCount:23, night:true, diffBeg:40, diffInt:40, diffAdv:20 },
  { rank:10, nameJa:'神立高原', name:'Kandatsu Kogen', region:'汤泽', score:55.5, newSnow:0, snowBase:0, tempMid:-1, windMid:10, weather:'☁️', driveTimeMin:120, trailCount:15, night:true, diffBeg:30, diffInt:40, diffAdv:30 },
  { rank:11, nameJa:'宝台树', name:'Hodaigi', region:'群马', score:54.3, newSnow:0, snowBase:0, tempMid:-2.8, windMid:10, weather:'☀️', driveTimeMin:150, trailCount:16, night:false, diffBeg:40, diffInt:40, diffAdv:20 },
  { rank:12, nameJa:'白马八方尾根', name:'Hakuba Happo-One', region:'白马', score:53.4, newSnow:0, snowBase:315, tempMid:-3.7, windMid:5, weather:'☀️', driveTimeMin:210, trailCount:13, night:true, diffBeg:30, diffInt:30, diffAdv:40 },
  { rank:13, nameJa:'神乐', name:'Kagura', region:'汤泽', score:52.3, newSnow:0, snowBase:0, tempMid:-5.3, windMid:15, weather:'☁️', driveTimeMin:150, trailCount:23, night:false, diffBeg:30, diffInt:40, diffAdv:30 },
  { rank:14, nameJa:'轻井泽王子', name:'Karuizawa Prince', region:'长野南部', score:50.3, newSnow:0, snowBase:0, tempMid:-1.3, windMid:5, weather:'🌨️', driveTimeMin:120, trailCount:10, night:true, diffBeg:50, diffInt:30, diffAdv:20 },
  { rank:15, nameJa:'谷川岳天神平', name:'Tanigawadake Tenjindaira', region:'群马', score:48.8, newSnow:0, snowBase:0, tempMid:-3.2, windMid:10, weather:'☀️', driveTimeMin:150, trailCount:7, night:false, diffBeg:30, diffInt:30, diffAdv:40 },
  { rank:16, nameJa:'白马五龙', name:'Hakuba Goryu', region:'白马', score:47.5, newSnow:0, snowBase:0, tempMid:-3.7, windMid:5, weather:'☀️', driveTimeMin:210, trailCount:15, night:true, diffBeg:35, diffInt:40, diffAdv:25 },
  { rank:17, nameJa:'嬬恋', name:'Tsumagoi', region:'群马', score:46.5, newSnow:0, snowBase:0, tempMid:-6.2, windMid:10, weather:'🌨️', driveTimeMin:180, trailCount:11, night:false, diffBeg:30, diffInt:40, diffAdv:30 },
  { rank:18, nameJa:'草津温泉', name:'Kusatsu Onsen', region:'群马', score:45.8, newSnow:0, snowBase:0, tempMid:-6.2, windMid:10, weather:'🌨️', driveTimeMin:180, trailCount:9, night:true, diffBeg:35, diffInt:35, diffAdv:30 },
  { rank:19, nameJa:'奥志贺高原', name:'Okushiga Kogen', region:'志贺高原', score:44.3, newSnow:0, snowBase:0, tempMid:-6.5, windMid:10, weather:'🌨️', driveTimeMin:180, trailCount:9, night:false, diffBeg:25, diffInt:45, diffAdv:30 },
  { rank:20, nameJa:'志贺高原·横手山', name:'Shiga Kogen Yokoteyama', region:'志贺高原', score:43.3, newSnow:0, snowBase:0, tempMid:-7.7, windMid:15, weather:'🌨️', driveTimeMin:180, trailCount:5, night:false, diffBeg:30, diffInt:40, diffAdv:30 },
  { rank:21, nameJa:'志贺高原·一之濑', name:'Shiga Kogen Ichinose', region:'志贺高原', score:42.8, newSnow:0, snowBase:0, tempMid:-6.8, windMid:10, weather:'🌨️', driveTimeMin:180, trailCount:10, night:true, diffBeg:35, diffInt:40, diffAdv:25 },
  { rank:22, nameJa:'白马47', name:'Hakuba 47', region:'白马', score:41.3, newSnow:0, snowBase:0, tempMid:-3.3, windMid:5, weather:'☀️', driveTimeMin:210, trailCount:8, night:false, diffBeg:20, diffInt:40, diffAdv:40 },
];

const hokkaidoAll = [
  { rank:1, nameJa:'二世古安努普利', name:'Niseko Annupuri', region:'二世古', score:62.3, newSnow:1, snowBase:380, tempMid:-6, windMid:15, weather:'☁️', driveTimeMin:110, trailCount:13, night:true, diffBeg:23, diffInt:46, diffAdv:31 },
  { rank:2, nameJa:'二世古Village', name:'Niseko Village', region:'二世古', score:61.3, newSnow:1, snowBase:380, tempMid:-6, windMid:15, weather:'☁️', driveTimeMin:115, trailCount:27, night:true, diffBeg:50, diffInt:23, diffAdv:27 },
  { rank:3, nameJa:'二世古HANAZONO', name:'Niseko HANAZONO', region:'二世古', score:61.1, newSnow:1, snowBase:380, tempMid:-6, windMid:15, weather:'☁️', driveTimeMin:125, trailCount:12, night:true, diffBeg:30, diffInt:32, diffAdv:38 },
  { rank:4, nameJa:'二世古Grand Hirafu', name:'Niseko Grand Hirafu', region:'二世古', score:60.1, newSnow:1, snowBase:380, tempMid:-6, windMid:15, weather:'☁️', driveTimeMin:120, trailCount:30, night:true, diffBeg:30, diffInt:40, diffAdv:30 },
  { rank:5, nameJa:'留寿都度假村', name:'Rusutsu Resort', region:'留寿都', score:57.5, newSnow:1, snowBase:260, tempMid:-6.5, windMid:20, weather:'☁️', driveTimeMin:90, trailCount:37, night:true, diffBeg:30, diffInt:40, diffAdv:30 },
  { rank:6, nameJa:'富良野滑雪场', name:'Furano Ski Resort', region:'富良野', score:53.9, newSnow:0, snowBase:230, tempMid:-7.3, windMid:20, weather:'☁️', driveTimeMin:150, trailCount:28, night:true, diffBeg:41, diffInt:37, diffAdv:22 },
  { rank:7, nameJa:'神居滑雪场', name:'Kamui Ski Links', region:'旭川', score:51.7, newSnow:0, snowBase:165, tempMid:-6.2, windMid:15, weather:'☁️', driveTimeMin:150, trailCount:25, night:false, diffBeg:40, diffInt:30, diffAdv:30 },
  { rank:8, nameJa:'星野TOMAMU', name:'Hoshino Tomamu', region:'占冠', score:50.9, newSnow:0, snowBase:178, tempMid:-8.3, windMid:25, weather:'☁️', driveTimeMin:90, trailCount:29, night:true, diffBeg:35, diffInt:40, diffAdv:25 },
  { rank:9, nameJa:'佐幌度假村', name:'Sahoro Resort', region:'十胜', score:46.1, newSnow:0, snowBase:130, tempMid:-7.5, windMid:20, weather:'☁️', driveTimeMin:120, trailCount:21, night:true, diffBeg:38, diffInt:14, diffAdv:48 },
  { rank:10, nameJa:'小樽天狗山', name:'Otaru Tenguyama', region:'小樽', score:45.0, newSnow:0, snowBase:0, tempMid:-2.8, windMid:15, weather:'🌨️', driveTimeMin:70, trailCount:6, night:true, diffBeg:34, diffInt:33, diffAdv:33 },
  { rank:11, nameJa:'Mount Racey', name:'Mount Racey', region:'夕张', score:44.0, newSnow:0, snowBase:0, tempMid:-6.3, windMid:20, weather:'🌨️', driveTimeMin:60, trailCount:18, night:false, diffBeg:30, diffInt:40, diffAdv:30 },
  { rank:12, nameJa:'Snow Cruise ONZE', name:'Snow Cruise ONZE', region:'小樽', score:43.8, newSnow:0, snowBase:0, tempMid:-2.8, windMid:15, weather:'🌨️', driveTimeMin:40, trailCount:8, night:true, diffBeg:50, diffInt:30, diffAdv:20 },
  { rank:13, nameJa:'盘溪', name:'Bankei', region:'札幌', score:43.0, newSnow:0, snowBase:0, tempMid:-3.8, windMid:10, weather:'☁️', driveTimeMin:55, trailCount:17, night:true, diffBeg:40, diffInt:40, diffAdv:20 },
  { rank:14, nameJa:'中山峠滑雪场', name:'Nakayama Toge', region:'札幌', score:42.8, newSnow:0, snowBase:0, tempMid:-6.3, windMid:20, weather:'🌨️', driveTimeMin:60, trailCount:4, night:false, diffBeg:20, diffInt:60, diffAdv:20 },
  { rank:15, nameJa:'札幌国际滑雪场', name:'Sapporo Kokusai', region:'札幌', score:42.0, newSnow:0, snowBase:0, tempMid:-6.3, windMid:20, weather:'🌨️', driveTimeMin:80, trailCount:7, night:false, diffBeg:28, diffInt:43, diffAdv:29 },
  { rank:16, nameJa:'朝里川温泉', name:'Asarigawa Onsen', region:'小樽', score:41.3, newSnow:0, snowBase:0, tempMid:-2.5, windMid:15, weather:'🌨️', driveTimeMin:60, trailCount:9, night:true, diffBeg:22, diffInt:33, diffAdv:45 },
  { rank:17, nameJa:'喜乐乐度假村', name:'Kiroro Resort', region:'余市', score:40.0, newSnow:0, snowBase:0, tempMid:-7, windMid:20, weather:'🌨️', driveTimeMin:80, trailCount:23, night:true, diffBeg:36, diffInt:28, diffAdv:36 },
  { rank:18, nameJa:'札幌手稻', name:'Sapporo Teine', region:'札幌', score:39.5, newSnow:0, snowBase:0, tempMid:-5.5, windMid:15, weather:'🌨️', driveTimeMin:50, trailCount:15, night:true, diffBeg:46, diffInt:27, diffAdv:27 },
  { rank:19, nameJa:'旭岳', name:'Asahidake', region:'旭川', score:38.0, newSnow:0, snowBase:0, tempMid:-10.7, windMid:25, weather:'☁️', driveTimeMin:180, trailCount:3, night:false, diffBeg:0, diffInt:30, diffAdv:70 },
  { rank:20, nameJa:'二世古MOIWA', name:'Niseko Moiwa', region:'二世古', score:35.0, newSnow:1, snowBase:0, tempMid:-4.8, windMid:15, weather:'🌨️', driveTimeMin:115, trailCount:8, night:false, diffBeg:30, diffInt:40, diffAdv:30 },
];

function buildListHTML(title, subtitle, pageLabel, resorts, driveLabel) {
  const rows = resorts.map(r => {
    const dh = (r.driveTimeMin / 60).toFixed(1);
    return `
    <div class="row">
      <span class="rank">${r.rank}</span>
      <div class="info">
        <div class="top-line">
          <span class="name">${r.nameJa}</span>
          <span class="en-name">${r.name}</span>
          <span class="pill">${r.region}</span>
        </div>
        <div class="stats-line">
          <span class="st">${r.weather}</span>
          <span class="st"><strong>${r.newSnow}cm</strong>新雪</span>
          <span class="st">${r.snowBase}cm积雪</span>
          <span class="st">${r.tempMid}°C</span>
          <span class="st">💨${r.windMid}</span>
          <span class="st">🚗${dh}h</span>
          <span class="st">${r.trailCount}道</span>
          <span class="st diff">雪道 <span class="dg"></span>${r.diffBeg}%<span class="dr"></span>${r.diffInt}%<span class="db"></span>${r.diffAdv}%</span>
          ${r.night ? '<span class="st night">🌙夜场</span>' : '<span class="st"></span>'}
        </div>
      </div>
      <div class="score-block">
        <span class="score">${r.score.toFixed(1)}</span><span class="score-suffix">/100</span>
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

async function renderPage(browser, outPath, html) {
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: outPath, clip: { x:0, y:0, width:900, height:1200 } });
  await page.close();
  console.log('  → ' + outPath);
}

async function main() {
  const outDir = path.join(__dirname, '..', 'public', 'cards');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu','--disable-dev-shm-usage'],
    headless: 'new',
  });

  // Tokyo: 22 resorts. Page 2 = ranks 4-13, Page 3 = ranks 14-22
  const tokyoP2 = tokyoAll.slice(3, 13);  // ranks 4-13
  const tokyoP3 = tokyoAll.slice(13);      // ranks 14-22

  await renderPage(browser,
    path.join(outDir, 'tokyo-2026-02-17-p2.png'),
    buildListHTML('东京周边滑雪场情报', '2026.02.17 星期二', '全部排名 4-13位', tokyoP2, '东京'));

  await renderPage(browser,
    path.join(outDir, 'tokyo-2026-02-17-p3.png'),
    buildListHTML('东京周边滑雪场情报', '2026.02.17 星期二', '全部排名 14-22位', tokyoP3, '东京'));

  // Hokkaido: 20 resorts. Page 2 = ranks 4-13, Page 3 = ranks 14-20
  const hokP2 = hokkaidoAll.slice(3, 13);
  const hokP3 = hokkaidoAll.slice(13);

  await renderPage(browser,
    path.join(outDir, 'hokkaido-2026-02-17-p2.png'),
    buildListHTML('北海道滑雪场情报', '2026.02.17 星期二', '全部排名 4-13位', hokP2, '新千岁'));

  await renderPage(browser,
    path.join(outDir, 'hokkaido-2026-02-17-p3.png'),
    buildListHTML('北海道滑雪场情报', '2026.02.17 星期二', '全部排名 14-20位', hokP3, '新千岁'));

  await browser.close();
  console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); });
