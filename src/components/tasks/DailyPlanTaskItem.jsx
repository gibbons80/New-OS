import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function DailyPlanTaskItem({ task, taskIndex, dailyPlan }) {
  const queryClient = useQueryClient();

  const priorityColors = {
    high: 'text-red-600 bg-red-50',
    medium: 'text-amber-600 bg-amber-50',
    low: 'text-blue-600 bg-blue-50'
  };

  const toggleCompleteMutation = useMutation({
    mutationFn: async () => {
      const updatedTasks = [...dailyPlan.morning_tasks];
      updatedTasks[taskIndex] = {
        ...updatedTasks[taskIndex],
        completed_today: !task.completed_today,
        completion_time: !task.completed_today ? new Date().toISOString() : null
      };

      await base44.entities.DailyPlan.update(dailyPlan.id, {
        morning_tasks: updatedTasks
      });
    },
    onMutate: async () => {
      // Optimistically update UI immediately
      await queryClient.cancelQueries({ queryKey: ['daily-plan'] });
      const previousPlan = queryClient.getQueryData(['daily-plan', dailyPlan.user_id, dailyPlan.date]);
      
      queryClient.setQueryData(['daily-plan', dailyPlan.user_id, dailyPlan.date], (old) => {
        if (!old) return old;
        const updatedTasks = [...old.morning_tasks];
        updatedTasks[taskIndex] = {
          ...updatedTasks[taskIndex],
          completed_today: !task.completed_today,
          completion_time: !task.completed_today ? new Date().toISOString() : null
        };
        return { ...old, morning_tasks: updatedTasks };
      });
      
      return { previousPlan };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousPlan) {
        queryClient.setQueryData(['daily-plan', dailyPlan.user_id, dailyPlan.date], context.previousPlan);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-plan'] });
    }
  });

  const handleToggle = () => {
    toggleCompleteMutation.mutate();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-xl border transition-all",
        task.completed_today 
          ? "bg-emerald-50 border-emerald-200" 
          : "bg-white border-slate-200 hover:border-slate-300"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={handleToggle}
          disabled={toggleCompleteMutation.isPending}
          className={cn(
            "mt-0.5 transition-all",
            toggleCompleteMutation.isPending && "opacity-50 cursor-not-allowed"
          )}
        >
          {toggleCompleteMutation.isPending ? (
            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <div className={cn(
              "w-5 h-5 rounded-full border-2 transition-all",
              task.completed_today 
                ? "bg-emerald-600 border-emerald-600" 
                : "border-slate-400 hover:border-emerald-600"
            )} />
          )}
        </button>
        <div className="flex-1">
          <h4 className={cn(
            "font-medium",
            task.completed_today ? "text-slate-500 line-through" : "text-slate-900"
          )}>
            {task.title}
          </h4>
        </div>
      </div>
    </motion.div>
  );
}