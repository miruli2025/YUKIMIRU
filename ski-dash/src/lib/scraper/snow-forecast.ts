import * as cheerio from 'cheerio';
import { DailyForecast } from '@/lib/types';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const BASE_URL = 'https://www.snow-forecast.com/resorts';

function parseWeatherCondition(altText: string): string {
  if (!altText) return 'unknown';
  const lower = altText.toLowerCase();
  if (lower.includes('rain') && lower.includes('snow')) return 'mixed';
  if (lower.includes('rain')) return 'rain';
  if (lower.includes('heavy') && lower.includes('snow')) return 'heavy-snow';
  if (lower.includes('snow')) return 'light-snow';
  if (lower.includes('cloud') || lower.includes('overcast')) return 'cloud';
  if (lower.includes('clear') || lower.includes('sun') || lower.includes('fine')) return 'clear';
  if (lower.includes('part cloud')) return 'cloud';
  if (lower.includes('mix')) return 'mixed';
  return 'cloud';
}

function safeParseFloat(text: string | undefined | null): number {
  if (!text) return 0;
  const cleaned = text.replace(/[^\d.-]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

export async function scrapeSnowForecast(
  slug: string,
  resortId: string,
  elevation: 'top' | 'mid' | 'bot' = 'mid'
): Promise<DailyForecast[]> {
  const url = `${BASE_URL}/${slug}/6day/${elevation}`;
  
  let html: string;
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(15000),
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`[scraper] 404 for ${slug}, skipping`);
          return [];
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      html = await response.text();
      break;
    } catch (err) {
      console.warn(`[scraper] Attempt ${attempt}/${maxRetries} failed for ${slug}:`, err);
      if (attempt === maxRetries) {
        console.error(`[scraper] All retries failed for ${slug}`);
        return [];
      }
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }

  return parseSnowForecastHtml(html!, resortId);
}

