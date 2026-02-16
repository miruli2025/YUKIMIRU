import { Resort, DailyForecast, ResortScore, DateType } from '@/lib/types';

// V1 Default weights - Tokyo area (PRD 7.2)
const WEIGHTS_TOKYO = {
  freshSnow: 0.25,
  weather: 0.20,
  trailOpen: 0.15,
  snowDepth: 0.10,
  access: 0.15,
  value: 0.10,
  crowd: 0.05,
};

// Hokkaido area weights - snow quality matters more, access less
const WEIGHTS_HOKKAIDO = {
  freshSnow: 0.30,
  weather: 0.20,
  trailOpen: 0.15,
  snowDepth: 0.15,
  access: 0.05,
  value: 0.10,
  crowd: 0.05,
};

// --- Fresh Snow Score (0-100) ---
function scoreFreshSnow(cm: number): number {
  if (cm <= 0) return 0;
  if (cm >= 15) return 100;
  if (cm <= 5) return (cm / 5) * 50;
  return 50 + ((cm - 5) / 10) * 50;
}

// --- Weather Comfort Score (PRD 7.3) ---
function scoreWeatherComfort(tempMidC: number, windSpeedMid: number, condition: string): number {
  let tempScore: number;
  if (tempMidC >= -10 && tempMidC <= -5) {
    tempScore = 100;
  } else if (tempMidC > -5 && tempMidC <= 0) {
    tempScore = 100 - (tempMidC + 5) * 8;
  } else if (tempMidC > 0) {
    tempScore = Math.max(30, 60 - tempMidC * 10);
  } else if (tempMidC < -10 && tempMidC >= -15) {
    tempScore = 100 + (tempMidC + 10) * 14;
  } else {
    tempScore = 30;
  }

  let windScore: number;
  if (windSpeedMid < 15) windScore = 100;
  else if (windSpeedMid < 30) windScore = 70;
  else if (windSpeedMid < 50) windScore = 40;
  else windScore = 10;

  const conditionScores: Record<string, number> = {
    'clear': 100,
    'cloud': 80,
    'light-snow': 90,
    'heavy-snow': 50,
    'rain': 10,
    'mixed': 30,
    'unknown': 60,
  };
  const weatherScore = conditionScores[condition] ?? 60;

  return tempScore * 0.4 + windScore * 0.3 + weatherScore * 0.3;
}

// --- Trail Open Rate Score ---
function scoreTrailOpen(rate: number | undefined): number {
  return rate ?? 75;
}

// --- Snow Depth Score (relative ranking) ---
function scoreSnowDepth(baseCm: number, allBaseCms: number[]): number {
  if (allBaseCms.length === 0) return 50;
  const sorted = [...allBaseCms].sort((a, b) => b - a);
  const rank = sorted.indexOf(baseCm);
  if (rank === -1) return 50;
  return 100 - (rank / sorted.length) * 100;
}

// --- Access Score (Tokyo area - drive time from Tokyo) ---
function scoreAccessTokyo(driveTimeMin: number): number {
  const hours = driveTimeMin / 60;
  if (hours < 2) return 100;
  if (hours < 3) return 70;
  if (hours < 4) return 40;
  return 20;
}

// --- Access Score (Hokkaido area - distance from New Chitose Airport) ---
function scoreAccessHokkaido(driveDistanceKm: number, hasDirectBus: boolean): number {
  let score: number;
  if (driveDistanceKm < 50) score = 100;
  else if (driveDistanceKm < 80) score = 80;
  else if (driveDistanceKm < 120) score = 60;
  else if (driveDistanceKm < 170) score = 40;
  else score = 20;

  if (hasDirectBus) {
    score = Math.min(100, score + 15);
  }
  return score;
}

// --- Value Score (price inverse) ---
function scoreValue(price: number, allPrices: number[]): number {
  if (allPrices.length === 0) return 50;
  const maxPrice = Math.max(...allPrices);
  const minPrice = Math.min(...allPrices);
  if (maxPrice === minPrice) return 75;
  return 100 - ((price - minPrice) / (maxPrice - minPrice)) * 80;
}

