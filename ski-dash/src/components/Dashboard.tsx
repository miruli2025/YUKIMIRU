'use client';

import { useState, useEffect } from 'react';
import { ResortScore } from '@/lib/types';
import { DatePicker } from './DatePicker';
import { TopCards } from './TopCards';
import { ResortTable } from './ResortTable';

interface ApiResponse {
  date: string;
  area: string;
  hasForecast: boolean;
  resorts: ResortScore[];
}

type Area = 'tokyo' | 'hokkaido';

const AREA_LABELS: Record<Area, { title: string; regions: string }> = {
  tokyo: { title: '東京周辺', regions: '汤泽・白马・志贺高原・群马・长野・山梨' },
  hokkaido: { title: '北海道', regions: '二世古・富良野・札幌・旭川・留寿都・十胜・占冠・夕张・小樽・余市' },
};

function getJstToday(): string {
  const jstMs = Date.now() + 9 * 60 * 60 * 1000;
  const d = new Date(jstMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function Dashboard() {
  const [date, setDate] = useState('');
  const [area, setArea] = useState<Area>('tokyo');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Set date on client only to avoid hydration mismatch
  useEffect(() => {
    setDate(getJstToday());
  }, []);

  useEffect(() => {
    if (!date) return; // Wait for client-side date
    setLoading(true);
    fetch(`/api/resorts?date=${date}&area=${area}`)
      .then(r => r.json())
      .then((d: ApiResponse) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [date, area]);

  return (
    <div>
      {/* Area Tabs */}
      <div className="flex gap-2 mb-6">
        {(Object.keys(AREA_LABELS) as Area[]).map((a) => (
          <button
            key={a}
            onClick={() => setArea(a)}
            className={`
              px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left
              ${area === a
                ? 'bg-white/[0.12] text-[#f5f5f7] shadow-[0_0_0_1px_rgba(255,255,255,0.12)]'
                : 'bg-white/[0.04] text-[#86868b] hover:bg-white/[0.08] hover:text-[#a1a1a6]'
              }
            `}
          >
            <div>{AREA_LABELS[a].title}</div>
            <div className="text-[10px] font-normal mt-0.5 opacity-60">{AREA_LABELS[a].regions}</div>
          </button>
        ))}
      </div>

      <DatePicker value={date} onChange={setDate} />
      
      {!data?.hasForecast && !loading && (
        <div className="rounded-2xl bg-[#1d1d1f] p-5 mb-10 text-sm text-[#86868b]">
          ⚠️ この日の天気予報データがまだ取得されていません。
          <code className="bg-white/[0.06] px-1.5 py-0.5 rounded-md ml-1 text-[#f5f5f7]">npm run fetch</code> を実行してデータを取得してください。
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-6 w-6 border-[1.5px] border-[#86868b] border-t-transparent"></div>
          <span className="ml-3 text-[#86868b] text-sm">読み込み中...</span>
        </div>
      ) : data ? (
        <>
          <TopCards scores={data.resorts} />
          <ResortTable scores={data.resorts} area={area} />
        </>
      ) : (
        <div className="text-center py-32 text-[#86868b]">データの読み込みに失敗しました</div>
      )}

      {/* Footer notes */}
      {area === 'hokkaido' && (
        <p className="text-center text-[11px] text-[#666] mt-12 mb-2">
          🚌 = 新千岁机场有直达巴士
        </p>
      )}
      <p className={`text-center text-[11px] text-[#666] ${area === 'hokkaido' ? 'mb-4' : 'mt-12 mb-4'}`}>
        💡 票价为官网线上购票最低价，仅供参考。实际价格请以各雪场官网为准。
      </p>
    </div>
  );
}
