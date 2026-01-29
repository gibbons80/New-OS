import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { formatInEST } from '@/components/dateFormatter';
import { 
  CheckCircle, 
  Circle, 
  History,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function TasksPastSubmissions({ user }) {
  const [expandedPlans, setExpandedPlans] = useState({});

  // Fetch all past plans (including multiple submissions per day)
  const { data: pastPlans = [] } = useQuery({
    queryKey: ['past-daily-plans', user?.id],
    queryFn: async () => {
      const plans = await base44.entities.DailyPlan.filter({
        user_id: user?.id,
        archived: { $ne: true }
      }, '-created_date');
      // Show any plan that has been worked on (has tasks or submission timestamps)
      return plans.filter(p => 
        p.submitted_at_morning || 
        p.submitted_at_eod || 
        (p.morning_tasks && p.morning_tasks.length > 0) ||
        (p.eod_tasks_completed && p.eod_tasks_completed.length > 0)
      );
    },
    enabled: !!user?.id
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Past Submissions</h1>
        <p className="text-slate-500 mt-1 text-sm md:text-base">View previous daily plans</p>
      </motion.div>

      <div className="space-y-3 md:space-y-4">
        {pastPlans.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-8 md:p-12 text-center shadow-lg"
          >
            <History className="w-10 h-10 md:w-12 md:h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm md:text-base">No past submissions yet</p>
          </motion.div>
        ) : (
          pastPlans.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden shadow-lg"
            >
              <button
                onClick={() => setExpandedPlans({
                  ...expandedPlans,
                  [plan.id]: !expandedPlans[plan.id]
                })}
                className="w-full p-4 md:p-6 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm md:text-base text-slate-900 break-words">
                      {plan.submitted_at_morning 
                        ? formatInEST(plan.submitted_at_morning, 'EEEE, MMMM d, yyyy h:mm a')
                        : format(new Date(plan.date), 'EEEE, MMMM d, yyyy')}
                    </h3>
                    <p className="text-[10px] md:text-xs text-slate-400 mt-0.5">
                      Plan Date: {format(new Date(plan.date), 'MMM d, yyyy')}
                    </p>
                    <div className="flex items-center gap-2 md:gap-3 mt-2 flex-wrap">
                      <span className={cn(
                        "px-2 py-1 text-[10px] md:text-xs font-medium rounded-lg",
                        plan.status === 'eod_submitted' 
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-blue-100 text-blue-700"
                      )}>
                        {plan.status === 'eod_submitted' ? 'Completed' : 'Morning Only'}
                      </span>
                      <span className="text-xs md:text-sm text-slate-500">
                        {plan.morning_tasks?.length || 0} tasks planned
                      </span>
                    </div>
                    <p className="text-[10px] md:text-xs text-slate-400 mt-1">
                      {plan.status === 'eod_submitted' && plan.submitted_at_eod
                        ? `Submitted: ${formatInEST(plan.submitted_at_eod, 'MMM d, yyyy h:mm a')}`
                        : plan.submitted_at_morning
                        ? `Submitted: ${formatInEST(plan.submitted_at_morning, 'MMM d, yyyy h:mm a')}`
                        : ''}
                    </p>
                  </div>
                  <ChevronDown className={cn(
                    "w-4 h-4 md:w-5 md:h-5 text-slate-400 transition-transform shrink-0",
                    expandedPlans[plan.id] && "rotate-180"
                  )} />
                </div>
              </button>

              <AnimatePresence>
                {expandedPlans[plan.id] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 md:px-6 pb-4 md:pb-6 space-y-4">
                      {/* Morning Tasks */}
                      {plan.morning_tasks?.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs md:text-sm font-medium text-slate-700">Morning Plan:</h4>
                          {plan.morning_tasks.map((task, idx) => {
                            const isCompleted = plan.eod_tasks_completed?.some(t => t.title === task.title);
                            const isRolledOver = plan.rolled_over_tasks?.some(t => t.title === task.title);
                            
                            return (
                              <div key={idx} className="flex items-start gap-2 text-xs md:text-sm text-slate-600 ml-4">
                                {isCompleted ? (
                                  <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-emerald-600 fill-emerald-600 shrink-0 mt-0.5" />
                                ) : isRolledOver ? (
                                  <Circle className="w-3 h-3 md:w-4 md:h-4 text-amber-600 fill-amber-600 shrink-0 mt-0.5" />
                                ) : (
                                  <Circle className="w-3 h-3 md:w-4 md:h-4 text-slate-400 shrink-0 mt-0.5" />
                                )}
                                <span className="break-words">{task.title}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* EOD Summary */}
                      {plan.status === 'eod_submitted' && (
                        <div className="pt-4 border-t border-slate-200 space-y-2">
                          {plan.eod_tasks_completed?.length > 0 && (
                            <div className="text-xs md:text-sm">
                              <span className="font-medium text-emerald-700">
                                ✓ {plan.eod_tasks_completed.length} completed
                              </span>
                            </div>
                          )}
                          {plan.rolled_over_tasks?.length > 0 && (
                            <div className="text-xs md:text-sm">
                              <span className="font-medium text-amber-700">
                                → {plan.rolled_over_tasks.length} rolled over
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}