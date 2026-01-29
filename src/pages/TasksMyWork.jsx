import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { formatInEST } from '@/components/dateFormatter';
import { createPageUrl } from '@/utils';
import { 
  Plus, 
  CheckCircle, 
  Circle, 
  Clock,
  AlertCircle,
  ArrowRight,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import MorningPlanGate from '@/components/tasks/MorningPlanGate';
import EODCloseoutGate from '@/components/tasks/EODCloseoutGate';
import DailyPlanTaskItem from '@/components/tasks/DailyPlanTaskItem';
import AddTaskToDay from '@/components/tasks/AddTaskToDay';

export default function TasksMyWork({ user }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const today = formatInTimeZone(new Date(), 'America/New_York', 'yyyy-MM-dd');
  const [showMorningGate, setShowMorningGate] = useState(false);
  const [showEODGate, setShowEODGate] = useState(false);

  // Fetch most recent plan (to handle day changes)
  const { data: todaysPlan } = useQuery({
    queryKey: ['daily-plan', user?.id, today],
    queryFn: async () => {
      const plans = await base44.entities.DailyPlan.filter({
        user_id: user?.id
      }, '-created_date');
      
      // If latest plan is incomplete, use that (even if from previous day)
      const latestPlan = plans[0];
      if (latestPlan && (latestPlan.status === 'morning_submitted' || latestPlan.status === 'not_started')) {
        return latestPlan;
      }
      
      // Otherwise, check for today's plan
      const todayPlan = plans.find(p => p.date === today);
      return todayPlan || null;
    },
    enabled: !!user?.id
  });

  // Fetch user's tasks
  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: () => base44.entities.Task.filter({
      owner_id: user?.id,
      status: { $in: ['open', 'in_progress'] }
    }, '-priority,-due_date'),
    enabled: !!user?.id
  });





  // Check if gates need to be shown
  useEffect(() => {
    if (!todaysPlan || todaysPlan.status === 'not_started' || todaysPlan.status === 'eod_submitted') {
      setShowMorningGate(true);
    } else if (todaysPlan.status === 'morning_submitted') {
      // Check if it's EOD time (after 4pm EST)
      const estHour = parseInt(formatInTimeZone(new Date(), 'America/New_York', 'HH'));
      if (estHour >= 16) {
        setShowEODGate(true);
      }
    }
  }, [todaysPlan]);

  const handleMorningComplete = () => {
    setShowMorningGate(false);
    queryClient.invalidateQueries({ queryKey: ['daily-plan'] });
  };

  const handleEODComplete = () => {
    setShowEODGate(false);
    queryClient.invalidateQueries({ queryKey: ['daily-plan'] });
  };

  // Show morning gate if no plan or not started or eod submitted
  if (showMorningGate && (!todaysPlan || todaysPlan.status === 'not_started' || todaysPlan.status === 'eod_submitted')) {
    return (
      <MorningPlanGate
        user={user}
        today={today}
        onComplete={handleMorningComplete}
        existingPlan={todaysPlan?.status === 'eod_submitted' ? null : todaysPlan}
      />
    );
  }

  // Show EOD gate if needed
  if (showEODGate && todaysPlan?.status === 'morning_submitted') {
    return (
      <EODCloseoutGate
        user={user}
        todaysPlan={todaysPlan}
        onComplete={handleEODComplete}
        onCancel={() => setShowEODGate(false)}
      />
    );
  }

  // Filter tasks using EST dates
  const todayEST = new Date();
  const overdueTasks = allTasks.filter(t => {
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date + 'T00:00:00');
    return dueDate < todayEST && t.status !== 'done';
  });
  const todayTasks = allTasks.filter(t => 
    t.due_date && t.due_date === today
  );
  const upcomingTasks = allTasks.filter(t => {
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date + 'T00:00:00');
    return dueDate > todayEST && t.due_date !== today;
  });



  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">My Work</h1>
          <p className="text-slate-600 mt-2">
            {allTasks.length} active tasks
          </p>
        </div>
        <Button
          onClick={() => navigate(createPageUrl('PlanTomorrow'))}
          className="bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Plan Tomorrow
        </Button>
      </motion.div>

      {/* Today's Plan - Interactive Task List */}
      {todaysPlan?.status === 'morning_submitted' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  Today's Tasks
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {todaysPlan.morning_tasks?.filter(t => t.completed_today).length || 0} of {todaysPlan.morning_tasks?.length || 0} completed
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEODGate(true)}
                className="border-slate-300 hover:bg-white"
              >
                End of Day Closeout
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          <div className="p-6 space-y-3">
            {todaysPlan.morning_tasks?.map((task, idx) => (
              <DailyPlanTaskItem
                key={idx}
                task={task}
                taskIndex={idx}
                dailyPlan={todaysPlan}
              />
            ))}

            {/* Add New Task */}
            <AddTaskToDay todaysPlan={todaysPlan} user={user} />
          </div>
        </motion.div>
      )}

      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl border border-red-200 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          <div className="p-4 bg-red-50 border-b border-red-200">
            <h3 className="font-semibold text-red-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Overdue ({overdueTasks.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            <AnimatePresence>
              {overdueTasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}




    </div>
  );
}

function TaskRow({ task }) {
  const queryClient = useQueryClient();
  const [isCompleting, setIsCompleting] = useState(false);

  const priorityColors = {
    high: 'text-red-600 bg-red-50',
    medium: 'text-amber-600 bg-amber-50',
    low: 'text-blue-600 bg-blue-50'
  };

  const completeTaskMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Task.update(task.id, { status: 'done' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  const handleComplete = async () => {
    setIsCompleting(true);
    await completeTaskMutation.mutateAsync();
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, x: 100 }}
      className="p-4 hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <button
          onClick={handleComplete}
          disabled={completeTaskMutation.isPending}
          className={cn(
            "mt-0.5 transition-all",
            completeTaskMutation.isPending && "opacity-50 cursor-not-allowed"
          )}
        >
          {completeTaskMutation.isPending ? (
            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Circle className="w-5 h-5 text-slate-400 hover:text-emerald-600 hover:fill-emerald-50" />
          )}
        </button>
        <div className="flex-1">
          <h4 className="font-medium text-slate-900">{task.title}</h4>
          {task.description && (
            <p className="text-sm text-slate-500 mt-1">{task.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {task.priority && (
              <span className={cn(
                "px-2 py-0.5 text-xs font-medium rounded",
                priorityColors[task.priority]
              )}>
                {task.priority}
              </span>
            )}
            {task.due_date && (
              <span className="text-xs text-slate-500">
                Due {format(new Date(task.due_date), 'MMM d')}
              </span>
            )}
            {task.related_to_name && (
              <span className="text-xs text-slate-500">
                → {task.related_to_name}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}