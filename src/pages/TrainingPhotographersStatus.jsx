import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Edit2,
  X,
  Plus,
  Search,
  Users,
  Phone,
  Mail,
  Trash2,
  Calendar
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { formatInEST } from '@/components/dateFormatter';
import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export default function TrainingPhotographersStatus({ user }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    photographer_status: '',
    equipment_status: null,
    signed_off_services: []
  });
  const [showAddService, setShowAddService] = useState(false);
  const [newService, setNewService] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCourse, setFilterCourse] = useState('all');
  const [newTrainerNote, setNewTrainerNote] = useState('');
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');

  const queryClient = useQueryClient();

  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ['training-staff'],
    queryFn: async () => {
      const staff = await base44.entities.Staff.filter({ department: 'Photographer' }, 'preferred_name');
      return staff;
    }
  });

  const { data: serviceTemplates = [] } = useQuery({
    queryKey: ['service-templates'],
    queryFn: () => base44.entities.ServiceTemplate.list('service_name'),
  });

  const { data: serviceGroups = [] } = useQuery({
    queryKey: ['service-groups'],
    queryFn: () => base44.entities.TrainingServiceGroup.list('sort_order')
  });

  const { data: trainerNotes = [] } = useQuery({
    queryKey: ['trainer-notes', selectedStaff?.id],
    queryFn: async () => {
      const allNotes = await base44.entities.StaffNote.filter({ 
        staff_id: selectedStaff.id
      }, '-created_date');
      return allNotes.filter(note => note.note_type === 'training' || note.note_type === 'equipment');
    },
    enabled: !!selectedStaff?.id
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.filter({ is_active: true }, 'order')
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments', selectedStaff?.id],
    queryFn: () => base44.entities.StaffCourseEnrollment.filter({ 
      staff_id: selectedStaff.id 
    }),
    enabled: !!selectedStaff?.id
  });

  const { data: allEnrollments = [] } = useQuery({
    queryKey: ['all-enrollments'],
    queryFn: () => base44.entities.StaffCourseEnrollment.list()
  });

  const updateStaffMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Staff.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-staff'] });
    }
  });

  const addTrainerNoteMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffNote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-notes'] });
      queryClient.invalidateQueries({ queryKey: ['staff-notes'] });
      setNewTrainerNote('');
    }
  });

  const enrollCourseMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffCourseEnrollment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      setShowEnrollDialog(false);
      setSelectedCourseId('');
    }
  });

  const unenrollCourseMutation = useMutation({
    mutationFn: (id) => base44.entities.StaffCourseEnrollment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id) => base44.entities.StaffNote.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-notes'] });
      queryClient.invalidateQueries({ queryKey: ['staff-notes'] });
    }
  });

  const handleEditStaff = (staff) => {
    setEditForm({
      photographer_status: staff.photographer_status || '',
      equipment_status: staff.equipment_status || null,
      signed_off_services: staff.signed_off_services || []
    });
    setSelectedStaff(staff);
    setIsEditing(true);
  };

  const handlePhotographerStatusChange = (status) => {
    const newForm = { ...editForm, photographer_status: status };
    setEditForm(newForm);
    updateStaffMutation.mutate({ id: selectedStaff.id, data: newForm });
  };

  const handleEquipmentStatusChange = (status) => {
    const newForm = { ...editForm, equipment_status: status || null };
    setEditForm(newForm);
    updateStaffMutation.mutate({ id: selectedStaff.id, data: newForm });
  };

  const handleAddTrainerNote = () => {
    if (!newTrainerNote.trim() || !selectedStaff) return;
    
    addTrainerNoteMutation.mutate({
      staff_id: selectedStaff.id,
      staff_name: selectedStaff.preferred_name || selectedStaff.legal_full_name,
      note: newTrainerNote,
      note_type: 'training',
      author_id: user?.id,
      author_name: user?.full_name
    });
  };

  const handleSave = () => {
    if (!selectedStaff) return;
    updateStaffMutation.mutate({ id: selectedStaff.id, data: editForm });
  };

  const handleRemoveService = (service) => {
    const newForm = {
      ...editForm,
      signed_off_services: editForm.signed_off_services.filter(s => s !== service)
    };
    setEditForm(newForm);
    updateStaffMutation.mutate({ id: selectedStaff.id, data: newForm });
  };

  const handleAddService = () => {
    if (!newService) return;
    const newForm = {
      ...editForm,
      signed_off_services: [...editForm.signed_off_services, newService]
    };
    setEditForm(newForm);
    updateStaffMutation.mutate({ id: selectedStaff.id, data: newForm });
    setNewService('');
    setShowAddService(false);
  };

  const handleEnrollCourse = () => {
    if (!selectedCourseId || !selectedStaff) return;
    
    const course = courses.find(c => c.id === selectedCourseId);
    enrollCourseMutation.mutate({
      staff_id: selectedStaff.id,
      staff_name: selectedStaff.preferred_name || selectedStaff.legal_full_name,
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

  const courseTypeLabels = {
    photo_shoot: 'Photo Shoot',
    marketing_and_coaching: 'Marketing & Coaching',
    add_on_training: 'Add-on Training'
  };

  const statusColors = {
    training: 'bg-emerald-100 text-emerald-700',
    active: 'bg-blue-100 text-blue-700',
    on_leave: 'bg-pink-100 text-pink-700',
    need_to_be_removed: 'bg-red-100 text-red-700',
    inactive: 'bg-amber-100 text-amber-700'
  };

  const statusIcons = {
    training: <BookOpen className="w-4 h-4" />,
    active: <CheckCircle className="w-4 h-4" />,
    on_leave: <Clock className="w-4 h-4" />,
    need_to_be_removed: <X className="w-4 h-4" />,
    inactive: <Clock className="w-4 h-4" />
  };

  const filteredStaff = staffList.filter(staff => {
    const matchesSearch = 
      (staff.preferred_name || staff.legal_full_name).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || staff.photographer_status === filterStatus;
    const matchesCourse = filterCourse === 'all' || allEnrollments.some(e => e.staff_id === staff.id && e.course_id === filterCourse);
    return matchesSearch && matchesStatus && matchesCourse;
  });

  return (
    <div className="space-y-6">
      {/* Access Control Check */}
      {user?.role !== 'admin' && !user?.is_trainer && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800 text-sm">
            You don't have permission to access this page. Only admins and trainers can view photographer status.
          </p>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Photographer Status</h1>
        <p className="text-slate-500 mt-1">Track photographer status and service sign-offs</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-64">
            <label className="text-sm font-medium text-slate-700 block mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Photographer Status</label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="training">Training</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
                <SelectItem value="need_to_be_removed">Need to be removed</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Course Enrollment</label>
            <Select value={filterCourse} onValueChange={setFilterCourse}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map(course => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.course_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Staff Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
            <p className="text-slate-500">Loading staff...</p>
          </div>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
          <div className="text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">No photographers found</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map(staff => (
            <div 
              key={staff.id} 
              onClick={() => navigate(createPageUrl('PhotographerDetail') + `?id=${staff.id}`)}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition-shadow cursor-pointer"
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xl shrink-0">
                  {staff.profile_photo_url ? (
                    <img 
                      src={staff.profile_photo_url} 
                      alt={staff.preferred_name || staff.legal_full_name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    (staff.preferred_name || staff.legal_full_name)?.charAt(0) || '?'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">
                    {staff.preferred_name || staff.legal_full_name}
                  </h3>
                  <p className="text-sm text-slate-500 mb-2">{staff.primary_role || 'Photographer'}</p>
                  
                  {/* Contact Info */}
                  <div className="space-y-1">
                    {staff.company_email && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="truncate">{staff.company_email}</span>
                      </div>
                    )}
                    {staff.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Phone className="w-3.5 h-3.5" />
                        {staff.phone}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Photographer Status */}
              <div className="mb-3">
                <div className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium",
                  statusColors[staff.photographer_status || 'training']
                )}>
                  {statusIcons[staff.photographer_status || 'training']}
                  {(staff.photographer_status || 'training').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
              </div>

              {/* Service Groups */}
              <div className="mb-4">
                <div className="text-xs text-slate-500 mb-2">Service Groups</div>
                {!staff.signed_off_services || staff.signed_off_services.length === 0 ? (
                  <p className="text-xs text-slate-400">None</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {Array.from(new Set(
                      staff.signed_off_services
                        .map(service => serviceGroups.find(g => g.service_names?.includes(service))?.group_name)
                        .filter(Boolean)
                    )).slice(0, 3).map((groupName, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                        {groupName}
                      </Badge>
                    ))}
                    {Array.from(new Set(
                      staff.signed_off_services
                        .map(service => serviceGroups.find(g => g.service_names?.includes(service))?.group_name)
                        .filter(Boolean)
                    )).length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{Array.from(new Set(
                          staff.signed_off_services
                            .map(service => serviceGroups.find(g => g.service_names?.includes(service))?.group_name)
                            .filter(Boolean)
                        )).length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>



            </div>
          ))}
        </div>
      )}

      {/* Edit Panel */}
      <AnimatePresence>
        {isEditing && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsEditing(false);
                setSelectedStaff(null);
              }}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
            />
            
            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 h-screen w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-slate-200 z-10 px-6 py-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xl shrink-0">
                    {selectedStaff?.profile_photo_url ? (
                      <img 
                        src={selectedStaff.profile_photo_url} 
                        alt={selectedStaff.preferred_name || selectedStaff.legal_full_name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      (selectedStaff?.preferred_name || selectedStaff?.legal_full_name)?.charAt(0) || '?'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-slate-900 truncate">
                      {selectedStaff ? `${selectedStaff.preferred_name || selectedStaff.legal_full_name}` : 'Edit Status'}
                    </h2>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {selectedStaff?.start_date && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Started {format(toZonedTime(parseISO(selectedStaff.start_date + 'Z'), 'America/New_York'), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                        {selectedStaff?.company_email && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Mail className="w-3.5 h-3.5" />
                            <span className="truncate">{selectedStaff.company_email}</span>
                          </div>
                        )}
                        {selectedStaff?.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Phone className="w-3.5 h-3.5" />
                            {selectedStaff.phone}
                          </div>
                        )}
                      </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setSelectedStaff(null);
                    }}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                <div>
                   <label className="text-sm font-medium text-slate-700 mb-2 block">Photographer Status</label>
                   <Select 
                     value={editForm.photographer_status} 
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
                     value={editForm.equipment_status || ''} 
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
                    {editForm.signed_off_services.length === 0 ? (
                      <p className="text-sm text-slate-500">No services signed off yet</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {editForm.signed_off_services.map((service, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {service}
                            <button
                              onClick={() => handleRemoveService(service)}
                              className="ml-1 hover:text-emerald-900"
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

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-3 block">Course Enrollments</label>
                  
                  {/* Current Enrollments */}
                  <div className="mb-4">
                    {enrollments.length === 0 ? (
                      <p className="text-sm text-slate-500">No courses enrolled yet</p>
                    ) : (
                      <div className="space-y-2">
                        {enrollments.map(enrollment => (
                          <div key={enrollment.id} className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                            <div>
                              <p className="font-medium text-slate-900 text-sm">{enrollment.course_name}</p>
                              <p className="text-xs text-slate-500">
                                {courseTypeLabels[courses.find(c => c.id === enrollment.course_id)?.course_type]}
                              </p>
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
                      className="mt-3"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Enroll in Course
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-3 block">Trainer Notes</label>
                  
                  {/* Add Note */}
                  <div className="mb-4">
                    <Textarea
                      value={newTrainerNote}
                      onChange={(e) => setNewTrainerNote(e.target.value)}
                      placeholder="Add a note about training progress, areas to improve, etc..."
                      rows={3}
                    />
                    <Button
                      size="sm"
                      onClick={handleAddTrainerNote}
                      disabled={!newTrainerNote.trim() || addTrainerNoteMutation.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700 mt-2"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Note
                    </Button>
                  </div>

                  {/* Notes List */}
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Note History</div>
                    {trainerNotes.length === 0 ? (
                      <p className="text-sm text-slate-500">No notes added yet</p>
                    ) : (
                      <div className="space-y-2">
                        {trainerNotes.map(note => (
                          <div key={note.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-slate-900 text-sm">{note.author_name}</span>
                                  <span className="text-xs text-slate-500">
                                    {formatInEST(note.created_date, 'MMM d, yyyy \'at\' h:mm a')} EST
                                  </span>
                                  <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700 border-slate-300 capitalize">
                                    {note.note_type?.replace(/_/g, ' ')}
                                  </Badge>
                                </div>
                              </div>
                              {note.author_id === user?.id && (
                                <button
                                  onClick={() => {
                                    if (confirm('Delete this note?')) {
                                      deleteNoteMutation.mutate(note.id);
                                    }
                                  }}
                                  className="p-1 hover:bg-slate-200 rounded transition-colors text-slate-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.note}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    These notes will sync to HR/Accounting staff detail pages and are visible to trainers, HR, and admins only
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
                        {course.course_name} ({courseTypeLabels[course.course_type]})
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

      {/* Add Service Dialog */}
      <Dialog open={showAddService} onOpenChange={setShowAddService}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Service Sign-Off</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Select Service
              </label>
              <Select value={newService} onValueChange={setNewService}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a service..." />
                </SelectTrigger>
                <SelectContent>
                  {serviceTemplates
                    .filter(t => !editForm.signed_off_services.includes(t.service_name))
                    .map(template => (
                      <SelectItem key={template.id} value={template.service_name}>
                        {template.service_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-2">
                Only services from the service templates library are shown
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setShowAddService(false);
                setNewService('');
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddService}
                disabled={!newService}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Add Service
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}