/**
 * Generate Xiaohongshu (小红书) style images from ski dashboard data
 * 3:4 ratio, dark theme, multiple slides
 * Usage: npx tsx scripts/gen-xhs-images.ts [date]
 */

const date = process.argv[2] || new Date().toISOString().split('T')[0];

interface ResortData {
  resortId: string;
  totalScore: number;
  freshSnowScore: number;
  weatherScore: number;
  powderDay: boolean;
  rainWarning: boolean;
  windWarning: boolean;
  forecast: {
    newSnowCm: number;
    snowBaseCm: number;
    tempMidC: number;
    windSpeedMid: number;
    weatherCondition: string;
  } | null;
  resort: {
    nameJa: string;
    name: string;
    region: string;
    driveTimeMin: number;
    liftPassPrice: number;
    hasNightSkiing: boolean;
    elevationTop: number;
  };
}

const weatherEmoji: Record<string, string> = {
  'clear': '☀️', 'cloud': '☁️', 'light-snow': '🌨️',
  'heavy-snow': '❄️', 'rain': '🌧️', 'mixed': '🌧️❄️', 'unknown': '❓'
};

const weatherText: Record<string, string> = {
  'clear': '晴', 'cloud': '多云', 'light-snow': '小雪',
  'heavy-snow': '大雪', 'rain': '雨', 'mixed': '雨雪', 'unknown': '-'
};

function scoreColor(score: number): string {
  if (score >= 70) return '#22d3ee'; // cyan
  if (score >= 55) return '#facc15'; // yellow
  return '#94a3b8'; // gray
}

function parseDateJST(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  // Calculate day of week from date parts directly (no timezone issues)
  const dt = new Date(y, m - 1, d);
  return { year: y, month: m, day: d, weekday: weekdays[dt.getDay()] };
}

// Resort character traits (from real reviews + features)
const resortTraits: Record<string, string[]> = {
  'gala-yuzawa': ['新干线直达超方便', '初中级雪道多适合休闲', '东京出发最省心'],
  'naeba': ['日本最长缆车龙之龙', '雪道种类丰富老少皆宜', '大型度假村吃喝不愁'],
  'kagura': ['粉雪圣地海拔高雪质好', '雪季超长能滑到5月', '野雪区域天堂'],
  'kandatsu-kogen': ['夜场气氛绝了', '地形公园玩家聚集地', '离汤泽站近交通便利'],
  'ishiuchi-maruyama': ['雪道超宽初学者友好', '夜场开到很晚', '山顶咖啡厅景色绝美'],
  'maiko': ['带娃首选亲子设施全', '住滑一体超轻松', '雪道宽适合练技术'],
  'happo-one': ['白马最经典地形丰富', '奥运级别的雪场', '高手必打卡的传奇雪场'],
  'hakuba-goryu': ['初中级雪道比例高', '和Hakuba47互通超大', '白马性价比之选'],
  'hakuba-47': ['地形公园日本顶级', '单板玩家的天堂', '树林野雪也很爽'],
  'yokoteyama': ['日本海拔最高雪场之一', '雪质粉到飞起', '山顶能看到绝美云海'],
  'okushiga-kogen': ['人少安静滑起来舒服', '雪质稳定少人为干扰', '适合享受纯粹滑雪'],
  'shiga-kogen-ichinose': ['志贺高原核心区域', '连接多个雪场滑不完', '标高高雪质有保障'],
  'nozawa-onsen': ['滑完泡温泉绝配', '古朴温泉街超有氛围', '雪道落差大刺激过瘾'],
  'kusatsu-onsen': ['草津温泉天下第一', '滑雪+温泉完美周末', '雪道不长但体验独特'],
  'marunuma-kogen': ['雪质好海拔高', '雪道设计流畅', '人不多体验舒适'],
  'kawaba': ['东京出发性价比高', '雪道设计有趣', '设施新颖现代感强'],
  'tanigawadake-tenjindaira': ['天神平粉雪传说', '野雪爱好者圣地', '缆车直达山顶省体力'],
  'hodaigi': ['树林雪道超好玩', '人少雪好隐藏宝藏', '适合中级进阶练习'],
  'tsumagoi': ['宽阔雪道适合飙速度', '人少不用排队', '安静享受滑雪乐趣'],
  'sugadaira-kogen': ['初学者天堂坡度温柔', '菅平牛肉超好吃', '团体合宿首选'],
  'karuizawa': ['购物滑雪两不误', '人工造雪稳定营业', '约会滑雪好去处'],
  'fujiten': ['离东京最近的雪场', '1.5h就能到', '适合说走就走的半日滑'],
};

