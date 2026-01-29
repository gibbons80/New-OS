import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { formatInEST } from '@/components/dateFormatter';
import { 
  Plus, 
  Copy,
  X,
  GripVertical,
  Sunrise,
  Star,
  ArrowRight,
  Trash2,
  CheckCircle
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function MorningPlanGate({ user, today, onComplete, existingPlan }) {
  const queryClient = useQueryClient();
  const [planTasks, setPlanTasks] = useState(existingPlan?.morning_tasks || []);
  const [notes, setNotes] = useState(existingPlan?.notes_morning || '');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showCommonTasks, setShowCommonTasks] = useState(false);
  const [selectedCommonTasks, setSelectedCommonTasks] = useState([]);
  const [showRollOverDialog, setShowRollOverDialog] = useState(false);

  // Fetch last completed plan
  const { data: lastPlan } = useQuery({
    queryKey: ['last-daily-plan', user?.id, today],
    queryFn: async () => {
      const plans = await base44.entities.DailyPlan.filter({
        user_id: user?.id,
        status: 'eod_submitted'
      }, '-created_date');
      
      // Get most recent completed plan
      return plans[0] || null;
    }
  });

  // Fetch common tasks
  const { data: commonTasks = [] } = useQuery({
    queryKey: ['common-tasks', user?.id],
    queryFn: async () => {
      const tasks = await base44.entities.Task.filter({
        owner_id: user?.id,
        is_common: true
      });
      // Sort by sort_order if available, otherwise by created_date
      return tasks.sort((a, b) => {
        if (a.sort_order !== undefined && b.sort_order !== undefined) {
          return a.sort_order - b.sort_order;
        }
        return new Date(b.created_date) - new Date(a.created_date);
      });
    },
    enabled: !!user?.id
  });

  // Fetch ALL rolled over tasks from all plans
  const { data: allRollOverTasks = [] } = useQuery({
    queryKey: ['all-rollover-tasks', user?.id],
    queryFn: async () => {
      const plans = await base44.entities.DailyPlan.filter({
        user_id: user?.id,
        department: user?.departments?.[0] || 'sales'
      }, '-date', 100);
      
      const allRolledOver = [];
      plans.forEach(plan => {
        if (plan.rolled_over_tasks && Array.isArray(plan.rolled_over_tasks)) {
          plan.rolled_over_tasks.forEach(task => {
            allRolledOver.push({
              ...task,
              source_plan_id: plan.id,
              source_date: plan.date
            });
          });
        }
      });
      
      // Remove duplicates based on title
      const uniqueTasks = allRolledOver.filter((task, index, self) =>
        index === self.findIndex(t => t.title === task.title)
      );
      
      return uniqueTasks;
    },
    enabled: !!user?.id
  });

  const deleteRollOverTaskMutation = useMutation({
    mutationFn: async ({ planId, taskTitle }) => {
      const plan = await base44.entities.DailyPlan.get(planId);
      const updatedRollOverTasks = (plan.rolled_over_tasks || []).filter(
        t => t.title !== taskTitle
      );
      await base44.entities.DailyPlan.update(planId, {
        rolled_over_tasks: updatedRollOverTasks
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-rollover-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['last-daily-plan'] });
    }
  });



  const createPlanMutation = useMutation({
    mutationFn: async () => {
      const planData = {
        user_id: user?.id,
        user_name: user?.full_name,
        date: today,
        status: 'morning_submitted',
        submitted_at_morning: new Date().toISOString(),
        morning_tasks: planTasks,
        notes_morning: notes,
        manager_visibility: true,
        department: user?.departments?.[0] || 'sales'
      };

      if (existingPlan) {
        return await base44.entities.DailyPlan.update(existingPlan.id, planData);
      }
      return await base44.entities.DailyPlan.create(planData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-plan'] });
      onComplete();
    }
  });

  const handleCopyLast = () => {
    if (!lastPlan) return;
    
    // Copy ALL tasks from last plan - completed, added, and rolled over
    const completedTasks = lastPlan.eod_tasks_completed || [];
    const addedTasks = lastPlan.eod_tasks_added || [];
    const rolledOverTasks = lastPlan.rolled_over_tasks || [];
    const allTasks = [...completedTasks, ...addedTasks, ...rolledOverTasks];
    
    if (allTasks.length > 0) {
      setPlanTasks(allTasks.map(t => ({
        ...t,
        daily_plan_id: undefined,
        created_from: 'copied_from_yesterday',
        completed_today: false,
        rollover_to_tomorrow: false,
        completion_time: null
      })));
    } else if (lastPlan.morning_tasks?.length > 0) {
      setPlanTasks(lastPlan.morning_tasks.map(t => ({
        ...t,
        daily_plan_id: undefined,
        created_from: 'copied_from_yesterday',
        completed_today: false,
        rollover_to_tomorrow: false,
        completion_time: null
      })));
    }
  };



  const handleAddManual = () => {
    if (!newTaskTitle.trim()) return;
    
    setPlanTasks([...planTasks, {
      title: newTaskTitle,
      department: user?.departments?.[0] || 'sales',
      priority: 'medium',
      planned_for_today: true,
      completed_today: false,
      rollover_to_tomorrow: false,
      created_from: 'manual'
    }]);
    
    setNewTaskTitle('');
  };

  const handleToggleCommonTask = (taskId) => {
    if (selectedCommonTasks.includes(taskId)) {
      setSelectedCommonTasks(selectedCommonTasks.filter(id => id !== taskId));
    } else {
      setSelectedCommonTasks([...selectedCommonTasks, taskId]);
    }
  };

  const handleAddCommonTasks = () => {
    const tasksToAdd = commonTasks
      .filter(t => selectedCommonTasks.includes(t.id))
      .map(t => ({
        source_task_id: t.id,
        title: t.title,
        department: t.department,
        linked_object_type: t.related_to_type,
        linked_object_id: t.related_to_id,
        priority: t.priority,
        planned_for_today: true,
        completed_today: false,
        rollover_to_tomorrow: false,
        created_from: 'pulled_from_my_work'
      }));
    
    setPlanTasks([...planTasks, ...tasksToAdd]);
    setSelectedCommonTasks([]);
    setShowCommonTasks(false);
  };

  const handleRemoveTask = (index) => {
    setPlanTasks(planTasks.filter((_, i) => i !== index));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(planTasks);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    
    setPlanTasks(items);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4 md:p-6">
      <div className="max-w-3xl w-full bg-white rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 md:p-8 text-white">
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <Sunrise className="w-6 h-6 md:w-8 md:h-8" />
            <h1 className="text-2xl md:text-3xl font-bold">Plan Your Day</h1>
          </div>
          <p className="text-blue-100 text-sm md:text-base">
            {formatInEST(new Date(), 'EEEE, MMMM d, yyyy h:mm a')}
          </p>
        </div>

        <div className="p-4 md:p-8 space-y-4 md:space-y-6">
          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
            <Button
              variant="outline"
              onClick={handleCopyLast}
              disabled={!lastPlan}
              className="flex-1 text-xs md:text-sm"
            >
              <Copy className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
              <span className="hidden sm:inline">Copy Last</span>
              <span className="sm:hidden">Last</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowRollOverDialog(true)}
              disabled={allRollOverTasks.length === 0}
              className="flex-1 text-xs md:text-sm"
            >
              <ArrowRight className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
              <span className="hidden sm:inline">Roll Over Tasks ({allRollOverTasks.length})</span>
              <span className="sm:hidden">Rollover ({allRollOverTasks.length})</span>
            </Button>
            
            <Dialog open={showCommonTasks} onOpenChange={setShowCommonTasks}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={commonTasks.length === 0}
                  className="flex-1 text-xs md:text-sm"
                >
                  <Star className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                  <span className="hidden sm:inline">Add Common Tasks ({commonTasks.length})</span>
                  <span className="sm:hidden">Common ({commonTasks.length})</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Select Common Tasks</DialogTitle>
                  <DialogDescription>
                    Choose tasks to add to today's plan
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {commonTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleToggleCommonTask(task.id)}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 border border-slate-200 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedCommonTasks.includes(task.id)}
                        onCheckedChange={() => handleToggleCommonTask(task.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{task.title}</p>
                        {task.description && (
                          <p className="text-sm text-slate-500 mt-1">{task.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedCommonTasks([]);
                      setShowCommonTasks(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddCommonTasks}
                    disabled={selectedCommonTasks.length === 0}
                  >
                    Add {selectedCommonTasks.length} Task{selectedCommonTasks.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Add Manual Task */}
          <div className="flex gap-2 md:gap-3">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Add a task for today..."
              onKeyPress={(e) => e.key === 'Enter' && handleAddManual()}
              className="text-sm"
            />
            <Button onClick={handleAddManual} disabled={!newTaskTitle.trim()} className="shrink-0">
              <Plus className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Add</span>
            </Button>
          </div>

          {/* Task List */}
          <div className="space-y-3">
            <h3 className="text-sm md:text-base font-semibold text-slate-900">
              Today's Tasks ({planTasks.length})
            </h3>
            
            {planTasks.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 md:p-12 text-center">
                <p className="text-slate-400 text-xs md:text-sm">
                  No tasks added yet. Use the buttons above to get started.
                </p>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="plan-tasks">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                    >
                      {planTasks.map((task, index) => (
                        <Draggable
                          key={index}
                          draggableId={`task-${index}`}
                          index={index}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="flex items-center gap-2 md:gap-3 bg-slate-50 rounded-lg p-2.5 md:p-3 border border-slate-200"
                            >
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm md:text-base text-slate-900 break-words">{task.title}</p>
                              </div>
                              <button
                                onClick={() => handleRemoveTask(index)}
                                className="p-1.5 md:p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors shrink-0"
                              >
                                <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>

          {/* Optional Notes */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Morning Notes (Optional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes or context for today..."
              rows={3}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              onClick={() => createPlanMutation.mutate()}
              disabled={planTasks.length === 0 || createPlanMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 px-4 md:px-8 w-full sm:w-auto text-sm md:text-base"
              size="lg"
            >
              {createPlanMutation.isPending ? 'Submitting...' : 'Submit Today\'s Plan'}
            </Button>
          </div>
        </div>
      </div>

      {/* Roll Over Tasks Dialog */}
      <Dialog open={showRollOverDialog} onOpenChange={setShowRollOverDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Roll Over Tasks</DialogTitle>
            <DialogDescription>
              Select tasks from previous days to add to today
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-2 mt-4">
            {allRollOverTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                No rolled over tasks available
              </div>
            ) : (
              allRollOverTasks.map((task, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <button
                    onClick={() => {
                      if (!planTasks.some(t => t.title === task.title)) {
                        setPlanTasks([...planTasks, {
                          title: task.title,
                          priority: task.priority || 'medium',
                          department: task.department || user?.departments?.[0] || 'sales',
                          linked_object_type: task.linked_object_type,
                          linked_object_id: task.linked_object_id,
                          planned_for_today: true,
                          completed_today: false,
                          rollover_to_tomorrow: false,
                          created_from: 'rolled_over'
                        }]);
                      }
                    }}
                    className="mt-1"
                  >
                    <CheckCircle 
                      className={cn(
                        "w-5 h-5",
                        planTasks.some(t => t.title === task.title)
                          ? "text-emerald-600 fill-emerald-600"
                          : "text-slate-300 hover:text-emerald-600"
                      )}
                    />
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {task.priority && (
                        <span className={cn(
                          "px-2 py-0.5 text-xs font-medium rounded",
                          task.priority === 'high' && "bg-red-100 text-red-700",
                          task.priority === 'medium' && "bg-amber-100 text-amber-700",
                          task.priority === 'low' && "bg-blue-100 text-blue-700"
                        )}>
                          {task.priority}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        From {format(new Date(task.source_date), 'MMM d')}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => deleteRollOverTaskMutation.mutate({
                      planId: task.source_plan_id,
                      taskTitle: task.title
                    })}
                    disabled={deleteRollOverTaskMutation.isPending}
                    className="p-2 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
                    title="Delete from rolled over tasks"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowRollOverDialog(false)}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}