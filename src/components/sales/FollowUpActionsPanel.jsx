import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { formatInEST } from '../dateFormatter';
import { X, Calendar, Clock, AlertCircle, Plus, Edit2, Trash2, Phone, MessageCircle, Mail, Send, Heart, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateLeadActions } from '../utils/leadActions';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function FollowUpActionsPanel({ leadId, isOpen, onClose, onAddFollowUp }) {
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editFollowUpType, setEditFollowUpType] = useState('call');
  const [editFollowUpPriority, setEditFollowUpPriority] = useState('medium');
  const [editFollowUpDate, setEditFollowUpDate] = useState('');
  const [editFollowUpTime, setEditFollowUpTime] = useState('09:00');
  const [editFollowUpNote, setEditFollowUpNote] = useState('');

  // Fetch lead data
  const { data: lead } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      const leads = await base44.entities.Lead.filter({ id: leadId });
      return leads[0];
    },
    enabled: !!leadId && isOpen
  });

  // Fetch activities
  const { data: activities = [] } = useQuery({
    queryKey: ['activities', leadId],
    queryFn: () => base44.entities.Activity.filter({ lead_id: leadId }, '-created_date'),
    enabled: !!leadId && isOpen
  });

  // Fetch bookings
  const { data: bookings = [] } = useQuery({
    queryKey: ['lead-bookings', leadId],
    queryFn: () => base44.entities.Booking.filter({ lead_id: leadId }, '-created_date'),
    enabled: !!leadId && isOpen
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['lead-tasks', leadId],
    queryFn: () => base44.entities.Task.filter({ 
      related_to_type: 'lead',
      related_to_id: leadId
    }, '-created_date'),
    enabled: !!leadId && isOpen
  });

  // Calculate follow-up actions
  const followUpActions = lead ? calculateLeadActions(lead, activities, bookings, tasks, today) : [];

  const urgencyColors = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => base44.entities.Task.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-tasks', leadId] });
      setDeleteConfirmId(null);
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }) => base44.entities.Task.update(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-tasks', leadId] });
      setEditingTask(null);
      setEditFollowUpType('call');
      setEditFollowUpPriority('medium');
      setEditFollowUpDate('');
      setEditFollowUpNote('');
    }
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full md:w-[600px] bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Scheduled Follow-ups</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {lead?.name || 'Lead'} - Auto & Manual
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <Button
                onClick={onAddFollowUp}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Follow-up
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {followUpActions.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No scheduled follow-ups</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {followUpActions.map((action, index) => (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-slate-50 rounded-xl p-4 border border-slate-200 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={cn("text-xs", urgencyColors[action.urgency])}>
                              {action.urgency}
                            </Badge>
                            {action.type === 'manual' ? (
                              <Badge variant="outline" className="text-xs">
                                Manual
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                Auto
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-medium text-slate-900 mb-1">
                            {action.action}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Clock className="w-4 h-4" />
                            {formatInEST(action.dueDate)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {action.urgency === 'high' && (
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                          )}
                          {action.type === 'manual' && action.task && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingTask(action.task);
                                  // Extract type from title if possible
                                  const title = action.task.title.toLowerCase();
                                  if (title.includes('call')) setEditFollowUpType('call');
                                  else if (title.includes('text')) setEditFollowUpType('text');
                                  else if (title.includes('email')) setEditFollowUpType('email');
                                  else if (title.includes('dm')) setEditFollowUpType('dm');
                                  else if (title.includes('engagement')) setEditFollowUpType('engagement');
                                  else setEditFollowUpType('note');
                                  
                                  setEditFollowUpPriority(action.task.priority || 'medium');
                                  setEditFollowUpDate(action.task.due_date || '');
                                  setEditFollowUpTime(action.task.due_time || '09:00');
                                  setEditFollowUpNote(action.task.description || '');
                                }}
                                className="p-1.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(action.task.id)}
                                className="p-1.5 rounded hover:bg-red-100 text-slate-500 hover:text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Follow-up</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this follow-up? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteTaskMutation.mutate(deleteConfirmId)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Edit Follow-up Dialog */}
          <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl">Edit Follow-up Reminder</DialogTitle>
              </DialogHeader>
              {editingTask && (
                <div className="space-y-6 mt-4">
                  <div>
                    <label className="text-base font-medium text-slate-900 block mb-3">Follow-up Type</label>
                    <div className="grid grid-cols-6 gap-3">
                      {[
                        { value: 'call', icon: Phone, label: 'Call' },
                        { value: 'text', icon: MessageCircle, label: 'Text' },
                        { value: 'email', icon: Mail, label: 'Email' },
                        { value: 'dm', icon: Send, label: 'DM' },
                        { value: 'engagement', icon: Heart, label: 'Engagement' },
                        { value: 'note', icon: FileText, label: 'Note' }
                      ].map(({ value, icon: Icon, label }) => (
                        <button
                          key={value}
                          onClick={() => setEditFollowUpType(value)}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                            editFollowUpType === value
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-200 hover:border-slate-300"
                          )}
                        >
                          <Icon className={cn(
                            "w-6 h-6",
                            editFollowUpType === value ? "text-blue-600" : "text-slate-400"
                          )} />
                          <span className={cn(
                            "text-sm font-medium",
                            editFollowUpType === value ? "text-blue-600" : "text-slate-600"
                          )}>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-base font-medium text-slate-900 block mb-2">Priority</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => setEditFollowUpPriority('low')}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all font-medium",
                          editFollowUpPriority === 'low'
                            ? "border-slate-500 bg-slate-50 text-slate-900"
                            : "border-slate-200 hover:border-slate-300 text-slate-600"
                        )}
                      >
                        Low
                      </button>
                      <button
                        onClick={() => setEditFollowUpPriority('medium')}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all font-medium",
                          editFollowUpPriority === 'medium'
                            ? "border-amber-500 bg-amber-50 text-amber-900"
                            : "border-slate-200 hover:border-slate-300 text-slate-600"
                        )}
                      >
                        Medium
                      </button>
                      <button
                        onClick={() => setEditFollowUpPriority('high')}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all font-medium",
                          editFollowUpPriority === 'high'
                            ? "border-red-500 bg-red-50 text-red-900"
                            : "border-slate-200 hover:border-slate-300 text-slate-600"
                        )}
                      >
                        High
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-base font-medium text-slate-900 block mb-2">Follow-up Date</label>
                    <Input
                      type="date"
                      value={editFollowUpDate}
                      onChange={(e) => setEditFollowUpDate(e.target.value)}
                      className="h-12"
                      placeholder="Pick a date"
                    />
                  </div>
                  <div>
                    <label className="text-base font-medium text-slate-900 block mb-2">Follow-up Time</label>
                    <Input
                      type="time"
                      value={editFollowUpTime}
                      onChange={(e) => setEditFollowUpTime(e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div>
                    <label className="text-base font-medium text-slate-900 block mb-2">Note (optional)</label>
                    <Textarea
                      value={editFollowUpNote}
                      onChange={(e) => setEditFollowUpNote(e.target.value)}
                      placeholder="Add a reminder note..."
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setEditingTask(null)}
                      className="px-6"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => {
                        const typeLabel = editFollowUpType.charAt(0).toUpperCase() + editFollowUpType.slice(1);
                        updateTaskMutation.mutate({
                           taskId: editingTask.id,
                           data: {
                             title: `${typeLabel} follow-up - ${lead?.name || 'lead'}`,
                             description: editFollowUpNote,
                             due_date: editFollowUpDate,
                             due_time: editFollowUpTime,
                             priority: editFollowUpPriority
                           }
                         });
                      }}
                      disabled={updateTaskMutation.isPending || !editFollowUpDate || !editFollowUpTime}
                      className="bg-slate-700 hover:bg-slate-800 px-6"
                    >
                      Update Follow-up
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </AnimatePresence>
  );
}