import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Megaphone, Trophy, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function HomePageSettings({ user }) {
  const queryClient = useQueryClient();
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    priority: 0
  });

  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    target_value: '',
    current_value: 0,
    unit: '',
    start_date: '',
    end_date: ''
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.filter({}, '-priority,-created_date')
  });

  const { data: companyGoals = [] } = useQuery({
    queryKey: ['company-goals'],
    queryFn: () => base44.entities.CompanyGoal.filter({}, '-created_date')
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: (data) => base44.entities.Announcement.create({
      ...data,
      created_by_id: user?.id,
      created_by_name: user?.full_name
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setShowAnnouncementDialog(false);
      setAnnouncementForm({ title: '', content: '', priority: 0 });
      setEditingAnnouncement(null);
    }
  });

  const updateAnnouncementMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Announcement.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setShowAnnouncementDialog(false);
      setAnnouncementForm({ title: '', content: '', priority: 0 });
      setEditingAnnouncement(null);
    }
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: (id) => base44.entities.Announcement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setDeleteConfirm(null);
    }
  });

  const createGoalMutation = useMutation({
    mutationFn: (data) => base44.entities.CompanyGoal.create({
      ...data,
      created_by_id: user?.id,
      created_by_name: user?.full_name
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-goals'] });
      setShowGoalDialog(false);
      setGoalForm({ title: '', description: '', target_value: '', current_value: 0, unit: '', start_date: '', end_date: '' });
      setEditingGoal(null);
    }
  });

  const updateGoalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CompanyGoal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-goals'] });
      setShowGoalDialog(false);
      setGoalForm({ title: '', description: '', target_value: '', current_value: 0, unit: '', start_date: '', end_date: '' });
      setEditingGoal(null);
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (id) => base44.entities.CompanyGoal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-goals'] });
      setDeleteConfirm(null);
    }
  });

  const handleEditAnnouncement = (announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementForm({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority || 0
    });
    setShowAnnouncementDialog(true);
  };

  const handleEditGoal = (goal) => {
    setEditingGoal(goal);
    setGoalForm({
      title: goal.title,
      description: goal.description || '',
      target_value: goal.target_value,
      current_value: goal.current_value,
      unit: goal.unit || '',
      start_date: goal.start_date || '',
      end_date: goal.end_date || ''
    });
    setShowGoalDialog(true);
  };

  const handleSaveAnnouncement = () => {
    if (editingAnnouncement) {
      updateAnnouncementMutation.mutate({
        id: editingAnnouncement.id,
        data: announcementForm
      });
    } else {
      createAnnouncementMutation.mutate(announcementForm);
    }
  };

  const handleSaveGoal = () => {
    if (editingGoal) {
      updateGoalMutation.mutate({
        id: editingGoal.id,
        data: goalForm
      });
    } else {
      createGoalMutation.mutate(goalForm);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Home Page Settings</h1>
        <p className="text-slate-500 mt-1 text-sm md:text-base">Manage announcements and company goals</p>
      </div>

      {/* Announcements Section */}
      <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <Megaphone className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base md:text-lg font-semibold text-slate-900">Announcements</h2>
              <p className="text-xs md:text-sm text-slate-500">{announcements.length} total</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingAnnouncement(null);
              setAnnouncementForm({ title: '', content: '', priority: 0 });
              setShowAnnouncementDialog(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-xs md:text-sm h-9 md:h-10 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 md:mr-2" />
            <span className="hidden md:inline">Add Announcement</span>
            <span className="md:hidden">Add</span>
          </Button>
        </div>
        <div className="divide-y divide-slate-100">
          {announcements.length === 0 ? (
            <div className="p-8 md:p-12 text-center text-slate-400 text-sm md:text-base">
              No announcements yet
            </div>
          ) : (
            announcements.map((announcement) => (
              <div key={announcement.id} className="p-4 md:p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-3 md:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 text-sm md:text-base">{announcement.title}</h3>
                      {!announcement.is_active && (
                        <span className="px-2 py-0.5 text-[10px] md:text-xs font-medium bg-slate-100 text-slate-500 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 mb-2 text-sm md:text-base">{announcement.content}</p>
                    <p className="text-[10px] md:text-xs text-slate-400">
                      By {announcement.created_by_name} • {new Date(announcement.created_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1 md:gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditAnnouncement(announcement)}
                      className="h-8 w-8 md:h-9 md:w-9 p-0"
                    >
                      <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirm({ type: 'announcement', id: announcement.id })}
                      className="text-red-600 hover:text-red-700 h-8 w-8 md:h-9 md:w-9 p-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Company Goals Section */}
      <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base md:text-lg font-semibold text-slate-900">Company Goals</h2>
              <p className="text-xs md:text-sm text-slate-500">{companyGoals.length} total</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingGoal(null);
              setGoalForm({ title: '', description: '', target_value: '', current_value: 0, unit: '', start_date: '', end_date: '' });
              setShowGoalDialog(true);
            }}
            className="bg-amber-600 hover:bg-amber-700 text-xs md:text-sm h-9 md:h-10 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 md:mr-2" />
            <span className="hidden md:inline">Add Goal</span>
            <span className="md:hidden">Add</span>
          </Button>
        </div>
        <div className="divide-y divide-slate-100">
          {companyGoals.length === 0 ? (
            <div className="p-8 md:p-12 text-center text-slate-400 text-sm md:text-base">
              No company goals yet
            </div>
          ) : (
            companyGoals.map((goal) => {
              const progress = Math.min((goal.current_value / goal.target_value) * 100, 100);
              return (
                <div key={goal.id} className="p-4 md:p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-3 md:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 text-sm md:text-base">{goal.title}</h3>
                        {!goal.is_active && (
                          <span className="px-2 py-0.5 text-[10px] md:text-xs font-medium bg-slate-100 text-slate-500 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      {goal.description && (
                        <p className="text-slate-600 mb-3 text-sm md:text-base">{goal.description}</p>
                      )}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs md:text-sm">
                          <span className="text-slate-600">
                            {goal.current_value.toLocaleString()} / {goal.target_value.toLocaleString()} {goal.unit}
                          </span>
                          <span className="font-semibold text-slate-900">{progress.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 md:h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        {goal.end_date && (
                          <p className="text-[10px] md:text-xs text-slate-500">
                            Target: {new Date(goal.end_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 md:gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditGoal(goal)}
                        className="h-8 w-8 md:h-9 md:w-9 p-0"
                      >
                        <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteConfirm({ type: 'goal', id: goal.id })}
                        className="text-red-600 hover:text-red-700 h-8 w-8 md:h-9 md:w-9 p-0"
                      >
                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Announcement Dialog */}
      <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAnnouncement ? 'Edit' : 'Add'} Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Title</label>
              <Input
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                placeholder="Enter announcement title"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Content</label>
              <Textarea
                value={announcementForm.content}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                placeholder="Enter announcement content"
                rows={6}
                className="resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowAnnouncementDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveAnnouncement}
                disabled={!announcementForm.title || !announcementForm.content}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {editingAnnouncement ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Goal Dialog */}
      <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Edit' : 'Add'} Company Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Title</label>
              <Input
                value={goalForm.title}
                onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                placeholder="Enter goal title"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Description (optional)</label>
              <Textarea
                value={goalForm.description}
                onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                placeholder="Enter goal description"
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Target Value</label>
                <Input
                  type="number"
                  value={goalForm.target_value}
                  onChange={(e) => setGoalForm({ ...goalForm, target_value: parseFloat(e.target.value) || '' })}
                  placeholder="100"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Current Value</label>
                <Input
                  type="number"
                  value={goalForm.current_value}
                  onChange={(e) => setGoalForm({ ...goalForm, current_value: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Unit</label>
                <Input
                  value={goalForm.unit}
                  onChange={(e) => setGoalForm({ ...goalForm, unit: e.target.value })}
                  placeholder="bookings"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Start Date (optional)</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !goalForm.start_date && "text-slate-500")}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {goalForm.start_date ? format(new Date(goalForm.start_date + 'T00:00:00'), 'PPP') : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={goalForm.start_date ? new Date(goalForm.start_date + 'T00:00:00') : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          setGoalForm({ ...goalForm, start_date: `${year}-${month}-${day}` });
                        } else {
                          setGoalForm({ ...goalForm, start_date: '' });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">End Date (optional)</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !goalForm.end_date && "text-slate-500")}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {goalForm.end_date ? format(new Date(goalForm.end_date + 'T00:00:00'), 'PPP') : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={goalForm.end_date ? new Date(goalForm.end_date + 'T00:00:00') : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          setGoalForm({ ...goalForm, end_date: `${year}-${month}-${day}` });
                        } else {
                          setGoalForm({ ...goalForm, end_date: '' });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowGoalDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveGoal}
                disabled={!goalForm.title || !goalForm.target_value}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {editingGoal ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this {deleteConfirm?.type}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm?.type === 'announcement') {
                  deleteAnnouncementMutation.mutate(deleteConfirm.id);
                } else {
                  deleteGoalMutation.mutate(deleteConfirm.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}