/**
 * Auto-generate Xiaohongshu cards from DB data
 * Reads daily_forecasts from SQLite, scores resorts, generates PNG cards
 * Usage: node scripts/gen-xhs-auto.js [YYYY-MM-DD]
 */
const puppeteer = require('puppeteer-core');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'ski-dash.db');
const OUT_DIR = path.join(__dirname, '..', 'public', 'cards');

// ============================================================
// Resort static data (from src/data/resorts.ts)
// ============================================================
const RESORTS = [
  // Tokyo
  { id:'gala-yuzawa', name:'GALA Yuzawa', nameJa:'GALA汤泽', region:'汤泽', area:'tokyo', driveTimeMin:120, driveDistanceKm:200, liftPassPrice:7300, hasNightSkiing:false, hasDirectBus:false, trailCount:16, diffBeg:35, diffInt:40, diffAdv:25 },
  { id:'naeba', name:'Naeba', nameJa:'苗场', region:'汤泽', area:'tokyo', driveTimeMin:150, driveDistanceKm:220, liftPassPrice:7800, hasNightSkiing:true, hasDirectBus:false, trailCount:24, diffBeg:30, diffInt:40, diffAdv:30 },
  { id:'kagura', name:'Kagura', nameJa:'神乐', region:'汤泽', area:'tokyo', driveTimeMin:150, driveDistanceKm:215, liftPassPrice:7500, hasNightSkiing:false, hasDirectBus:false, trailCount:23, diffBeg:30, diffInt:40, diffAdv:30 },
  { id:'kandatsu-kogen', name:'Kandatsu Kogen', nameJa:'神立高原', region:'汤泽', area:'tokyo', driveTimeMin:120, driveDistanceKm:195, liftPassPrice:6500, hasNightSkiing:true, hasDirectBus:false, trailCount:15, diffBeg:30, diffInt:40, diffAdv:30 },
  { id:'ishiuchi-maruyama', name:'Ishiuchi Maruyama', nameJa:'石打丸山', region:'汤泽', area:'tokyo', driveTimeMin:120, driveDistanceKm:190, liftPassPrice:7900, hasNightSkiing:true, hasDirectBus:false, trailCount:23, diffBeg:40, diffInt:40, diffAdv:20 },
  { id:'maiko', name:'Maiko', nameJa:'舞子', region:'汤泽', area:'tokyo', driveTimeMin:120, driveDistanceKm:190, liftPassPrice:7000, hasNightSkiing:true, hasDirectBus:false, trailCount:26, diffBeg:40, diffInt:40, diffAdv:20 },
  { id:'happo-one', name:'Hakuba Happo-One', nameJa:'白马八方尾根', region:'白马', area:'tokyo', driveTimeMin:210, driveDistanceKm:300, liftPassPrice:8700, hasNightSkiing:true, hasDirectBus:false, trailCount:13, diffBeg:30, diffInt:30, diffAdv:40 },
  { id:'hakuba-goryu', name:'Hakuba Goryu', nameJa:'白马五龙', region:'白马', area:'tokyo', driveTimeMin:210, driveDistanceKm:295, liftPassPrice:9500, hasNightSkiing:true, hasDirectBus:false, trailCount:15, diffBeg:35, diffInt:40, diffAdv:25 },
  { id:'hakuba-47', name:'Hakuba 47', nameJa:'白马47', region:'白马', area:'tokyo', driveTimeMin:210, driveDistanceKm:295, liftPassPrice:9500, hasNightSkiing:false, hasDirectBus:false, trailCount:8, diffBeg:20, diffInt:40, diffAdv:40 },
  { id:'yokoteyama', name:'Shiga Kogen Yokoteyama', nameJa:'志贺高原·横手山', region:'志贺高原', area:'tokyo', driveTimeMin:180, driveDistanceKm:260, liftPassPrice:6500, hasNightSkiing:false, hasDirectBus:false, trailCount:5, diffBeg:30, diffInt:40, diffAdv:30 },
  { id:'okushiga-kogen', name:'Okushiga Kogen', nameJa:'奥志贺高原', region:'志贺高原', area:'tokyo', driveTimeMin:180, driveDistanceKm:255, liftPassPrice:6700, hasNightSkiing:false, hasDirectBus:false, trailCount:9, diffBeg:25, diffInt:45, diffAdv:30 },
  { id:'shiga-kogen-ichinose', name:'Shiga Kogen Ichinose', nameJa:'志贺高原·一之濑', region:'志贺高原', area:'tokyo', driveTimeMin:180, driveDistanceKm:250, liftPassPrice:9000, hasNightSkiing:true, hasDirectBus:false, trailCount:10, diffBeg:35, diffInt:40, diffAdv:25 },
  { id:'nozawa-onsen', name:'Nozawa Onsen', nameJa:'野泽温泉', region:'长野北部', area:'tokyo', driveTimeMin:180, driveDistanceKm:260, liftPassPrice:7500, hasNightSkiing:true, hasDirectBus:false, trailCount:36, diffBeg:30, diffInt:40, diffAdv:30 },
  { id:'kusatsu-onsen', name:'Kusatsu Onsen', nameJa:'草津温泉', region:'群马', area:'tokyo', driveTimeMin:180, driveDistanceKm:220, liftPassPrice:6000, hasNightSkiing:true, hasDirectBus:false, trailCount:9, diffBeg:35, diffInt:35, diffAdv:30 },
  { id:'marunuma-kogen', name:'Marunuma Kogen', nameJa:'丸沼高原', region:'群马', area:'tokyo', driveTimeMin:150, driveDistanceKm:200, liftPassPrice:6300, hasNightSkiing:false, hasDirectBus:false, trailCount:13, diffBeg:35, diffInt:40, diffAdv:25 },
  { id:'kawaba', name:'Kawaba', nameJa:'川场', region:'群马', area:'tokyo', driveTimeMin:150, driveDistanceKm:180, liftPassPrice:6800, hasNightSkiing:false, hasDirectBus:false, trailCount:12, diffBeg:25, diffInt:45, diffAdv:30 },
  { id:'tanigawadake-tenjindaira', name:'Tanigawadake Tenjindaira', nameJa:'谷川岳天神平', region:'群马', area:'tokyo', driveTimeMin:150, driveDistanceKm:180, liftPassPrice:9000, hasNightSkiing:false, hasDirectBus:false, trailCount:7, diffBeg:30, diffInt:30, diffAdv:40 },
  { id:'hodaigi', name:'Hodaigi', nameJa:'宝台树', region:'群马', area:'tokyo', driveTimeMin:150, driveDistanceKm:185, liftPassPrice:6900, hasNightSkiing:false, hasDirectBus:false, trailCount:16, diffBeg:40, diffInt:40, diffAdv:20 },
  { id:'tsumagoi', name:'Tsumagoi', nameJa:'嬬恋', region:'群马', area:'tokyo', driveTimeMin:180, driveDistanceKm:210, liftPassPrice:6500, hasNightSkiing:false, hasDirectBus:false, trailCount:11, diffBeg:30, diffInt:40, diffAdv:30 },
  { id:'sugadaira-kogen', name:'Sugadaira Kogen', nameJa:'菅平高原', region:'长野北部', area:'tokyo', driveTimeMin:150, driveDistanceKm:200, liftPassPrice:6400, hasNightSkiing:true, hasDirectBus:false, trailCount:36, diffBeg:40, diffInt:40, diffAdv:20 },
  { id:'karuizawa', name:'Karuizawa Prince', nameJa:'轻井泽王子', region:'长野南部', area:'tokyo', driveTimeMin:120, driveDistanceKm:170, liftPassPrice:9000, hasNightSkiing:true, hasDirectBus:false, trailCount:10, diffBeg:50, diffInt:30, diffAdv:20 },
  { id:'fujiten', name:'Fujiten', nameJa:'富士天', region:'山梨', area:'tokyo', driveTimeMin:90, driveDistanceKm:110, liftPassPrice:5500, hasNightSkiing:true, hasDirectBus:false, trailCount:7, diffBeg:50, diffInt:35, diffAdv:15 },
  // Hokkaido
  { id:'niseko-grand-hirafu', name:'Niseko Grand Hirafu', nameJa:'二世古Grand Hirafu', region:'二世古', area:'hokkaido', driveTimeMin:120, driveDistanceKm:110, liftPassPrice:11000, hasNightSkiing:true, hasDirectBus:true, trailCount:30, diffBeg:30, diffInt:40, diffAdv:30 },
  { id:'niseko-village', name:'Niseko Village', nameJa:'二世古Village', region:'二世古', area:'hokkaido', driveTimeMin:115, driveDistanceKm:105, liftPassPrice:9700, hasNightSkiing:true, hasDirectBus:true, trailCount:27, diffBeg:50, diffInt:23, diffAdv:27 },
  { id:'niseko-annupuri', name:'Niseko Annupuri', nameJa:'二世古安努普利', region:'二世古', area:'hokkaido', driveTimeMin:110, driveDistanceKm:100, liftPassPrice:7000, hasNightSkiing:true, hasDirectBus:true, trailCount:13, diffBeg:23, diffInt:46, diffAdv:31 },
  { id:'niseko-hanazono', name:'Niseko HANAZONO', nameJa:'二世古HANAZONO', region:'二世古', area:'hokkaido', driveTimeMin:125, driveDistanceKm:115, liftPassPrice:8400, hasNightSkiing:true, hasDirectBus:true, trailCount:12, diffBeg:30, diffInt:32, diffAdv:38 },
  { id:'rusutsu', name:'Rusutsu Resort', nameJa:'留寿都度假村', region:'留寿都', area:'hokkaido', driveTimeMin:90, driveDistanceKm:90, liftPassPrice:12000, hasNightSkiing:true, hasDirectBus:true, trailCount:37, diffBeg:30, diffInt:40, diffAdv:30 },
  { id:'kiroro', name:'Kiroro Resort', nameJa:'喜乐乐度假村', region:'余市', area:'hokkaido', driveTimeMin:80, driveDistanceKm:80, liftPassPrice:8800, hasNightSkiing:true, hasDirectBus:true, trailCount:23, diffBeg:36, diffInt:28, diffAdv:36 },
  { id:'sapporo-kokusai', name:'Sapporo Kokusai', nameJa:'札幌国际滑雪场', region:'札幌', area:'hokkaido', driveTimeMin:80, driveDistanceKm:75, liftPassPrice:6000, hasNightSkiing:false, hasDirectBus:true, trailCount:7, diffBeg:28, diffInt:43, diffAdv:29 },
  { id:'teine', name:'Sapporo Teine', nameJa:'札幌手稻', region:'札幌', area:'hokkaido', driveTimeMin:50, driveDistanceKm:50, liftPassPrice:8400, hasNightSkiing:true, hasDirectBus:true, trailCount:15, diffBeg:46, diffInt:27, diffAdv:27 },
  { id:'furano', name:'Furano Ski Resort', nameJa:'富良野滑雪场', region:'富良野', area:'hokkaido', driveTimeMin:150, driveDistanceKm:150, liftPassPrice:8000, hasNightSkiing:true, hasDirectBus:true, trailCount:28, diffBeg:41, diffInt:37, diffAdv:22 },
  { id:'tomamu', name:'Hoshino Tomamu', nameJa:'星野TOMAMU', region:'占冠', area:'hokkaido', driveTimeMin:90, driveDistanceKm:100, liftPassPrice:7700, hasNightSkiing:true, hasDirectBus:true, trailCount:29, diffBeg:35, diffInt:40, diffAdv:25 },
  { id:'sahoro', name:'Sahoro Resort', nameJa:'佐幌度假村', region:'十胜', area:'hokkaido', driveTimeMin:120, driveDistanceKm:130, liftPassPrice:8800, hasNightSkiing:true, hasDirectBus:false, trailCount:21, diffBeg:38, diffInt:14, diffAdv:48 },
  { id:'kamui-links', name:'Kamui Ski Links', nameJa:'神居滑雪场', region:'旭川', area:'hokkaido', driveTimeMin:150, driveDistanceKm:170, liftPassPrice:5300, hasNightSkiing:false, hasDirectBus:false, trailCount:25, diffBeg:40, diffInt:30, diffAdv:30 },
  { id:'asahidake', name:'Asahidake', nameJa:'旭岳', region:'旭川', area:'hokkaido', driveTimeMin:180, driveDistanceKm:200, liftPassPrice:2800, hasNightSkiing:false, hasDirectBus:false, trailCount:3, diffBeg:0, diffInt:30, diffAdv:70 },
  { id:'otaru-tenguyama', name:'Otaru Tenguyama', nameJa:'小樽天狗山', region:'小樽', area:'hokkaido', driveTimeMin:70, driveDistanceKm:70, liftPassPrice:3500, hasNightSkiing:true, hasDirectBus:false, trailCount:6, diffBeg:34, diffInt:33, diffAdv:33 },
  { id:'asarigawa-onsen', name:'Asarigawa Onsen', nameJa:'朝里川温泉', region:'小樽', area:'hokkaido', driveTimeMin:60, driveDistanceKm:65, liftPassPrice:5300, hasNightSkiing:true, hasDirectBus:false, trailCount:9, diffBeg:22, diffInt:33, diffAdv:45 },
  { id:'mount-racey', name:'Mount Racey', nameJa:'Mount Racey', region:'夕张', area:'hokkaido', driveTimeMin:60, driveDistanceKm:65, liftPassPrice:6000, hasNightSkiing:false, hasDirectBus:false, trailCount:18, diffBeg:30, diffInt:40, diffAdv:30 },
  { id:'nakayama-toge', name:'Nakayama Toge', nameJa:'中山峠滑雪场', region:'札幌', area:'hokkaido', driveTimeMin:60, driveDistanceKm:60, liftPassPrice:5000, hasNightSkiing:false, hasDirectBus:false, trailCount:4, diffBeg:20, diffInt:60, diffAdv:20 },
  { id:'bankei', name:'Bankei', nameJa:'盘溪', region:'札幌', area:'hokkaido', driveTimeMin:55, driveDistanceKm:55, liftPassPrice:7500, hasNightSkiing:true, hasDirectBus:false, trailCount:17, diffBeg:40, diffInt:40, diffAdv:20 },
  { id:'niseko-moiwa', name:'Niseko Moiwa', nameJa:'二世古MOIWA', region:'二世古', area:'hokkaido', driveTimeMin:115, driveDistanceKm:105, liftPassPrice:11700, hasNightSkiing:false, hasDirectBus:false, trailCount:8, diffBeg:30, diffInt:40, diffAdv:30 },
  { id:'snow-cruise-onze', name:'Snow Cruise ONZE', nameJa:'Snow Cruise ONZE', region:'小樽', area:'hokkaido', driveTimeMin:40, driveDistanceKm:45, liftPassPrice:5000, hasNightSkiing:true, hasDirectBus:false, trailCount:8, diffBeg:50, diffInt:30, diffAdv:20 },
];

