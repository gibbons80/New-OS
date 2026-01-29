import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { 
  Plus, 
  Copy,
  X,
  GripVertical,
  Calendar,
  Star,
  ArrowRight,
  Trash2,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

export default function PlanTomorrow({ user }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const today = formatInTimeZone(new Date(), 'America/New_York', 'yyyy-MM-dd');
  const tomorrow = formatInTimeZone(addDays(new Date(), 1), 'America/New_York', 'yyyy-MM-dd');
  
  const [planTasks, setPlanTasks] = useState([]);
  const [notes, setNotes] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showCommonTasks, setShowCommonTasks] = useState(false);
  const [selectedCommonTasks, setSelectedCommonTasks] = useState([]);
  const [showRollOverDialog, setShowRollOverDialog] = useState(false);

  // Fetch tomorrow's draft plan if it exists
  const { data: existingDraft } = useQuery({
    queryKey: ['tomorrow-draft-plan', user?.id, tomorrow],
    queryFn: async () => {
      const plans = await base44.entities.DailyPlan.filter({
        user_id: user?.id,
        date: tomorrow,
        status: 'draft'
      });
      return plans[0] || null;
    },
    enabled: !!user?.id,
    onSuccess: (draft) => {
      if (draft) {
        setPlanTasks(draft.morning_tasks || []);
        setNotes(draft.notes_morning || '');
      }
    }
  });

  // Fetch last completed plan
  const { data: lastPlan } = useQuery({
    queryKey: ['last-daily-plan', user?.id],
    queryFn: async () => {
      const plans = await base44.entities.DailyPlan.filter({
        user_id: user?.id,
        status: 'eod_submitted'
      }, '-created_date');
      
      return plans[0] || null;
    }
  });

  // Fetch common tasks
  const { data: commonTasks = [] } = useQuery({
    queryKey: ['common-tasks', user?.id],
    queryFn: async () => {
      return await base44.entities.Task.filter({
        owner_id: user?.id,
        is_common: true
      }, '-priority');
    },
    enabled: !!user?.id
  });

  // Fetch today's plan to get rollover tasks
  const { data: todaysPlan } = useQuery({
    queryKey: ['todays-plan-for-tomorrow', user?.id, today],
    queryFn: async () => {
      const plans = await base44.entities.DailyPlan.filter({
        user_id: user?.id,
        date: today
      });
      return plans[0] || null;
    },
    enabled: !!user?.id
  });

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const planData = {
        user_id: user?.id,
        user_name: user?.full_name,
        date: tomorrow,
        status: 'draft',
        morning_tasks: planTasks,
        notes_morning: notes,
        manager_visibility: false,
        department: user?.departments?.[0] || 'sales'
      };

      if (existingDraft) {
        return await base44.entities.DailyPlan.update(existingDraft.id, planData);
      }
      return await base44.entities.DailyPlan.create(planData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tomorrow-draft-plan'] });
      toast.success('Tomorrow\'s plan saved!');
    }
  });

  const handleCopyLast = () => {
    if (!lastPlan) return;
    
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
    toast.success('Tasks copied from last plan');
  };

  const handleRollOverFromToday = () => {
    if (!todaysPlan?.morning_tasks) return;
    
    // Get incomplete tasks from today
    const incompleteTasks = todaysPlan.morning_tasks.filter(t => !t.completed_today);
    
    if (incompleteTasks.length > 0) {
      const newTasks = incompleteTasks.map(t => ({
        ...t,
        daily_plan_id: undefined,
        created_from: 'rolled_over',
        completed_today: false,
        rollover_to_tomorrow: false,
        completion_time: null
      }));
      setPlanTasks([...planTasks, ...newTasks]);
      toast.success(`Added ${incompleteTasks.length} tasks from today`);
    } else {
      toast.info('No incomplete tasks to roll over');
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
    toast.success(`Added ${tasksToAdd.length} common tasks`);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-8 text-white relative">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('TasksMyWork'))}
            className="text-white hover:bg-white/20 mb-4 absolute top-4 right-4"
          >
            Today's Tasks
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Plan Tomorrow</h1>
          </div>
          <p className="text-blue-100">
            Draft - Your changes are automatically saved
          </p>
        </div>

        <div className="p-8 space-y-6">
          {/* Quick Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleCopyLast}
              disabled={!lastPlan}
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Last
            </Button>
            
            <Button
              variant="outline"
              onClick={handleRollOverFromToday}
              disabled={!todaysPlan?.morning_tasks || todaysPlan.morning_tasks.filter(t => !t.completed_today).length === 0}
              className="flex-1"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Roll Over Tasks ({todaysPlan?.morning_tasks?.filter(t => !t.completed_today).length || 0})
            </Button>
            
            <Dialog open={showCommonTasks} onOpenChange={setShowCommonTasks}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={commonTasks.length === 0}
                  className="flex-1"
                >
                  <Star className="w-4 h-4 mr-2" />
                  Add Common Tasks ({commonTasks.length})
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Select Common Tasks</DialogTitle>
                  <DialogDescription>
                    Choose tasks to add to tomorrow's plan
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
          <div className="flex gap-3">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Add a task for today..."
              onKeyPress={(e) => e.key === 'Enter' && handleAddManual()}
            />
            <Button onClick={handleAddManual} disabled={!newTaskTitle.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>

          {/* Task List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900">
              Tomorrow's Tasks ({planTasks.length})
            </h3>
            
            {planTasks.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
                <p className="text-slate-400">
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
                              className="flex items-center gap-3 bg-slate-50 rounded-lg p-3 border border-slate-200"
                            >
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="w-5 h-5 text-slate-400" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-slate-900">{task.title}</p>
                              </div>
                              <button
                                onClick={() => handleRemoveTask(index)}
                                className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                              >
                                <X className="w-4 h-4" />
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

          {/* Morning Notes */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Morning Notes (Optional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes for tomorrow..."
              rows={3}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              onClick={() => saveDraftMutation.mutate()}
              disabled={planTasks.length === 0 || saveDraftMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 px-8"
              size="lg"
            >
              {saveDraftMutation.isPending ? 'Saving...' : 'Save Draft'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}