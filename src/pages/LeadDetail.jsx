import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, differenceInDays, startOfDay, endOfDay } from 'date-fns';
import { formatInEST } from '../components/dateFormatter';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Calendar,
  Plus,
  Edit2,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  FileText,
  Trash2,
  Check,
  X,
  ArrowRight,
  Flame,
  ChevronDown,
  Heart,
  Instagram,
  Facebook,
  Upload,
  Image as ImageIcon,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import FollowUpActionsPanel from '../components/sales/FollowUpActionsPanel';

const statusColors = {
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  contacted: 'bg-amber-100 text-amber-700 border-amber-200',
  engaged: 'bg-purple-100 text-purple-700 border-purple-200',
  nurture: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  won: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  lost: 'bg-slate-100 text-slate-500 border-slate-200',
};

const activityTypeIcons = {
  call: Phone,
  text: MessageCircle,
  email: Mail,
  dm: Send,
  engagement: Heart,
  note: FileText
};

const outcomeIcons = {
  no_response: XCircle,
  conversation: MessageCircle,
  booked: Calendar,
  not_interested: XCircle,
};

const outcomeColors = {
  no_response: 'text-slate-400',
  conversation: 'text-blue-500',
  booked: 'text-emerald-500',
  not_interested: 'text-red-400',
};

