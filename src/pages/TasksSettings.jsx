import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';


import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Star, Plus, Trash2, Edit, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';

export default function TasksSettings({ user }) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    department: user?.departments?.[0] || 'sales'
  });

  // Fetch all user's common tasks
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

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Task.create({
        ...data,
        owner_id: user?.id,
        owner_name: user?.full_name,
        is_common: true,
        status: 'open',
        priority: 'medium',
        sort_order: commonTasks.length
      });
    },
    onSuccess: (newTask) => {
      // Immediately add the new task to the cache
      queryClient.setQueryData(['common-tasks', user?.id], (old) => {
        return [...(old || []), newTask];
      });
      setShowCreateDialog(false);
      resetForm();
    }
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.Task.update(id, data);
    },
    onSuccess: (updatedTask) => {
      // Immediately update the task in the cache
      queryClient.setQueryData(['common-tasks', user?.id], (old) => {
        return (old || []).map(task => task.id === updatedTask.id ? updatedTask : task);
      });
      setEditingTask(null);
      resetForm();
    }
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.Task.delete(id);
    },
    onSuccess: (_, deletedId) => {
      // Immediately remove the task from the cache
      queryClient.setQueryData(['common-tasks', user?.id], (old) => {
        return (old || []).filter(task => task.id !== deletedId);
      });
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      department: user?.departments?.[0] || 'sales'
    });
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      return;
    }

    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data: formData });
    } else {
      createTaskMutation.mutate(formData);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      department: task.department
    });
    setShowCreateDialog(true);
  };

  const handleDelete = (taskId) => {
    if (confirm('Are you sure you want to delete this common task?')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const reorderTasksMutation = useMutation({
    mutationFn: async (items) => {
      await Promise.all(
        items.map((task, index) => 
          base44.entities.Task.update(task.id, { sort_order: index })
        )
      );
    },
    onMutate: async (items) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['common-tasks', user?.id] });
      
      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(['common-tasks', user?.id]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['common-tasks', user?.id], items);
      
      return { previousTasks };
    },
    onError: (err, items, context) => {
      // Rollback on error
      queryClient.setQueryData(['common-tasks', user?.id], context.previousTasks);
    }
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(commonTasks);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    
    reorderTasksMutation.mutate(items);
  };



  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Common Tasks</h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">
            Manage tasks you use frequently in your daily plans
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) {
            setEditingTask(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Add Common Task</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? 'Edit Common Task' : 'Create Common Task'}
              </DialogTitle>
              <DialogDescription>
                This task will be available to quickly add to your daily plans
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Task Title *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Follow up with leads"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setEditingTask(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                >
                  {editingTask ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Common Tasks List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden shadow-lg"
      >
        <div className="p-4 md:p-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-slate-200">
          <h3 className="text-sm md:text-base font-semibold text-slate-900 flex items-center gap-2">
            <Star className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
            Your Common Tasks ({commonTasks.length})
          </h3>
        </div>

        {commonTasks.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <Star className="w-10 h-10 md:w-12 md:h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-2 text-sm md:text-base">No common tasks yet</p>
            <p className="text-xs md:text-sm text-slate-400">
              Create common tasks to quickly add them to your daily plans
            </p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="common-tasks">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="divide-y divide-slate-100"
                >
                  {commonTasks.map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            "p-3 md:p-4 transition-colors",
                            snapshot.isDragging ? "bg-slate-100 shadow-lg" : "hover:bg-slate-50"
                          )}
                        >
                          <div className="flex items-start gap-2 md:gap-3">
                            <div {...provided.dragHandleProps} className="mt-1">
                              <GripVertical className="w-4 h-4 md:w-5 md:h-5 text-slate-400 cursor-grab active:cursor-grabbing" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm md:text-base text-slate-900 break-words">{task.title}</h4>
                            </div>
                            <div className="flex gap-1 md:gap-2 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(task)}
                                className="h-8 w-8 md:h-10 md:w-10"
                              >
                                <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(task.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 md:h-10 md:w-10"
                              >
                                <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </Button>
                            </div>
                          </div>
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
      </motion.div>
    </div>
  );
}