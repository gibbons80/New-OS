import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function AddTaskToDay({ todaysPlan, user }) {
  const queryClient = useQueryClient();
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const addTaskMutation = useMutation({
    mutationFn: async () => {
      const updatedTasks = [
        ...(todaysPlan.morning_tasks || []),
        {
          title: newTaskTitle,
          department: user?.departments?.[0] || 'sales',
          priority: 'medium',
          planned_for_today: true,
          completed_today: false,
          rollover_to_tomorrow: false,
          created_from: 'manual'
        }
      ];

      await base44.entities.DailyPlan.update(todaysPlan.id, {
        morning_tasks: updatedTasks
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-plan'] });
      setNewTaskTitle('');
    }
  });

  const handleAdd = () => {
    if (!newTaskTitle.trim()) return;
    addTaskMutation.mutate();
  };

  return (
    <div className="flex gap-3 pt-3 border-t border-slate-200">
      <Input
        value={newTaskTitle}
        onChange={(e) => setNewTaskTitle(e.target.value)}
        placeholder="Add another task for today..."
        onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
        disabled={addTaskMutation.isPending}
      />
      <Button 
        onClick={handleAdd} 
        disabled={!newTaskTitle.trim() || addTaskMutation.isPending}
        size="sm"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add
      </Button>
    </div>
  );
}