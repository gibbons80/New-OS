import React from 'react';
import { cn } from '@/lib/utils';

export default function LeaderboardItem({ rank, name, stats, isCurrentUser }) {
  return (
    <div className={cn(
      "flex items-center gap-2 md:gap-4 p-2 md:p-3 rounded-xl transition-colors",
      isCurrentUser ? "bg-emerald-50 border border-emerald-200" : "hover:bg-slate-50"
    )}>
      <div className={cn(
        "w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold shrink-0",
        rank === 1 && "bg-amber-100 text-amber-700",
        rank === 2 && "bg-slate-200 text-slate-600",
        rank === 3 && "bg-orange-100 text-orange-700",
        rank > 3 && "bg-slate-100 text-slate-500"
      )}>
        {rank}
      </div>
      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium text-sm md:text-base shrink-0">
        {name?.charAt(0) || 'U'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm md:text-base font-medium text-slate-900 truncate">
          {name} {isCurrentUser && <span className="text-emerald-600">(You)</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm md:text-lg font-bold text-slate-900">{stats.points}</div>
        <div className="text-[10px] md:text-xs text-slate-400">pts</div>
      </div>
    </div>
  );
}