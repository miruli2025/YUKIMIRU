'use client';

import { useState, useEffect } from 'react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
}

function getJSTDates(): string[] {
  // Always use JST (UTC+9), ignore user's local timezone
  const nowUtc = Date.now();
  const jstMs = nowUtc + 9 * 60 * 60 * 1000;
  const jstDate = new Date(jstMs);
  const y = jstDate.getUTCFullYear();
  const m = jstDate.getUTCMonth();
  const d = jstDate.getUTCDate();

  const dates: string[] = [];
  for (let i = 0; i < 6; i++) {
    const day = new Date(Date.UTC(y, m, d + i));
    const yyyy = day.getUTCFullYear();
    const mm = String(day.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(day.getUTCDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

function formatDate(dateStr: string) {
  const [y, m, dd] = dateStr.split('-').map(Number);
  const d = new Date(y, m - 1, dd);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = days[d.getDay()];
  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
  return { label: `${month}/${day}(${dow})`, isWeekend };
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const [dates, setDates] = useState<string[]>([]);

  useEffect(() => {
    const d = getJSTDates();
    setDates(d);
    // If current value is empty or not in the new dates, set to first
    if (!value || !d.includes(value)) {
      onChange(d[0]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (dates.length === 0) return null; // SSR: render nothing

  return (
    <div className="flex items-center gap-3 mb-8">
      <span className="text-sm text-[#94a3b8]">📅</span>
      <div className="flex gap-2 flex-nowrap overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {dates.map(date => {
          const { label, isWeekend } = formatDate(date);
          const isActive = date === value;
          return (
            <button
              key={date}
              onClick={() => onChange(date)}
              className={`px-4 py-2 text-sm rounded-full transition-all duration-200 border shrink-0 ${
                isActive
                  ? 'bg-[#22d3ee]/20 text-[#22d3ee] border-[#22d3ee]/50'
                  : 'bg-white/5 text-[#94a3b8] border-white/10 hover:bg-white/10'
              } ${isWeekend && !isActive ? 'text-[#c084fc]' : ''}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
