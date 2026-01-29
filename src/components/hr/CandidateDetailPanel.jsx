import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Mail, Phone, MapPin, Clock, Video, X, Edit, MessageSquare, Trash2, Copy, CheckSquare, Calendar, Plus } from 'lucide-react';
import AddressAutocomplete from '@/components/cs/AddressAutocomplete';
import { formatInEST } from '@/components/dateFormatter';
import { toast } from 'sonner';
import { format } from 'date-fns';
import StaffDetailsForm from '@/components/StaffDetailsForm';

const STAGES = [
  { id: 'my_interview_completed', label: 'My Interview Completed', icon: '✅', color: 'bg-emerald-50 border-emerald-200' },
  { id: 'scheduling_interview', label: 'Scheduling Interview', icon: '📅', color: 'bg-blue-50 border-blue-200' },
  { id: 'interviewing', label: 'Interviewing', icon: '🎤', color: 'bg-purple-50 border-purple-200' },
  { id: 'interview_completed', label: 'Interview Completed', icon: '😊', color: 'bg-yellow-50 border-yellow-200' },
  { id: 'request_to_hire', label: 'Request to be Hired', icon: '🤝', color: 'bg-cyan-50 border-cyan-200' },
  { id: 'offer_sent', label: 'Offer Sent', icon: '📬', color: 'bg-pink-50 border-pink-200' },
  { id: 'hired', label: 'Hired', icon: '🎉', color: 'bg-green-50 border-green-200' },
  { id: 'rejected', label: 'Rejected', icon: '🚫', color: 'bg-red-50 border-red-200' },
];