// ============================================================
// Scoring logic (simplified, matches the spec)
// ============================================================
function interpolate(value, stops) {
  // stops: [[v0,s0],[v1,s1],...] sorted by v ascending
  if (value <= stops[0][0]) return stops[0][1];
  if (value >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [v0, s0] = stops[i];
    const [v1, s1] = stops[i + 1];
    if (value >= v0 && value <= v1) {
      return s0 + (s1 - s0) * (value - v0) / (v1 - v0);
    }
  }
  return stops[stops.length - 1][1];
}

function scoreFreshSnow(cm) {
  return interpolate(cm, [[0,20],[5,40],[10,55],[20,70],[30,80],[50,100]]);
}

// Effective fresh snow: today + yesterday * decay (based on today's temp)
function calcEffectiveSnow(todaySnow, yesterdaySnow, tempMidC) {
  let decay;
  if (tempMidC <= -5) decay = 0.6;       // cold: powder stays
  else if (tempMidC <= 0) decay = 0.3;    // mild: partial retention
  else decay = 0.1;                        // warm: mostly gone
  return todaySnow + yesterdaySnow * decay;
}

function scoreSnowDepth(cm) {
  return interpolate(cm, [[0,0],[50,25],[100,45],[200,65],[300,80],[400,90],[500,100]]);
}

