import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function GoalProgress({ 
  label, 
  current, 
  goal, 
  icon: Icon,
  color = 'emerald' 
}) {
  const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  
  const colorClasses = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    violet: 'bg-violet-500',
  };

  const bgClasses = {
    emerald: 'bg-emerald-100',
    blue: 'bg-blue-100',
    amber: 'bg-amber-100',
    violet: 'bg-violet-100',
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100">
      <div className={cn("p-2 rounded-lg", bgClasses[color])}>
        <Icon className={cn("w-5 h-5", `text-${color}-600`)} />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          <span className="text-sm font-bold text-slate-900">
            {current} <span className="text-slate-400 font-normal">/ {goal}</span>
          </span>
        </div>
        <div className={cn("h-2 rounded-full overflow-hidden", bgClasses[color])}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={cn("h-full rounded-full", colorClasses[color])}
          />
        </div>
      </div>
    </div>
  );
}