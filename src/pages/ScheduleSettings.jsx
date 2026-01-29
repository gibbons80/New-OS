import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Save, X, Users, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const DAYS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' }
];

export default function ScheduleSettings({ user }) {
  const queryClient = useQueryClient();
  const [showNewSchedule, setShowNewSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [expandedUsers, setExpandedUsers] = useState({});
  const [newSchedule, setNewSchedule] = useState({
    user_id: '',
    selected_days: [],
    shifts: [{ start_time: '09:00', end_time: '17:00' }],
    notes: ''
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['all-schedules'],
    queryFn: () => base44.entities.Schedule.filter({ is_active: true }, '-created_date')
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      // Only show users who have schedule access
      return allUsers.filter(u => 
        u.departments?.includes('schedule') || u.role === 'admin'
      );
    }
  });

  const updateUserScheduleStatusMutation = useMutation({
    mutationFn: ({ userId, onTeamSchedule }) => 
      base44.entities.User.update(userId, { on_team_schedule: onTeamSchedule }),
    onMutate: async ({ userId, onTeamSchedule }) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({ queryKey: ['users'] });

      // Optimistic update
      const previousUsers = queryClient.getQueryData(['users']);
      queryClient.setQueryData(['users'], (old) =>
        old.map(u => u.id === userId ? { ...u, on_team_schedule: onTeamSchedule } : u)
      );

      return { previousUsers };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousUsers) {
        queryClient.setQueryData(['users'], context.previousUsers);
      }
      toast.error('Failed to update');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Team schedule status updated');
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const selectedUser = users.find(u => u.id === data.user_id);
      const promises = [];
      
      // Create schedule for each selected day and shift
      for (const day of data.selected_days) {
        for (const shift of data.shifts) {
          promises.push(
            base44.entities.Schedule.create({
              user_id: data.user_id,
              user_name: selectedUser?.full_name,
              day_of_week: day,
              start_time: shift.start_time,
              end_time: shift.end_time,
              notes: data.notes,
              is_active: true
            })
          );
        }
      }
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setShowNewSchedule(false);
      setNewSchedule({
        user_id: '',
        selected_days: [],
        shifts: [{ start_time: '09:00', end_time: '17:00' }],
        notes: ''
      });
      toast.success('Schedule created');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Schedule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setEditingSchedule(null);
      toast.success('Schedule updated');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Schedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Schedule deleted');
    }
  });

  const groupedSchedules = users.map(u => ({
    user: u,
    schedules: schedules.filter(s => s.user_id === u.id).sort((a, b) => {
      const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      return dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week);
    })
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Schedule Settings</h1>
          <p className="text-slate-600 mt-2">Manage recurring weekly schedules and team visibility</p>
        </div>
        <Button onClick={() => setShowNewSchedule(true)} className="bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <Plus className="w-4 h-4 mr-2" />
          Add Schedule
        </Button>
      </motion.div>

      {/* Team Schedule Visibility */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-slate-900">Team Schedule Visibility</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Control which team members appear on the team schedule page. Users can still view the schedule app even if they're not shown on the team schedule.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {users.map(u => (
            <button
              key={u.id}
              onClick={() => updateUserScheduleStatusMutation.mutate({
                userId: u.id,
                onTeamSchedule: !u.on_team_schedule
              })}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                u.on_team_schedule
                  ? "bg-purple-50 border-purple-200"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
                u.on_team_schedule ? "bg-purple-600" : "bg-slate-300"
              )}>
                {u.on_team_schedule && <CheckCircle className="w-5 h-5 text-white" />}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="font-medium text-slate-900 text-sm truncate">{u.full_name}</div>
                <div className="text-xs text-slate-500 truncate">{u.email}</div>
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Schedules by User */}
      {groupedSchedules.map(({ user: u, schedules: userSchedules }, index) => {
        const isExpanded = expandedUsers[u.id] ?? false;
        return (
        <motion.div
          key={u.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + index * 0.05 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          <button
            onClick={() => setExpandedUsers(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
            className="w-full p-6 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="text-left">
              <h2 className="text-lg font-semibold text-slate-900">{u.full_name}</h2>
              <p className="text-sm text-slate-500">{u.email}</p>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
            )}
          </button>
          {isExpanded && (
          <div className="divide-y divide-slate-100">
            {userSchedules.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p>No schedules set for this user</p>
              </div>
            ) : (
              userSchedules.map(schedule => (
                <div key={schedule.id} className="p-4 flex items-center justify-between">
                  {editingSchedule?.id === schedule.id ? (
                    <div className="flex-1 grid grid-cols-4 gap-4">
                      <Select
                        value={editingSchedule.day_of_week}
                        onValueChange={(v) => setEditingSchedule({ ...editingSchedule, day_of_week: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS.map(day => (
                            <SelectItem key={day.value} value={day.value}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="time"
                        value={editingSchedule.start_time}
                        onChange={(e) => setEditingSchedule({ ...editingSchedule, start_time: e.target.value })}
                      />
                      <Input
                        type="time"
                        value={editingSchedule.end_time}
                        onChange={(e) => setEditingSchedule({ ...editingSchedule, end_time: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateMutation.mutate({ id: schedule.id, data: editingSchedule })}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingSchedule(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <span className="font-medium text-slate-900 capitalize w-24">
                            {schedule.day_of_week}
                          </span>
                          <span className="text-slate-600">
                            {schedule.start_time} - {schedule.end_time}
                          </span>
                          {schedule.notes && (
                            <span className="text-sm text-slate-500">• {schedule.notes}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingSchedule(schedule)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteMutation.mutate(schedule.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
            </div>
            )}
            </motion.div>
            );
            })}

      {/* New Schedule Dialog */}
      <Dialog open={showNewSchedule} onOpenChange={setShowNewSchedule}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Team Member</label>
              <Select
                value={newSchedule.user_id}
                onValueChange={(v) => setNewSchedule({ ...newSchedule, user_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-3">Days (select multiple)</label>
              <div className="grid grid-cols-2 gap-2">
                {DAYS.map(day => (
                  <button
                    key={day.value}
                    onClick={() => {
                      const isSelected = newSchedule.selected_days.includes(day.value);
                      setNewSchedule({
                        ...newSchedule,
                        selected_days: isSelected
                          ? newSchedule.selected_days.filter(d => d !== day.value)
                          : [...newSchedule.selected_days, day.value]
                      });
                    }}
                    className={cn(
                      "px-3 py-2 rounded-lg border transition-colors text-sm font-medium",
                      newSchedule.selected_days.includes(day.value)
                        ? "bg-purple-100 border-purple-300 text-purple-700"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-slate-700">Shifts</label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setNewSchedule({
                    ...newSchedule,
                    shifts: [...newSchedule.shifts, { start_time: '09:00', end_time: '17:00' }]
                  })}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Shift
                </Button>
              </div>
              <div className="space-y-3">
                {newSchedule.shifts.map((shift, idx) => (
                  <div key={idx} className="flex items-end gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-slate-600 block mb-1">Start Time</label>
                      <Input
                        type="time"
                        value={shift.start_time}
                        onChange={(e) => {
                          const newShifts = [...newSchedule.shifts];
                          newShifts[idx].start_time = e.target.value;
                          setNewSchedule({ ...newSchedule, shifts: newShifts });
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium text-slate-600 block mb-1">End Time</label>
                      <Input
                        type="time"
                        value={shift.end_time}
                        onChange={(e) => {
                          const newShifts = [...newSchedule.shifts];
                          newShifts[idx].end_time = e.target.value;
                          setNewSchedule({ ...newSchedule, shifts: newShifts });
                        }}
                      />
                    </div>
                    {newSchedule.shifts.length > 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setNewSchedule({
                          ...newSchedule,
                          shifts: newSchedule.shifts.filter((_, i) => i !== idx)
                        })}
                        className="text-red-600 hover:text-red-700 h-9"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Notes (optional)</label>
              <Input
                value={newSchedule.notes}
                onChange={(e) => setNewSchedule({ ...newSchedule, notes: e.target.value })}
                placeholder="Location, special instructions, etc."
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowNewSchedule(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate(newSchedule)}
                disabled={!newSchedule.user_id || newSchedule.selected_days.length === 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Add Schedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}