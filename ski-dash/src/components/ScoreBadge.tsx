'use client';

export function ScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'lg'
    ? 'px-3.5 py-1 text-base'
    : size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-2.5 py-0.5 text-sm';

  return (
    <div className={`bg-[#22d3ee]/10 border border-[#22d3ee]/30 ${dims} rounded-full inline-flex items-center justify-center font-bold text-[#22d3ee] shrink-0`}>
      {Math.round(score)}
    </div>
  );
}

export function ScoreBadgeWithLabel({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="bg-[#22d3ee]/10 border border-[#22d3ee]/30 px-4 py-1.5 rounded-full flex items-center justify-center">
        <span className="text-xl font-extrabold text-[#22d3ee]">{Math.round(score)}</span>
      </div>
      <span className="text-sm text-[#86868b]">/ 100</span>
    </div>
  );
}

export function ColorCell({ value, thresholds }: { value: string | number; thresholds?: [number, number] }) {
  if (thresholds && typeof value === 'number') {
    const [good, bad] = thresholds;
    const color = value >= good ? 'text-[#34d399]' : value >= bad ? 'text-[#fbbf24]' : 'text-[#f87171]';
    return <span className={`font-medium ${color}`}>{value}</span>;
  }
  return <span>{value}</span>;
}

export function WeatherIcon({ condition }: { condition: string }) {
  const icons: Record<string, string> = {
    'clear': '☀️',
    'cloud': '☁️',
    'light-snow': '🌨️',
    'heavy-snow': '❄️',
    'rain': '🌧️',
    'mixed': '🌧️❄️',
    'unknown': '❓',
  };
  return <span className="text-base">{icons[condition] || '❓'}</span>;
}

export function WarningBadge({ type }: { type: 'rain' | 'wind' | 'powder' }) {
  if (type === 'rain') return <span className="text-[11px] text-[#f87171] bg-[#f87171]/10 px-2 py-0.5 rounded-full">🌧️ 降雨</span>;
  if (type === 'wind') return <span className="text-[11px] text-[#fbbf24] bg-[#fbbf24]/10 px-2 py-0.5 rounded-full">💨 強風</span>;
  if (type === 'powder') return <span className="text-[11px] text-[#22d3ee] bg-[#22d3ee]/10 px-2 py-0.5 rounded-full">🎿 Powder!</span>;
  return null;
}