function generateRecommendReason(r: ResortData): string {
  const f = r.forecast;
  const traits = resortTraits[r.resortId] || ['综合评分高', '值得一去'];
  
  const parts: string[] = [];
  
  // Weather-based dynamic reasons
  if (f) {
    if (f.newSnowCm >= 10) parts.push(`今天狂下${f.newSnowCm}cm新雪，粉雪猎人冲！`);
    else if (f.newSnowCm >= 3) parts.push(`有${f.newSnowCm}cm新雪加持`);
    
    if (f.tempMidC >= -3 && f.tempMidC <= 2) parts.push('温度刚好不冻手');
    else if (f.tempMidC > 2) parts.push('今天暖和不受罪');
    
    if (f.windSpeedMid <= 10) parts.push('风小体感舒适');
    
    if (f.weatherCondition === 'clear') parts.push('大晴天视野绝佳');
  }
  
  if (r.resort.driveTimeMin <= 120) parts.push('东京出发2h内搞定');
  if (r.resort.hasNightSkiing) parts.push('有夜场可以滑到嗨');
  // Pick 1 dynamic + 1 static trait, keep it short
  const dynamic = parts.length > 0 ? parts[0] : '';
  const staticTrait = traits[Math.floor(Math.random() * traits.length)];
  
  if (dynamic) return `${dynamic}！${staticTrait} 🔥`;
  return `${staticTrait} 🔥`;
}

