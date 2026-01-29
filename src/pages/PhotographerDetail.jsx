import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Plus,
  Trash2,
  CheckCircle,
  X,
  MessageSquare,
  Award,
  Package,
  Clock,
  Edit2,
  FileText,
  User,
  Cake,
  Briefcase,
  Settings,
  BookOpen,
  Upload,
  Image as ImageIcon,
  ChevronDown,
  Star,
} from 'lucide-react';
import { formatInEST } from '@/components/dateFormatter';
import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { toast } from 'sonner';

export default function PhotographerDetail({ user }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const staffId = urlParams.get('id');

  const [showInteractionDialog, setShowInteractionDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [selectedProgress, setSelectedProgress] = useState(null);
  const [newServices, setNewServices] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [noteText, setNoteText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewImages, setPreviewImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [interactionForm, setInteractionForm] = useState({
    interaction_type: 'check_in',
    notes: '',
    interaction_date: format(toZonedTime(new Date(), 'America/New_York'), "yyyy-MM-dd'T'HH:mm")
  });
  const [interactionFiles, setInteractionFiles] = useState([]);
  const [feedbackForm, setFeedbackForm] = useState({
    feedback_notes: '',
    score: '',
    status: 'feedback_given'
  });

  // Queries
  const { data: staff, isLoading: staffLoading } = useQuery({
    queryKey: ['staff-detail', staffId],
    queryFn: () => base44.entities.Staff.filter({ id: staffId }).then(res => res[0]),
    enabled: !!staffId
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ['staff-interactions', staffId],
    queryFn: () => base44.entities.StaffInteraction.filter({ staff_id: staffId }, '-interaction_date'),
    enabled: !!staffId
  });

  const { data: staffNotes = [] } = useQuery({
    queryKey: ['staff-notes', staffId],
    queryFn: () => base44.entities.StaffNote.filter({ staff_id: staffId, note_type: 'training' }, '-created_date'),
    enabled: !!staffId
  });

  // Combine interactions and notes into a single activity log
  const activityLog = React.useMemo(() => {
    const combined = [
      ...interactions.map(i => ({ ...i, type: 'interaction', date: i.interaction_date })),
      ...staffNotes.map(n => ({ ...n, type: 'note', date: n.created_date }))
    ];
    return combined.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [interactions, staffNotes]);

  const { data: lessonProgress = [] } = useQuery({
    queryKey: ['staff-lesson-progress', staffId],
    queryFn: () => base44.entities.StaffLessonProgress.filter({ staff_id: staffId }, '-submitted_at'),
    enabled: !!staffId
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['staff-enrollments', staffId],
    queryFn: () => base44.entities.StaffCourseEnrollment.filter({ staff_id: staffId }),
    enabled: !!staffId
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['staff-equipment', staffId],
    queryFn: () => base44.entities.Equipment.filter({ assigned_to_id: staffId }),
    enabled: !!staffId
  });



  const { data: serviceTemplates = [] } = useQuery({
    queryKey: ['service-templates'],
    queryFn: () => base44.entities.ServiceTemplate.list('service_name'),
  });

  const { data: serviceGroups = [] } = useQuery({
    queryKey: ['service-groups'],
    queryFn: () => base44.entities.TrainingServiceGroup.list('sort_order')
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.filter({ is_active: true }, 'order')
  });

  // Mutations
  const createInteractionMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffInteraction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-interactions'] });
      toast.success('Interaction logged');
      setShowInteractionDialog(false);
      setInteractionForm({
        interaction_type: 'check_in',
        notes: '',
        interaction_date: format(toZonedTime(new Date(), 'America/New_York'), "yyyy-MM-dd'T'HH:mm")
      });
      setInteractionFiles([]);
    },
    onError: () => toast.error('Failed to log interaction')
  });

  const createNoteMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffNote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-notes'] });
      toast.success('Note added');
      setShowNoteDialog(false);
      setNoteText('');
      setUploadedFiles([]);
    },
    onError: () => toast.error('Failed to add note')
  });

  const updateProgressMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StaffLessonProgress.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-lesson-progress'] });
      toast.success('Feedback saved');
      setShowFeedbackDialog(false);
      setSelectedProgress(null);
      setFeedbackForm({
        feedback_notes: '',
        score: '',
        status: 'feedback_given'
      });
    },
    onError: () => toast.error('Failed to save feedback')
  });

  const deleteInteractionMutation = useMutation({
    mutationFn: (id) => base44.entities.StaffInteraction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-interactions'] });
      toast.success('Interaction deleted');
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id) => base44.entities.StaffNote.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-notes'] });
      toast.success('Note deleted');
    }
  });

  const updateStaffMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Staff.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-detail'] });
      toast.success('Updated');
    }
  });



  const enrollCourseMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffCourseEnrollment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-enrollments'] });
      setShowEnrollDialog(false);
      setSelectedCourseId('');
      toast.success('Enrolled in course');
    }
  });

  const unenrollCourseMutation = useMutation({
    mutationFn: (id) => base44.entities.StaffCourseEnrollment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-enrollments'] });
      toast.success('Unenrolled from course');
    }
  });

  // Handlers
  const handleFileUpload = async (files, setFilesState) => {
    setUploading(true);
    const uploadedUrls = [];
    
    for (const file of files) {
      try {
        const result = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(result.file_url);
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    
    setFilesState(prev => [...prev, ...uploadedUrls]);
    setUploading(false);
  };

  const handleDrop = (e, setFilesState) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files, setFilesState);
  };

  const handleLogInteraction = () => {
    if (!interactionForm.notes.trim()) {
      toast.error('Please add notes');
      return;
    }

    // Convert EST datetime to UTC for storage
    const estDate = new Date(interactionForm.interaction_date);
    const utcDate = toZonedTime(estDate, 'America/New_York');

    createInteractionMutation.mutate({
      staff_id: staffId,
      staff_name: staff.preferred_name || staff.legal_full_name,
      ...interactionForm,
      interaction_date: utcDate.toISOString(),
      file_urls: interactionFiles,
      logged_by_id: user.id,
      logged_by_name: user.full_name
    });
  };

  const handleAddNote = () => {
    if (!noteText.trim()) {
      toast.error('Please add note text');
      return;
    }

    createNoteMutation.mutate({
      staff_id: staffId,
      staff_name: staff.preferred_name || staff.legal_full_name,
      note: noteText,
      note_type: 'training',
      file_urls: uploadedFiles,
      author_id: user.id,
      author_name: user.full_name
    });
  };

  const handleProvideFeedback = () => {
    if (!feedbackForm.feedback_notes.trim()) {
      toast.error('Please add feedback notes');
      return;
    }

    const data = {
      ...feedbackForm,
      score: feedbackForm.score ? Number(feedbackForm.score) : null,
      reviewed_at: new Date().toISOString(),
      reviewed_by_id: user.id,
      reviewed_by_name: user.full_name
    };

    updateProgressMutation.mutate({ id: selectedProgress.id, data });
  };

  const openFeedbackDialog = (progress) => {
    setSelectedProgress(progress);
    setFeedbackForm({
      feedback_notes: progress.feedback_notes || '',
      score: progress.score || '',
      status: progress.status
    });
    setShowFeedbackDialog(true);
  };

  const handlePhotographerStatusChange = (status) => {
    updateStaffMutation.mutate({ 
      id: staffId, 
      data: { 
        photographer_status: status,
        equipment_status: staff.equipment_status,
        signed_off_services: staff.signed_off_services || []
      } 
    });
  };

  const handleEquipmentStatusChange = (status) => {
    updateStaffMutation.mutate({ 
      id: staffId, 
      data: { 
        photographer_status: staff.photographer_status,
        equipment_status: status || null,
        signed_off_services: staff.signed_off_services || []
      } 
    });
  };

  const handleRemoveService = (service) => {
    const newServices = (staff.signed_off_services || []).filter(s => s !== service);
    updateStaffMutation.mutate({ 
      id: staffId, 
      data: { 
        photographer_status: staff.photographer_status,
        equipment_status: staff.equipment_status,
        signed_off_services: newServices
      } 
    });
  };

  const handleAddService = () => {
    if (newServices.length === 0) return;
    
    // Get unique services from selected groups
    const groupServices = newServices
      .filter(name => serviceGroups.some(g => g.group_name === name))
      .flatMap(groupName => {
        const group = serviceGroups.find(g => g.group_name === groupName);
        return group?.service_names || [];
      });
    
    // Get individual services (those not matching any group name)
    const individualServices = newServices.filter(name => !serviceGroups.some(g => g.group_name === name));
    
    // Combine and deduplicate
    const allNewServices = [...new Set([...groupServices, ...individualServices])];
    const updatedServices = [...new Set([...(staff.signed_off_services || []), ...allNewServices])];
    
    updateStaffMutation.mutate({ 
      id: staffId, 
      data: { 
        photographer_status: staff.photographer_status,
        equipment_status: staff.equipment_status,
        signed_off_services: updatedServices
      } 
    });
    setNewServices([]);
    setShowAddService(false);
  };



  const handleEnrollCourse = () => {
    if (!selectedCourseId || !staff) return;
    
    const course = courses.find(c => c.id === selectedCourseId);
    enrollCourseMutation.mutate({
      staff_id: staffId,
      staff_name: staff.preferred_name || staff.legal_full_name,
      course_id: selectedCourseId,
      course_name: course?.course_name,
      enrollment_status: 'enrolled',
      enrolled_date: new Date().toISOString(),
      progress_percent: 0,
      completed_lessons: []
    });
  };

  const handleUnenrollCourse = (enrollmentId) => {
    if (confirm('Remove this course enrollment?')) {
      unenrollCourseMutation.mutate(enrollmentId);
    }
  };

  const interactionTypeLabels = {
    call: 'Call',
    email: 'Email',
    meeting: 'Meeting',
    check_in: 'Check-in',
    note: 'Note',
    feedback: 'Feedback',
    other: 'Other'
  };

  const statusColors = {
    not_started: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-blue-100 text-blue-700',
    submitted: 'bg-purple-100 text-purple-700',
    feedback_given: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    needs_improvement: 'bg-red-100 text-red-700'
  };

  if (staffLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
          <p className="text-slate-500">Loading photographer...</p>
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Photographer not found</p>
        <Button onClick={() => navigate(createPageUrl('TrainingPhotographersStatus'))} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to List
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl('TrainingPhotographersStatus'))}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Photographers
        </Button>

        <div className="flex items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-3xl shrink-0">
            {staff.profile_photo_url ? (
              <img
                src={staff.profile_photo_url}
                alt={staff.preferred_name || staff.legal_full_name}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              (staff.preferred_name || staff.legal_full_name)?.charAt(0) || '?'
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">
              {staff.preferred_name || staff.legal_full_name}
            </h1>
            <p className="text-slate-500 text-lg mt-1">{staff.primary_role || 'Photographer'}</p>
            {staff.business && (
              <p className="text-slate-500 text-sm mt-1">
                <span className="font-medium">Business:</span> {staff.business}
              </p>
            )}
            {staff.address && (
              <p className="text-slate-500 text-sm mt-1">
                <span className="font-medium">Address:</span> {staff.address}
              </p>
            )}
            <div className="flex flex-wrap gap-4 mt-3">
              {staff.company_email && (
                <a
                  href={`mailto:${staff.company_email}`}
                  className="flex items-center gap-2 text-slate-600 hover:text-indigo-600"
                >
                  <Mail className="w-4 h-4" />
                  {staff.company_email}
                </a>
              )}
              {staff.phone && (
                <a
                  href={`tel:${staff.phone}`}
                  className="flex items-center gap-2 text-slate-600 hover:text-indigo-600"
                >
                  <Phone className="w-4 h-4" />
                  {staff.phone}
                </a>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowInteractionDialog(true)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Log Interaction
            </Button>
            <Button
              onClick={() => setShowNoteDialog(true)}
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Status & Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Photographer Status</label>
                <Select 
                  value={staff.photographer_status || 'training'} 
                  onValueChange={handlePhotographerStatusChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="need_to_be_removed">Need to be removed</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Equipment Status</label>
                <Select 
                  value={staff.equipment_status || ''} 
                  onValueChange={handleEquipmentStatusChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No equipment assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>No Equipment</SelectItem>
                    <SelectItem value="waiting_on_equipment">Waiting on Equipment</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="request_return">Request Return</SelectItem>
                    <SelectItem value="waiting_on_returning">Waiting on Returning</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Signed Off Services</label>
                <div className="space-y-2">
                  {!staff.signed_off_services || staff.signed_off_services.length === 0 ? (
                    <p className="text-sm text-slate-500">No services signed off yet</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(
                        staff.signed_off_services
                          .map(service => serviceGroups.find(g => g.service_names?.includes(service))?.group_name)
                          .filter(Boolean)
                      )).map((groupName, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span className="font-medium">{groupName}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const group = serviceGroups.find(g => g.group_name === groupName);
                              if (group) {
                                const remainingServices = (staff.signed_off_services || []).filter(
                                  s => !group.service_names?.includes(s)
                                );
                                updateStaffMutation.mutate({
                                  id: staffId,
                                  data: {
                                    photographer_status: staff.photographer_status,
                                    equipment_status: staff.equipment_status,
                                    signed_off_services: remainingServices
                                  }
                                });
                              }
                            }}
                            className="text-emerald-600 hover:text-emerald-800 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddService(true)}
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Service
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityLog.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No activity logged yet</p>
              ) : (
                <div className="space-y-3">
                  {activityLog.map((item) => (
                    <div key={`${item.type}-${item.id}`} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.type === 'interaction' ? (
                            <Badge variant="outline" className="capitalize">
                              {interactionTypeLabels[item.interaction_type]}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 capitalize">
                              {item.note_type?.replace(/_/g, ' ') || 'Note'}
                            </Badge>
                          )}
                          <span className="text-sm text-slate-500">
                            {formatInEST(item.date, 'MMM d, yyyy \'at\' h:mm a')} EST
                          </span>
                        </div>
                        {((item.type === 'interaction' && item.logged_by_id === user.id) || 
                          (item.type === 'note' && item.author_id === user.id)) && (
                          <button
                            onClick={() => {
                              if (confirm(`Delete this ${item.type}?`)) {
                                if (item.type === 'interaction') {
                                  deleteInteractionMutation.mutate(item.id);
                                } else {
                                  deleteNoteMutation.mutate(item.id);
                                }
                              }
                            }}
                            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {item.type === 'interaction' ? item.notes : item.note}
                      </p>
                      {item.file_urls && item.file_urls.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {item.file_urls.map((url, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setPreviewImages(item.file_urls);
                                setCurrentImageIndex(idx);
                                setPreviewImage(url);
                              }}
                              className="block w-24 h-24 rounded-lg overflow-hidden border-2 border-slate-200 hover:border-indigo-400 transition-colors cursor-pointer"
                            >
                              <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-slate-500 mt-2">
                        {item.type === 'interaction' 
                          ? `Logged by ${item.logged_by_name}`
                          : `Added by ${item.author_name}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Training Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Training Progress & Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lessonProgress.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No training submissions yet</p>
              ) : (
                <div className="space-y-3">
                  {lessonProgress.map((progress) => (
                    <div key={progress.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900">{progress.lesson_title}</h4>
                          <p className="text-sm text-slate-500">{progress.course_name}</p>
                          <Badge className={`mt-2 ${statusColors[progress.status]}`}>
                            {progress.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openFeedbackDialog(progress)}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Give Feedback
                        </Button>
                      </div>
                      {progress.submitted_at && (
                        <p className="text-xs text-slate-500 mt-2">
                          Submitted {formatInEST(progress.submitted_at, 'MMM d, yyyy')} EST
                        </p>
                      )}
                      {progress.feedback_notes && (
                        <div className="mt-3 p-3 bg-white rounded border border-slate-200">
                          <p className="text-xs font-medium text-slate-700 mb-1">Feedback:</p>
                          <p className="text-sm text-slate-600">{progress.feedback_notes}</p>
                          {progress.score && (
                            <p className="text-xs text-slate-500 mt-1">Score: {progress.score}/100</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
         <div className="space-y-6">
           {/* Shoots Completed */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Star className="w-5 h-5" />
                 Shoots Completed
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="text-center">
                 <div className="text-4xl font-bold text-indigo-600">{staff.shoots_completed || 0}</div>
                 <p className="text-sm text-slate-500 mt-1">Total shoots</p>
               </div>

               <div className="space-y-2">
                 <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                   <span className="text-sm text-slate-700">1st Shoot 🎉</span>
                   <Badge className={(staff.shoots_completed || 0) >= 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}>
                     {(staff.shoots_completed || 0) >= 1 ? '✓' : '-'}
                   </Badge>
                 </div>
                 <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                   <span className="text-sm text-slate-700">5 Shoots 🔥</span>
                   <Badge className={(staff.shoots_completed || 0) >= 5 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}>
                     {(staff.shoots_completed || 0) >= 5 ? '✓' : '-'}
                   </Badge>
                 </div>
                 <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                   <span className="text-sm text-slate-700">10 Shoots 👑</span>
                   <Badge className={(staff.shoots_completed || 0) >= 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}>
                     {(staff.shoots_completed || 0) >= 10 ? '✓' : '-'}
                   </Badge>
                 </div>
                 <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                   <span className="text-sm text-slate-700">15+ Shoots 🌟</span>
                   <Badge className={(staff.shoots_completed || 0) >= 15 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}>
                     {(staff.shoots_completed || 0) >= 15 ? '✓' : '-'}
                   </Badge>
                 </div>
               </div>

               <div className="space-y-2 pt-2 border-t">
                 <label className="text-sm font-medium text-slate-700 block">Quick Set</label>
                 <div className="grid grid-cols-4 gap-2">
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={() => updateStaffMutation.mutate({ 
                       id: staffId, 
                       data: { shoots_completed: 1, photographer_status: staff.photographer_status, equipment_status: staff.equipment_status, signed_off_services: staff.signed_off_services || [] }
                     })}
                     className="text-xs"
                   >
                     1
                   </Button>
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={() => updateStaffMutation.mutate({ 
                       id: staffId, 
                       data: { shoots_completed: 5, photographer_status: staff.photographer_status, equipment_status: staff.equipment_status, signed_off_services: staff.signed_off_services || [] }
                     })}
                     className="text-xs"
                   >
                     5
                   </Button>
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={() => updateStaffMutation.mutate({ 
                       id: staffId, 
                       data: { shoots_completed: 10, photographer_status: staff.photographer_status, equipment_status: staff.equipment_status, signed_off_services: staff.signed_off_services || [] }
                     })}
                     className="text-xs"
                   >
                     10
                   </Button>
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={() => updateStaffMutation.mutate({ 
                       id: staffId, 
                       data: { shoots_completed: 15, photographer_status: staff.photographer_status, equipment_status: staff.equipment_status, signed_off_services: staff.signed_off_services || [] }
                     })}
                     className="text-xs"
                   >
                     15
                   </Button>
                 </div>
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-700 block">Adjust Count</label>
                 <div className="flex gap-2">
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={() => updateStaffMutation.mutate({ 
                       id: staffId, 
                       data: { shoots_completed: Math.max(0, (staff.shoots_completed || 0) - 1), photographer_status: staff.photographer_status, equipment_status: staff.equipment_status, signed_off_services: staff.signed_off_services || [] }
                     })}
                     className="flex-1"
                   >
                     -
                   </Button>
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={() => updateStaffMutation.mutate({ 
                       id: staffId, 
                       data: { shoots_completed: (staff.shoots_completed || 0) + 1, photographer_status: staff.photographer_status, equipment_status: staff.equipment_status, signed_off_services: staff.signed_off_services || [] }
                     })}
                     className="flex-1"
                   >
                     +
                   </Button>
                 </div>
               </div>
             </CardContent>
           </Card>

           {/* Last Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Last Contact
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityLog.length > 0 ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {formatInEST(activityLog[0].date, 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatInEST(activityLog[0].date, 'h:mm a')} EST
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {activityLog[0].type === 'interaction' 
                        ? interactionTypeLabels[activityLog[0].interaction_type]
                        : 'Note'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4 text-sm">No contact logged yet</p>
              )}
            </CardContent>
          </Card>

          {/* Important Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Important Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {staff.start_date && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Start Date</p>
                    <p className="text-sm font-medium text-slate-900">
                      {format(toZonedTime(parseISO(staff.start_date + 'Z'), 'America/New_York'), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}
              {staff.birthday && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                    <Cake className="w-5 h-5 text-pink-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Birthday</p>
                    <p className="text-sm font-medium text-slate-900">
                      {format(parseISO(staff.birthday), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}
              {!staff.start_date && !staff.birthday && (
                <p className="text-slate-500 text-center py-4 text-sm">No dates added yet</p>
              )}
            </CardContent>
          </Card>

          {/* Equipment Assigned */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Equipment Assigned
              </CardTitle>
            </CardHeader>
            <CardContent>
              {equipment.length === 0 ? (
                <p className="text-slate-500 text-center py-4 text-sm">No equipment assigned</p>
              ) : (
                <div className="space-y-2">
                  {equipment.map((item) => (
                    <div key={item.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="font-medium text-slate-900 text-sm">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.model}</p>
                      {item.checked_out_date && (
                        <p className="text-xs text-slate-400 mt-1">
                          Since {formatInEST(item.checked_out_date, 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Course Enrollments */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <FileText className="w-5 h-5" />
                 Course Enrollments
               </CardTitle>
             </CardHeader>
            <CardContent className="space-y-3">
              {enrollments.length === 0 ? (
                <p className="text-slate-500 text-center py-4 text-sm">No courses enrolled</p>
              ) : (
                <div className="space-y-2">
                  {enrollments.map((enrollment) => (
                    <div key={enrollment.id} className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{enrollment.course_name}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {enrollment.progress_percent || 0}% Complete
                        </Badge>
                      </div>
                      <button
                        onClick={() => handleUnenrollCourse(enrollment.id)}
                        className="p-1 hover:bg-indigo-100 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowEnrollDialog(true)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Enroll in Course
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Log Interaction Dialog */}
      <Dialog open={showInteractionDialog} onOpenChange={setShowInteractionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log New Interaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Interaction Type
              </label>
              <Select
                value={interactionForm.interaction_type}
                onValueChange={(value) =>
                  setInteractionForm({ ...interactionForm, interaction_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="check_in">Check-in</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Date & Time (EST)
              </label>
              <Input
                type="datetime-local"
                value={interactionForm.interaction_date}
                onChange={(e) =>
                  setInteractionForm({ ...interactionForm, interaction_date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Notes *
              </label>
              <Textarea
                value={interactionForm.notes}
                onChange={(e) =>
                  setInteractionForm({ ...interactionForm, notes: e.target.value })
                }
                placeholder="What did you discuss? What are the next steps?"
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Photos (Optional)
              </label>
              <div
                onDrop={(e) => handleDrop(e, setInteractionFiles)}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors cursor-pointer"
                onClick={() => document.getElementById('interaction-file-input').click()}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-600">
                  Drag & drop photos here or click to browse
                </p>
                <input
                  id="interaction-file-input"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(Array.from(e.target.files), setInteractionFiles)}
                />
              </div>
              {interactionFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {interactionFiles.map((url, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-slate-200">
                      <img src={url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInteractionFiles(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {uploading && (
                <p className="text-sm text-slate-500 mt-2">Uploading...</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowInteractionDialog(false);
                setInteractionForm({
                  interaction_type: 'check_in',
                  notes: '',
                  interaction_date: format(toZonedTime(new Date(), 'America/New_York'), "yyyy-MM-dd'T'HH:mm")
                });
                setInteractionFiles([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLogInteraction}
              disabled={createInteractionMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Log Interaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Note *
              </label>
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note about training progress, areas to improve, etc..."
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Photos/Files (Optional)
              </label>
              <div
                onDrop={(e) => handleDrop(e, setUploadedFiles)}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors cursor-pointer"
                onClick={() => document.getElementById('note-file-input').click()}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-600">
                  Drag & drop files here or click to browse
                </p>
                <input
                  id="note-file-input"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(Array.from(e.target.files), setUploadedFiles)}
                />
              </div>
              {uploadedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {uploadedFiles.map((url, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-slate-200">
                      <img src={url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {uploading && (
                <p className="text-sm text-slate-500 mt-2">Uploading...</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNoteDialog(false);
                setNoteText('');
                setUploadedFiles([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddNote}
              disabled={createNoteMutation.isPending || !noteText.trim()}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Service Dialog */}
      <Dialog open={showAddService} onOpenChange={setShowAddService}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Service Sign-Offs</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Service Groups Section */}
            {serviceGroups.length > 0 && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Service Groups
                </label>
                <div className="grid grid-cols-2 gap-2 p-2 border rounded-lg bg-blue-50/30">
                  {serviceGroups.map(group => {
                    const allServicesSignedOff = group.service_names?.every(name => 
                      (staff.signed_off_services || []).includes(name)
                    );
                    return (
                      <button
                        key={group.id}
                        onClick={() => {
                          if (newServices.includes(group.group_name)) {
                            setNewServices(prev => prev.filter(s => s !== group.group_name));
                          } else {
                            setNewServices(prev => [...prev, group.group_name]);
                          }
                        }}
                        className={`p-3 text-left rounded-lg border-2 transition-all ${
                          newServices.includes(group.group_name)
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                            : allServicesSignedOff
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            newServices.includes(group.group_name)
                              ? 'border-indigo-500 bg-indigo-500'
                              : allServicesSignedOff
                              ? 'border-emerald-500 bg-emerald-500'
                              : 'border-slate-300'
                          }`}>
                            {(newServices.includes(group.group_name) || allServicesSignedOff) && (
                              <CheckCircle className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <span className="text-sm font-medium">{group.group_name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}


            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setShowAddService(false);
                setNewServices([]);
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddService}
                disabled={newServices.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Add {newServices.length > 0 ? `${newServices.length} ` : ''}Service{newServices.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enroll Course Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll in Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Select Course
              </label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a course..." />
                </SelectTrigger>
                <SelectContent>
                  {courses
                    .filter(c => !enrollments.some(e => e.course_id === c.id))
                    .map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.course_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setShowEnrollDialog(false);
                setSelectedCourseId('');
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleEnrollCourse}
                disabled={!selectedCourseId || enrollCourseMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Enroll
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provide Training Feedback</DialogTitle>
          </DialogHeader>
          {selectedProgress && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-900">{selectedProgress.lesson_title}</p>
                <p className="text-sm text-slate-500">{selectedProgress.course_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Status
                </label>
                <Select
                  value={feedbackForm.status}
                  onValueChange={(value) =>
                    setFeedbackForm({ ...feedbackForm, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feedback_given">Feedback Given</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Score (0-100) - Optional
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={feedbackForm.score}
                  onChange={(e) =>
                    setFeedbackForm({ ...feedbackForm, score: e.target.value })
                  }
                  placeholder="85"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Feedback Notes *
                </label>
                <Textarea
                  value={feedbackForm.feedback_notes}
                  onChange={(e) =>
                    setFeedbackForm({ ...feedbackForm, feedback_notes: e.target.value })
                  }
                  placeholder="What did they do well? What needs improvement?"
                  rows={5}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowFeedbackDialog(false);
                setSelectedProgress(null);
                setFeedbackForm({
                  feedback_notes: '',
                  score: '',
                  status: 'feedback_given'
                });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProvideFeedback}
              disabled={updateProgressMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Save Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => {
        setPreviewImage(null);
        setPreviewImages([]);
        setCurrentImageIndex(0);
      }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Image Preview {previewImages.length > 1 && `(${currentImageIndex + 1} of ${previewImages.length})`}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 relative">
            <img src={previewImages[currentImageIndex] || previewImage} alt="Preview" className="w-full h-auto max-h-[70vh] object-contain rounded-lg" />
            {previewImages.length > 1 && (
              <>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setCurrentImageIndex((prev) => (prev - 1 + previewImages.length) % previewImages.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg"
                >
                  <ChevronDown className="w-5 h-5 rotate-90" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setCurrentImageIndex((prev) => (prev + 1) % previewImages.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg"
                >
                  <ChevronDown className="w-5 h-5 -rotate-90" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}