export default function LeadDetail({ user }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const leadId = urlParams.get('id');

  // Calculate today's boundaries in EST
  const nowEST = toZonedTime(new Date(), 'America/New_York');
  const todayStartEST = startOfDay(nowEST);
  const todayEndEST = endOfDay(nowEST);

  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newActivity, setNewActivity] = useState({
    activity_type: 'call',
    outcome: 'no_response',
    notes: '',
    shoot_date: '',
    payment_type: 'paid',
    photos: []
  });
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [viewingPhotos, setViewingPhotos] = useState(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditDragging, setIsEditDragging] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpType, setFollowUpType] = useState('call');
  const [followUpPriority, setFollowUpPriority] = useState('medium');
  const [editData, setEditData] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [timelineLimit, setTimelineLimit] = useState(10);
  const [showFollowUpsPanel, setShowFollowUpsPanel] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [showDeleteActivityConfirm, setShowDeleteActivityConfirm] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [showDeleteBookingConfirm, setShowDeleteBookingConfirm] = useState(null);
  const [showDeleteLeadConfirm, setShowDeleteLeadConfirm] = useState(false);
  const [showLostReasonDialog, setShowLostReasonDialog] = useState(false);
  const [lostReason, setLostReason] = useState('');

  const { data: lead, isLoading: loadingLead, error: leadError } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      if (!leadId) throw new Error('No lead ID provided');
      const leads = await base44.entities.Lead.filter({ id: leadId });
      if (!leads || leads.length === 0) throw new Error('Lead not found');
      return leads[0];
    },
    enabled: !!leadId && !!user?.id,
    retry: 2
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', leadId],
    queryFn: () => base44.entities.Activity.filter({ lead_id: leadId }, '-created_date'),
    enabled: !!leadId && !!user?.id && !!lead,
    staleTime: 30000
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['notes', leadId],
    queryFn: () => base44.entities.Note.filter({ 
      related_to_type: 'lead', 
      related_to_id: leadId 
    }, '-created_date'),
    enabled: !!leadId && !!user?.id && !!lead,
    staleTime: 30000
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['lead-bookings', leadId],
    queryFn: () => base44.entities.Booking.filter({ lead_id: leadId }, '-created_date'),
    enabled: !!leadId && !!user?.id && !!lead,
    staleTime: 30000
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['lead-tasks', leadId],
    queryFn: () => base44.entities.Task.filter({ 
      related_to_type: 'lead',
      related_to_id: leadId
    }, '-created_date'),
    enabled: !!leadId && !!user?.id && !!lead,
    staleTime: 30000
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['lead-audits', leadId],
    queryFn: () => base44.entities.AuditLog.filter({
      entity_type: 'Lead',
      entity_id: leadId
    }, '-created_date'),
    enabled: !!leadId && !!user?.id && !!lead,
    staleTime: 30000
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user?.id,
    staleTime: 300000,
    cacheTime: 600000
  });

  const { data: myGrabbedLeads = [] } = useQuery({
    queryKey: ['my-grabbed-leads'],
    queryFn: () => base44.entities.Lead.filter({
      reassigned_owner_id: user?.id,
      is_open_for_reassignment: true
    }),
    enabled: !!user?.id && !!leadId && !!lead,
    staleTime: 30000
  });

  const updateLeadMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Lead.update(leadId, data);
      
      // Create audit log for status or interest level changes
      if (data.status) {
        await base44.entities.AuditLog.create({
          action: `Changed status to ${data.status}`,
          entity_type: 'Lead',
          entity_id: leadId,
          entity_name: lead?.name,
          user_id: user?.id,
          user_name: user?.full_name,
          department: 'sales',
          details: `Status updated to ${data.status}`
        });
      }
      if (data.interest_level) {
        await base44.entities.AuditLog.create({
          action: `Changed interest level to ${data.interest_level}`,
          entity_type: 'Lead',
          entity_id: leadId,
          entity_name: lead?.name,
          user_id: user?.id,
          user_name: user?.full_name,
          department: 'sales',
          details: `Interest level updated to ${data.interest_level}`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead-audits', leadId] });
      queryClient.invalidateQueries({ queryKey: ['activities', leadId] });
    }
  });

  const createActivityMutation = useMutation({
    mutationFn: async (data) => {
      // If this is an open lead that hasn't been grabbed yet, grab it automatically
      if (lead?.is_open_for_reassignment && !lead?.reassigned_owner_id) {
        await base44.entities.Lead.update(leadId, {
          reassigned_owner_id: user?.id,
          reassigned_owner_name: user?.full_name,
          reassigned_grab_date: new Date().toISOString(),
          last_reassignment_contact_date: null
        });
        
        // Create audit log for auto-grab
        await base44.entities.AuditLog.create({
          action: 'Lead Reassigned',
          entity_type: 'Lead',
          entity_id: leadId,
          entity_name: lead?.name || lead?.phone,
          user_id: user?.id,
          user_name: user?.full_name,
          details: `${user?.full_name} grabbed this lead by logging activity`,
          department: 'sales'
        });
      }

      const todayEST = formatInTimeZone(new Date(), 'America/New_York', 'yyyy-MM-dd');
      const offset = formatInTimeZone(new Date(), 'America/New_York', 'XXX');
      const activityTimestamp = new Date(`${todayEST}T12:00:00${offset}`).toISOString();
      
      const activityData = {
        ...data,
        lead_id: leadId,
        lead_name: lead?.name,
        performed_by_id: user?.id,
        performed_by_name: user?.full_name,
        department: 'sales',
        activity_at: activityTimestamp
      };
      
      // Include photos if provided
      if (data.photos && data.photos.length > 0) {
        activityData.photos = data.photos;
      }
      
      await base44.entities.Activity.create(activityData);

      // If this is an open lead and user had a conversation or booked, assign the lead permanently
      if (lead?.is_open_for_reassignment && (data.outcome === 'conversation' || data.outcome === 'booked')) {
        await base44.entities.Lead.update(leadId, {
          owner_id: user?.id,
          owner_name: user?.full_name,
          is_open_for_reassignment: false,
          reassigned_owner_id: null,
          reassigned_owner_name: null,
          reassigned_grab_date: null,
          last_reassignment_contact_date: null
        });
      }
      // If this is a grabbed lead and user is logging contact, update last_reassignment_contact_date
      else if (lead?.reassigned_owner_id === user?.id && ['call', 'text', 'email', 'dm'].includes(data.activity_type)) {
        await base44.entities.Lead.update(leadId, {
          last_reassignment_contact_date: new Date().toISOString()
        });
      }
    },
    onSuccess: async (data, variables) => {
      setShowActivityDialog(false);
      setNewActivity({ activity_type: 'call', outcome: 'no_response', notes: '', shoot_date: '', payment_type: 'paid', photos: [] });

      // If booked, create a booking
      if (variables.outcome === 'booked') {
        const todayEST = formatInTimeZone(new Date(), 'America/New_York', 'yyyy-MM-dd');
        const offset = formatInTimeZone(new Date(), 'America/New_York', 'XXX');
        const bookingTimestamp = new Date(`${todayEST}T12:00:00${offset}`).toISOString();
        await base44.entities.Booking.create({
          lead_id: leadId,
          lead_name: lead?.name,
          booked_by_id: user?.id,
          booked_by_name: user?.full_name,
          booked_at: bookingTimestamp,
          address: variables.address,
          hdph_link: variables.hdph_link,
          department: 'sales'
        });
        queryClient.invalidateQueries({ queryKey: ['lead-bookings', leadId] });
        updateLeadMutation.mutate({ status: 'won' });
      } else if (lead?.status !== 'won') {
        // Only update status if not already won
        if (variables.activity_type === 'engagement') {
          // Engagement logic: new -> engaged, engaged stays engaged, contacted -> nurture
          if (lead?.status === 'new') {
            updateLeadMutation.mutate({ status: 'engaged' });
          } else if (lead?.status === 'contacted') {
            updateLeadMutation.mutate({ status: 'nurture' });
          }
        } else if (['call', 'text', 'email', 'dm'].includes(variables.activity_type)) {
          // Call, Text, Email, DM move to contacted (but not if already won)
          updateLeadMutation.mutate({ status: 'contacted' });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['activities', leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead-audits', leadId] });
      queryClient.invalidateQueries({ queryKey: ['my-grabbed-leads'] });
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create({
      ...data,
      owner_id: user?.id,
      owner_name: user?.full_name,
      related_to_type: 'lead',
      related_to_id: leadId,
      related_to_name: lead?.name,
      status: 'open',
      department: 'sales'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['lead-tasks', leadId] });
      setShowFollowUpDialog(false);
      setFollowUpDate('');
      setFollowUpNote('');
      setFollowUpType('call');
      setFollowUpPriority('medium');
      }
  });

  const updateLeadDetailsMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.update(leadId, data),
    onSuccess: async () => {
      // If there are notes to save, create a note entity
      if (editNotes.trim()) {
        await base44.entities.Note.create({
          content: editNotes.trim(),
          related_to_type: 'lead',
          related_to_id: leadId,
          author_id: user?.id,
          author_name: user?.full_name,
          department: 'sales',
          category: 'general'
        });
        queryClient.invalidateQueries({ queryKey: ['notes', leadId] });
        setEditNotes('');
      }
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      setShowEditDialog(false);
    }
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ noteId, content }) => base44.entities.Note.update(noteId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', leadId] });
      setEditingNoteId(null);
      setEditingNoteContent('');
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId) => base44.entities.Note.delete(noteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes', leadId] })
  });

  const updateBookingMutation = useMutation({
    mutationFn: ({ bookingId, data }) => base44.entities.Booking.update(bookingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-bookings', leadId] });
      setEditingBooking(null);
    }
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (bookingId) => {
      // Find and delete the associated activity with outcome='booked'
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        const bookedActivity = activities.find(a => 
          a.outcome === 'booked' && 
          a.lead_id === booking.lead_id &&
          Math.abs(new Date(a.created_date).getTime() - new Date(booking.created_date).getTime()) < 60000
        );
        if (bookedActivity) {
          await base44.entities.Activity.delete(bookedActivity.id);
        }
      }
      await base44.entities.Booking.delete(bookingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-bookings', leadId] });
      queryClient.invalidateQueries({ queryKey: ['activities', leadId] });
      setShowDeleteBookingConfirm(null);
    }
  });

  const updateActivityMutation = useMutation({
    mutationFn: async ({ activityId, data }) => {
      await base44.entities.Activity.update(activityId, data);
      
      // If this is a booked activity, find and update the associated booking
      if (data.outcome === 'booked') {
        const activity = activities.find(a => a.id === activityId);
        if (activity) {
          const booking = bookings.find(b => 
            b.lead_id === activity.lead_id &&
            Math.abs(new Date(b.created_date).getTime() - new Date(activity.created_date).getTime()) < 60000
          );
          if (booking) {
            await base44.entities.Booking.update(booking.id, {
              address: data.address,
              hdph_link: data.hdph_link
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead-bookings', leadId] });
      setEditingActivity(null);
    }
  });

  const deleteActivityMutation = useMutation({
    mutationFn: (activityId) => base44.entities.Activity.delete(activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', leadId] });
      setShowDeleteActivityConfirm(null);
    }
  });

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingPhotos(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(result.file_url);
      }
      setNewActivity({ ...newActivity, photos: [...(newActivity.photos || []), ...uploadedUrls] });
    } catch (error) {
      console.error('Photo upload failed:', error);
      alert('Failed to upload photos. Please try again.');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removePhoto = (index) => {
    const updatedPhotos = [...newActivity.photos];
    updatedPhotos.splice(index, 1);
    setNewActivity({ ...newActivity, photos: updatedPhotos });
  };

  const handleEditPhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingPhotos(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(result.file_url);
      }
      setEditingActivity({ ...editingActivity, photos: [...(editingActivity.photos || []), ...uploadedUrls] });
    } catch (error) {
      console.error('Photo upload failed:', error);
      alert('Failed to upload photos. Please try again.');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removeEditPhoto = (index) => {
    const updatedPhotos = [...(editingActivity.photos || [])];
    updatedPhotos.splice(index, 1);
    setEditingActivity({ ...editingActivity, photos: updatedPhotos });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length === 0) return;

    setUploadingPhotos(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(result.file_url);
      }
      setNewActivity({ ...newActivity, photos: [...(newActivity.photos || []), ...uploadedUrls] });
    } catch (error) {
      console.error('Photo upload failed:', error);
      alert('Failed to upload photos. Please try again.');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleEditDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditDragging(true);
  };

  const handleEditDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditDragging(false);
  };

  const handleEditDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length === 0) return;

    setUploadingPhotos(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(result.file_url);
      }
      setEditingActivity({ ...editingActivity, photos: [...(editingActivity.photos || []), ...uploadedUrls] });
    } catch (error) {
      console.error('Photo upload failed:', error);
      alert('Failed to upload photos. Please try again.');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const deleteLeadMutation = useMutation({
    mutationFn: async () => {
      // Delete all associated activities first
      const leadActivities = await base44.entities.Activity.filter({ lead_id: leadId });
      for (const activity of leadActivities) {
        await base44.entities.Activity.delete(activity.id);
      }
      
      // Delete all associated bookings
      const leadBookings = await base44.entities.Booking.filter({ lead_id: leadId });
      for (const booking of leadBookings) {
        await base44.entities.Booking.delete(booking.id);
      }
      
      // Delete all associated tasks
      const leadTasks = await base44.entities.Task.filter({ 
        related_to_type: 'lead',
        related_to_id: leadId 
      });
      for (const task of leadTasks) {
        await base44.entities.Task.delete(task.id);
      }
      
      // Delete all associated notes
      const leadNotes = await base44.entities.Note.filter({ 
        related_to_type: 'lead',
        related_to_id: leadId 
      });
      for (const note of leadNotes) {
        await base44.entities.Note.delete(note.id);
      }
      
      // Finally delete the lead
      await base44.entities.Lead.delete(leadId);
    },
    onSuccess: () => {
      navigate(createPageUrl('Leads'));
    }
  });

  if (!user || loadingLead) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (leadError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-medium mb-2">Error loading lead</p>
        <p className="text-slate-500 text-sm mb-4">{leadError?.message}</p>
        <Link to={createPageUrl('Leads')} className="text-emerald-600 hover:underline">
          Back to Leads
        </Link>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-2">Lead not found</p>
        <p className="text-slate-400 text-sm mb-4">This lead may not exist or you don't have access to it</p>
        <Link to={createPageUrl('Leads')} className="text-emerald-600 hover:underline">
          Back to Leads
        </Link>
      </div>
    );
  }

  // Combine all timeline items
  const timelineItems = [
    ...activities.map(a => ({ ...a, type: 'activity', date: a.created_date })),
    ...bookings.map(b => ({ ...b, type: 'booking', date: b.created_date })),
    ...tasks.map(t => ({ ...t, type: 'task', date: t.created_date })),
    ...auditLogs.map(l => ({ ...l, type: 'audit', date: l.created_date }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const lastActivity = activities[0];

  // Check if user has engaged with this lead today
  const hasEngagedToday = activities.some(a => {
    if (a.activity_type !== 'engagement') return false;
    if (!a.activity_at) return false;
    const actDateEST = toZonedTime(new Date(a.activity_at), 'America/New_York');
    return actDateEST >= todayStartEST && actDateEST <= todayEndEST;
  });



  // Check if user can grab lead (same logic as OpenLeads page)
  const canGrabLead = () => {
    if (!lead?.is_open_for_reassignment) return { allowed: false, reason: 'not_open' };
    if (lead?.reassigned_owner_id === user?.id) return { allowed: false, reason: 'already_grabbed' };
    if (myGrabbedLeads.length === 0) return { allowed: true };
    
    const currentGrabbedLead = myGrabbedLeads[0];
    const grabDate = new Date(currentGrabbedLead.reassigned_grab_date);
    const now = new Date();
    const minutesSinceGrab = Math.floor((now - grabDate) / (1000 * 60));
    
    // Check if 10 minutes have passed
    if (minutesSinceGrab >= 10) {
      return { allowed: true };
    }
    
    // Check if contact has been logged
    if (currentGrabbedLead.last_reassignment_contact_date) {
      const contactDate = new Date(currentGrabbedLead.last_reassignment_contact_date);
      if (contactDate > grabDate) {
        return { allowed: true };
      }
    }
    
    // Calculate remaining time
    const remainingMinutes = 10 - minutesSinceGrab;
    return { 
      allowed: false, 
      reason: 'wait_required',
      leadName: currentGrabbedLead.name || 'your current lead',
      remainingMinutes 
    };
  };

  const grabStatus = canGrabLead();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-blue-50/30 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10 px-4 py-6 md:py-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link 
            to={createPageUrl('Leads' + window.location.search)}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Leads
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Lead Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl border border-slate-200 p-3 md:p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
            <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-lg md:text-2xl font-bold text-slate-900 break-words">
                  {lead.name || 'Unnamed Lead'}
                </h1>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setEditData(lead);
                    setEditNotes('');
                    setShowEditDialog(true);
                  }}
                  className="shrink-0"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="hidden sm:inline ml-2">Edit</span>
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select 
                  value={lead.status} 
                  onValueChange={(v) => {
                    if (v === 'lost') {
                      setShowLostReasonDialog(true);
                    } else {
                      updateLeadMutation.mutate({ status: v });
                    }
                  }}
                >
                  <SelectTrigger className={cn("h-10 w-full sm:w-36 border capitalize", statusColors[lead.status])}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">✨ New</SelectItem>
                    <SelectItem value="engaged">💬 Engaging</SelectItem>
                    <SelectItem value="contacted">📞 Contacted</SelectItem>
                    <SelectItem value="nurture">🌱 Nurturing</SelectItem>
                    <SelectItem value="won">✅ Converted</SelectItem>
                    <SelectItem value="lost">❌ Lost</SelectItem>
                  </SelectContent>
                </Select>
                <Select 
                  value={lead.interest_level || 'warm'} 
                  onValueChange={(v) => updateLeadMutation.mutate({ interest_level: v })}
                >
                  <SelectTrigger className={cn(
                    "h-10 w-full sm:w-32 border",
                    lead.interest_level === 'hot' && "bg-red-100 text-red-700 border-red-200",
                    lead.interest_level === 'warm' && "bg-orange-100 text-orange-700 border-orange-200",
                    lead.interest_level === 'cold' && "bg-cyan-100 text-cyan-700 border-cyan-200"
                  )}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hot">🔥 Hot</SelectItem>
                    <SelectItem value="warm">☀️ Warm</SelectItem>
                    <SelectItem value="cold">❄️ Cold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lead Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6 mb-4 md:mb-6">
              <div>
                <div className="text-sm text-slate-500 mb-1">Contact Type</div>
                <div className="font-medium text-slate-900 capitalize">
                  {lead.contact_type ? lead.contact_type.replace(/_/g, ' ') : 'Not specified'}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">Location</div>
                <div className="font-medium text-slate-900">{lead.location || 'Not specified'}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">Source</div>
                <div className="font-medium text-slate-900 capitalize">{lead.lead_source || 'Unknown'}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">Est. Deal Value</div>
                <div className="font-medium text-slate-900">
                  {lead.estimated_value ? `$${lead.estimated_value}` : 'Not set'}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">Owner</div>
                <div className="font-medium text-slate-900">{lead.owner_name || 'Unassigned'}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">Business</div>
                <div className="font-medium text-slate-900 capitalize">
                  {lead.business ? (lead.business === 'windowstill' ? 'WindowStill' : 'Lifestyle Production Group') : 'Not specified'}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <div className="text-xs md:text-sm font-medium text-slate-700 mb-2 md:mb-3">Contact Information</div>
              <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2">
                {lead.phone && (
                  <a 
                    href={`tel:${lead.phone}`}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                  >
                    <Phone className="w-4 h-4 shrink-0" />
                    <span className="truncate">{lead.phone}</span>
                  </a>
                )}
                {lead.email && (
                  <a 
                    href={`mailto:${lead.email}`}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                  >
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="truncate">{lead.email}</span>
                  </a>
                )}
                {lead.instagram_link && (
                  <a 
                    href={lead.instagram_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors text-sm"
                  >
                    <Send className="w-4 h-4 shrink-0" />
                    Instagram
                  </a>
                )}
                {lead.facebook_link && (
                  <a 
                    href={lead.facebook_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                  >
                    <Send className="w-4 h-4 shrink-0" />
                    Facebook
                  </a>
                )}
              </div>
            </div>

            {/* Notes */}
            {notes.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="text-sm font-medium text-slate-700 mb-2">Notes</div>
                <div className="space-y-2">
                  {notes.map(note => (
                    <div key={note.id} className="group flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50">
                      {editingNoteId === note.id ? (
                        <>
                          <Textarea
                            value={editingNoteContent}
                            onChange={(e) => setEditingNoteContent(e.target.value)}
                            className="flex-1 text-sm resize-none"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => updateNoteMutation.mutate({ noteId: note.id, content: editingNoteContent })}
                              className="p-1 rounded hover:bg-emerald-100 text-emerald-600"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingNoteId(null);
                                setEditingNoteContent('');
                              }}
                              className="p-1 rounded hover:bg-slate-200 text-slate-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="flex-1 text-sm text-slate-600">{note.content}</p>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditingNoteContent(note.content);
                              }}
                              className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteNoteMutation.mutate(note.id)}
                              className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Activity Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            <div className="p-3 md:p-6 border-b border-slate-100 flex items-center justify-between gap-2">
              <h2 className="text-base md:text-lg font-semibold text-slate-900">Activity Timeline</h2>
              <Button 
                size="sm"
                onClick={() => setShowActivityDialog(true)}
                className="bg-slate-900 hover:bg-slate-800 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Log Activity</span>
              </Button>
            </div>
            <div className="p-3 md:p-6">
              {timelineItems.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No activities yet</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {timelineItems.slice(0, timelineLimit).map((item, index) => {
                    // Activity item
                    if (item.type === 'activity') {
                      const Icon = activityTypeIcons[item.activity_type] || MessageCircle;
                      return (
                        <div key={`activity-${item.id}`} className="flex gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-slate-50 group">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 md:w-5 md:h-5 text-yellow-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-slate-900 capitalize text-sm md:text-base">
                                  {item.activity_type}
                                </span>
                                {item.outcome && item.activity_type !== 'engagement' && (
                                  <Badge className={cn(
                                    "text-xs capitalize",
                                    item.outcome === 'conversation' && "bg-green-100 text-green-700",
                                    item.outcome === 'booked' && "bg-emerald-100 text-emerald-700",
                                    item.outcome === 'no_response' && "bg-slate-100 text-slate-600"
                                  )}>
                                    {item.outcome?.replace('_', ' ')}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs md:text-sm text-slate-400">
                                  {formatInEST(item.created_date)}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => setEditingActivity(item)}
                                    className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                                  >
                                    <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteActivityConfirm(item.id)}
                                    className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600"
                                  >
                                    <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 mt-2">
                              {item.notes && (
                                <p className="text-slate-600 text-sm flex-1">{item.notes}</p>
                              )}
                              {item.photos && item.photos.length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingPhotos(item.photos);
                                    setCurrentPhotoIndex(0);
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100 transition-colors shrink-0"
                                >
                                  <ImageIcon className="w-3 h-3" />
                                  {item.photos.length} {item.photos.length === 1 ? 'photo' : 'photos'}
                                </button>
                              )}
                            </div>
                            {item.photos && item.photos.length > 0 && (
                              <div className="flex gap-2 mt-2 flex-wrap">
                                {item.photos.slice(0, 3).map((photoUrl, idx) => (
                                  <button
                                    key={idx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewingPhotos(item.photos);
                                      setCurrentPhotoIndex(idx);
                                    }}
                                    className="relative group"
                                  >
                                    <img
                                      src={photoUrl}
                                      alt={`Screenshot ${idx + 1}`}
                                      className="w-16 h-16 object-cover rounded-lg border-2 border-slate-200 hover:border-blue-500 transition-colors cursor-pointer"
                                    />
                                    {idx === 2 && item.photos.length > 3 && (
                                      <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                                        <span className="text-white text-xs font-medium">+{item.photos.length - 3}</span>
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              {(() => {
                                const activityUser = users.find(u => u.id === item.performed_by_id);
                                return activityUser?.profile_photo_url ? (
                                  <img
                                    src={activityUser.profile_photo_url}
                                    alt={item.performed_by_name}
                                    className="w-6 h-6 rounded-full object-cover border border-slate-200"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
                                    {item.performed_by_name?.charAt(0)}
                                  </div>
                                );
                              })()}
                              <span className="text-sm text-slate-500">{item.performed_by_name}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    // Booking item
                    if (item.type === 'booking') {
                      return (
                        <div key={`booking-${item.id}`} className="flex gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-emerald-50 border border-emerald-100 group">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                            <Calendar className="w-4 h-4 md:w-5 md:h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-emerald-900">Shoot Booked</span>
                                <Badge className="bg-emerald-100 text-emerald-700">Won</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-emerald-600">
                                  {formatInEST(item.booked_at || item.created_date)}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Find associated booked activity and edit it instead
                                      const bookedActivity = activities.find(a => 
                                        a.outcome === 'booked' && 
                                        a.lead_id === item.lead_id &&
                                        Math.abs(new Date(a.created_date).getTime() - new Date(item.created_date).getTime()) < 60000
                                      );
                                      if (bookedActivity) {
                                        setEditingActivity({
                                          ...bookedActivity,
                                          address: item.address,
                                          hdph_link: item.hdph_link
                                        });
                                      }
                                    }}
                                    className="p-1 rounded hover:bg-emerald-200 text-emerald-700"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowDeleteBookingConfirm(item.id);
                                    }}
                                    className="p-1 rounded hover:bg-red-100 text-emerald-700 hover:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            {(() => {
                              const bookedActivity = activities.find(a => 
                                a.outcome === 'booked' && 
                                a.lead_id === item.lead_id &&
                                Math.abs(new Date(a.created_date).getTime() - new Date(item.created_date).getTime()) < 60000
                              );
                              if (bookedActivity?.shoot_date) {
                                return (
                                  <p className="text-emerald-700 mt-2 text-sm flex items-center gap-1 font-medium">
                                    <Calendar className="w-3 h-3" />
                                    Shoot Date: {format(new Date(bookedActivity.shoot_date + 'T00:00:00'), 'MMM d, yyyy')}
                                  </p>
                                );
                              }
                              return null;
                            })()}
                            {item.address && (
                              <p className="text-emerald-700 mt-2 text-sm flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {item.address}
                              </p>
                            )}
                            {item.hdph_link && (
                              <a 
                                href={item.hdph_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-600 hover:text-emerald-700 mt-1 text-sm flex items-center gap-1"
                              >
                                <ArrowRight className="w-3 h-3" />
                                HDPH Link
                              </a>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              {(() => {
                                const bookingUser = users.find(u => u.id === item.booked_by_id);
                                return bookingUser?.profile_photo_url ? (
                                  <img
                                    src={bookingUser.profile_photo_url}
                                    alt={item.booked_by_name}
                                    className="w-6 h-6 rounded-full object-cover border border-emerald-200"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-emerald-200 flex items-center justify-center text-xs font-medium text-emerald-700">
                                    {item.booked_by_name?.charAt(0)}
                                  </div>
                                );
                              })()}
                              <span className="text-sm text-emerald-600">{item.booked_by_name}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    // Task/Follow-up item
                    if (item.type === 'task') {
                      const isDailyEngagement = item.title?.includes('Daily Engagement');
                      const isEngagementTask = item.title?.toLowerCase().includes('engagement') || item.title?.toLowerCase().includes('engage');
                      
                      // Check if engagement was logged today for this lead
                      const hasEngagedTodayForTask = activities.some(a => {
                        if (a.activity_type !== 'engagement' || a.lead_id !== lead.id) return false;
                        const actDateEST = toZonedTime(new Date(a.activity_at || a.created_date), 'America/New_York');
                        return actDateEST >= todayStartEST && actDateEST <= todayEndEST;
                      });
                      
                      if (isDailyEngagement) {
                        return (
                          <div key={`task-${item.id}`} className={cn(
                            "p-4 md:p-5 rounded-xl border-2 transition-all",
                            hasEngagedTodayForTask 
                              ? "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200" 
                              : "bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200"
                          )}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Heart className={cn(
                                  "w-5 h-5",
                                  hasEngagedTodayForTask ? "text-emerald-600 fill-emerald-600" : "text-pink-600"
                                )} />
                                <span className={cn(
                                  "font-semibold",
                                  hasEngagedTodayForTask ? "text-emerald-900" : "text-pink-900"
                                )}>
                                  Daily Engagement
                                </span>
                              </div>
                              {hasEngagedTodayForTask && (
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Done Today
                                </Badge>
                              )}
                            </div>
                            
                            <p className={cn(
                              "text-sm mb-4",
                              hasEngagedTodayForTask ? "text-emerald-700" : "text-pink-700"
                            )}>
                              {hasEngagedTodayForTask 
                                ? "Great! You've engaged with this lead today."
                                : "Like, comment, or view their social media content"}
                            </p>
                            
                            <div className="flex flex-wrap gap-2">
                              {lead.instagram_link && (
                                <a
                                  href={lead.instagram_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-pink-50 border border-pink-200 rounded-lg transition-colors text-sm font-medium text-pink-700"
                                >
                                  <Instagram className="w-4 h-4" />
                                  Instagram
                                </a>
                              )}
                              {lead.facebook_link && (
                                <a
                                  href={lead.facebook_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors text-sm font-medium text-blue-700"
                                >
                                  <Facebook className="w-4 h-4" />
                                  Facebook
                                </a>
                              )}
                              <Button
                                size="sm"
                                onClick={() => {
                                  createActivityMutation.mutate({
                                    activity_type: 'engagement',
                                    outcome: 'no_response',
                                    notes: 'Engaged with lead on social media'
                                  });
                                }}
                                disabled={createActivityMutation.isPending || hasEngagedTodayForTask}
                                className={cn(
                                  "ml-auto",
                                  hasEngagedTodayForTask 
                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 cursor-not-allowed" 
                                    : "bg-pink-600 hover:bg-pink-700 text-white"
                                )}
                              >
                                {hasEngagedTodayForTask ? (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Logged
                                  </>
                                ) : (
                                  <>
                                    <Heart className="w-4 h-4 mr-2" />
                                    Mark as Done
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div key={`task-${item.id}`} className="flex gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-blue-50 border border-blue-100">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4 md:w-5 md:h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-blue-900">{item.title}</span>
                                {item.due_date && (
                                  <Badge className="bg-blue-100 text-blue-700">
                                    Due {formatInEST(item.due_date)}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-sm text-blue-600">
                                {formatInEST(item.created_date)}
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-blue-700 mt-2 text-sm">{item.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              {(() => {
                                const taskOwner = users.find(u => u.id === item.owner_id);
                                return taskOwner?.profile_photo_url ? (
                                  <img
                                    src={taskOwner.profile_photo_url}
                                    alt={item.owner_name}
                                    className="w-6 h-6 rounded-full object-cover border border-blue-200"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs font-medium text-blue-700">
                                    {item.owner_name?.charAt(0)}
                                  </div>
                                );
                              })()}
                              <span className="text-sm text-blue-600">{item.owner_name}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    // Audit log item (status/interest changes)
                    if (item.type === 'audit') {
                      const isStatusChange = item.action?.includes('status');
                      const isInterestChange = item.action?.includes('interest');
                      
                      // Extract the status or interest value from the action
                      let bgColor = 'bg-violet-50';
                      let borderColor = 'border-violet-100';
                      let iconBg = 'bg-violet-500';
                      let textColor = 'text-violet-900';
                      let secondaryColor = 'text-violet-600';
                      let badgeBg = 'bg-violet-200';
                      let badgeText = 'text-violet-700';
                      
                      if (isStatusChange) {
                        const statusMatch = item.action.match(/to (new|contacted|engaged|nurture|won|lost)/i);
                        const status = statusMatch?.[1]?.toLowerCase();

                        if (status === 'new') {
                          bgColor = 'bg-blue-50'; borderColor = 'border-blue-100';
                          iconBg = 'bg-blue-500'; textColor = 'text-blue-900';
                          secondaryColor = 'text-blue-600'; badgeBg = 'bg-blue-200'; badgeText = 'text-blue-700';
                        } else if (status === 'contacted') {
                          bgColor = 'bg-amber-50'; borderColor = 'border-amber-100';
                          iconBg = 'bg-amber-500'; textColor = 'text-amber-900';
                          secondaryColor = 'text-amber-600'; badgeBg = 'bg-amber-200'; badgeText = 'text-amber-700';
                        } else if (status === 'engaged') {
                          bgColor = 'bg-purple-50'; borderColor = 'border-purple-100';
                          iconBg = 'bg-purple-500'; textColor = 'text-purple-900';
                          secondaryColor = 'text-purple-600'; badgeBg = 'bg-purple-200'; badgeText = 'text-purple-700';
                        } else if (status === 'nurture') {
                          bgColor = 'bg-cyan-50'; borderColor = 'border-cyan-100';
                          iconBg = 'bg-cyan-500'; textColor = 'text-cyan-900';
                          secondaryColor = 'text-cyan-600'; badgeBg = 'bg-cyan-200'; badgeText = 'text-cyan-700';
                        } else if (status === 'won') {
                          bgColor = 'bg-emerald-50'; borderColor = 'border-emerald-100';
                          iconBg = 'bg-emerald-500'; textColor = 'text-emerald-900';
                          secondaryColor = 'text-emerald-600'; badgeBg = 'bg-emerald-200'; badgeText = 'text-emerald-700';
                        } else if (status === 'lost') {
                          bgColor = 'bg-slate-50'; borderColor = 'border-slate-100';
                          iconBg = 'bg-slate-500'; textColor = 'text-slate-900';
                          secondaryColor = 'text-slate-600'; badgeBg = 'bg-slate-200'; badgeText = 'text-slate-700';
                        }
                      } else if (isInterestChange) {
                        const interestMatch = item.action.match(/to (hot|warm|cold)/i);
                        const interest = interestMatch?.[1]?.toLowerCase();
                        
                        if (interest === 'hot') {
                          bgColor = 'bg-red-50'; borderColor = 'border-red-100';
                          iconBg = 'bg-red-500'; textColor = 'text-red-900';
                          secondaryColor = 'text-red-600'; badgeBg = 'bg-red-200'; badgeText = 'text-red-700';
                        } else if (interest === 'warm') {
                          bgColor = 'bg-orange-50'; borderColor = 'border-orange-100';
                          iconBg = 'bg-orange-500'; textColor = 'text-orange-900';
                          secondaryColor = 'text-orange-600'; badgeBg = 'bg-orange-200'; badgeText = 'text-orange-700';
                        } else if (interest === 'cold') {
                          bgColor = 'bg-cyan-50'; borderColor = 'border-cyan-100';
                          iconBg = 'bg-cyan-500'; textColor = 'text-cyan-900';
                          secondaryColor = 'text-cyan-600'; badgeBg = 'bg-cyan-200'; badgeText = 'text-cyan-700';
                        }
                      }
                      
                      return (
                        <div key={`audit-${item.id}`} className={cn("flex gap-3 md:gap-4 p-3 md:p-4 rounded-xl border", bgColor, borderColor)}>
                          <div className={cn("w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0", iconBg)}>
                            {isStatusChange ? (
                              <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-white" />
                            ) : isInterestChange ? (
                              <Flame className="w-4 h-4 md:w-5 md:h-5 text-white" />
                            ) : (
                              <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className={cn("font-medium capitalize", textColor)}>{item.action}</span>
                              <span className={cn("text-sm", secondaryColor)}>
                                {formatInEST(item.created_date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              {(() => {
                                const auditUser = users.find(u => u.id === item.user_id);
                                return auditUser?.profile_photo_url ? (
                                  <img
                                    src={auditUser.profile_photo_url}
                                    alt={item.user_name}
                                    className={cn("w-6 h-6 rounded-full object-cover border-2", badgeBg.replace('bg-', 'border-'))}
                                  />
                                ) : (
                                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium", badgeBg, badgeText)}>
                                    {item.user_name?.charAt(0)}
                                  </div>
                                );
                              })()}
                              <span className={cn("text-sm", secondaryColor)}>{item.user_name}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    return null;
                    })}
                    </div>
                    {timelineItems.length > timelineLimit && (
                    <div className="text-center mt-4">
                      <Button
                        variant="outline"
                        onClick={() => setTimelineLimit(prev => prev + 10)}
                        className="w-full"
                      >
                        See More ({timelineItems.length - timelineLimit} remaining)
                      </Button>
                    </div>
                    )}
                    </>
                    )}
                    </div>
            </motion.div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-3 md:space-y-6">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl border border-slate-200 p-3 md:p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
            <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-3 md:mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button 
                onClick={() => {
                  setNewActivity({ ...newActivity, outcome: 'booked' });
                  setShowActivityDialog(true);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 justify-start"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Booked Shoot
                </Button>
              <Button 
                onClick={() => {
                  createActivityMutation.mutate({
                    activity_type: 'engagement',
                    outcome: 'no_response',
                    notes: 'Engaged with lead on social media'
                  });
                }}
                variant="outline"
                className={cn(
                  "w-full justify-start transition-all",
                  hasEngagedToday && "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                )}
                disabled={createActivityMutation.isPending}
              >
                <Heart className={cn(
                  "w-4 h-4 mr-2",
                  hasEngagedToday && "fill-current text-red-600"
                )} />
                {hasEngagedToday ? "Engaged Today" : "Log Engagement"}
                </Button>
                <Button 
                onClick={() => setShowActivityDialog(true)}
                variant="outline"
                className="w-full justify-start"
                >
                <Phone className="w-4 h-4 mr-2" />
                Log Activity
                </Button>
                <Button 
                onClick={() => setShowFollowUpDialog(true)}
                variant="outline"
                className="w-full justify-start bg-white text-slate-900"
                >
                <Clock className="w-4 h-4 mr-2" />
                Set Follow-up
                </Button>
                </div>
                </motion.div>

                {/* View Follow-ups */}
                <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl border border-slate-200 p-3 md:p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
                >
              <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-3 md:mb-4">Follow-up Schedule</h3>
              <Button
              onClick={() => setShowFollowUpsPanel(true)}
              variant="outline"
              className="w-full justify-start"
              >
              <Calendar className="w-4 h-4 mr-2" />
              View All Follow-ups
              </Button>
              </motion.div>

              {/* Last Contact */}
              {lastActivity && (
              <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl border border-slate-200 p-3 md:p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
              <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-2">Last Contact</h3>
              <p className="text-slate-600">
                {formatInEST(lastActivity.created_date)}
              </p>
              </motion.div>
              )}

              {/* Last Booked */}
          {bookings.length > 0 && (() => {
            const now = new Date();
            const bookedActivities = activities.filter(a => a.outcome === 'booked' && a.shoot_date);

            const futureBookings = bookedActivities
              .filter(a => new Date(a.shoot_date + 'T00:00:00') > now)
              .sort((a, b) => new Date(b.shoot_date) - new Date(a.shoot_date)); // Farthest future first

            const pastBookings = bookedActivities
              .filter(a => new Date(a.shoot_date + 'T00:00:00') <= now)
              .sort((a, b) => new Date(b.shoot_date) - new Date(a.shoot_date)); // Most recent past first

            const relevantBooking = futureBookings.length > 0 ? futureBookings[0] : pastBookings[0];
            const title = futureBookings.length > 0 ? 'Next Scheduled Shoot' : 'Last Completed Shoot';

            if (relevantBooking) {
              return (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 }}
                  className="bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl border border-slate-200 p-3 md:p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
                >
                  <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-2">{title}</h3>
                  <p className="text-slate-600">
                    {format(new Date(relevantBooking.shoot_date + 'T00:00:00'), 'MMM d, yyyy')}
                  </p>
                  </motion.div>
                  );
                  }
                  return null;
                  })()}

          {/* Open Lead Management & Grab Lead */}
          {lead?.is_open_for_reassignment && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl border border-slate-200 p-3 md:p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-2">
                {lead?.reassigned_owner_id === user?.id ? 'You Grabbed This Lead' : 'Open Lead'}
              </h3>
              {lead?.reassigned_owner_id === user?.id ? (
                <>
                  <p className="text-xs text-slate-500 mb-4">
                    You have this lead for 10 days or until you log a contact
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      // Release lead
                      await updateLeadMutation.mutateAsync({
                        reassigned_owner_id: null,
                        reassigned_owner_name: null,
                        reassigned_grab_date: null,
                        last_reassignment_contact_date: null
                      });
                      
                      // Create audit log
                      await base44.entities.AuditLog.create({
                        action: 'Lead Released',
                        entity_type: 'Lead',
                        entity_id: leadId,
                        entity_name: lead?.name || lead?.phone,
                        user_id: user?.id,
                        user_name: user?.full_name,
                        details: `${user?.full_name} released this lead back to the open pool`,
                        department: 'sales'
                      });
                      
                      queryClient.invalidateQueries({ queryKey: ['lead-audits', leadId] });
                      queryClient.invalidateQueries({ queryKey: ['my-grabbed-leads'] });
                    }}
                    className="w-full"
                  >
                    Release Lead
                  </Button>
                </>
              ) : lead?.reassigned_owner_id ? (
                <>
                  <p className="text-xs text-slate-500 mb-2">
                    Currently grabbed by {lead.reassigned_owner_name}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-500 mb-4">Available to grab</p>
                  {!grabStatus.allowed && grabStatus.reason === 'wait_required' && (
                    <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                      <p className="font-medium">Cannot grab lead</p>
                      <p className="mt-1">
                        Log contact for {grabStatus.leadName} or wait {grabStatus.remainingMinutes} min
                      </p>
                    </div>
                  )}
                  <Button
                    size="sm"
                    onClick={async () => {
                      // Grab lead
                      await updateLeadMutation.mutateAsync({
                        reassigned_owner_id: user?.id,
                        reassigned_owner_name: user?.full_name,
                        reassigned_grab_date: new Date().toISOString(),
                        last_reassignment_contact_date: null
                      });
                      
                      // Create audit log
                      await base44.entities.AuditLog.create({
                        action: 'Lead Reassigned',
                        entity_type: 'Lead',
                        entity_id: leadId,
                        entity_name: lead?.name || lead?.phone,
                        user_id: user?.id,
                        user_name: user?.full_name,
                        details: `${user?.full_name} grabbed this lead from the open pool`,
                        department: 'sales'
                      });
                      
                      queryClient.invalidateQueries({ queryKey: ['lead-audits', leadId] });
                      queryClient.invalidateQueries({ queryKey: ['my-grabbed-leads'] });
                    }}
                    disabled={!grabStatus.allowed}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    Grab Lead
                    </Button>
                    </>
                    )}
                    </motion.div>
                    )}

                    {/* Admin Controls */}
          {user?.role === 'admin' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 }}
              className="bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl border border-slate-200 p-3 md:p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-2">Admin Controls</h3>
              <p className="text-xs text-slate-500 mb-4">Manage lead reassignment status</p>
              <div className="space-y-2">
                <Button
                  size="sm"
                  variant={lead.is_open_for_reassignment ? "default" : "outline"}
                  onClick={async () => {
                    const newStatus = !lead.is_open_for_reassignment;

                    // Update lead
                    await updateLeadMutation.mutateAsync({ 
                      is_open_for_reassignment: newStatus,
                      reassigned_owner_id: null,
                      reassigned_owner_name: null,
                      reassigned_grab_date: null,
                      last_permanent_owner_id: newStatus ? (lead.owner_id || user?.id) : lead.last_permanent_owner_id,
                      last_permanent_owner_name: newStatus ? (lead.owner_name || user?.full_name) : lead.last_permanent_owner_name,
                      owner_id: newStatus ? null : user?.id,
                      owner_name: newStatus ? null : user?.full_name
                    });

                    // Create audit log
                    await base44.entities.AuditLog.create({
                      action: newStatus ? 'Lead Unassigned' : 'Lead Reassigned',
                      entity_type: 'Lead',
                      entity_id: leadId,
                      entity_name: lead?.name || lead?.phone,
                      user_id: user?.id,
                      user_name: user?.full_name,
                      details: newStatus ? `${user?.full_name} unassigned this lead and opened it for reassignment` : `${user?.full_name} closed reassignment and assigned lead to themselves`,
                      department: 'sales'
                    });

                    queryClient.invalidateQueries({ queryKey: ['lead-audits', leadId] });
                  }}
                  className={cn("w-full justify-start", lead.is_open_for_reassignment && "bg-emerald-600")}
                >
                  {lead.is_open_for_reassignment ? 'Close Reassignment' : 'Open for Reassignment'}
                </Button>
                <Button
                  size="sm"
                  variant={lead.exclude_from_reassignment ? "destructive" : "outline"}
                  onClick={() => updateLeadMutation.mutate({ 
                    exclude_from_reassignment: !lead.exclude_from_reassignment,
                    is_open_for_reassignment: false
                  })}
                  className="w-full justify-start"
                >
                  {lead.exclude_from_reassignment ? 'Excluded' : 'Exclude from Pool'}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setShowDeleteLeadConfirm(true)}
                  className="w-full justify-start"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Lead
                  </Button>
                  </div>
                  </motion.div>
                  )}
                  </div>
                  </div>
                  </div>

                  {/* Log Activity Dialog */}
                  <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Log Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div>
              <label className="text-base font-medium text-slate-900 block mb-3">Activity Type</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                {[
                  { value: 'call', icon: Phone, label: 'Call' },
                  { value: 'text', icon: MessageCircle, label: 'Text' },
                  { value: 'email', icon: Mail, label: 'Email' },
                  { value: 'dm', icon: Send, label: 'DM' },
                  { value: 'engagement', icon: Heart, label: 'Engage' },
                  { value: 'note', icon: FileText, label: 'Note' }
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => setNewActivity({ ...newActivity, activity_type: value })}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all min-w-0",
                      newActivity.activity_type === value
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <Icon className={cn(
                      "w-5 h-5 shrink-0",
                      newActivity.activity_type === value ? "text-blue-600" : "text-slate-400"
                    )} />
                    <span className={cn(
                      "text-xs font-medium truncate w-full text-center",
                      newActivity.activity_type === value ? "text-blue-600" : "text-slate-600"
                    )}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
            {newActivity.activity_type !== 'engagement' && newActivity.activity_type !== 'note' && (
              <div>
                <label className="text-base font-medium text-slate-900 block mb-2">Outcome</label>
                <Select 
                  value={newActivity.outcome} 
                  onValueChange={(v) => setNewActivity({ ...newActivity, outcome: v })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_response">No Response</SelectItem>
                    <SelectItem value="conversation">Conversation</SelectItem>
                    <SelectItem value="booked">Booked</SelectItem>
                    <SelectItem value="not_interested">Not Interested</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {newActivity.outcome === 'booked' && newActivity.activity_type !== 'engagement' && newActivity.activity_type !== 'note' && (
              <>
                <div>
                  <label className="text-base font-medium text-slate-900 block mb-2">Shoot Date *</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-12 justify-start text-left font-normal",
                          !newActivity.shoot_date && "text-slate-500"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {newActivity.shoot_date ? format(new Date(newActivity.shoot_date + 'T00:00:00'), 'PPP') : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={newActivity.shoot_date ? new Date(newActivity.shoot_date + 'T00:00:00') : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            setNewActivity({ ...newActivity, shoot_date: `${year}-${month}-${day}` });
                          } else {
                            setNewActivity({ ...newActivity, shoot_date: '' });
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-base font-medium text-slate-900 block mb-2">Address</label>
                  <Input
                    value={newActivity.address || ''}
                    onChange={(e) => setNewActivity({ ...newActivity, address: e.target.value })}
                    placeholder="Shoot location address..."
                    className="h-12"
                  />
                </div>
                <div>
                  <label className="text-base font-medium text-slate-900 block mb-2">HDPH Booked Link</label>
                  <Input
                    value={newActivity.hdph_link || ''}
                    onChange={(e) => setNewActivity({ ...newActivity, hdph_link: e.target.value })}
                    placeholder="https://..."
                    className="h-12"
                  />
                </div>
                <div>
                  <label className="text-base font-medium text-slate-900 block mb-2">Offer</label>
                  <Select 
                    value={newActivity.payment_type || 'paid'} 
                    onValueChange={(v) => setNewActivity({ ...newActivity, payment_type: v })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="free_plus_paid">Free + Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                </>
                )}
            <div>
              <label className="text-base font-medium text-slate-900 block mb-2">Notes</label>
              <Textarea
                value={newActivity.notes}
                onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value })}
                placeholder="Add any notes about this interaction..."
                rows={4}
                className="resize-none"
              />
            </div>
            <div>
              <label className="text-base font-medium text-slate-900 block mb-2">
                Photos / Screenshots
              </label>
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload-new"
                    disabled={uploadingPhotos}
                  />
                  <label
                    htmlFor="photo-upload-new"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      "flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                      uploadingPhotos
                        ? "border-slate-300 bg-slate-50 cursor-not-allowed"
                        : isDragging
                        ? "border-emerald-500 bg-emerald-100"
                        : "border-slate-300 hover:border-emerald-500 hover:bg-emerald-50"
                    )}
                  >
                    {uploadingPhotos ? (
                      <>
                        <Upload className="w-5 h-5 text-slate-400 animate-pulse" />
                        <span className="text-sm text-slate-500">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-5 h-5 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {isDragging ? 'Drop photos here' : 'Click or drag photos here'}
                        </span>
                      </>
                    )}
                  </label>
                </div>
                {newActivity.photos && newActivity.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {newActivity.photos.map((photoUrl, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={photoUrl}
                          alt={`Screenshot ${idx + 1}`}
                          className="w-full h-24 object-cover rounded-lg border-2 border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setShowActivityDialog(false)}
                className="px-6"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => createActivityMutation.mutate(newActivity)}
                disabled={createActivityMutation.isPending || (newActivity.outcome === 'booked' && !newActivity.shoot_date)}
                className="bg-slate-700 hover:bg-slate-800 px-6"
              >
                Log Activity
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Set Follow-up Dialog */}
      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Set Follow-up Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div>
              <label className="text-base font-medium text-slate-900 block mb-3">Follow-up Type</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                {[
                  { value: 'call', icon: Phone, label: 'Call' },
                  { value: 'text', icon: MessageCircle, label: 'Text' },
                  { value: 'email', icon: Mail, label: 'Email' },
                  { value: 'dm', icon: Send, label: 'DM' },
                  { value: 'engagement', icon: Heart, label: 'Engage' },
                  { value: 'note', icon: FileText, label: 'Note' }
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => setFollowUpType(value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all min-w-0",
                      followUpType === value
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <Icon className={cn(
                      "w-5 h-5 shrink-0",
                      followUpType === value ? "text-blue-600" : "text-slate-400"
                    )} />
                    <span className={cn(
                      "text-xs font-medium truncate w-full text-center",
                      followUpType === value ? "text-blue-600" : "text-slate-600"
                    )}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-base font-medium text-slate-900 block mb-2">Priority</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setFollowUpPriority('low')}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all font-medium",
                    followUpPriority === 'low'
                      ? "border-slate-500 bg-slate-50 text-slate-900"
                      : "border-slate-200 hover:border-slate-300 text-slate-600"
                  )}
                >
                  Low
                </button>
                <button
                  onClick={() => setFollowUpPriority('medium')}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all font-medium",
                    followUpPriority === 'medium'
                      ? "border-amber-500 bg-amber-50 text-amber-900"
                      : "border-slate-200 hover:border-slate-300 text-slate-600"
                  )}
                >
                  Medium
                </button>
                <button
                  onClick={() => setFollowUpPriority('high')}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all font-medium",
                    followUpPriority === 'high'
                      ? "border-red-500 bg-red-50 text-red-900"
                      : "border-slate-200 hover:border-slate-300 text-slate-600"
                  )}
                >
                  High
                </button>
              </div>
            </div>
            <div>
              <label className="text-base font-medium text-slate-900 block mb-2">Follow-up Date & Time</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-12 justify-start text-left font-normal",
                      !followUpDate && "text-slate-500"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {followUpDate ? format(new Date(followUpDate + 'T00:00:00'), 'PPP') : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={followUpDate ? new Date(followUpDate + 'T00:00:00') : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        setFollowUpDate(`${year}-${month}-${day}`);
                      } else {
                        setFollowUpDate('');
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-base font-medium text-slate-900 block mb-2">Note (optional)</label>
              <Textarea
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                placeholder="Add a reminder note..."
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setShowFollowUpDialog(false)}
                className="px-6"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  const typeLabel = followUpType.charAt(0).toUpperCase() + followUpType.slice(1);
                  createTaskMutation.mutate({
                    title: `${typeLabel} follow-up - ${lead.name || 'lead'}`,
                    description: followUpNote,
                    due_date: followUpDate,
                    priority: followUpPriority,
                    is_system_generated: false
                  });
                }}
                disabled={createTaskMutation.isPending || !followUpDate}
                className="bg-slate-700 hover:bg-slate-800 px-6"
              >
                Set Follow-up
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Edit Lead</DialogTitle>
          </DialogHeader>
          {editData && (
            <div className="space-y-6 mt-4">
              <div>
                <label className="text-base font-medium text-slate-900 block mb-2">Contact Name *</label>
                <Input
                  value={editData.name || ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="h-12"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-base font-medium text-slate-900 block mb-2">Phone Number</label>
                  <Input
                    type="tel"
                    value={editData.phone || ''}
                    onChange={(e) => {
                      const input = e.target.value.replace(/\D/g, '');
                      let formatted = '';
                      if (input.length > 0) {
                        formatted = '(' + input.substring(0, 3);
                        if (input.length > 3) {
                          formatted += ') ' + input.substring(3, 6);
                        }
                        if (input.length > 6) {
                          formatted += '-' + input.substring(6, 10);
                        }
                      }
                      setEditData({ ...editData, phone: formatted });
                    }}
                    className="h-12"
                    placeholder="(310) 555-0167"
                    maxLength="14"
                  />
                </div>
                <div>
                  <label className="text-base font-medium text-slate-900 block mb-2">Email Address</label>
                  <Input
                    value={editData.email || ''}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="h-12"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-base font-medium text-slate-900 block mb-2">Instagram Link</label>
                  <Input
                    value={editData.instagram_link || ''}
                    onChange={(e) => setEditData({ ...editData, instagram_link: e.target.value })}
                    className="h-12"
                    placeholder="https://instagram.com/username"
                  />
                </div>
                <div>
                  <label className="text-base font-medium text-slate-900 block mb-2">Facebook Link</label>
                  <Input
                    value={editData.facebook_link || ''}
                    onChange={(e) => setEditData({ ...editData, facebook_link: e.target.value })}
                    className="h-12"
                    placeholder="https://facebook.com/username"
                  />
                </div>
              </div>

              <div>
                <label className="text-base font-medium text-slate-900 block mb-2">Contact Type</label>
                <Select 
                  value={editData.contact_type || ''} 
                  onValueChange={(v) => setEditData({ ...editData, contact_type: v })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select contact type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="real_estate_agent">Real Estate Agent</SelectItem>
                    <SelectItem value="broker">Broker</SelectItem>
                    <SelectItem value="property_manager">Property Manager</SelectItem>
                    <SelectItem value="developer">Developer</SelectItem>
                    <SelectItem value="home_builder">Home Builder</SelectItem>
                    <SelectItem value="manufactured_home_builder">Manufactured Home Builder</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-base font-medium text-slate-900 block mb-2">Lead Source</label>
                  <Select 
                    value={editData.lead_source || 'other'} 
                    onValueChange={(v) => setEditData({ ...editData, lead_source: v })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-base font-medium text-slate-900 block mb-2">Interest Level</label>
                  <Select 
                    value={editData.interest_level || 'warm'} 
                    onValueChange={(v) => setEditData({ ...editData, interest_level: v })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hot">Hot</SelectItem>
                      <SelectItem value="warm">Warm</SelectItem>
                      <SelectItem value="cold">Cold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-base font-medium text-slate-900 block mb-2">Location/Market</label>
                  <Input
                    value={editData.location || ''}
                    onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                    className="h-12"
                    placeholder="Venice"
                  />
                </div>
                <div>
                  <label className="text-base font-medium text-slate-900 block mb-2">Est. Deal Value</label>
                  <Input
                    type="number"
                    value={editData.estimated_value || ''}
                    onChange={(e) => setEditData({ ...editData, estimated_value: parseFloat(e.target.value) })}
                    className="h-12"
                    placeholder="500"
                  />
                </div>
              </div>

              <div>
                <label className="text-base font-medium text-slate-900 block mb-2">Business</label>
                <Select 
                  value={editData.business || 'windowstill'} 
                  onValueChange={(v) => setEditData({ ...editData, business: v })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="windowstill">WindowStill</SelectItem>
                    <SelectItem value="lifestyle_production_group">Lifestyle Production Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-base font-medium text-slate-900 block mb-2">Add Note</label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add a note about this client..."
                  rows={4}
                  className="resize-none"
                />
                <p className="text-sm text-slate-500 mt-1">This note will be added to the lead's timeline</p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditDialog(false)}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => updateLeadDetailsMutation.mutate(editData)}
                  disabled={updateLeadDetailsMutation.isPending || !editData.name}
                  className="bg-slate-900 hover:bg-slate-800 px-6"
                >
                  Update Lead
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Follow-ups Panel */}
      <FollowUpActionsPanel
        leadId={leadId}
        isOpen={showFollowUpsPanel}
        onClose={() => setShowFollowUpsPanel(false)}
        onAddFollowUp={() => setShowFollowUpDialog(true)}
      />

      {/* Edit Activity Dialog */}
      <Dialog open={!!editingActivity} onOpenChange={() => setEditingActivity(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Edit Activity</DialogTitle>
          </DialogHeader>
          {editingActivity && (
            <div className="space-y-6 mt-4">
              <div>
                <label className="text-base font-medium text-slate-900 block mb-3">Activity Type</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                  {[
                    { value: 'call', icon: Phone, label: 'Call' },
                    { value: 'text', icon: MessageCircle, label: 'Text' },
                    { value: 'email', icon: Mail, label: 'Email' },
                    { value: 'dm', icon: Send, label: 'DM' },
                    { value: 'engagement', icon: Heart, label: 'Engage' },
                    { value: 'note', icon: FileText, label: 'Note' }
                  ].map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => setEditingActivity({ ...editingActivity, activity_type: value })}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all min-w-0",
                        editingActivity.activity_type === value
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <Icon className={cn(
                        "w-5 h-5 shrink-0",
                        editingActivity.activity_type === value ? "text-blue-600" : "text-slate-400"
                      )} />
                      <span className={cn(
                        "text-xs font-medium truncate w-full text-center",
                        editingActivity.activity_type === value ? "text-blue-600" : "text-slate-600"
                      )}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {editingActivity.activity_type !== 'engagement' && editingActivity.activity_type !== 'note' && (
                <div>
                  <label className="text-base font-medium text-slate-900 block mb-2">Outcome</label>
                  <Select 
                    value={editingActivity.outcome} 
                    onValueChange={(v) => setEditingActivity({ ...editingActivity, outcome: v })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_response">No Response</SelectItem>
                      <SelectItem value="conversation">Conversation</SelectItem>
                      <SelectItem value="booked">Booked</SelectItem>
                      <SelectItem value="not_interested">Not Interested</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {editingActivity.outcome === 'booked' && editingActivity.activity_type !== 'engagement' && editingActivity.activity_type !== 'note' && (
                <>
                  <div>
                    <label className="text-base font-medium text-slate-900 block mb-2">Shoot Date *</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-12 justify-start text-left font-normal",
                            !editingActivity.shoot_date && "text-slate-500"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {editingActivity.shoot_date ? format(new Date(editingActivity.shoot_date + 'T00:00:00'), 'PPP') : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarPicker
                          mode="single"
                          selected={editingActivity.shoot_date ? new Date(editingActivity.shoot_date + 'T00:00:00') : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              setEditingActivity({ ...editingActivity, shoot_date: `${year}-${month}-${day}` });
                            } else {
                              setEditingActivity({ ...editingActivity, shoot_date: '' });
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="text-base font-medium text-slate-900 block mb-2">Address</label>
                    <Input
                      value={editingActivity.address || ''}
                      onChange={(e) => setEditingActivity({ ...editingActivity, address: e.target.value })}
                      placeholder="Shoot location address..."
                      className="h-12"
                    />
                  </div>
                  <div>
                    <label className="text-base font-medium text-slate-900 block mb-2">HDPH Booked Link</label>
                    <Input
                      value={editingActivity.hdph_link || ''}
                      onChange={(e) => setEditingActivity({ ...editingActivity, hdph_link: e.target.value })}
                      placeholder="https://..."
                      className="h-12"
                    />
                    </div>
                    <div>
                    <label className="text-base font-medium text-slate-900 block mb-2">Offer</label>
                    <Select 
                      value={editingActivity.payment_type || 'paid'} 
                      onValueChange={(v) => setEditingActivity({ ...editingActivity, payment_type: v })}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                    </div>
                    </>
                    )}
              <div>
                <label className="text-base font-medium text-slate-900 block mb-2">Notes</label>
                <Textarea
                  value={editingActivity.notes || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, notes: e.target.value })}
                  placeholder="Add any notes about this interaction..."
                  rows={4}
                  className="resize-none"
                />
              </div>
              <div>
                <label className="text-base font-medium text-slate-900 block mb-2">
                  Photos / Screenshots
                </label>
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleEditPhotoUpload}
                      className="hidden"
                      id="photo-upload-edit"
                      disabled={uploadingPhotos}
                    />
                    <label
                      htmlFor="photo-upload-edit"
                      onDragOver={handleEditDragOver}
                      onDragLeave={handleEditDragLeave}
                      onDrop={handleEditDrop}
                      className={cn(
                        "flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                        uploadingPhotos
                          ? "border-slate-300 bg-slate-50 cursor-not-allowed"
                          : isEditDragging
                          ? "border-emerald-500 bg-emerald-100"
                          : "border-slate-300 hover:border-emerald-500 hover:bg-emerald-50"
                      )}
                    >
                      {uploadingPhotos ? (
                        <>
                          <Upload className="w-5 h-5 text-slate-400 animate-pulse" />
                          <span className="text-sm text-slate-500">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-5 h-5 text-slate-400" />
                          <span className="text-sm text-slate-600">
                            {isEditDragging ? 'Drop photos here' : 'Click or drag photos here'}
                          </span>
                        </>
                      )}
                    </label>
                  </div>
                  {editingActivity.photos && editingActivity.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {editingActivity.photos.map((photoUrl, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={photoUrl}
                            alt={`Screenshot ${idx + 1}`}
                            className="w-full h-24 object-cover rounded-lg border-2 border-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeEditPhoto(idx)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setEditingActivity(null)}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => updateActivityMutation.mutate({
                    activityId: editingActivity.id,
                    data: {
                      activity_type: editingActivity.activity_type,
                      outcome: editingActivity.outcome,
                      notes: editingActivity.notes,
                      address: editingActivity.address,
                      hdph_link: editingActivity.hdph_link,
                      shoot_date: editingActivity.shoot_date,
                      payment_type: editingActivity.payment_type,
                      photos: editingActivity.photos
                    }
                  })}
                  disabled={updateActivityMutation.isPending || (editingActivity.outcome === 'booked' && !editingActivity.shoot_date)}
                  className="bg-slate-700 hover:bg-slate-800 px-6"
                >
                  Update Activity
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Activity Confirmation */}
      <AlertDialog open={!!showDeleteActivityConfirm} onOpenChange={() => setShowDeleteActivityConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this activity? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteActivityMutation.mutate(showDeleteActivityConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Booking Confirmation */}
      <AlertDialog open={!!showDeleteBookingConfirm} onOpenChange={() => setShowDeleteBookingConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this booking? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteBookingMutation.mutate(showDeleteBookingConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Lead Confirmation */}
      <AlertDialog open={showDeleteLeadConfirm} onOpenChange={setShowDeleteLeadConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead? This will permanently remove the lead and all associated activities, bookings, and notes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteLeadMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lost Reason Dialog */}
      <Dialog open={showLostReasonDialog} onOpenChange={setShowLostReasonDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Why was this lead lost?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-900 block mb-2">Reason *</label>
              <Textarea
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="Please explain why this lead was marked as lost..."
                rows={4}
                className="resize-none"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowLostReasonDialog(false);
                  setLostReason('');
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  if (!lostReason.trim()) return;
                  
                  // Update lead status
                  await updateLeadMutation.mutateAsync({ status: 'lost' });
                  
                  // Create activity with the lost reason
                  const todayEST = formatInTimeZone(new Date(), 'America/New_York', 'yyyy-MM-dd');
                  const offset = formatInTimeZone(new Date(), 'America/New_York', 'XXX');
                  const activityTimestamp = new Date(`${todayEST}T12:00:00${offset}`).toISOString();
                  await base44.entities.Activity.create({
                    lead_id: leadId,
                    lead_name: lead?.name,
                    activity_type: 'note',
                    outcome: 'no_response',
                    notes: `Lead marked as lost: ${lostReason.trim()}`,
                    performed_by_id: user?.id,
                    performed_by_name: user?.full_name,
                    department: 'sales',
                    activity_at: activityTimestamp
                  });
                  
                  queryClient.invalidateQueries({ queryKey: ['activities', leadId] });
                  setShowLostReasonDialog(false);
                  setLostReason('');
                }}
                disabled={!lostReason.trim() || updateLeadMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                Mark as Lost
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Viewer Dialog */}
      <Dialog open={!!viewingPhotos} onOpenChange={() => setViewingPhotos(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <div className="relative bg-black">
            <button
              onClick={() => setViewingPhotos(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            {viewingPhotos && viewingPhotos.length > 0 && (
              <>
                <img
                  src={viewingPhotos[currentPhotoIndex]}
                  alt={`Screenshot ${currentPhotoIndex + 1}`}
                  className="w-full max-h-[80vh] object-contain"
                />
                {viewingPhotos.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full">
                    <button
                      onClick={() => setCurrentPhotoIndex((currentPhotoIndex - 1 + viewingPhotos.length) % viewingPhotos.length)}
                      className="p-1 text-white hover:bg-white/20 rounded-full transition-colors"
                      disabled={viewingPhotos.length === 1}
                    >
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    <span className="text-white text-sm">
                      {currentPhotoIndex + 1} / {viewingPhotos.length}
                    </span>
                    <button
                      onClick={() => setCurrentPhotoIndex((currentPhotoIndex + 1) % viewingPhotos.length)}
                      className="p-1 text-white hover:bg-white/20 rounded-full transition-colors"
                      disabled={viewingPhotos.length === 1}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}