function generateCoverHTML(resorts: ResortData[], date: string): string {
  const { month, day, weekday } = parseDateJST(date);
  const top3 = resorts.slice(0, 3);
  const medals = ['🥇', '🥈', '🥉'];
  
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700;900&family=Orbitron:wght@700;800;900&display=swap" rel="stylesheet">
    <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { width:1080px; height:1440px; background: linear-gradient(180deg, #0a0a1a 0%, #0f1629 40%, #0a0a1a 100%); color:#e2e8f0; font-family: 'Noto Sans SC', -apple-system, sans-serif; padding:60px; display:flex; flex-direction:column; }
    .header { text-align:center; margin-bottom:50px; }
    .header h1 { font-size:48px; font-weight:900; font-family: 'Noto Sans SC', sans-serif; background: linear-gradient(135deg, #22d3ee, #6366f1); -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin-bottom:16px; }
    .header .date-big { font-size:52px; font-weight:900; color:#fff; margin-bottom:12px; letter-spacing:2px; font-family: 'Noto Sans SC', sans-serif; }
    .header .date-big .weekday { color:#22d3ee; }
    .header .sub { font-size:22px; color:#64748b; margin-top:8px; }
    .top-list { flex:1; display:flex; flex-direction:column; gap:28px; }
    .top-card { background: rgba(255,255,255,0.04); border-radius:24px; padding:36px 40px; border: 1px solid rgba(255,255,255,0.08); position:relative; overflow:hidden; }
    .top-card.gold { border-color: rgba(255,215,0,0.35); box-shadow: 0 0 40px rgba(255,215,0,0.08); }
    .top-card.silver { border-color: rgba(148,163,184,0.3); }
    .top-card.bronze { border-color: rgba(205,127,50,0.25); }
    .top-card .rank-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
    .top-card .medal { font-size:40px; }
    .top-card .score { font-size:36px; font-weight:900; font-family: 'Noto Sans SC', sans-serif; color:#22d3ee; }
    .top-card .name { font-size:36px; font-weight:700; color:#fff; margin-bottom:4px; }
    .top-card .name-en { font-size:18px; color:#64748b; margin-bottom:16px; }
    .top-card .stats { display:flex; gap:24px; flex-wrap:wrap; font-size:22px; color:#94a3b8; }
    .top-card .stats .val { color:#e2e8f0; font-weight:600; margin-right:4px; }
    .top-card .reason { font-size:24px; color:#a5b4fc; margin-top:14px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.06); line-height:1.5; }
    .footer { text-align:center; margin-top:40px; padding-top:20px; border-top:1px solid rgba(255,255,255,0.06); }
    .footer .brand { font-size:20px; color:#475569; }
    .tag { display:inline-block; font-size:16px; padding:4px 12px; border-radius:8px; margin-left:8px; }
    .tag.powder { background:rgba(34,211,238,0.15); color:#22d3ee; border:1px solid rgba(34,211,238,0.3); }
    .tag.snow { background:rgba(99,102,241,0.15); color:#818cf8; border:1px solid rgba(99,102,241,0.3); }
  </style></head><body>
    <div class="header">
      <h1>东京周边滑雪场当日雪况</h1>
      <div class="date-big">${month}月${day}日 <span class="weekday">星期${weekday}</span></div>
      <div class="sub">综合评分 TOP 3 推荐</div>
    </div>
    <div class="top-list">
      ${top3.map((r, i) => {
        const f = r.forecast;
        const cls = ['gold','silver','bronze'][i];
        return `<div class="top-card ${cls}">
          <div class="rank-row">
            <span class="medal">${medals[i]}</span>
            <span class="score">${Math.round(r.totalScore)}分</span>
          </div>
          <div class="name">${r.resort.nameJa}${r.powderDay ? '<span class="tag powder">🎿 Powder</span>' : ''}${(f?.newSnowCm||0)>0 ? '<span class="tag snow">🌨️ 新雪</span>' : ''}</div>
          <div class="name-en">${r.resort.name} · ${r.resort.region}</div>
          <div class="stats">
            <span>${weatherEmoji[f?.weatherCondition||'unknown']} <span class="val">${weatherText[f?.weatherCondition||'unknown']}</span></span>
            <span>🌨️ <span class="val">${f?.newSnowCm||0}cm</span>新雪</span>
            <span>🌡️ <span class="val">${f?.tempMidC||0}°C</span></span>
            <span>💨 <span class="val">${f?.windSpeedMid||0}km/h</span></span>
            <span>🚗 <span class="val">${(r.resort.driveTimeMin/60).toFixed(1)}h</span>東京</span>
            <span>💴 <span class="val">¥${r.resort.liftPassPrice.toLocaleString()}</span></span>
          </div>
          <div class="reason">💬 ${generateRecommendReason(r)}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="footer"><span class="brand">YukiMiru · Snow-Forecast データ</span></div>
  </body></html>`;
}

function generateRankingHTML(resorts: ResortData[], date: string, page: number): string {
  const { month, day, weekday } = parseDateJST(date);
  const dateStr = `${month}月${day}日(${weekday})`;
  const perPage = 11;
  const start = page * perPage;
  const slice = resorts.slice(start, start + perPage);
  
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700;900&family=Orbitron:wght@700;800;900&display=swap" rel="stylesheet">
    <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { width:1080px; height:1440px; background: linear-gradient(180deg, #0a0a1a 0%, #0f1629 50%, #0a0a1a 100%); color:#e2e8f0; font-family: 'Noto Sans SC', -apple-system, sans-serif; padding:50px; display:flex; flex-direction:column; }
    .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; padding-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.08); }
    .header h2 { font-size:30px; font-weight:700; background: linear-gradient(135deg, #22d3ee, #6366f1); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .header .date { font-size:28px; color:#fff; font-weight:800; }
    .header .page { font-size:18px; color:#64748b; margin-top:4px; }
    .table { flex:1; }
    .table-header { display:flex; align-items:center; padding:10px 20px; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1); }
    .table-header span { font-size:20px; color:#64748b; font-weight:600; letter-spacing:1px; }
    .th-rank { width:50px; }
    .th-name { flex:1; min-width:200px; }
    .th-score { width:70px; text-align:center; flex-shrink:0; }
    .th-data { display:flex; font-size:20px; justify-content:space-between; }
    .row { display:flex; align-items:center; padding:14px 20px; border-radius:16px; margin-bottom:5px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); }
    .row:nth-child(odd) { background:rgba(255,255,255,0.035); }
    .rank { width:50px; font-size:24px; font-weight:700; color:#64748b; }
    .rank.top3 { color:#22d3ee; }
    .name-col { flex:1; min-width:200px; }
    .name-col .ja { font-size:22px; font-weight:600; color:#fff; }
    .name-col .region { font-size:15px; color:#64748b; }
    .score-col { width:70px; text-align:center; font-size:26px; font-weight:900; font-family:'Noto Sans SC',sans-serif; color:#22d3ee; flex-shrink:0; }
    .data-col { display:flex; font-size:17px; color:#94a3b8; align-items:center; justify-content:space-between; }
    .data-col span { display:inline-block; text-align:center; white-space:nowrap; }
    .data-col .c-weather { width:44px; font-size:22px; }
    .data-col .c-snow { width:68px; }
    .data-col .c-temp { width:68px; }
    .data-col .c-wind { width:52px; }
    .data-col .c-price { width:68px; }
    .data-col .val { color:#cbd5e1; font-weight:600; }
    .night { color:#a78bfa; font-size:16px; }
    .footer { text-align:center; margin-top:16px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.06); }
    .footer .brand { font-size:18px; color:#475569; }
  </style></head><body>
    <div class="header">
      <div>
        <h2>🎿 东京周边滑雪场当日雪况</h2>
        <div class="page">全部排名 ${page+1}/2</div>
      </div>
      <div class="date">${month}/${day} 星期${weekday}</div>
    </div>
    <div class="table">
      <div class="table-header">
        <span class="th-rank">#</span>
        <span class="th-name">滑雪场</span>
        <span class="th-score">评分</span>
        <span class="th-data">
          <span style="width:44px;text-align:center">天气</span>
          <span style="width:68px;text-align:center">新雪</span>
          <span style="width:68px;text-align:center">温度</span>
          <span style="width:52px;text-align:center">风速</span>
          <span style="width:68px;text-align:center">票价</span>
        </span>
      </div>
      ${slice.map((r, i) => {
        const idx = start + i + 1;
        const f = r.forecast;
        return `<div class="row">
          <div class="rank ${idx<=3?'top3':''}">${idx}</div>
          <div class="name-col">
            <div class="ja">${r.resort.nameJa} ${r.resort.hasNightSkiing?'<span class="night">🌙</span>':''}</div>
            <div class="region">${r.resort.region} · 🚗${(r.resort.driveTimeMin/60).toFixed(1)}h</div>
          </div>
          <div class="score-col">${Math.round(r.totalScore)}</div>
          <div class="data-col">
            <span class="c-weather">${weatherEmoji[f?.weatherCondition||'unknown']}</span>
            <span class="c-snow">🌨️<span class="val">${f?.newSnowCm||0}</span>cm</span>
            <span class="c-temp">🌡️<span class="val">${f?.tempMidC||0}°C</span></span>
            <span class="c-wind">💨<span class="val">${f?.windSpeedMid||0}</span></span>
            <span class="c-price">💴<span class="val">¥${(r.resort.liftPassPrice/1000).toFixed(1)}k</span></span>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div class="footer">
      <div style="display:flex;gap:24px;justify-content:center;margin-bottom:10px;font-size:16px;color:#94a3b8;">
        <span>🌙 有夜场</span>
        <span>🚗 从东京驾车出发时长</span>
      </div>
      <span class="brand">YukiMiru · Snow-Forecast データ · ${dateStr}</span>
    </div>
  </body></html>`;
}

async function main() {
  // Fetch data
  const res = await fetch(`http://127.0.0.1:3088/api/resorts?date=${date}`);
  const data = await res.json();
  const resorts: ResortData[] = data.resorts;

  console.log(`Generating images for ${date}, ${resorts.length} resorts`);

  // Write HTML files
  const fs = await import('fs');
  const path = await import('path');
  const outDir = path.join(process.cwd(), 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const pages = [
    { name: 'cover', html: generateCoverHTML(resorts, date) },
    { name: 'ranking-1', html: generateRankingHTML(resorts, date, 0) },
    { name: 'ranking-2', html: generateRankingHTML(resorts, date, 1) },
  ];

  for (const p of pages) {
    const htmlPath = path.join(outDir, `${date}-${p.name}.html`);
    fs.writeFileSync(htmlPath, p.html);
    console.log(`  Written: ${htmlPath}`);
  }

  // Screenshot with Playwright
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ args: ['--no-sandbox'] });
    
    for (const p of pages) {
      const htmlPath = path.join(outDir, `${date}-${p.name}.html`);
      const pngPath = path.join(outDir, `${date}-${p.name}.png`);
      const page = await browser.newPage({ viewport: { width: 1080, height: 1440 } });
      await page.goto(`file://${htmlPath}`);
      await page.waitForTimeout(500);
      await page.screenshot({ path: pngPath, type: 'png' });
      await page.close();
      console.log(`  Screenshot: ${pngPath}`);
    }
    
    await browser.close();
    console.log('\nDone! Images saved to output/');
  } catch (e) {
    console.error('Playwright screenshot failed:', e);
    console.log('HTML files are still available in output/');
  }
}

main().catch(console.error);