// --- Crowd Score (PRD 7.4) ---
function scoreCrowd(dateType: DateType, sizeCategory: 'small' | 'medium' | 'large'): number {
  const baseCrowdScores: Record<DateType, number> = {
    'weekday': 90,
    'weekend': 60,
    'long-weekend': 30,
    'peak-holiday': 10,
  };
  let score = baseCrowdScores[dateType];
  if (sizeCategory === 'large') score = Math.min(100, score + 10);
  if (sizeCategory === 'small') score = Math.max(0, score - 10);
  return score;
}

// --- Date Type Detection ---
export function getDateType(dateStr: string): DateType {
  const date = new Date(dateStr + 'T00:00:00+09:00');
  const day = date.getDay();
  const month = date.getMonth() + 1;
  const dayOfMonth = date.getDate();

  if ((month === 12 && dayOfMonth >= 28) || (month === 1 && dayOfMonth <= 4)) {
    return 'peak-holiday';
  }
  if (month === 2 && dayOfMonth >= 10 && dayOfMonth <= 12) return 'peak-holiday';

  if (day === 0 || day === 6) {
    return 'weekend';
  }

  if (day >= 1 && day <= 5) return 'weekday';
  return 'weekend';
}

// --- Special Rules (PRD 7.5) ---
function checkRainWarning(forecast: DailyForecast): boolean {
  return forecast.tempBottomC > 0 && forecast.precipMm > 0;
}

function checkWindWarning(forecast: DailyForecast): boolean {
  return forecast.windSpeedTop > 50;
}

function checkPowderDay(forecast: DailyForecast): boolean {
  return forecast.newSnowCm > 20 && forecast.tempMidC < -5;
}

// --- Main Scoring Function ---
export function scoreResorts(
  resorts: Resort[],
  forecastMap: Map<string, DailyForecast>,
  date: string,
  area: 'tokyo' | 'hokkaido' = 'tokyo'
): ResortScore[] {
  const dateType = getDateType(date);
  const weights = area === 'hokkaido' ? WEIGHTS_HOKKAIDO : WEIGHTS_TOKYO;
  const allPrices = resorts.map(r => r.liftPassPrice);
  const allBaseCms = Array.from(forecastMap.values()).map(f => f.snowBaseCm);

  return resorts.map(resort => {
    const forecast = forecastMap.get(resort.id) || null;

    const freshSnowScore = forecast ? scoreFreshSnow(forecast.newSnowCm) : 0;
    const weatherScore = forecast
      ? scoreWeatherComfort(forecast.tempMidC, forecast.windSpeedMid, forecast.weatherCondition)
      : 50;
    const trailOpenScore = scoreTrailOpen(resort.trailOpenRate);
    const snowDepthScore = forecast ? scoreSnowDepth(forecast.snowBaseCm, allBaseCms) : 50;
    const accessScore = area === 'hokkaido'
      ? scoreAccessHokkaido(resort.driveDistanceKm, resort.hasDirectBus)
      : scoreAccessTokyo(resort.driveTimeMin);
    const valueScore = scoreValue(resort.liftPassPrice, allPrices);
    const crowdScore = scoreCrowd(dateType, resort.sizeCategory);

    let totalScore =
      freshSnowScore * weights.freshSnow +
      weatherScore * weights.weather +
      trailOpenScore * weights.trailOpen +
      snowDepthScore * weights.snowDepth +
      accessScore * weights.access +
      valueScore * weights.value +
      crowdScore * weights.crowd;

    const rainWarning = forecast ? checkRainWarning(forecast) : false;
    const windWarning = forecast ? checkWindWarning(forecast) : false;
    const powderDay = forecast ? checkPowderDay(forecast) : false;

    if (rainWarning) totalScore *= 0.6;
    if (windWarning) totalScore *= 0.85;
    if (powderDay) totalScore = Math.min(100, totalScore * 1.15);

    return {
      resortId: resort.id,
      date,
      totalScore: Math.round(totalScore * 10) / 10,
      freshSnowScore: Math.round(freshSnowScore),
      weatherScore: Math.round(weatherScore),
      trailOpenScore: Math.round(trailOpenScore),
      snowDepthScore: Math.round(snowDepthScore),
      accessScore: Math.round(accessScore),
      valueScore: Math.round(valueScore),
      crowdScore: Math.round(crowdScore),
      rainWarning,
      windWarning,
      powderDay,
      forecast,
      resort,
    };
  }).sort((a, b) => b.totalScore - a.totalScore);
}
