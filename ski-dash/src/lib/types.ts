export interface Resort {
  id: string;
  name: string;
  nameJa: string;
  region: string;
  prefecture: string;
  area: 'tokyo' | 'hokkaido';
  elevationTop: number;    // meters
  elevationBottom: number;  // meters
  driveTimeMin: number;     // minutes from Tokyo (tokyo area) or New Chitose Airport (hokkaido area)
  driveDistanceKm: number;
  liftPassPrice: number;    // JPY, adult 1-day
  hasNightSkiing: boolean;
  hasDirectBus: boolean;    // direct bus from New Chitose Airport (hokkaido only)
  trailCount: number;
  difficultyBeginner: number; // percentage
  difficultyIntermediate: number;
  difficultyAdvanced: number;
  snowForecastSlug: string;
  trailOpenRate?: number;   // 0-100, manually updated
  trailMapUrl?: string;     // URL to trail/course map (PDF, PNG, page)
  sizeCategory: 'small' | 'medium' | 'large'; // for crowd adjustment
}

export interface ForecastData {
  resortId: string;
  date: string;           // YYYY-MM-DD
  timeSlot: string;       // 'AM' | 'PM' | 'night'
  // Snow
  newSnowCm: number;
  snowBaseCm: number;     // base depth at mid elevation
  // Weather
  tempTopC: number;
  tempMidC: number;
  tempBottomC: number;
  windSpeedTop: number;   // km/h
  windSpeedMid: number;
  weatherCondition: string; // 'clear' | 'cloud' | 'light-snow' | 'heavy-snow' | 'rain' | 'mixed'
  weatherIcon: string;
  freezingLevelM: number; // meters
  precipMm: number;
  // Metadata
  fetchedAt: string;      // ISO timestamp
}

export interface DailyForecast {
  resortId: string;
  date: string;
  newSnowCm: number;       // total for day
  snowBaseCm: number;
  tempTopC: number;         // daytime avg
  tempMidC: number;
  tempBottomC: number;
  windSpeedTop: number;     // max
  windSpeedMid: number;
  weatherCondition: string; // dominant
  weatherIcon: string;
  freezingLevelM: number;
  precipMm: number;
  fetchedAt: string;
}

export interface ResortScore {
  resortId: string;
  date: string;
  totalScore: number;
  freshSnowScore: number;
  weatherScore: number;
  trailOpenScore: number;
  snowDepthScore: number;
  accessScore: number;
  valueScore: number;
  crowdScore: number;
  // Flags
  rainWarning: boolean;
  windWarning: boolean;
  powderDay: boolean;
  // Source data for display
  forecast: DailyForecast | null;
  resort: Resort;
}

export type DateType = 'weekday' | 'weekend' | 'long-weekend' | 'peak-holiday';