// Fallback snow depth: use last known non-zero value from history
function resolveSnowBase(db, resortId, date, rawValue) {
  if (rawValue > 0) return rawValue;
  // Look for most recent non-zero snow_base_cm for this resort
  const row = db.prepare(
    "SELECT snow_base_cm FROM daily_forecasts WHERE resort_id = ? AND snow_base_cm > 0 AND date <= ? ORDER BY date DESC, fetched_at DESC LIMIT 1"
  ).get(resortId, date);
  if (row) return row.snow_base_cm;
  return MANUAL_SNOW_BASE_FALLBACK[resortId] ?? 0;
}

function scoreWeather(condition) {
  const map = { 'clear':90, 'cloud':60, 'light-snow':50, 'heavy-snow':40, 'rain':20, 'mixed':30 };
  // "part cloud" icon → treat as 少云=80
  return map[condition] ?? 60;
}

function scoreWeatherFromIcon(icon) {
  if (!icon) return 60;
  const i = icon.toLowerCase();
  if (i === 'clear') return 90;
  if (i === 'part cloud') return 80;
  if (i === 'cloud') return 60;
  if (i.includes('light snow') || i === 'mod snow' || i === 'snow showers') return 50;
  if (i.includes('heavy snow')) return 40;
  if (i.includes('rain')) return 20;
  return 60;
}

