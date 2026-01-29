import React from 'react';
import { Calendar, Target, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export default function MonthlyGoalProgress({ user, bookings, monthlyGoal }) {
  if (!user || !monthlyGoal) return null;

  const today = new Date();
  const startDate = user.start_date ? new Date(user.start_date) : null;
  const daysFromStart = startDate ? differenceInDays(today, startDate) : 999;

  let goalAmount = 0;
  let currentProgress = 0;
  let periodLabel = '';
  let periodStart = null;
  let periodEnd = null;

  if (monthlyGoal.goal_type === 'onboarding' && daysFromStart <= 90) {
    // Combined 90-day onboarding goal
    goalAmount = monthlyGoal.onboarding_day_1_60_goal + monthlyGoal.onboarding_day_61_90_goal;
    periodLabel = `Days 1-90 (Day ${daysFromStart})`;
    periodStart = startDate;
    periodEnd = new Date(startDate);
    periodEnd.setDate(periodEnd.getDate() + 89); // Day 1-90
    
    currentProgress = bookings.filter(b => {
      const bookingDate = toZonedTime(new Date(b.booked_at || b.created_date), 'America/New_York');
      return bookingDate >= periodStart && bookingDate <= periodEnd && b.booked_by_id === user.id;
    }).length;
  } else {
    // Standard monthly goal
    goalAmount = monthlyGoal.standard_monthly_goal;
    periodLabel = format(today, 'MMMM yyyy');
    periodStart = startOfMonth(today);
    periodEnd = endOfMonth(today);
    
    currentProgress = bookings.filter(b => {
      const bookingDate = toZonedTime(new Date(b.booked_at || b.created_date), 'America/New_York');
      return bookingDate >= periodStart && bookingDate <= periodEnd && b.booked_by_id === user.id;
    }).length;
  }

  const percentage = Math.min((currentProgress / goalAmount) * 100, 100);
  const daysInPeriod = differenceInDays(periodEnd, periodStart);
  const daysElapsed = differenceInDays(today, periodStart);
  const daysRemaining = Math.max(differenceInDays(periodEnd, today), 0);
  const pacePercentage = (daysElapsed / daysInPeriod) * 100;
  const isOnTrack = percentage >= pacePercentage;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-3 md:p-4 text-white"
    >
      <div className="hidden md:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Target className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-xs md:text-sm font-semibold truncate">
              {monthlyGoal.goal_type === 'onboarding' && daysFromStart <= 90 ? 'Onboarding Goal' : 'Monthly Goal'}
            </h3>
            <p className="text-indigo-100 text-[10px] md:text-xs truncate">
              {monthlyGoal.goal_type === 'onboarding' && daysFromStart <= 90 ? periodLabel : format(today, 'MMMM yyyy')}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl md:text-2xl font-bold">{currentProgress}/{goalAmount}</div>
          <div className="text-indigo-100 text-xs">{Math.round(percentage)}%</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-white/20 rounded-full overflow-hidden md:mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute inset-y-0 left-0 bg-white rounded-full"
        />
        <div
          className="absolute inset-y-0 w-0.5 bg-yellow-300"
          style={{ left: `${pacePercentage}%` }}
          title="Expected pace"
        />
        {monthlyGoal.goal_type === 'onboarding' && daysFromStart <= 90 && (
          <div
            className="absolute inset-y-0 w-0.5 bg-green-300"
            style={{ left: `${(60 / 90) * 100}%` }}
            title="30 bookings by Day 60"
          />
        )}
      </div>

      {/* Status Footer */}
      <div className="hidden md:flex items-center justify-between text-[10px] md:text-xs">
        <div className="flex items-center gap-1">
          <TrendingUp className={cn("w-3 h-3", isOnTrack ? "text-green-300" : "text-yellow-300")} />
          <span className="text-indigo-100">{isOnTrack ? "On track" : "Behind pace"}</span>
        </div>
        <span className="text-indigo-100">{daysRemaining}d left</span>
      </div>
    </motion.div>
  );
}