export default function CandidateDetailPanel({ candidate, onSave, onCancel, user }) {
  const [formData, setFormData] = useState(candidate);
  const [isEditing, setIsEditing] = useState(!candidate.id);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [videoNote, setVideoNote] = useState('');
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: '',
    due_time: '',
    priority: 'medium'
  });
  const [showHireDialog, setShowHireDialog] = useState(false);
  const queryClient = useQueryClient();

  const hireCandidateMutation = useMutation({
    mutationFn: ({ candidateId, staffData }) => base44.functions.invoke('hireCandidate', { candidateId, staffData }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      setShowHireDialog(false);
      toast.success('Candidate hired successfully!');
      onSave();
    },
    onError: (error) => {
      toast.error('Failed to hire candidate: ' + error.message);
    }
  });

  const handleHireCandidate = (staffData) => {
    hireCandidateMutation.mutate({ candidateId: candidate.id, staffData });
  };

  const getCurrentStage = () => STAGES.find(s => s.id === formData.stage) || STAGES[0];

  const { data: notes = [] } = useQuery({
    queryKey: ['candidate-notes', candidate.id],
    queryFn: () => candidate.id ? base44.entities.CandidateNote.filter({ candidate_id: candidate.id }, '-created_date') : [],
    enabled: !!candidate.id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['candidate-tasks', candidate.id],
    queryFn: () => candidate.id ? base44.entities.Task.filter({ 
      related_to_type: 'candidate',
      related_to_id: candidate.id,
      department: 'hr_accounting'
    }, '-due_date') : [],
    enabled: !!candidate.id,
  });

  const addNoteMutation = useMutation({
    mutationFn: (noteData) => base44.entities.CandidateNote.create(noteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-notes', candidate.id] });
      setNewNote('');
      setShowAddNote(false);
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId) => base44.entities.CandidateNote.delete(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-notes', candidate.id] });
    },
  });

  const addTaskMutation = useMutation({
    mutationFn: (taskData) => base44.entities.Task.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-tasks', candidate.id] });
      queryClient.invalidateQueries({ queryKey: ['hiring-tasks-overview'] });
      setNewTask({
        title: '',
        description: '',
        due_date: '',
        due_time: '',
        priority: 'medium'
      });
      setShowAddTask(false);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-tasks', candidate.id] });
      queryClient.invalidateQueries({ queryKey: ['hiring-tasks-overview'] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => base44.entities.Task.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-tasks', candidate.id] });
      queryClient.invalidateQueries({ queryKey: ['hiring-tasks-overview'] });
    },
  });

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate({
      candidate_id: candidate.id,
      candidate_name: candidate.preferred_name || candidate.legal_full_name,
      note: newNote,
      author_id: user.id,
      author_name: user.full_name,
    });
  };

  const handleAddVideoNote = () => {
    if (!videoNote.trim()) return;
    addNoteMutation.mutate({
      candidate_id: candidate.id,
      candidate_name: candidate.preferred_name || candidate.legal_full_name,
      note: videoNote,
      author_id: user.id,
      author_name: user.full_name,
    });
    setVideoNote('');
  };

  const handleCloseVideoDialog = () => {
    if (videoNote.trim()) {
      setShowUnsavedWarning(true);
    } else {
      setShowVideoDialog(false);
    }
  };

  const handleConfirmClose = () => {
    setVideoNote('');
    setShowUnsavedWarning(false);
    setShowVideoDialog(false);
  };

  const handleSaveAndClose = () => {
    if (videoNote.trim()) {
      addNoteMutation.mutate({
        candidate_id: candidate.id,
        candidate_name: candidate.preferred_name || candidate.legal_full_name,
        note: videoNote,
        author_id: user.id,
        author_name: user.full_name,
      });
    }
    setVideoNote('');
    setShowUnsavedWarning(false);
    setShowVideoDialog(false);
  };

  const handleDeleteNote = (noteId) => {
    if (confirm('Are you sure you want to delete this note?')) {
      deleteNoteMutation.mutate(noteId);
    }
  };

  const handleAddTask = () => {
    if (!newTask.title.trim()) return;
    addTaskMutation.mutate({
      title: newTask.title,
      description: newTask.description,
      due_date: newTask.due_date,
      due_time: newTask.due_time,
      priority: newTask.priority,
      status: 'open',
      related_to_type: 'candidate',
      related_to_id: candidate.id,
      related_to_name: candidate.preferred_name || candidate.legal_full_name,
      owner_id: user.id,
      owner_name: user.full_name,
      department: 'hr_accounting'
    });
  };

  const handleToggleTaskStatus = (task) => {
    const newStatus = task.status === 'done' ? 'open' : 'done';
    updateTaskMutation.mutate({ id: task.id, data: { status: newStatus } });
  };

  const handleDeleteTask = (taskId) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    if (candidate.id) {
      setIsEditing(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const currentStage = getCurrentStage();

  return (
    <div className="space-y-6 pt-6">
      {/* Stage Selector - Always Visible at Top */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Stage *</label>
        <Select 
          value={formData.stage} 
          onValueChange={(value) => {
            updateField('stage', value);
            if (candidate.id) {
              onSave({ ...formData, stage: value });
            }
          }}
        >
          <SelectTrigger className={`${currentStage.color} border-2`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{currentStage.icon}</span>
              <span>{currentStage.label}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {STAGES.map(stage => (
              <SelectItem key={stage.id} value={stage.id}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{stage.icon}</span>
                  <span>{stage.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* MyInterview Integration Section */}
      {candidate.id && formData.interview_url && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <button
            type="button"
            onClick={() => setShowVideoDialog(true)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
          >
            <Video className="w-4 h-4" />
            Watch Interview Video
          </button>

          {candidate.stage === 'offer_sent' && (
            <Button
              onClick={() => setShowHireDialog(true)}
              className="mt-4 w-full bg-green-600 hover:bg-green-700 gap-2"
            >
              Hire Candidate
            </Button>
          )}
        </div>
      )}

      {/* Contact Information Section */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Contact Information</h3>
          {candidate.id && !isEditing && (
            <Button type="button" onClick={() => setIsEditing(true)} variant="outline" size="sm" className="gap-2">
              <Edit className="w-4 h-4" />
              Edit
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {isEditing ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Legal Full Name *"
                  value={formData.legal_full_name}
                  onChange={(e) => updateField('legal_full_name', e.target.value)}
                  required
                />
                <Input
                  placeholder="Preferred Name"
                  value={formData.preferred_name}
                  onChange={(e) => updateField('preferred_name', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="email"
                  placeholder="Email *"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  required
                />
                <Input
                  placeholder="Phone"
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    const formatted = value.length <= 10 
                      ? value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3').replace(/\)\s$/, ')').replace(/-$/, '')
                      : value.slice(0, 10).replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
                    updateField('phone', formatted);
                  }}
                />
              </div>

              <AddressAutocomplete
                value={formData.address}
                onChange={(value) => updateField('address', value)}
                placeholder="Address / Location"
              />

              <Select value={formData.timezone} onValueChange={(value) => updateField('timezone', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern (EST/EDT)</SelectItem>
                  <SelectItem value="America/Chicago">Central (CST/CDT)</SelectItem>
                  <SelectItem value="America/Denver">Mountain (MST/MDT)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific (PST/PDT)</SelectItem>
                  <SelectItem value="America/Anchorage">Alaska (AKST/AKDT)</SelectItem>
                  <SelectItem value="Pacific/Honolulu">Hawaii (HST)</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2 pt-2">
                {candidate.id && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setFormData(candidate);
                      setIsEditing(false);
                    }} 
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                )}
                <Button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-700">
                  {candidate.id ? 'Save' : 'Create'}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="flex-1 truncate">{formData.email}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(formData.email);
                    toast.success('Copied');
                  }}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              {formData.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>{formData.phone}</span>
                </div>
              )}
              {formData.address && (
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{formData.address}</span>
                </div>
              )}
              {formData.timezone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>{formData.timezone.replace('America/', '').replace('_', ' ')}</span>
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Tasks Section */}
      {candidate.id && (
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-5 h-5" />
              Tasks
            </h3>
            <Button type="button" onClick={() => setShowAddTask(true)} variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Task
            </Button>
          </div>

          {tasks.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No tasks yet</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tasks.map((task) => {
                const priorityColors = {
                  low: 'bg-blue-100 text-blue-800',
                  medium: 'bg-yellow-100 text-yellow-800',
                  high: 'bg-red-100 text-red-800'
                };
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

                return (
                  <Card key={task.id} className={`group ${isOverdue ? 'border-red-300 bg-red-50/50' : 'bg-slate-50'}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleTaskStatus(task)}
                          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            task.status === 'done' ? 'bg-green-600 border-green-600' : 'border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {task.status === 'done' && <CheckSquare className="w-4 h-4 text-white" />}
                        </button>
                        <div className="flex-1">
                          <p className={`text-sm font-medium text-slate-900 ${task.status === 'done' ? 'line-through' : ''}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-slate-600 mt-1">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {task.due_date && (
                              <Badge variant="outline" className={`text-xs ${isOverdue ? 'border-red-500 text-red-700' : ''}`}>
                                <Calendar className="w-3 h-3 mr-1" />
                                {format(new Date(task.due_date), 'MMM d')}
                                {task.due_time && ` ${task.due_time}`}
                              </Badge>
                            )}
                            <Badge className={priorityColors[task.priority]}>
                              {task.priority}
                            </Badge>
                            {isOverdue && (
                              <Badge className="bg-red-100 text-red-800">
                                Overdue
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Notes & Activity Section */}
      {candidate.id && (
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Notes & Activity
            </h3>
            <Button type="button" onClick={() => setShowAddNote(true)} variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Note
            </Button>
          </div>

          {notes.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No notes yet</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notes.map((note) => (
                <Card key={note.id} className="bg-slate-50 group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{note.author_name}</p>
                        <p className="text-xs text-slate-500">{formatInEST(note.created_date, 'MMM d, yyyy h:mm a')}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.note}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Task Dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Task for {candidate.preferred_name || candidate.legal_full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Task Title *</label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Schedule follow-up call"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Description</label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional details..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Due Date</label>
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Due Time (EST)</label>
                <Input
                  type="time"
                  value={newTask.due_time}
                  onChange={(e) => setNewTask(prev => ({ ...prev, due_time: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Priority</label>
              <Select value={newTask.priority} onValueChange={(value) => setNewTask(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowAddTask(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleAddTask} 
              disabled={!newTask.title.trim() || addTaskMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {addTaskMutation.isPending ? 'Adding...' : 'Add Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Add Interview Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Enter interview notes, feedback, observations..."
              rows={20}
              className="resize-none text-base"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowAddNote(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleAddNote} 
              disabled={!newNote.trim() || addNoteMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {addNoteMutation.isPending ? 'Adding...' : 'Add Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Player Dialog */}
      <Dialog open={showVideoDialog} onOpenChange={handleCloseVideoDialog}>
        <DialogContent className="max-w-[85vw] w-full h-[85vh] p-0 flex flex-col">
          <DialogHeader className="p-4 pb-3">
            <DialogTitle>Interview Video</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex flex-col lg:flex-row gap-4 px-4 pb-4 overflow-hidden">
            {/* Video Player */}
            <div className="flex-1 overflow-hidden">
              <iframe
                src={formData.interview_url}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Notes Section */}
            <div className="w-full lg:w-80 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Add Interview Note</h3>
              </div>
              <Textarea
                value={videoNote}
                onChange={(e) => setVideoNote(e.target.value)}
                placeholder="Take notes while watching..."
                className="flex-1 resize-none text-sm"
                rows={8}
              />
              <Button
                onClick={handleAddVideoNote}
                disabled={!videoNote.trim() || addNoteMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 w-full"
                size="sm"
              >
                {addNoteMutation.isPending ? 'Saving...' : 'Save Note'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unsaved Notes Warning */}
      <Dialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unsaved Notes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-4">
            You have unsaved notes. Do you want to save them before closing?
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleConfirmClose}>
              Discard
            </Button>
            <Button onClick={handleSaveAndClose} className="bg-rose-600 hover:bg-rose-700">
              Save & Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hire Candidate Dialog */}
      <Dialog open={showHireDialog} onOpenChange={setShowHireDialog}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hire {candidate.preferred_name || candidate.legal_full_name}</DialogTitle>
          </DialogHeader>
          <StaffDetailsForm
            candidate={candidate}
            onSave={handleHireCandidate}
            onCancel={() => setShowHireDialog(false)}
            isLoading={hireCandidateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}