function scoreTemperature(tempMidC) {
  // Optimal range: -5 to -10 → 90
  if (tempMidC >= -10 && tempMidC <= -5) return 90;
  if (tempMidC > -5) {
    const diff = tempMidC - (-5);
    return Math.max(20, 90 - diff * 10);
  }
  // colder than -10
  const diff = -10 - tempMidC;
  return Math.max(20, 90 - diff * 8);
}

function scoreWind(windMid) {
  return interpolate(windMid, [[0,95],[5,90],[10,75],[15,60],[20,45],[30,30],[40,20],[50,10]]);
}

function scoreAccessTokyo(driveTimeMin) {
  return interpolate(driveTimeMin, [[60,100],[120,80],[180,50],[240,30],[300,20]]);
}

function scoreAccessHokkaido(driveDistanceKm, hasDirectBus) {
  let s;
  if (driveDistanceKm < 50) s = 100;
  else if (driveDistanceKm < 80) s = 80;
  else if (driveDistanceKm < 120) s = 60;
  else if (driveDistanceKm < 170) s = 40;
  else s = 20;
  if (hasDirectBus) s = Math.min(100, s + 15);
  return s;
}

function scoreValue(price) {
  if (price < 4000) return 100;
  if (price < 5500) return 85;
  if (price < 7000) return 70;
  if (price < 8500) return 50;
  return 30;
}

