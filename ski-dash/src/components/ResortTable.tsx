'use client';

import { useState } from 'react';
import { ResortScore } from '@/lib/types';
import { ScoreBadge, WeatherIcon, WarningBadge } from './ScoreBadge';
import Link from 'next/link';

type SortKey = 'totalScore' | 'freshSnowScore' | 'weatherScore' | 'accessScore' | 'valueScore' | 'newSnow' | 'temp' | 'wind' | 'price' | 'name';

export function ResortTable({ scores, area }: { scores: ResortScore[]; area: 'tokyo' | 'hokkaido' }) {
  const [sortKey, setSortKey] = useState<SortKey>('totalScore');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sorted = [...scores].sort((a, b) => {
    let va: number, vb: number;
    switch (sortKey) {
      case 'totalScore': va = a.totalScore; vb = b.totalScore; break;
      case 'freshSnowScore': va = a.freshSnowScore; vb = b.freshSnowScore; break;
      case 'weatherScore': va = a.weatherScore; vb = b.weatherScore; break;
      case 'accessScore': va = a.accessScore; vb = b.accessScore; break;
      case 'valueScore': va = a.valueScore; vb = b.valueScore; break;
      case 'newSnow': va = a.forecast?.newSnowCm ?? 0; vb = b.forecast?.newSnowCm ?? 0; break;
      case 'temp': va = a.forecast?.tempMidC ?? -99; vb = b.forecast?.tempMidC ?? -99; break;
      case 'wind': va = a.forecast?.windSpeedMid ?? 0; vb = b.forecast?.windSpeedMid ?? 0; break;
      case 'price': va = a.resort.liftPassPrice; vb = b.resort.liftPassPrice; break;
      case 'name': va = a.resort.nameJa.localeCompare(b.resort.nameJa) as unknown as number; vb = 0; break;
      default: va = a.totalScore; vb = b.totalScore;
    }
    return sortAsc ? va - vb : vb - va;
  });

  const SortHeader = ({ label, sortField, className = '' }: { label: string; sortField: SortKey; className?: string }) => (
    <th
      className={`px-3 py-3 text-left text-xs font-medium text-[#94a3b8] cursor-pointer hover:text-[#e2e8f0] select-none transition-colors whitespace-nowrap ${className}`}
      onClick={() => handleSort(sortField)}
    >
      {label} {sortKey === sortField ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );

  const snowColor = (cm: number) => cm >= 15 ? 'text-[#22d3ee] font-bold' : cm >= 5 ? 'text-[#e2e8f0]' : 'text-[#94a3b8]';
  const tempColor = (t: number) => t >= -10 && t <= -5 ? 'text-[#34d399]' : t > 0 ? 'text-[#f87171]' : 'text-[#67e8f9]';
  const windColor = (w: number) => w < 15 ? 'text-[#34d399]' : w < 30 ? 'text-[#fbbf24]' : 'text-[#f87171]';

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#e2e8f0] mb-6">📊 全部滑雪场</h2>
      <div className="overflow-x-auto rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-3 py-3 text-left text-xs font-medium text-[#94a3b8] w-8">#</th>
              <SortHeader label="滑雪场" sortField="name" className="min-w-[140px]" />
              <SortHeader label="评分↓" sortField="totalScore" />
              <SortHeader label="新雪" sortField="newSnow" />
              <th className="px-3 py-3 text-left text-xs font-medium text-[#94a3b8] whitespace-nowrap">積雪</th>
              <SortHeader label="温度" sortField="temp" />
              <SortHeader label="風速" sortField="wind" />
              <th className="px-3 py-3 text-left text-xs font-medium text-[#94a3b8] whitespace-nowrap">天気</th>
              {/* trailOpenRate removed */}
              <SortHeader label={area === 'hokkaido' ? '車程（新千岁机场出发）' : '車程（东京出发）'} sortField="accessScore" />
              <SortHeader label="票价" sortField="price" />
              <th className="px-3 py-3 text-left text-xs font-medium text-[#94a3b8] whitespace-nowrap">夜场</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[#94a3b8] whitespace-nowrap">雪道比例</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((score, i) => (
              <tr key={score.resortId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-3 py-3 text-sm text-[#94a3b8]">{i + 1}</td>
                <td className="px-3 py-3">
                  <Link href={`/resort/${score.resortId}`} className="group">
                    <div className="font-medium text-[#e2e8f0] text-sm group-hover:text-[#22d3ee] transition-colors flex items-center gap-1.5 whitespace-nowrap">
                      {score.resort.nameJa}
                      <span className="inline-flex px-1.5 py-0.5 rounded-full bg-white/[0.07] text-[10px] font-normal text-[#8e8e93] leading-none">{score.resort.region}</span>
                    </div>
                  </Link>
                </td>
                <td className="px-3 py-3">
                  <ScoreBadge score={score.totalScore} size="sm" />
                </td>
                <td className={`px-3 py-3 text-sm ${snowColor(score.forecast?.newSnowCm ?? 0)}`}>
                  {score.forecast?.newSnowCm ?? '-'}cm
                </td>
                <td className="px-3 py-3 text-sm text-[#94a3b8]">
                  {score.forecast?.snowBaseCm ?? '-'}cm
                </td>
                <td className={`px-3 py-3 text-sm ${tempColor(score.forecast?.tempMidC ?? 0)}`}>
                  {score.forecast?.tempMidC ?? '-'}°C
                </td>
                <td className={`px-3 py-3 text-sm ${windColor(score.forecast?.windSpeedMid ?? 0)}`}>
                  {score.forecast?.windSpeedMid ?? '-'}km/h
                </td>
                <td className="px-3 py-3">
                  <WeatherIcon condition={score.forecast?.weatherCondition ?? 'unknown'} />
                </td>
                {/* trailOpenRate removed */}
                <td className="px-3 py-3 text-sm text-[#94a3b8] whitespace-nowrap">
                  {(score.resort.driveTimeMin / 60).toFixed(1)}h{area === 'hokkaido' && score.resort.hasDirectBus ? ' 🚌' : ''}
                </td>
                <td className="px-3 py-3 text-sm text-[#94a3b8]">
                  ¥{score.resort.liftPassPrice.toLocaleString()}
                </td>
                <td className="px-3 py-3 text-sm">
                  {score.resort.hasNightSkiing ? '🌙' : '-'}
                </td>
                <td className="px-3 py-3 text-xs text-[#94a3b8] whitespace-nowrap">
                  <span className="text-[#4ade80]">🟢{score.resort.difficultyBeginner}%</span>
                  <span className="mx-0.5">/</span>
                  <span className="text-[#f87171]">🔴{score.resort.difficultyIntermediate}%</span>
                  <span className="mx-0.5">/</span>
                  <span className="text-[#1e1e1e]">⚫{score.resort.difficultyAdvanced}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
