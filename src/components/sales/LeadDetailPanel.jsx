import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { formatInEST } from '../dateFormatter';
import {
  X,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Calendar,
  Edit2,
  CheckCircle,
  XCircle,
  Send,
  FileText,
  Heart,
  ArrowRight,
  Flame,
  Check,
  Trash2,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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

export default function LeadDetailPanel({ leadId, onClose, user }) {
  const queryClient = useQueryClient();
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [newActivity, setNewActivity] = useState({
    activity_type: 'call',
    outcome: 'no_response',
    notes: '',
    payment_type: 'paid',
    photos: []
  });
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [viewingPhotos, setViewingPhotos] = useState(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const { data: lead, isLoading: loadingLead } = useQuery({
    queryKey: ['lead-panel', leadId],
    queryFn: async () => {
      const leads = await base44.entities.Lead.filter({ id: leadId });
      return leads[0];
    },
    enabled: !!leadId
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities-panel', leadId],
    queryFn: () => base44.entities.Activity.filter({ lead_id: leadId }, '-created_date', 20),
    enabled: !!leadId
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['lead-bookings-panel', leadId],
    queryFn: () => base44.entities.Booking.filter({ lead_id: leadId }, '-created_date'),
    enabled: !!leadId
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const updateLeadMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Lead.update(leadId, data);
      
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-panel', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });

  const createActivityMutation = useMutation({
    mutationFn: async (data) => {
      const activityData = {
        ...data,
        lead_id: leadId,
        lead_name: lead?.name,
        performed_by_id: user?.id,
        performed_by_name: user?.full_name,
        department: 'sales',
        activity_at: new Date().toISOString()
      };
      
      // Include shoot_date if provided
      if (data.shoot_date) {
        activityData.shoot_date = data.shoot_date;
      }
      
      // Include photos if provided
      if (data.photos && data.photos.length > 0) {
        activityData.photos = data.photos;
      }
      
      await base44.entities.Activity.create(activityData);

      // Update last contact date for reassigned leads (any activity counts as contact)
      if (lead?.is_open_for_reassignment && lead?.reassigned_owner_id === user?.id) {
        await base44.entities.Lead.update(leadId, {
          last_reassignment_contact_date: new Date().toISOString()
        });
      }

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

      if (data.outcome === 'booked') {
        await base44.entities.Booking.create({
          lead_id: leadId,
          lead_name: lead?.name,
          booked_by_id: user?.id,
          booked_by_name: user?.full_name,
          booked_at: new Date().toISOString(),
          address: data.address,
          hdph_link: data.hdph_link,
          department: 'sales'
        });
        updateLeadMutation.mutate({ status: 'won' });
      } else if (lead?.status !== 'won') {
        if (data.activity_type === 'engagement') {
          if (lead?.status === 'new') {
            updateLeadMutation.mutate({ status: 'engaged' });
          } else if (lead?.status === 'contacted') {
            updateLeadMutation.mutate({ status: 'nurture' });
          }
        } else if (['call', 'text', 'email', 'dm'].includes(data.activity_type)) {
          updateLeadMutation.mutate({ status: 'contacted' });
        }
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['activities-panel', leadId] });
      queryClient.refetchQueries({ queryKey: ['lead-panel', leadId] });
      queryClient.refetchQueries({ queryKey: ['lead-bookings-panel', leadId] });
      queryClient.refetchQueries({ queryKey: ['activities'] });
      queryClient.refetchQueries({ queryKey: ['my-tasks'] });
      queryClient.refetchQueries({ queryKey: ['leads'] });
      queryClient.refetchQueries({ queryKey: ['bookings'] });
      setShowActivityDialog(false);
      setNewActivity({ activity_type: 'call', outcome: 'no_response', notes: '', payment_type: 'paid', photos: [] });
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

  if (!leadId) return null;

  if (loadingLead) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[90]"
        />
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed top-0 right-0 h-screen w-full max-w-3xl bg-white shadow-2xl z-[100] overflow-y-auto"
        >
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        </motion.div>
      </>
    );
  }

  if (!lead) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[90]"
      />
      
      {/* Sliding Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed top-0 right-0 h-screen w-full md:max-w-2xl lg:max-w-3xl bg-white shadow-2xl z-[100] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 pt-4 pb-3 md:px-6 md:pt-6 md:pb-4 z-[110] shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="text-base md:text-xl font-semibold text-slate-900 break-words flex-1 line-clamp-2">{lead.name || 'Lead Details'}</h2>
            <button
              onClick={onClose}
              className="p-1.5 md:p-2 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Select 
              value={lead.status} 
              onValueChange={(v) => updateLeadMutation.mutate({ status: v })}
            >
              <SelectTrigger className={cn("h-9 md:h-10 w-full sm:w-32 border capitalize text-sm", statusColors[lead.status])}>
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
            <Link
              to={createPageUrl('LeadDetail') + `?id=${leadId}`}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Full View</span>
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Lead Info */}
          <div className="bg-slate-50 rounded-xl p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4">
              <div>
                <div className="text-xs md:text-sm text-slate-500 mb-1">Contact Type</div>
                <div className="font-medium text-slate-900 capitalize text-sm md:text-base">
                  {lead.contact_type ? lead.contact_type.replace(/_/g, ' ') : 'Not specified'}
                </div>
              </div>
              <div>
                <div className="text-xs md:text-sm text-slate-500 mb-1">Location</div>
                <div className="font-medium text-slate-900 text-sm md:text-base">{lead.location || 'Not specified'}</div>
              </div>
              <div>
                <div className="text-xs md:text-sm text-slate-500 mb-1">Source</div>
                <div className="font-medium text-slate-900 capitalize text-sm md:text-base">{lead.lead_source || 'Unknown'}</div>
              </div>
              <div>
                <div className="text-xs md:text-sm text-slate-500 mb-1">Interest Level</div>
                <Select 
                  value={lead.interest_level || 'warm'} 
                  onValueChange={(v) => updateLeadMutation.mutate({ interest_level: v })}
                >
                  <SelectTrigger className={cn(
                    "h-10 w-full border",
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

            {/* Contact Info */}
            <div className="border-t border-slate-200 pt-4">
              <div className="text-xs md:text-sm font-medium text-slate-700 mb-2">Contact</div>
              <div className="grid grid-cols-1 gap-2">
                {lead.phone && (
                  <a 
                    href={`tel:${lead.phone}`}
                    className="inline-flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                  >
                    <Phone className="w-4 h-4 shrink-0" />
                    <span className="truncate">{lead.phone}</span>
                  </a>
                )}
                {lead.email && (
                  <a 
                    href={`mailto:${lead.email}`}
                    className="inline-flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
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
                    className="inline-flex items-center gap-2 px-3 py-2.5 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors text-sm"
                  >
                    <Send className="w-4 h-4 shrink-0" />
                    <span>Instagram</span>
                  </a>
                )}
                {lead.facebook_link && (
                  <a 
                    href={lead.facebook_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                  >
                    <Send className="w-4 h-4 shrink-0" />
                    <span>Facebook</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-2">
              <Button 
                onClick={() => {
                  setNewActivity({ ...newActivity, outcome: 'booked' });
                  setShowActivityDialog(true);
                }}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 justify-center text-sm"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Booked Shoot
              </Button>
              <Button 
                onClick={() => {
                  createActivityMutation.mutate({
                    activity_type: 'engagement',
                    outcome: 'no_response',
                    notes: ''
                  });
                }}
                variant="outline"
                className="w-full h-11 justify-center text-sm"
                disabled={createActivityMutation.isPending}
              >
                <Heart className="w-4 h-4 mr-2" />
                Log Engagement
              </Button>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <h3 className="text-sm md:text-base font-semibold text-slate-900">Recent Activity</h3>
              <Button
                onClick={() => setShowActivityDialog(true)}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
              >
                Log New Activity
              </Button>
            </div>
            {activities.length === 0 ? (
              <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activities yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.slice(0, 5).map((activity) => {
                  const Icon = activityTypeIcons[activity.activity_type] || MessageCircle;
                  const activityUser = users.find(u => u.id === activity.performed_by_id);
                  return (
                    <div key={activity.id} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                      {activityUser?.profile_photo_url ? (
                        <img
                          src={activityUser.profile_photo_url}
                          alt={activity.performed_by_name}
                          className="w-8 h-8 rounded-full object-cover border-2 border-slate-100 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-yellow-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 capitalize text-sm">
                            {activity.activity_type}
                          </span>
                          {activity.outcome && (
                            <Badge className={cn(
                              "text-xs capitalize",
                              activity.outcome === 'conversation' && "bg-green-100 text-green-700",
                              activity.outcome === 'booked' && "bg-emerald-100 text-emerald-700",
                              activity.outcome === 'no_response' && "bg-slate-100 text-slate-600"
                            )}>
                              {activity.outcome?.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-start gap-2 mt-1">
                          {activity.notes && (
                            <p className="text-slate-600 text-sm whitespace-pre-wrap flex-1">{activity.notes}</p>
                          )}
                          {activity.photos && activity.photos.length > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingPhotos(activity.photos);
                                setCurrentPhotoIndex(0);
                              }}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100 transition-colors shrink-0"
                            >
                              <ImageIcon className="w-3 h-3" />
                              {activity.photos.length} {activity.photos.length === 1 ? 'photo' : 'photos'}
                            </button>
                          )}
                        </div>
                        {activity.photos && activity.photos.length > 0 && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {activity.photos.slice(0, 3).map((photoUrl, idx) => (
                              <button
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingPhotos(activity.photos);
                                  setCurrentPhotoIndex(idx);
                                }}
                                className="relative group"
                              >
                                <img
                                  src={photoUrl}
                                  alt={`Screenshot ${idx + 1}`}
                                  className="w-16 h-16 object-cover rounded-lg border-2 border-slate-200 hover:border-blue-500 transition-colors cursor-pointer"
                                />
                                {idx === 2 && activity.photos.length > 3 && (
                                  <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                                    <span className="text-white text-xs font-medium">+{activity.photos.length - 3}</span>
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {formatInEST(activity.activity_at || activity.created_date)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bookings */}
          {bookings.length > 0 && (
            <div>
              <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-3">Bookings</h3>
              <div className="space-y-2">
                {bookings.map((booking) => (
                  <div key={booking.id} className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
                      <Calendar className="w-4 h-4" />
                      Shoot Booked
                    </div>
                    {booking.address && (
                      <p className="text-slate-600 text-sm mt-1">{booking.address}</p>
                    )}
                    <p className="text-xs text-emerald-600 mt-1">{formatInEST(booking.booked_at || booking.created_date)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Log Activity Dialog */}
      <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Log Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-900 block mb-2">Activity Type</label>
              <div className="grid grid-cols-3 gap-2">
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
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                      newActivity.activity_type === value
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <Icon className={cn(
                      "w-5 h-5",
                      newActivity.activity_type === value ? "text-blue-600" : "text-slate-400"
                    )} />
                    <span className={cn(
                      "text-xs font-medium",
                      newActivity.activity_type === value ? "text-blue-600" : "text-slate-600"
                    )}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
            {newActivity.activity_type !== 'engagement' && newActivity.activity_type !== 'note' && (
              <div>
                <label className="text-sm font-medium text-slate-900 block mb-2">Outcome</label>
                <Select 
                  value={newActivity.outcome} 
                  onValueChange={(v) => setNewActivity({ ...newActivity, outcome: v })}
                >
                  <SelectTrigger className="h-11">
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
                  <label className="text-sm font-medium text-slate-900 block mb-2">Shoot Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-11 justify-start text-left font-normal",
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
                  <label className="text-sm font-medium text-slate-900 block mb-2">Address</label>
                  <Input
                    value={newActivity.address || ''}
                    onChange={(e) => setNewActivity({ ...newActivity, address: e.target.value })}
                    placeholder="Shoot location address..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-900 block mb-2">HDPH Booked Link</label>
                  <Input
                    value={newActivity.hdph_link || ''}
                    onChange={(e) => setNewActivity({ ...newActivity, hdph_link: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-900 block mb-2">Offer</label>
                  <Select 
                    value={newActivity.payment_type || 'paid'} 
                    onValueChange={(v) => setNewActivity({ ...newActivity, payment_type: v })}
                  >
                    <SelectTrigger className="h-11">
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
              <label className="text-sm font-medium text-slate-900 block mb-2">Notes</label>
              <Textarea
                value={newActivity.notes}
                onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value })}
                placeholder="Add any notes about this interaction..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-900 block mb-2">
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
                    id="photo-upload"
                    disabled={uploadingPhotos}
                  />
                  <label
                    htmlFor="photo-upload"
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
              >
                Cancel
              </Button>
              <Button 
                onClick={() => createActivityMutation.mutate(newActivity)}
                disabled={createActivityMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Log Activity
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
    </>
  );
}