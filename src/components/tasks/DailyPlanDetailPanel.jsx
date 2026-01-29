import React from 'react';
import { X, CheckCircle, ArrowRight, Circle, Clock, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatInEST } from '@/components/dateFormatter';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';

export default function DailyPlanDetailPanel({ plan, onClose }) {
  const queryClient = useQueryClient();

  const archiveMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.DailyPlan.update(plan.id, {
        archived: !plan.archived
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-plans'] });
      onClose();
    }
  });

  if (!plan) return null;

  const renderTaskItem = (task, type) => {
    let icon = Circle;
    let bgColor = 'bg-slate-50';
    let textColor = 'text-slate-700';
    let borderColor = 'border-slate-200';

    if (task.completed_today) {
      icon = CheckCircle;
      bgColor = 'bg-emerald-50';
      textColor = 'text-emerald-700';
      borderColor = 'border-emerald-300';
    } else if (task.rollover_to_tomorrow) {
      icon = ArrowRight;
      bgColor = 'bg-amber-50';
      textColor = 'text-amber-700';
      borderColor = 'border-amber-300';
    }

    const Icon = icon;

    return (
      <div key={task.id || task.title} className={cn(
        'flex items-start gap-3 p-3 rounded-lg border', 
        bgColor, borderColor
      )}>
        <Icon className={cn('w-5 h-5 mt-0.5', textColor)} />
        <div className="flex-1">
          <p className={cn('font-medium', textColor)}>{task.title}</p>
          {task.description && <p className="text-sm text-slate-500 mt-1">{task.description}</p>}
          {task.rollover_reason && (
            <p className="text-xs text-amber-600 mt-1">
              Rolled over: {task.rollover_reason.replace(/_/g, ' ')}
            </p>
          )}
          {task.rollover_notes && (
            <p className="text-xs text-slate-500 mt-1">
              Notes: {task.rollover_notes}
            </p>
          )}
          {type === 'added' && (
            <p className="text-xs text-emerald-600 mt-1">
              Completed today (added ad-hoc)
            </p>
          )}
          {task.completion_time && (
            <p className="text-xs text-slate-500 mt-1">
              ✓ Completed: {formatInEST(task.completion_time, 'MMM d, yyyy h:mm a')}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {plan && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 400 }}
          className="fixed right-0 top-0 h-full w-full md:w-1/2 lg:w-1/3 bg-white shadow-2xl border-l border-slate-200 z-50 overflow-y-auto"
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Daily Plan: {plan.user_name}</h2>
              <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                {plan.created_date && (
                  <p>Created: {formatInEST(plan.created_date, 'MMM d, yyyy h:mm a')}</p>
                )}
                {plan.submitted_at_morning && (
                  <p>Morning Submitted: {formatInEST(plan.submitted_at_morning, 'MMM d, yyyy h:mm a')}</p>
                )}
                {plan.submitted_at_eod && (
                  <p>EOD Submitted: {formatInEST(plan.submitted_at_eod, 'MMM d, yyyy h:mm a')}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => archiveMutation.mutate()}
                disabled={archiveMutation.isPending}
              >
                <Archive className="w-4 h-4 mr-2" />
                {plan.archived ? 'Unarchive' : 'Archive'}
              </Button>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {plan.status === 'not_started' && (
              <div className="flex items-center gap-2 text-slate-500">
                <Clock className="w-5 h-5" />
                <p>No plan submitted for this day.</p>
              </div>
            )}

            {plan.morning_tasks?.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-slate-800 mb-3">Morning Plan Tasks</h3>
                <div className="space-y-3">
                  {plan.morning_tasks.map((task, idx) => renderTaskItem(task, 'morning'))}
                </div>
                {plan.notes_morning && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-sm font-medium text-slate-700">Morning Notes:</p>
                    <p className="text-sm text-slate-600 mt-1">{plan.notes_morning}</p>
                  </div>
                )}
              </section>
            )}

            {plan.eod_tasks_completed?.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-emerald-800 mb-3">Completed Tasks (EOD)</h3>
                <div className="space-y-3">
                  {plan.eod_tasks_completed.map((task, idx) => renderTaskItem(task, 'completed'))}
                </div>
              </section>
            )}

            {plan.eod_tasks_added?.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-blue-800 mb-3">Additional Tasks Completed (EOD)</h3>
                <div className="space-y-3">
                  {plan.eod_tasks_added.map((task, idx) => renderTaskItem(task, 'added'))}
                </div>
              </section>
            )}

            {plan.rolled_over_tasks?.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-amber-800 mb-3">Rolled Over Tasks</h3>
                <div className="space-y-3">
                  {plan.rolled_over_tasks.map((task, idx) => renderTaskItem(task, 'rolled_over'))}
                </div>
              </section>
            )}

            {plan.notes_eod && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm font-medium text-slate-700">EOD Notes:</p>
                <p className="text-sm text-slate-600 mt-1">{plan.notes_eod}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}