function scoreTrails(trailCount, diffBeg, diffInt, diffAdv) {
  let s;
  if (trailCount > 30) s = 90;
  else if (trailCount >= 20) s = 75;
  else if (trailCount >= 15) s = 60;
  else if (trailCount >= 10) s = 45;
  else s = 30;
  // Difficulty variety bonus: if all three ≥15%, +10
  if (diffBeg >= 15 && diffInt >= 15 && diffAdv >= 15) s = Math.min(100, s + 10);
  return s;
}

const WEIGHTS_TOKYO = { freshSnow:0.25, snowDepth:0.10, weather:0.10, temperature:0.10, wind:0.10, access:0.15, value:0.10, trails:0.10 };
const WEIGHTS_HOKKAIDO = { freshSnow:0.28, snowDepth:0.18, weather:0.10, temperature:0.10, wind:0.07, access:0.05, value:0.10, trails:0.12 };

// Manual fallback snow base for Tokyo-area resorts when upstream source does not provide updated depth.
const MANUAL_SNOW_BASE_FALLBACK = {
  'naeba': 160,
  'kagura': 275,
  'gala-yuzawa': 200,
  'ishiuchi-maruyama': 150,
  'maiko': 195,
  'kandatsu-kogen': 150,
};

function scoreResort(resort, forecast, area, yesterdayForecast, db, dateStr) {
  const w = area === 'hokkaido' ? WEIGHTS_HOKKAIDO : WEIGHTS_TOKYO;
  const newSnow = forecast ? forecast.new_snow_cm : 0;
  const rawSnowBase = forecast ? forecast.snow_base_cm : 0;
  const snowBase = db ? resolveSnowBase(db, resort.id, dateStr, rawSnowBase) : rawSnowBase;
  const tempMid = forecast ? forecast.temp_mid_c : 0;
  const windMid = forecast ? forecast.wind_speed_mid : 10;
  const weatherIcon = forecast ? forecast.weather_icon : '';

  // Effective fresh snow considers yesterday's snowfall + temperature retention
  const yesterdaySnow = yesterdayForecast ? yesterdayForecast.new_snow_cm : 0;
  const effectiveSnow = calcEffectiveSnow(newSnow, yesterdaySnow, tempMid);

  const scores = {
    freshSnow: scoreFreshSnow(effectiveSnow),
    snowDepth: scoreSnowDepth(snowBase),
    weather: scoreWeatherFromIcon(weatherIcon),
    temperature: scoreTemperature(tempMid),
    wind: scoreWind(windMid),
    access: area === 'hokkaido'
      ? scoreAccessHokkaido(resort.driveDistanceKm, resort.hasDirectBus)
      : scoreAccessTokyo(resort.driveTimeMin),
    value: scoreValue(resort.liftPassPrice),
    trails: scoreTrails(resort.trailCount, resort.diffBeg, resort.diffInt, resort.diffAdv),
  };

  let total = 0;
  for (const key of Object.keys(w)) {
    total += scores[key] * w[key];
  }

  return {
    ...resort,
    newSnow, effectiveSnow: Math.round(effectiveSnow * 10) / 10, snowBase, tempMid, windMid,
    hasSnowBaseData: snowBase > 0,
    weatherIcon,
    weatherEmoji: getWeatherEmoji(weatherIcon),
    score: Math.round(total * 10) / 10,
    _scores: scores,
  };
}

