import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

export const forecasts = sqliteTable('forecasts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  resortId: text('resort_id').notNull(),
  date: text('date').notNull(),        // YYYY-MM-DD
  timeSlot: text('time_slot').notNull(), // AM, PM, night
  newSnowCm: real('new_snow_cm').default(0),
  snowBaseCm: real('snow_base_cm').default(0),
  tempTopC: real('temp_top_c').default(0),
  tempMidC: real('temp_mid_c').default(0),
  tempBottomC: real('temp_bottom_c').default(0),
  windSpeedTop: real('wind_speed_top').default(0),
  windSpeedMid: real('wind_speed_mid').default(0),
  weatherCondition: text('weather_condition').default('unknown'),
  weatherIcon: text('weather_icon').default(''),
  freezingLevelM: real('freezing_level_m').default(0),
  precipMm: real('precip_mm').default(0),
  fetchedAt: text('fetched_at').notNull(),
});

export const dailyForecasts = sqliteTable('daily_forecasts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  resortId: text('resort_id').notNull(),
  date: text('date').notNull(),
  newSnowCm: real('new_snow_cm').default(0),
  snowBaseCm: real('snow_base_cm').default(0),
  tempTopC: real('temp_top_c').default(0),
  tempMidC: real('temp_mid_c').default(0),
  tempBottomC: real('temp_bottom_c').default(0),
  windSpeedTop: real('wind_speed_top').default(0),
  windSpeedMid: real('wind_speed_mid').default(0),
  weatherCondition: text('weather_condition').default('unknown'),
  weatherIcon: text('weather_icon').default(''),
  freezingLevelM: real('freezing_level_m').default(0),
  precipMm: real('precip_mm').default(0),
  fetchedAt: text('fetched_at').notNull(),
});
