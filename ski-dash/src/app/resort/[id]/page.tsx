'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { resorts, getResortById } from '@/data/resorts';
import { scoreResorts } from '@/lib/scoring/recommend';
import { Resort, DailyForecast, ResortScore } from '@/lib/types';
import { ScoreBadge, WeatherIcon } from '@/components/ScoreBadge';

interface ForecastRow {
  resortId: string;
  date: string;
  newSnowCm: number;
  snowBaseCm: number;
  tempTopC: number;
  tempMidC: number;
  tempBottomC: number;
  windSpeedTop: number;
  windSpeedMid: number;
  weatherCondition: string;
  weatherIcon: string;
  freezingLevelM: number;
  precipMm: number;
  fetchedAt: string;
}

export default function ResortDetail() {
  const params = useParams();
  const id = params.id as string;
  const resort = getResortById(id);
  const [forecastRows, setForecastRows] = useState<ForecastRow[]>([]);
  const [score, setScore] = useState<ResortScore | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!resort) return;
    
    fetch(`/api/forecast?resortId=${id}`)
      .then(r => r.json())
      .then(data => {
        const rows = (data.forecasts || []).sort((a: ForecastRow, b: ForecastRow) => a.date.localeCompare(b.date));
        setForecastRows(rows);

        const todayForecast = rows.find((f: ForecastRow) => f.date === today);
        const forecastMap = new Map<string, DailyForecast>();
        if (todayForecast) {
          forecastMap.set(resort.id, {
            resortId: resort.id,
            date: today,
            newSnowCm: todayForecast.newSnowCm ?? 0,
            snowBaseCm: todayForecast.snowBaseCm ?? 0,
            tempTopC: todayForecast.tempTopC ?? 0,
            tempMidC: todayForecast.tempMidC ?? 0,
            tempBottomC: todayForecast.tempBottomC ?? 0,
            windSpeedTop: todayForecast.windSpeedTop ?? 0,
            windSpeedMid: todayForecast.windSpeedMid ?? 0,
            weatherCondition: todayForecast.weatherCondition ?? 'unknown',
            weatherIcon: todayForecast.weatherIcon ?? '',
            freezingLevelM: todayForecast.freezingLevelM ?? 0,
            precipMm: todayForecast.precipMm ?? 0,
            fetchedAt: todayForecast.fetchedAt,
          });
        }
        const scores = scoreResorts([resort], forecastMap, today);
        setScore(scores[0]);
        setLoading(false);
      })
      .catch(() => {
        const scores = scoreResorts([resort], new Map(), today);
        setScore(scores[0]);
        setLoading(false);
      });
  }, [id, resort, today]);

  if (!resort) {
    return (
      <div className="text-center py-32">
        <h1 className="text-xl font-bold text-[#f5f5f7]">スキー場が見つかりません</h1>
        <Link href="/" className="text-[#0071e3] hover:underline mt-4 inline-block text-sm">← ダッシュボードに戻る</Link>
      </div>
    );
  }

  const snowColor = (cm: number) => cm >= 15 ? 'text-[#0071e3] font-semibold' : cm >= 5 ? 'text-[#f5f5f7]' : 'text-[#86868b]';
  const tempColor = (t: number) => t >= -10 && t <= -5 ? 'text-[#30d158]' : t > 0 ? 'text-[#ff453a]' : 'text-[#64d2ff]';
  const windColor = (w: number) => w < 15 ? 'text-[#30d158]' : w < 30 ? 'text-[#ffd60a]' : 'text-[#ff453a]';

  return (
    <div>
      <Link href="/" className="text-[#0071e3] text-sm mb-8 inline-block hover:underline">← ダッシュボードに戻る</Link>

      <div className="rounded-3xl bg-[#1d1d1f] p-8 mb-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#f5f5f7] tracking-tight mb-1">{resort.nameJa}</h1>
            <p className="text-[#86868b] text-sm">{resort.name} · {resort.region} · {resort.prefecture}</p>
          </div>
          {score && <ScoreBadge score={score.totalScore} size="lg" />}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="rounded-2xl bg-white/[0.04] p-5">
            <div className="text-[#86868b] text-xs mb-2">🏔️ 標高</div>
            <div className="font-semibold text-[#f5f5f7]">{resort.elevationBottom}m - {resort.elevationTop}m</div>
          </div>
          <div className="rounded-2xl bg-white/[0.04] p-5">
            <div className="text-[#86868b] text-xs mb-2">🚗 東京から</div>
            <div className="font-semibold text-[#f5f5f7]">{(resort.driveTimeMin / 60).toFixed(1)}時間 ({resort.driveDistanceKm}km)</div>
          </div>
          <div className="rounded-2xl bg-white/[0.04] p-5">
            <div className="text-[#86868b] text-xs mb-2">🎫 リフト券</div>
            <div className="font-semibold text-[#f5f5f7]">¥{resort.liftPassPrice.toLocaleString()}</div>
          </div>
          <div className="rounded-2xl bg-white/[0.04] p-5">
            <div className="text-[#86868b] text-xs mb-2">🎿 コース</div>
            <div className="font-semibold text-[#f5f5f7]">{resort.trailCount}本</div>
            <div className="text-xs text-[#86868b] mt-1">
              初{resort.difficultyBeginner}% 中{resort.difficultyIntermediate}% 上{resort.difficultyAdvanced}%
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2 text-sm flex-wrap">
          {resort.hasNightSkiing && <span className="bg-white/[0.04] text-[#bf5af2] px-3 py-1.5 rounded-full text-xs">🌙 ナイター有</span>}
          {resort.trailMapUrl && (
            <a
              href={resort.trailMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#22d3ee]/10 text-[#22d3ee] px-3 py-1.5 rounded-full text-xs hover:bg-[#22d3ee]/20 transition-colors inline-flex items-center gap-1"
            >
              🗺️ 雪道图
            </a>
          )}
        </div>
      </div>

      {/* 6-day forecast */}
      <div className="rounded-3xl bg-[#1d1d1f] p-8 mb-8">
        <h2 className="text-xl font-bold text-[#f5f5f7] tracking-tight mb-6">📅 6日間予報</h2>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-[1.5px] border-[#86868b] border-t-transparent"></div>
            <span className="ml-3 text-[#86868b] text-sm">読み込み中...</span>
          </div>
        ) : forecastRows.length === 0 ? (
          <p className="text-[#86868b] text-sm">
            予報データがありません。<code className="bg-white/[0.06] px-1.5 py-0.5 rounded-md text-[#f5f5f7]">npm run fetch</code> を実行してください。
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-[#86868b]">日付</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-[#86868b]">天気</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-[#86868b]">新雪</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-[#86868b]">積雪</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-[#86868b]">気温(中腹)</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-[#86868b]">風速</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-[#86868b]">降水</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-[#86868b]">凍結高度</th>
                </tr>
              </thead>
              <tbody>
                {forecastRows.map(f => {
                  const d = new Date(f.date + 'T00:00:00');
                  const days = ['日', '月', '火', '水', '木', '金', '土'];
                  const isToday = f.date === today;
                  return (
                    <tr key={f.date} className={`border-b border-white/[0.02] ${isToday ? 'bg-[#0071e3]/[0.06]' : 'hover:bg-white/[0.02]'} transition-colors`}>
                      <td className="px-4 py-4 font-medium text-[#f5f5f7]">
                        {d.getMonth() + 1}/{d.getDate()}({days[d.getDay()]})
                        {isToday && <span className="text-[11px] text-[#0071e3] ml-1.5 font-normal">今日</span>}
                      </td>
                      <td className="px-4 py-4"><WeatherIcon condition={f.weatherCondition ?? 'unknown'} /></td>
                      <td className={`px-4 py-4 ${snowColor(f.newSnowCm ?? 0)}`}>{f.newSnowCm ?? 0}cm</td>
                      <td className="px-4 py-4 text-[#86868b]">{f.snowBaseCm ?? 0}cm</td>
                      <td className={`px-4 py-4 ${tempColor(f.tempMidC ?? 0)}`}>{f.tempMidC ?? 0}°C</td>
                      <td className={`px-4 py-4 ${windColor(f.windSpeedMid ?? 0)}`}>{f.windSpeedMid ?? 0}km/h</td>
                      <td className="px-4 py-4 text-[#86868b]">{f.precipMm ?? 0}mm</td>
                      <td className="px-4 py-4 text-[#86868b]">{f.freezingLevelM ?? 0}m</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Score breakdown */}
      {score && (
        <div className="rounded-3xl bg-[#1d1d1f] p-8">
          <h2 className="text-xl font-bold text-[#f5f5f7] tracking-tight mb-6">📊 スコア内訳</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              { label: '新雪', score: score.freshSnowScore, weight: '25%' },
              { label: '天気快適度', score: score.weatherScore, weight: '20%' },
              { label: 'コース開放率', score: score.trailOpenScore, weight: '15%' },
              { label: '積雪量', score: score.snowDepthScore, weight: '10%' },
              { label: 'アクセス', score: score.accessScore, weight: '15%' },
              { label: 'コスパ', score: score.valueScore, weight: '10%' },
              { label: '混雑度', score: score.crowdScore, weight: '5%' },
            ].map(({ label, score: s, weight }) => (
              <div key={label} className="rounded-2xl bg-white/[0.04] p-5">
                <div className="text-[#86868b] text-xs mb-3">{label} <span className="opacity-60">({weight})</span></div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white/[0.06] rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${s >= 70 ? 'bg-[#30d158]' : s >= 45 ? 'bg-[#ffd60a]' : 'bg-[#ff453a]'}`}
                      style={{ width: `${Math.min(100, Math.max(0, s))}%` }}
                    />
                  </div>
                  <span className="font-bold text-[#f5f5f7] w-8 text-right tabular-nums">{s}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