function getWeatherEmoji(icon) {
  if (!icon) return '❓';
  const i = icon.toLowerCase();
  if (i === 'clear') return '☀️';
  if (i === 'part cloud') return '⛅';
  if (i === 'cloud') return '☁️';
  if (i.includes('heavy snow')) return '❄️';
  if (i.includes('snow') || i === 'mod snow') return '🌨️';
  if (i.includes('rain')) return '🌧️';
  return '☁️';
}

// ============================================================
// Recommendation reasons (dynamic, no repeats for top 3)
// ============================================================
function generateReasons(scoredResorts) {
  const usedCategories = new Set();
  const candidates = [
    { cat: 'powder', check: r => r.newSnow >= 15, text: r => `❄️ ${r.newSnow}cm新雪！粉雪天堂，冲就对了` },
    { cat: 'powder', check: r => r.newSnow >= 5, text: r => `❄️ ${r.newSnow}cm新雪加持，雪质超赞` },
    { cat: 'value', check: r => r.liftPassPrice < 5500, text: r => `💰 雪票${r.liftPassPrice.toLocaleString()}円还要啥自行车，冲！` },
    { cat: 'value', check: r => r.liftPassPrice < 7000, text: r => `💰 ${r.liftPassPrice.toLocaleString()}円性价比之王，滑到爽` },
    { cat: 'weather', check: r => r.weatherIcon === 'clear', text: r => `📸 蓝天白雪的完美搭配，拍照绝绝子` },
    { cat: 'weather', check: r => r.weatherIcon === 'part cloud', text: r => `📸 天气给力，拍照滑雪两不误` },
    { cat: 'trails', check: r => r.trailCount >= 25, text: r => `🎯 ${r.trailCount}条雪道任你挑，从早滑到晚都不腻` },
    { cat: 'trails', check: r => r.trailCount >= 15, text: r => `🎯 ${r.trailCount}条雪道丰富多样，各级别都能玩嗨` },
    { cat: 'snowdepth', check: r => r.snowBase >= 300, text: r => `⛰️ 积雪${r.snowBase}cm！雪量王者，底子厚实` },
    { cat: 'snowdepth', check: r => r.snowBase >= 200, text: r => `⛰️ ${r.snowBase}cm积雪打底，雪况稳定有保障` },
    { cat: 'access', check: r => r.driveTimeMin <= 90, text: r => `🚗 ${(r.driveTimeMin/60).toFixed(1)}h就到，说走就走` },
    { cat: 'access', check: r => r.driveTimeMin <= 120, text: r => `🚗 ${(r.driveTimeMin/60).toFixed(1)}h轻松直达，周末首选` },
    { cat: 'night', check: r => r.hasNightSkiing, text: r => `🌙 支持夜场，滑到天黑也不怕` },
    { cat: 'allround', check: () => true, text: r => `👑 全方位高分选手，闭眼选都不会错` },
  ];

  return scoredResorts.map(r => {
    for (const c of candidates) {
      if (!usedCategories.has(c.cat) && c.check(r)) {
        usedCategories.add(c.cat);
        return { ...r, reason: c.text(r) };
      }
    }
    return { ...r, reason: '👑 全方位高分选手，闭眼选都不会错' };
  });
}

