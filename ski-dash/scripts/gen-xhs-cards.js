/**
 * 小红书 (Xiaohongshu) 3:4 card generator
 * Uses Chromium to render HTML → PNG with full emoji support
 * Usage: node scripts/gen-xhs-cards.js [date]
 * Example: node scripts/gen-xhs-cards.js 2026-02-17
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

// --- Data (hardcoded for now, TODO: pull from DB + scoring) ---
const tokyoResorts = [
  { nameJa:'富士天', name:'Fujiten', region:'山梨', score:69.6,
    newSnow:2, snowBase:0, tempMid:-2.8, windMid:10, weather:'🌨️ 小雪',
    driveTimeMin:90, trailCount:7, diffBeg:50, diffInt:35, diffAdv:15,
    reason:'💰 雪票5,500円还要啥自行车，冲！' },
  { nameJa:'丸沼高原', name:'Marunuma Kogen', region:'群马', score:63.3,
    newSnow:0, snowBase:0, tempMid:-5.8, windMid:10, weather:'☀️ 晴',
    driveTimeMin:150, trailCount:13, diffBeg:35, diffInt:40, diffAdv:25,
    reason:'📸 蓝天白雪的完美搭配，拍照绝绝子' },
  { nameJa:'川场', name:'Kawaba', region:'群马', score:62.3,
    newSnow:0, snowBase:0, tempMid:-5.7, windMid:10, weather:'☀️ 晴',
    driveTimeMin:150, trailCount:12, diffBeg:25, diffInt:45, diffAdv:30,
    reason:'🎯 12条雪道任你挑，从早滑到晚都不腻' },
];

const hokkaidoResorts = [
  { nameJa:'二世古安努普利', name:'Niseko Annupuri', region:'二世古', score:62.3,
    newSnow:1, snowBase:380, tempMid:-6, windMid:15, weather:'☁️ 多云',
    driveTimeMin:110, trailCount:13, diffBeg:23, diffInt:46, diffAdv:31,
    reason:'🎿 性价比之王，7,000円滑到爽' },
  { nameJa:'二世古Village', name:'Niseko Village', region:'二世古', score:61.3,
    newSnow:1, snowBase:380, tempMid:-6, windMid:15, weather:'☁️ 多云',
    driveTimeMin:115, trailCount:27, diffBeg:50, diffInt:23, diffAdv:27,
    reason:'🎯 27条雪道任你挑，从早滑到晚都不腻' },
  { nameJa:'二世古HANAZONO', name:'Niseko HANAZONO', region:'二世古', score:61.1,
    newSnow:1, snowBase:380, tempMid:-6, windMid:15, weather:'☁️ 多云',
    driveTimeMin:125, trailCount:12, diffBeg:30, diffInt:32, diffAdv:38,
    reason:'👑 全方位高分选手，闭眼选都不会错' },
];

function buildHTML(title, subtitle, resorts, driveLabel) {
  const cards = resorts.map((r, i) => {
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
          <span class="score">${r.score.toFixed(1)}</span><span class="score-suffix">/100</span>
        </div>
      </div>
      <div class="row2">
        <span class="en-name">${r.name}</span>
        <span class="diff">
          <span class="diff-label">雪道:</span>
          <span class="dot green"></span>${r.diffBeg}%
          <span class="dot red"></span>${r.diffInt}%
          <span class="dot black"></span>${r.diffAdv}%
        </span>
      </div>
      <div class="stats">
        <div class="stat-row">
          <span>🌨️ <strong>${r.newSnow}cm</strong> 新雪</span>
          <span>⛰️ <strong>${r.snowBase}cm</strong> 积雪</span>
        </div>
        <div class="stat-row">
          <span>🌡️ ${r.tempMid}°C ${r.weather}</span>
          <span>💨 ${r.windMid}km/h</span>
        </div>
        <div class="stat-row">
          <span>🚗 ${dh}h（${driveLabel}出发）</span>
          <span>🎿 ${r.trailCount}条雪道</span>
        </div>
      </div>
      <div class="reason">${r.reason}</div>
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

async function renderCard(browser, outPath, title, subtitle, resorts, driveLabel) {
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 2 });
  const html = buildHTML(title, subtitle, resorts, driveLabel);
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: outPath, clip: { x:0, y:0, width:900, height:1200 } });
  await page.close();
  console.log('  → ' + outPath);
}

async function main() {
  const dateStr = process.argv[2] || '2026-02-17';
  const [y, m, d] = dateStr.split('-');
  // Use date parts directly to avoid timezone issues
  const cnWeekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
  const dayOfWeek = new Date(Date.UTC(+y, +m - 1, +d)).getUTCDay();
  const subtitle = `${y}.${m}.${d} ${cnWeekdays[dayOfWeek]}`;

  const outDir = path.join(__dirname, '..', 'public', 'cards');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu','--disable-dev-shm-usage'],
    headless: 'new',
  });

  await renderCard(browser,
    path.join(outDir, `tokyo-${dateStr}.png`),
    '东京周边滑雪场情报', subtitle, tokyoResorts, '东京');

  await renderCard(browser,
    path.join(outDir, `hokkaido-${dateStr}.png`),
    '北海道滑雪场情报', subtitle, hokkaidoResorts, '新千岁');

  await browser.close();
  console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); });
