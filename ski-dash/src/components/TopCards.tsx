'use client';

import { ResortScore } from '@/lib/types';
import { ScoreBadgeWithLabel, WeatherIcon, WarningBadge } from './ScoreBadge';
import Link from 'next/link';

const medals = ['🥇', '🥈', '🥉'];

// 生成小红书风格推荐理由，三张卡不重复
function getRecommendReasons(scores: ResortScore[]): string[] {
  const templates = [
    // 雪况好
    [
      (s: ResortScore) => `今日新雪${s.forecast?.newSnowCm ?? 0}cm，粉雪天堂就是这里！✨`,
      (s: ResortScore) => `${s.forecast?.newSnowCm ?? 0}cm新雪已就位，冲就完了🏂`,
      (s: ResortScore) => `新雪${s.forecast?.newSnowCm ?? 0}cm降临，不去亏一个亿❄️`,
    ],
    // 性价比
    [
      (s: ResortScore) => `雪票¥${s.resort.liftPassPrice.toLocaleString()}还要啥自行车，冲！💰`,
      (s: ResortScore) => `性价比之王，¥${s.resort.liftPassPrice.toLocaleString()}滑到爽🎿`,
      (s: ResortScore) => `花小钱办大事，¥${s.resort.liftPassPrice.toLocaleString()}就能拿下💸`,
    ],
    // 交通近
    [
      (s: ResortScore) => `${(s.resort.driveTimeMin / 60).toFixed(1)}h就到，说走就走的滑雪之旅🚗`,
      (s: ResortScore) => `距离超近只要${(s.resort.driveTimeMin / 60).toFixed(1)}h，周末轻松往返✌️`,
      (s: ResortScore) => `车程仅${(s.resort.driveTimeMin / 60).toFixed(1)}h，睡到自然醒再出发😴`,
    ],
    // 天气好
    [
      (s: ResortScore) => `今天天气绝了，能见度拉满的好日子☀️`,
      (s: ResortScore) => `蓝天白雪的完美搭配，拍照绝绝子📸`,
      (s: ResortScore) => `天公作美，今天是绝佳的滑雪日🌤️`,
    ],
    // 综合高分
    [
      (s: ResortScore) => `综合评分${s.totalScore}分，今天的MVP非它莫属🏆`,
      (s: ResortScore) => `全方位高分选手，闭眼选都不会错👑`,
      (s: ResortScore) => `今日最强推荐，各项指标都在线🔥`,
    ],
    // 雪道丰富
    [
      (s: ResortScore) => `${s.resort.trailCount}条雪道任你挑，从早滑到晚都不腻🎯`,
      (s: ResortScore) => `雪道超多共${s.resort.trailCount}条，新手老鸟都能找到快乐⛷️`,
      (s: ResortScore) => `${s.resort.trailCount}条道等你解锁，滑雪就像开盲盒🎁`,
    ],
  ];

  const reasons: string[] = [];
  const usedCategories = new Set<number>();

  for (let i = 0; i < Math.min(3, scores.length); i++) {
    const s = scores[i];
    // Pick best category for this resort
    let bestCat = 4; // default: 综合
    const snow = s.forecast?.newSnowCm ?? 0;
    const weather = s.weatherScore ?? 0;

    if (snow >= 10 && !usedCategories.has(0)) bestCat = 0;
    else if (s.valueScore >= 70 && !usedCategories.has(1)) bestCat = 1;
    else if (s.resort.driveTimeMin <= 150 && !usedCategories.has(2)) bestCat = 2;
    else if (weather >= 70 && !usedCategories.has(3)) bestCat = 3;
    else if (s.resort.trailCount >= 20 && !usedCategories.has(5)) bestCat = 5;
    else {
      // Find unused category
      for (const c of [4, 0, 1, 2, 3, 5]) {
        if (!usedCategories.has(c)) { bestCat = c; break; }
      }
    }

    usedCategories.add(bestCat);
    reasons.push(templates[bestCat][i](s));
  }

  return reasons;
}
const borderClasses = [
  'border border-[#B8860B]/20',
  'border border-[#94a3b8]/15',
  'border border-[#CD7F32]/15',
];

export function TopCards({ scores }: { scores: ResortScore[] }) {
  const top3 = scores.slice(0, 3);
  const reasons = getRecommendReasons(top3);

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold text-[#e2e8f0] mb-6">🏆 今日推荐</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {top3.map((score, i) => (
          <Link
            key={score.resortId}
            href={`/resort/${score.resortId}`}
            className={`group relative block rounded-2xl bg-[#1a1a1e] p-6 transition-all duration-300 hover:bg-[#222226] ${borderClasses[i]}`}
          >
            {/* Medal + Score on same row */}
            <div className="flex justify-between items-start mb-4">
              <span className="text-2xl">{medals[i]}</span>
              <ScoreBadgeWithLabel score={score.totalScore} />
            </div>

            <div className="flex items-center gap-2 mb-0.5 whitespace-nowrap">
              <h3 className="text-2xl font-bold text-white">{score.resort.nameJa}</h3>
              <span className="inline-flex px-2 py-0.5 rounded-full bg-white/[0.07] text-[11px] text-[#8e8e93] leading-none">{score.resort.region}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-[#94a3b8] mb-4">
              <span>{score.resort.name}</span>
              <span className="whitespace-nowrap text-xs">雪道: 🟢{score.resort.difficultyBeginner}% 🔴{score.resort.difficultyIntermediate}% ⚫{score.resort.difficultyAdvanced}%</span>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-[#cbd5e1]">
              <span>🌨️ <strong className="text-[#22d3ee]">{score.forecast?.newSnowCm ?? 0}cm</strong> 新雪</span>
              <span>⛰️ <strong>{score.forecast?.snowBaseCm ?? 0}cm</strong> 積雪</span>
              <span>🌡️ {score.forecast?.tempMidC ?? '-'}°C <WeatherIcon condition={score.forecast?.weatherCondition ?? 'unknown'} /></span>
              <span>💨 {score.forecast?.windSpeedMid ?? '-'}km/h</span>
              <span>🚗 {(score.resort.driveTimeMin / 60).toFixed(1)}h</span>
            </div>

            {/* 推荐理由 */}
            <div className="mt-4 pt-3 border-t border-white/[0.06]">
              <p className="text-xs text-[#fbbf24]">{reasons[i]}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