// ============================================================
// HTML Templates (exact copy from gen-xhs-cards.js and gen-xhs-pages.js)
// ============================================================
function buildPage1HTML(title, subtitle, resorts, driveLabel) {
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
          <span>⛰️ <strong>${r.hasSnowBaseData ? `${r.snowBase}cm` : '无数据'}</strong> 积雪</span>
        </div>
        <div class="stat-row">
          <span>🌡️ ${r.tempMid}°C ${r.weatherEmoji} ${r.weatherIcon}</span>
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
          <span class="st">${r.weatherEmoji}</span>
          <span class="st"><strong>${r.newSnow}cm</strong>新雪</span>
          <span class="st">${r.hasSnowBaseData ? `${r.snowBase}cm积雪` : '积雪无数据'}</span>
          <span class="st">${r.tempMid}°C</span>
          <span class="st">💨${r.windMid}</span>
          <span class="st">🚗${dh}h</span>
          <span class="st">${r.trailCount}道</span>
          <span class="st diff">雪道 <span class="dg"></span>${r.diffBeg}%<span class="dr"></span>${r.diffInt}%<span class="db"></span>${r.diffAdv}%</span>
          ${r.hasNightSkiing ? '<span class="st night">🌙夜场</span>' : '<span class="st"></span>'}
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

// ============================================================
// Main
// ============================================================
async function main() {
  // Date: arg or tomorrow JST (cards show next-day forecast)
  let dateStr = process.argv[2];
  if (!dateStr) {
    const now = new Date(Date.now() + 9 * 3600 * 1000);
    now.setDate(now.getDate() + 1);
    dateStr = now.toISOString().slice(0, 10);
  }
  console.log(`Generating cards for ${dateStr}`);

  const [y, m, d] = dateStr.split('-');
  const cnWeekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
  const dayOfWeek = new Date(Date.UTC(+y, +m - 1, +d)).getUTCDay();
  const subtitle = `${y}.${m}.${d} ${cnWeekdays[dayOfWeek]}`;

  // Read DB
  const db = new Database(DB_PATH, { readonly: true });
  const rows = db.prepare('SELECT * FROM daily_forecasts WHERE date = ? ORDER BY fetched_at DESC').all(dateStr);

  // Yesterday's date for effective snow calculation
  const yesterdayDate = new Date(Date.UTC(+y, +m - 1, +d));
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);
  const yesterdayRows = db.prepare('SELECT * FROM daily_forecasts WHERE date = ? ORDER BY fetched_at DESC').all(yesterdayStr);

  // Dedup: keep latest per resort_id
  const forecastMap = new Map();
  for (const row of rows) {
    if (!forecastMap.has(row.resort_id)) {
      forecastMap.set(row.resort_id, row);
    }
  }

  const yesterdayMap = new Map();
  for (const row of yesterdayRows) {
    if (!yesterdayMap.has(row.resort_id)) {
      yesterdayMap.set(row.resort_id, row);
    }
  }

  console.log(`Found forecasts for ${forecastMap.size} resorts on ${dateStr}`);
  console.log(`Found yesterday forecasts for ${yesterdayMap.size} resorts on ${yesterdayStr}`);

  // Score & rank per area
  function processArea(area) {
    const areaResorts = RESORTS.filter(r => r.area === area);
    const scored = areaResorts.map(r => scoreResort(r, forecastMap.get(r.id) || null, area, yesterdayMap.get(r.id) || null, db, dateStr));
    scored.sort((a, b) => b.score - a.score);
    scored.forEach((r, i) => { r.rank = i + 1; });
    return scored;
  }

  const tokyoAll = processArea('tokyo');
  const hokkaidoAll = processArea('hokkaido');
  db.close();

  // Generate reasons for top 3
  const tokyoTop3 = generateReasons(tokyoAll.slice(0, 3));
  const hokkaidoTop3 = generateReasons(hokkaidoAll.slice(0, 3));

  // Log top 3
  for (const area of [['Tokyo', tokyoTop3], ['Hokkaido', hokkaidoTop3]]) {
    console.log(`\n${area[0]} TOP 3:`);
    for (const r of area[1]) {
      console.log(`  ${r.rank}. ${r.nameJa} (${r.name}) — ${r.score} — ${r.reason}`);
    }
  }

  // Render
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu','--disable-dev-shm-usage'],
    headless: 'new',
  });

  async function render(outPath, html) {
    const page = await browser.newPage();
    await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: outPath, clip: { x:0, y:0, width:900, height:1200 } });
    await page.close();
    console.log('  → ' + outPath);
  }

  // Page 1: TOP 3
  await render(
    path.join(OUT_DIR, `tokyo-${dateStr}.png`),
    buildPage1HTML('东京周边滑雪场情报', subtitle, tokyoTop3, '东京')
  );
  await render(
    path.join(OUT_DIR, `hokkaido-${dateStr}.png`),
    buildPage1HTML('北海道滑雪场情报', subtitle, hokkaidoTop3, '新千岁')
  );

  // Pages 2-3: full ranking lists
  const tokyoP2 = tokyoAll.slice(3, 13);
  const tokyoP3 = tokyoAll.slice(13);
  const hokP2 = hokkaidoAll.slice(3, 13);
  const hokP3 = hokkaidoAll.slice(13);

  await render(
    path.join(OUT_DIR, `tokyo-${dateStr}-p2.png`),
    buildListHTML('东京周边滑雪场情报', subtitle, `全部排名 4-${Math.min(13, tokyoAll.length)}位`, tokyoP2, '东京')
  );
  if (tokyoP3.length > 0) {
    await render(
      path.join(OUT_DIR, `tokyo-${dateStr}-p3.png`),
      buildListHTML('东京周边滑雪场情报', subtitle, `全部排名 14-${tokyoAll.length}位`, tokyoP3, '东京')
    );
  }

  await render(
    path.join(OUT_DIR, `hokkaido-${dateStr}-p2.png`),
    buildListHTML('北海道滑雪场情报', subtitle, `全部排名 4-${Math.min(13, hokkaidoAll.length)}位`, hokP2, '新千岁')
  );
  if (hokP3.length > 0) {
    await render(
      path.join(OUT_DIR, `hokkaido-${dateStr}-p3.png`),
      buildListHTML('北海道滑雪场情报', subtitle, `全部排名 14-${hokkaidoAll.length}位`, hokP3, '新千岁')
    );
  }

  await browser.close();
  console.log('\nDone!');
}

main().catch(e => { console.error(e); process.exit(1); });
