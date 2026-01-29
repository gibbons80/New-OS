import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { formatInEST } from '@/components/dateFormatter';
import { 
  CheckCircle, 
  ArrowRight,
  Plus,
  X,
  Moon,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function EODCloseoutGate({ user, todaysPlan, onComplete, onCancel }) {
  const queryClient = useQueryClient();
  const [taskStatuses, setTaskStatuses] = useState(
    todaysPlan.morning_tasks?.reduce((acc, task, idx) => {
      acc[idx] = { 
        completed: task.completed_today || false, 
        rollover: false, 
        reason: '', 
        notes: '' 
      };
      return acc;
    }, {}) || {}
  );
  const [additionalTasks, setAdditionalTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [eodNotes, setEodNotes] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const updatePlanMutation = useMutation({
    mutationFn: async () => {
      const completed = [];
      const rolledOver = [];
      
      todaysPlan.morning_tasks?.forEach((task, idx) => {
        const status = taskStatuses[idx];
        if (status.completed) {
          completed.push({
            ...task,
            completed_today: true,
            completion_time: new Date().toISOString()
          });
        } else if (status.rollover) {
          rolledOver.push({
            ...task,
            rollover_to_tomorrow: true,
            rollover_reason: status.reason,
            rollover_notes: status.notes
          });
        }
      });

      await base44.entities.DailyPlan.update(todaysPlan.id, {
        status: 'eod_submitted',
        submitted_at_eod: new Date().toISOString(),
        eod_tasks_completed: completed,
        eod_tasks_added: additionalTasks,
        rolled_over_tasks: rolledOver,
        notes_eod: eodNotes
      });
      
      // Check for tomorrow's draft plan and activate it
      const tomorrow = format(new Date(new Date().setDate(new Date().getDate() + 1)), 'yyyy-MM-dd');
      const tomorrowDrafts = await base44.entities.DailyPlan.filter({
        user_id: user?.id,
        date: tomorrow,
        status: 'draft'
      });
      
      if (tomorrowDrafts.length > 0) {
        const tomorrowDraft = tomorrowDrafts[0];
        // Update draft to not_started so it becomes the active plan for tomorrow
        await base44.entities.DailyPlan.update(tomorrowDraft.id, {
          status: 'not_started'
        });
      }
    },
    onSuccess: () => {
      setShowSuccessPopup(true);
      setTimeout(() => {
        setShowSuccessPopup(false);
        queryClient.invalidateQueries({ queryKey: ['daily-plan'] });
        queryClient.invalidateQueries({ queryKey: ['tomorrow-draft-plan'] });
        onComplete();
      }, 4000);
    }
  });

  const handleToggleComplete = (idx) => {
    setTaskStatuses({
      ...taskStatuses,
      [idx]: {
        ...taskStatuses[idx],
        completed: !taskStatuses[idx].completed,
        rollover: false
      }
    });
  };

  const handleToggleRollover = (idx) => {
    setTaskStatuses({
      ...taskStatuses,
      [idx]: {
        ...taskStatuses[idx],
        rollover: !taskStatuses[idx].rollover,
        completed: false
      }
    });
  };

  const handleAddAdditional = () => {
    if (!newTaskTitle.trim()) return;
    
    additionalTasks.push({
      title: newTaskTitle,
      department: user?.departments?.[0] || 'sales',
      priority: 'medium',
      completed_today: true,
      completion_time: new Date().toISOString(),
      created_from: 'manual'
    });
    
    setAdditionalTasks([...additionalTasks]);
    setNewTaskTitle('');
  };

  const canSubmit = todaysPlan.morning_tasks?.every((_, idx) => {
    if (taskStatuses[idx]?.completed) return true;
    if (taskStatuses[idx]?.rollover) {
      // If reason is "other", notes must be provided
      if (taskStatuses[idx]?.reason === 'other') {
        return taskStatuses[idx]?.notes?.trim().length > 0;
      }
      return true;
    }
    return false;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4 md:p-6">
      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl p-8 md:p-12 max-w-md mx-4 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
              <CheckCircle className="w-10 h-10 md:w-12 md:h-12 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
              Great Work Today! 🎉
            </h2>
            <p className="text-base md:text-lg text-slate-600 mb-2">
              Your end of day submission has been recorded.
            </p>
            <p className="text-base md:text-lg text-slate-600 font-medium">
              Have a wonderful day!
            </p>
          </div>
        </div>
      )}
      
      <div className="max-w-3xl w-full bg-white rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 md:p-8 text-white">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={updatePlanMutation.isPending}
            className="text-white hover:bg-white/20 mb-2 md:mb-4 text-sm"
          >
            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            Back to My Work
          </Button>
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <Moon className="w-6 h-6 md:w-8 md:h-8" />
            <h1 className="text-2xl md:text-3xl font-bold">Close Out Your Day</h1>
          </div>
          <p className="text-indigo-100 text-sm md:text-base">
            {formatInEST(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        <div className="p-4 md:p-8 space-y-4 md:space-y-6">
          {/* Morning Plan Review */}
          <div>
            <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-3">
              Morning Plan ({todaysPlan.morning_tasks?.length || 0} tasks)
            </h3>
            <p className="text-xs md:text-sm text-slate-500 mb-4">
              Mark each task as completed or roll over to tomorrow
            </p>
            
            <div className="space-y-3">
              {todaysPlan.morning_tasks?.map((task, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "border-2 rounded-xl p-3 md:p-4 transition-all",
                    taskStatuses[idx]?.completed && "border-emerald-300 bg-emerald-50",
                    taskStatuses[idx]?.rollover && "border-amber-300 bg-amber-50",
                    !taskStatuses[idx]?.completed && !taskStatuses[idx]?.rollover && "border-slate-200"
                  )}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm md:text-base text-slate-900 break-words">{task.title}</h4>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleComplete(idx)}
                        className={cn(
                          "flex-1 md:flex-none text-xs md:text-sm",
                          taskStatuses[idx]?.completed && "bg-emerald-100 border-emerald-300 text-emerald-700"
                        )}
                      >
                        <CheckCircle className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                        <span className="hidden sm:inline">Completed</span>
                        <span className="sm:hidden">Done</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleRollover(idx)}
                        className={cn(
                          "flex-1 md:flex-none text-xs md:text-sm",
                          taskStatuses[idx]?.rollover && "bg-amber-100 border-amber-300 text-amber-700"
                        )}
                      >
                        <ArrowRight className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                        <span className="hidden sm:inline">Roll Over</span>
                        <span className="sm:hidden">Later</span>
                      </Button>
                    </div>
                  </div>

                  {taskStatuses[idx]?.rollover && (
                    <div className="space-y-2 pt-3 border-t border-amber-200">
                      <Select
                        value={taskStatuses[idx]?.reason || ''}
                        onValueChange={(value) => setTaskStatuses({
                          ...taskStatuses,
                          [idx]: { ...taskStatuses[idx], reason: value }
                        })}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Why roll over?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="waiting_on_client">Waiting on client response</SelectItem>
                          <SelectItem value="waiting_on_internal">Waiting on internal approval or asset</SelectItem>
                          <SelectItem value="higher_priority">Higher-priority task took precedence</SelectItem>
                          <SelectItem value="took_longer">Task took longer than estimated</SelectItem>
                          <SelectItem value="unclear_instructions">Instructions or requirements were unclear</SelectItem>
                          <SelectItem value="technical_issue">Technical issue or tool failure</SelectItem>
                          <SelectItem value="started_not_completed">Task was started but not completed</SelectItem>
                          <SelectItem value="urgent_request">Unexpected urgent request came up</SelectItem>
                          <SelectItem value="deprioritized_by_manager">Task was deprioritized by manager</SelectItem>
                          <SelectItem value="personal_sick">Personal or sick day</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder={taskStatuses[idx]?.reason === 'other' ? "Additional notes (required)" : "Additional notes (optional)"}
                        value={taskStatuses[idx]?.notes || ''}
                        onChange={(e) => setTaskStatuses({
                          ...taskStatuses,
                          [idx]: { ...taskStatuses[idx], notes: e.target.value }
                        })}
                        required={taskStatuses[idx]?.reason === 'other'}
                        className={cn(
                          taskStatuses[idx]?.reason === 'other' && !taskStatuses[idx]?.notes && "border-red-300"
                        )}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Additional Completed Tasks */}
          <div>
            <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-3">
              Additional Tasks Completed Today
            </h3>
            <p className="text-xs md:text-sm text-slate-500 mb-4">
              Add any tasks you completed that weren't in your morning plan
            </p>
            
            <div className="flex gap-2 md:gap-3 mb-3">
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task completed today..."
                onKeyPress={(e) => e.key === 'Enter' && handleAddAdditional()}
                className="text-sm"
              />
              <Button onClick={handleAddAdditional} disabled={!newTaskTitle.trim()} className="shrink-0">
                <Plus className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Add</span>
              </Button>
            </div>

            {additionalTasks.length > 0 && (
              <div className="space-y-2">
                {additionalTasks.map((task, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 md:p-3 gap-2"
                  >
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-sm md:text-base text-slate-900 break-words">{task.title}</span>
                    </div>
                    <button
                      onClick={() => setAdditionalTasks(additionalTasks.filter((_, i) => i !== idx))}
                      className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 shrink-0"
                    >
                      <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* EOD Notes */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              End of Day Notes (Optional)
            </label>
            <Textarea
              value={eodNotes}
              onChange={(e) => setEodNotes(e.target.value)}
              placeholder="Reflections, blockers, or notes for tomorrow..."
              rows={3}
            />
          </div>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-4 border-t">
            {!canSubmit && (
              <p className="text-xs md:text-sm text-amber-600 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Please mark all morning tasks as completed or rolled over
              </p>
            )}
            <Button
              onClick={() => updatePlanMutation.mutate()}
              disabled={!canSubmit || updatePlanMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 px-4 md:px-8 w-full sm:w-auto sm:ml-auto text-sm md:text-base"
              size="lg"
            >
              {updatePlanMutation.isPending ? 'Submitting...' : 'Submit EOD Closeout'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}