export function parseSnowForecastHtml(html: string, resortId: string): DailyForecast[] {
  const $ = cheerio.load(html);
  const now = new Date();
  const fetchedAt = now.toISOString();

  // 1. Extract day info from header row: date and colspan (number of time slots)
  const dayInfos: { date: string; colspan: number }[] = [];
  $('tr[data-row="days"] td.forecast-table-days__cell').each((_, el) => {
    const date = $(el).attr('data-date') || '';
    const colspan = parseInt($(el).attr('colspan') || '1', 10);
    dayInfos.push({ date, colspan });
  });

  if (dayInfos.length === 0) {
    console.warn(`[scraper] No day cells found for ${resortId}`);
    return [];
  }

  // 2. Helper: extract cell values from a data-row, mapping to day indices
  function extractRowValues(rowSelector: string, extractor: ($el: cheerio.Cheerio<any>) => number): number[][] {
    // Returns array of arrays: one sub-array per day, with values per time slot
    const cells: number[] = [];
    $(`tr[data-row="${rowSelector}"] td.forecast-table__cell`).each((_, el) => {
      cells.push(extractor($(el)));
    });
    
    const result: number[][] = [];
    let idx = 0;
    for (const day of dayInfos) {
      const slots: number[] = [];
      for (let s = 0; s < day.colspan && idx < cells.length; s++, idx++) {
        slots.push(cells[idx]);
      }
      result.push(slots);
    }
    return result;
  }

  function extractRowStrings(rowSelector: string, extractor: ($el: cheerio.Cheerio<any>) => string): string[][] {
    const cells: string[] = [];
    $(`tr[data-row="${rowSelector}"] td.forecast-table__cell`).each((_, el) => {
      cells.push(extractor($(el)));
    });
    
    const result: string[][] = [];
    let idx = 0;
    for (const day of dayInfos) {
      const slots: string[] = [];
      for (let s = 0; s < day.colspan && idx < cells.length; s++, idx++) {
        slots.push(cells[idx]);
      }
      result.push(slots);
    }
    return result;
  }

  // 3. Extract each data row
  // Snow: from data-value attribute on .snow-amount, or 0 if "—"
  const snowByDay = extractRowValues('snow', ($el) => {
    const snowAmount = $el.find('.snow-amount');
    const dataVal = snowAmount.attr('data-value');
    if (dataVal) return parseFloat(dataVal);
    return 0;
  });

  // Rain: from text, "—" means 0
  const rainByDay = extractRowValues('rain', ($el) => {
    const text = $el.text().trim();
    if (text === '—' || text === '-' || !text) return 0;
    return safeParseFloat(text);
  });

  // Temperature max: from data-value on inner div
  const tempMaxByDay = extractRowValues('temperature-max', ($el) => {
    const div = $el.find('div[data-value]');
    return parseFloat(div.attr('data-value') || '0');
  });

  // Temperature min: from data-value on inner div
  const tempMinByDay = extractRowValues('temperature-min', ($el) => {
    const div = $el.find('div[data-value]');
    return parseFloat(div.attr('data-value') || '0');
  });

  // Wind: from data-speed on .wind-icon
  const windByDay = extractRowValues('wind', ($el) => {
    const windIcon = $el.find('.wind-icon');
    return parseFloat(windIcon.attr('data-speed') || '0');
  });

  // Freezing level: from data-value on .level-value
  const freezeByDay = extractRowValues('freezing-level', ($el) => {
    const levelVal = $el.find('.level-value');
    return parseFloat(levelVal.attr('data-value') || '0');
  });

  // Weather: from alt text on img.weather-icon
  const weatherByDay = extractRowStrings('weather', ($el) => {
    const img = $el.find('img.weather-icon');
    return img.attr('alt') || '';
  });

  // 4. Snow base depth from the snow conditions table
  let snowBaseCm = 0;
  const snowDepthTable = $('section.snow-depths-table');
  if (snowDepthTable.length) {
    // Look for "Top snow depth" or "Bottom snow depth"
    snowDepthTable.find('tr').each((_, row) => {
      const th = $(row).find('th').text().toLowerCase();
      if (th.includes('top snow depth') || th.includes('bottom snow depth')) {
        const val = safeParseFloat($(row).find('.snowht').text());
        if (val > snowBaseCm) snowBaseCm = val;
      }
    });
  }

  // 5. Aggregate into daily forecasts
  const results: DailyForecast[] = [];

  for (let i = 0; i < dayInfos.length; i++) {
    const { date } = dayInfos[i];
    if (!date) continue;

    // Sum snow and rain across time slots
    const totalSnow = (snowByDay[i] || []).reduce((a, b) => a + b, 0);
    const totalRain = (rainByDay[i] || []).reduce((a, b) => a + b, 0);

    // Temperature: average of max values for the day as representative temp at this elevation
    const maxTemps = tempMaxByDay[i] || [];
    const minTemps = tempMinByDay[i] || [];
    const allTemps = [...maxTemps, ...minTemps].filter(t => !isNaN(t));
    const avgTemp = allTemps.length > 0 ? allTemps.reduce((a, b) => a + b, 0) / allTemps.length : 0;
    const maxTemp = maxTemps.length > 0 ? Math.max(...maxTemps) : 0;
    const minTemp = minTemps.length > 0 ? Math.min(...minTemps) : 0;

    // Use mid temp as the average, top as colder (-3), bottom as warmer (+3)
    const tempMid = Math.round(avgTemp * 10) / 10;
    const tempTop = Math.round((tempMid - 3) * 10) / 10;
    const tempBottom = Math.round((tempMid + 3) * 10) / 10;

    // Wind: max across time slots
    const winds = windByDay[i] || [];
    const maxWind = winds.length > 0 ? Math.max(...winds) : 0;

    // Freezing level: average across time slots
    const freezes = freezeByDay[i] || [];
    const avgFreeze = freezes.length > 0 ? Math.round(freezes.reduce((a, b) => a + b, 0) / freezes.length) : 0;

    // Weather condition: pick dominant from time slots
    const weatherAlts = weatherByDay[i] || [];
    const weatherCondition = pickDominantWeather(weatherAlts);

    // Weather icon: use the PM slot if available, else first
    const iconAlt = weatherAlts.length >= 2 ? weatherAlts[1] : weatherAlts[0] || '';

    results.push({
      resortId,
      date,
      newSnowCm: Math.round(totalSnow * 10) / 10,
      snowBaseCm,
      tempTopC: tempTop,
      tempMidC: tempMid,
      tempBottomC: tempBottom,
      windSpeedTop: Math.round(maxWind * 1.3), // top is windier
      windSpeedMid: maxWind,
      weatherCondition,
      weatherIcon: iconAlt,
      freezingLevelM: avgFreeze,
      precipMm: Math.round(totalRain * 10) / 10,
      fetchedAt,
    });
  }

  return results;
}

function pickDominantWeather(alts: string[]): string {
  if (alts.length === 0) return 'unknown';
  
  // Priority: heavy-snow > rain > mixed > light-snow > cloud > clear
  const conditions = alts.map(a => parseWeatherCondition(a));
  
  const priority: Record<string, number> = {
    'heavy-snow': 6,
    'rain': 5,
    'mixed': 4,
    'light-snow': 3,
    'cloud': 2,
    'clear': 1,
    'unknown': 0,
  };

  // Count occurrences
  const counts: Record<string, number> = {};
  for (const c of conditions) {
    counts[c] = (counts[c] || 0) + 1;
  }

  // If any severe condition appears, use it; otherwise use most frequent
  let best = conditions[0];
  let bestScore = 0;
  for (const [cond, count] of Object.entries(counts)) {
    const score = count * 10 + (priority[cond] || 0);
    if (score > bestScore) {
      bestScore = score;
      best = cond;
    }
  }
  
  return best;
}

function formatFutureDate(from: Date, daysAhead: number): string {
  const d = new Date(from);
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

export async function scrapeAllResorts(
  resortSlugs: Array<{ id: string; slug: string }>
): Promise<Map<string, DailyForecast[]>> {
  const results = new Map<string, DailyForecast[]>();
  
  for (const { id, slug } of resortSlugs) {
    console.log(`[scraper] Fetching ${id} (${slug})...`);
    try {
      const forecasts = await scrapeSnowForecast(slug, id);
      results.set(id, forecasts);
      console.log(`[scraper] Got ${forecasts.length} days for ${id}`);
    } catch (err) {
      console.error(`[scraper] Failed for ${id}:`, err);
      results.set(id, []);
    }
    // Rate limiting: wait 2-4 seconds between requests
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
  }
  
  return results;
}
