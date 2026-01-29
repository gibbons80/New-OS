import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isToday, 
  isSameDay, 
  parseISO,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { formatInEST } from '../components/dateFormatter';
import { uploadFileWithProgress } from '../components/utils/mediaApi';
import { 
  Plus, 
  ChevronRight, 
  ChevronLeft, 
  Trophy, 
  Lightbulb,
  Trash2,
  Youtube,
  Instagram,
  AlertCircle,
  Edit3,
  Clock,
  MessageSquare,
  Send,
  CheckCircle,
  Upload,
  LinkIcon,
  Calendar,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { motion, AnimatePresence } from 'framer-motion';

const defaultStatusIcons = {
  needs_assigned: AlertCircle,
  editing: Edit3,
  waiting_on_cta: Clock,
  waiting_on_caption: MessageSquare,
  ready_to_post: Send,
  posted: CheckCircle
};

export default function SocialDashboard({ user }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [brandFilter, setBrandFilter] = useState('all');
  const [calendarView, setCalendarView] = useState('month'); // 'week', '2weeks', 'month'
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    brand: '',
    scheduled_date: '',
    content_status: '',
    original_video_link: '',
    ai_platform: ''
  });
  const [showNewCreator, setShowNewCreator] = useState(false);
  const [newCreator, setNewCreator] = useState({
    name: '',
    instagram_link: '',
    youtube_link: '',
    brands: []
  });
  const [editingCreator, setEditingCreator] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [newNote, setNewNote] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadLoaded, setUploadLoaded] = useState(0);
  const [quickInstagramLink, setQuickInstagramLink] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const { data: posts = [] } = useQuery({
    queryKey: ['social-posts'],
    queryFn: () => base44.entities.SocialPost.filter({ department: 'social' }, '-created_date', 500)
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets', selectedPost?.id],
    queryFn: () => selectedPost ? base44.entities.Asset.filter({ social_post_id: selectedPost.id }) : [],
    enabled: !!selectedPost
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['post-notes', selectedPost?.id],
    queryFn: () => selectedPost ? base44.entities.Note.filter({ 
      related_to_type: 'social_post', 
      related_to_id: selectedPost.id 
    }, '-created_date') : [],
    enabled: !!selectedPost
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const socialUsers = users.filter(u => 
    u.departments?.includes('social') || u.role === 'admin'
  );

  const { data: creators = [] } = useQuery({
    queryKey: ['creators'],
    queryFn: () => base44.entities.Creator.list()
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => base44.entities.AppSetting.filter({ is_active: true }, 'sort_order')
  });

  const brands = appSettings.filter(s => s.setting_type === 'brand');
  const aiPlatforms = appSettings.filter(s => s.setting_type === 'ai_platform');
  const contentStatuses = appSettings.filter(s => s.setting_type === 'content_status');

  const brandLabels = brands.reduce((acc, b) => ({ ...acc, [b.value]: b.label }), {});
  
  // Default status colors as fallback
  const defaultStatusColors = {
    needs_assigned: { bg: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
    editing: { bg: 'bg-blue-100 text-blue-700 border-blue-200', icon: Edit3 },
    waiting_on_cta: { bg: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
    waiting_on_caption: { bg: 'bg-amber-100 text-amber-700 border-amber-200', icon: MessageSquare },
    ready_to_post: { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Send },
    posted: { bg: 'bg-slate-100 text-slate-500 border-slate-200', icon: CheckCircle }
  };
  
  const statusColors = contentStatuses.length > 0 
    ? contentStatuses.reduce((acc, s) => {
        // Get icon component from lucide-react based on stored icon name
        const iconMap = {
          AlertCircle, Edit3, Clock, MessageSquare, Send, CheckCircle
        };
        const IconComponent = s.icon ? iconMap[s.icon] : defaultStatusIcons[s.value];
        
        return {
          ...acc,
          [s.value]: {
            bg: `${s.color} text-${s.color.replace('bg-', '').replace('-100', '-700')} border-${s.color.replace('bg-', '').replace('-100', '-200')}`,
            icon: IconComponent || AlertCircle
          }
        };
      }, {})
    : defaultStatusColors;

  const createPostMutation = useMutation({
    mutationFn: (data) => base44.entities.SocialPost.create({
      ...data,
      creator_id: user?.id,
      creator_name: user?.full_name,
      department: 'social'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      setShowNewPost(false);
      setNewPost({
        title: '',
        brand: '',
        scheduled_date: '',
        content_status: '',
        original_video_link: '',
        ai_platform: ''
      });
    }
  });

  const createCreatorMutation = useMutation({
    mutationFn: (data) => base44.entities.Creator.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creators'] });
      setShowNewCreator(false);
      setEditingCreator(null);
      setNewCreator({ name: '', instagram_link: '', youtube_link: '', brands: [] });
    }
  });

  const updateCreatorMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Creator.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creators'] });
      setShowNewCreator(false);
      setEditingCreator(null);
      setNewCreator({ name: '', instagram_link: '', youtube_link: '', brands: [] });
    }
  });

  const deleteCreatorMutation = useMutation({
    mutationFn: (id) => base44.entities.Creator.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['creators'] })
  });

  const updatePostDateMutation = useMutation({
    mutationFn: ({ postId, newDate }) => base44.entities.SocialPost.update(postId, { 
      scheduled_date: newDate 
    }),
    onMutate: async ({ postId, newDate }) => {
      await queryClient.cancelQueries({ queryKey: ['social-posts'] });
      const previousPosts = queryClient.getQueryData(['social-posts']);
      
      queryClient.setQueryData(['social-posts'], (old) => 
        old?.map(post => 
          post.id === postId ? { ...post, scheduled_date: newDate } : post
        )
      );
      
      return { previousPosts };
    },
    onError: (err, variables, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(['social-posts'], context.previousPosts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
    }
  });

  const updatePostMutation = useMutation({
    mutationFn: ({ postId, data }) => base44.entities.SocialPost.update(postId, data),
    onSuccess: (updatedPost, variables) => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      if (selectedPost) {
        queryClient.invalidateQueries({ queryKey: ['post', selectedPost.id] });
        // Update the selected post state immediately to reflect changes in the panel
        setSelectedPost(prev => ({ ...prev, ...variables.data }));
      }
      setEditingTitle(false);
    }
  });

  const createAssetMutation = useMutation({
    mutationFn: (data) => base44.entities.Asset.create({
      ...data,
      uploaded_by_id: user?.id,
      uploaded_by_name: user?.full_name,
      department: 'social'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    }
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (id) => base44.entities.Asset.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets'] })
  });

  const createNoteMutation = useMutation({
    mutationFn: (content) => base44.entities.Note.create({
      content,
      related_to_type: 'social_post',
      related_to_id: selectedPost.id,
      author_id: user?.id,
      author_name: user?.full_name,
      department: 'social'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-notes', selectedPost.id] });
      setNewNote('');
    }
  });

  const handleFileUpload = async (file) => {
    if (!file || !selectedPost) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadTotal(file.size);
    setUploadLoaded(0);
    
    try {
      // Upload file with progress tracking
      const { fileKey } = await uploadFileWithProgress(
        file,
        (percent, loaded, total) => {
          setUploadProgress(percent);
          setUploadLoaded(loaded);
          setUploadTotal(total);
        }
      );
      
      let assetType = 'other';
      if (file.type.startsWith('video/')) assetType = 'raw_clip';
      else if (file.type.startsWith('image/')) assetType = 'thumbnail';
      else if (file.type === 'application/pdf') assetType = 'pdf';
      
      await createAssetMutation.mutateAsync({
        name: file.name,
        asset_type: assetType,
        file_url: fileKey,
        social_post_id: selectedPost.id
      });
    } catch (error) {
      console.error('Upload failed:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      alert(`Upload failed: ${errorMessage}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadLoaded(0);
      setUploadTotal(0);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Calculate date range based on view
  let calendarStart, calendarEnd;
  if (calendarView === 'week') {
    calendarStart = startOfWeek(currentMonth, { weekStartsOn: 0 });
    calendarEnd = endOfWeek(currentMonth, { weekStartsOn: 0 });
  } else if (calendarView === '2weeks') {
    calendarStart = startOfWeek(currentMonth, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentMonth, { weekStartsOn: 0 });
    calendarEnd = new Date(weekEnd);
    calendarEnd.setDate(calendarEnd.getDate() + 7);
  } else {
    // month view
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  }
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Unscheduled content ideas
  const unscheduledIdeas = posts.filter(p => 
    !p.scheduled_date && 
    !p.posted &&
    (brandFilter === 'all' || p.brand === brandFilter)
  );

  const getPostsForDay = (day) => {
    return posts.filter(p => 
      p.scheduled_date && 
      isSameDay(parseISO(p.scheduled_date), day) &&
      (brandFilter === 'all' || p.brand === brandFilter)
    );
  };

  const isCurrentMonth = (day) => {
    if (calendarView === 'month') {
      return day.getMonth() === currentMonth.getMonth();
    }
    // For week and 2-week views, all days are in "current period"
    return true;
  };

  const navigateCalendar = (direction) => {
    if (calendarView === 'week') {
      setCurrentMonth(prev => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        return newDate;
      });
    } else if (calendarView === '2weeks') {
      setCurrentMonth(prev => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 14 : -14));
        return newDate;
      });
    } else {
      setCurrentMonth(direction === 'next' ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1));
    }
  };

  const getCalendarTitle = () => {
    if (calendarView === 'week' || calendarView === '2weeks') {
      return `${format(calendarStart, 'MMM d')} - ${format(calendarEnd, 'MMM d, yyyy')}`;
    }
    return format(currentMonth, 'MMMM yyyy');
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const postId = result.draggableId;
    const destinationId = result.destination.droppableId;
    
    // If dropped in unscheduled area, clear the date
    if (destinationId === 'unscheduled') {
      updatePostDateMutation.mutate({
        postId,
        newDate: null
      });
    } else {
      // Otherwise schedule for the selected date
      updatePostDateMutation.mutate({
        postId,
        newDate: destinationId
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-7 h-7 text-violet-600" />
            Content Calendar
          </h1>
          <p className="text-slate-500 mt-1">{formatInEST(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Button 
          onClick={() => setShowNewPost(true)}
          className="bg-violet-600 hover:bg-violet-700 shadow-lg hover:shadow-xl transition-shadow"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Post
        </Button>
      </motion.div>

      {/* Calendar */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          {/* Calendar Header - Responsive */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex flex-col gap-3">
              {/* Title Row */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-semibold text-slate-900">
                  {getCalendarTitle()}
                </h2>
                
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateCalendar('prev')}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateCalendar('next')}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Mobile Navigation */}
                <div className="flex md:hidden items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateCalendar('prev')}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateCalendar('next')}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Collapsible Filters on Mobile */}
              <div className="lg:hidden">
                <button
                  onClick={() => setFiltersExpanded(!filtersExpanded)}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-600" />
                    <span className="text-sm font-medium text-slate-900">View & Filter</span>
                    {brandFilter !== 'all' && (
                      <Badge className="bg-violet-100 text-violet-700 text-xs">Active</Badge>
                    )}
                  </div>
                  <ChevronRight className={cn(
                    "w-5 h-5 text-slate-400 transition-transform",
                    filtersExpanded && "rotate-90"
                  )} />
                </button>

                <AnimatePresence>
                  {filtersExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 space-y-3">
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                          <button
                            onClick={() => setCalendarView('week')}
                            className={cn(
                              "flex-1 px-3 py-2 text-sm rounded transition-colors",
                              calendarView === 'week' 
                                ? "bg-white text-slate-900 font-medium shadow-sm" 
                                : "text-slate-600"
                            )}
                          >
                            Week
                          </button>
                          <button
                            onClick={() => setCalendarView('2weeks')}
                            className={cn(
                              "flex-1 px-3 py-2 text-sm rounded transition-colors",
                              calendarView === '2weeks' 
                                ? "bg-white text-slate-900 font-medium shadow-sm" 
                                : "text-slate-600"
                            )}
                          >
                            2 Weeks
                          </button>
                          <button
                            onClick={() => setCalendarView('month')}
                            className={cn(
                              "flex-1 px-3 py-2 text-sm rounded transition-colors",
                              calendarView === 'month' 
                                ? "bg-white text-slate-900 font-medium shadow-sm" 
                                : "text-slate-600"
                            )}
                          >
                            Month
                          </button>
                        </div>
                        <Select value={brandFilter} onValueChange={setBrandFilter}>
                          <SelectTrigger className={cn(
                            "w-full",
                            brandFilter !== 'all' && "bg-violet-100 text-violet-700 border-violet-200"
                          )}>
                            <SelectValue placeholder="All Brands" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Channels</SelectItem>
                            {brands.map(b => (
                              <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Desktop Filters */}
              <div className="hidden lg:flex items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setCalendarView('week')}
                    className={cn(
                      "px-3 py-1 text-sm rounded transition-colors",
                      calendarView === 'week' 
                        ? "bg-white text-slate-900 font-medium shadow-sm" 
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setCalendarView('2weeks')}
                    className={cn(
                      "px-3 py-1 text-sm rounded transition-colors",
                      calendarView === '2weeks' 
                        ? "bg-white text-slate-900 font-medium shadow-sm" 
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    2 Weeks
                  </button>
                  <button
                    onClick={() => setCalendarView('month')}
                    className={cn(
                      "px-3 py-1 text-sm rounded transition-colors",
                      calendarView === 'month' 
                        ? "bg-white text-slate-900 font-medium shadow-sm" 
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Month
                  </button>
                </div>
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="All Brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    {brands.map(b => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        <div className="p-2 md:p-4">
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
              <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.charAt(0)}</span>
              </div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {calendarDays.map(day => {
              const dayPosts = getPostsForDay(day);
              const isInCurrentMonth = isCurrentMonth(day);
              const dayId = format(day, 'yyyy-MM-dd');
              return (
                <Droppable droppableId={dayId} key={day.toISOString()}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      onClick={() => {
                        if (isInCurrentMonth) {
                          setNewPost({
                            ...newPost,
                            scheduled_date: dayId
                          });
                          setShowNewPost(true);
                        }
                      }}
                      className={cn(
                        "min-h-[80px] md:min-h-[120px] p-1 md:p-2 rounded-lg border transition-colors cursor-pointer",
                        isToday(day) && "bg-violet-50 border-violet-300 border-2",
                        !isToday(day) && isInCurrentMonth && "bg-white border-slate-200",
                        !isInCurrentMonth && "bg-slate-50 border-slate-100 opacity-50",
                        snapshot.isDraggingOver && "bg-violet-100 border-violet-400",
                        isInCurrentMonth && "hover:bg-violet-50/50 hover:border-violet-200"
                      )}
                    >
                      <div className={cn(
                        "text-xs md:text-sm font-semibold mb-1 md:mb-2",
                        isToday(day) && "text-violet-900",
                        !isToday(day) && isInCurrentMonth && "text-slate-700",
                        !isInCurrentMonth && "text-slate-400"
                      )}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {dayPosts.slice(0, 4).map((post, index) => (
                          <Draggable key={post.id} draggableId={post.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={provided.draggableProps.style}
                              >
                                <div
                                  onClick={(e) => {
                                    if (!snapshot.isDragging) {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setSelectedPost(post);
                                    }
                                  }}
                                >
                                  <div
                                    className={cn(
                                      "text-[10px] md:text-xs p-1 md:p-1.5 rounded border cursor-pointer hover:shadow-sm transition-all",
                                      statusColors[post.content_status]?.bg || 'bg-slate-100 text-slate-700 border-slate-200',
                                      snapshot.isDragging && "shadow-lg opacity-80 rotate-2"
                                    )}
                                  >
                                    <div className="flex items-center gap-1">
                                      {React.createElement(statusColors[post.content_status]?.icon || AlertCircle, { className: "w-2.5 md:w-3 h-2.5 md:h-3 flex-shrink-0" })}
                                      <div className="font-medium truncate text-[10px] md:text-xs">{post.title}</div>
                                    </div>
                                    <div className="hidden md:block text-[10px] opacity-75 truncate">
                                      {post.assigned_to_name || 'Unassigned'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {dayPosts.length > 4 && (
                          <div className="text-[9px] md:text-[10px] text-slate-500 text-center pt-0.5 md:pt-1">
                            +{dayPosts.length - 4}
                          </div>
                        )}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </div>
        </motion.div>

          {/* Bottom Section: Top Creators & Unscheduled Ideas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Creators List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          <div className="p-3 md:p-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 md:w-5 h-4 md:h-5 text-amber-600" />
              <h3 className="text-sm md:text-base font-semibold text-amber-900">Creators</h3>
            </div>
            <Button
              size="sm"
              onClick={() => setShowNewCreator(true)}
              className="bg-amber-600 hover:bg-amber-700 h-8"
            >
              <Plus className="w-3 h-3 md:mr-1" />
              <span className="hidden md:inline">New</span>
            </Button>
          </div>
          <div className="p-3 md:p-4 max-h-[300px] md:max-h-[400px] overflow-y-auto">
            {creators.filter(c => brandFilter === 'all' || c.brands?.includes(brandFilter)).length === 0 ? (
              <p className="text-xs md:text-sm text-slate-400 text-center py-8">No creators for this brand</p>
            ) : (
              <div className="space-y-2">
                {creators.filter(c => brandFilter === 'all' || c.brands?.includes(brandFilter)).map((creator, idx) => (
                  <motion.div
                    key={creator.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-2.5 md:p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm md:text-base text-slate-900 truncate">{creator.name}</div>
                        <div className="flex items-center gap-1.5 md:gap-2 mt-1.5 md:mt-2">
                          <a
                            href={creator.instagram_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 bg-pink-50 text-pink-600 rounded text-[10px] md:text-xs hover:bg-pink-100 transition-colors"
                          >
                            <Instagram className="w-2.5 md:w-3 h-2.5 md:h-3" />
                            <span className="hidden sm:inline">Instagram</span>
                            <span className="sm:hidden">IG</span>
                          </a>
                          {creator.youtube_link && (
                            <a
                              href={creator.youtube_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 bg-red-50 text-red-600 rounded text-[10px] md:text-xs hover:bg-red-100 transition-colors"
                            >
                              <Youtube className="w-2.5 md:w-3 h-2.5 md:h-3" />
                              <span className="hidden sm:inline">YouTube</span>
                              <span className="sm:hidden">YT</span>
                            </a>
                          )}
                        </div>
                        {creator.brands && creator.brands.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5 md:mt-2">
                            {creator.brands.map(brand => (
                              <Badge key={brand} variant="outline" className="text-[9px] md:text-xs px-1.5 md:px-2 py-0">
                                {brandLabels[brand]}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 md:gap-1">
                        <button
                          onClick={() => {
                            setEditingCreator(creator);
                            setNewCreator({
                              name: creator.name,
                              instagram_link: creator.instagram_link,
                              youtube_link: creator.youtube_link || '',
                              brands: creator.brands || []
                            });
                            setShowNewCreator(true);
                          }}
                          className="p-1 md:p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                        >
                          <Edit3 className="w-3 md:w-4 h-3 md:h-4" />
                        </button>
                        <button
                          onClick={() => deleteCreatorMutation.mutate(creator.id)}
                          className="p-1 md:p-1.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3 md:w-4 h-3 md:h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Unscheduled Content Ideas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          <div className="p-3 md:p-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-cyan-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 md:w-5 h-4 md:h-5 text-blue-600" />
                <h3 className="text-sm md:text-base font-semibold text-blue-900">
                  <span className="hidden md:inline">Content Ideas (Unscheduled)</span>
                  <span className="md:hidden">Ideas ({unscheduledIdeas.length})</span>
                </h3>
              </div>
              <Badge className="bg-blue-100 text-blue-700 text-xs">
                {unscheduledIdeas.length}
              </Badge>
            </div>
          </div>
          
          {/* Quick Instagram Link Input */}
          <div className="p-3 md:p-4 border-b border-slate-100 bg-slate-50">
            <div className="flex gap-2">
              <Input
                value={quickInstagramLink}
                onChange={(e) => setQuickInstagramLink(e.target.value)}
                placeholder="Paste Instagram link..."
                className="flex-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && quickInstagramLink.trim()) {
                    createPostMutation.mutate({
                      title: 'New Instagram Idea',
                      brand: brands[0]?.value || '',
                      original_video_link: quickInstagramLink,
                      content_status: contentStatuses[0]?.value || 'needs_assigned'
                    });
                    setQuickInstagramLink('');
                  }
                }}
              />
              <Button
                onClick={() => {
                  if (quickInstagramLink.trim()) {
                    createPostMutation.mutate({
                      title: 'New Instagram Idea',
                      brand: brands[0]?.value || '',
                      original_video_link: quickInstagramLink,
                      content_status: contentStatuses[0]?.value || 'needs_assigned'
                    });
                    setQuickInstagramLink('');
                  }
                }}
                disabled={!quickInstagramLink.trim() || createPostMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 shrink-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <Droppable droppableId="unscheduled">
            {(provided) => (
              <div 
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="p-3 md:p-4 space-y-2 max-h-[250px] md:max-h-[300px] overflow-y-auto"
              >
                {unscheduledIdeas.length === 0 ? (
                  <p className="text-xs md:text-sm text-slate-400 text-center py-8">All content scheduled!</p>
                ) : (
                  unscheduledIdeas.map((post, index) => (
                    <Draggable key={post.id} draggableId={post.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={provided.draggableProps.style}
                        >
                          <div
                            onClick={(e) => {
                              if (!snapshot.isDragging) {
                                e.preventDefault();
                                setSelectedPost(post);
                              }
                            }}
                          >
                            <div className={cn(
                              "rounded-lg border transition-colors cursor-pointer",
                              statusColors[post.content_status]?.bg || 'bg-slate-100 text-slate-700 border-slate-200',
                              snapshot.isDragging ? "shadow-lg opacity-90 p-2 w-[180px]" : "p-2.5 md:p-3"
                            )}>
                              <div className={cn(
                                "flex items-start gap-2",
                                snapshot.isDragging ? "flex-col" : "justify-between"
                              )}>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 md:gap-2">
                                    {React.createElement(statusColors[post.content_status]?.icon || AlertCircle, { className: "w-3.5 md:w-4 h-3.5 md:h-4 flex-shrink-0" })}
                                    <div className={cn(
                                      "font-medium text-xs md:text-sm",
                                      snapshot.isDragging && "truncate"
                                    )}>{post.title}</div>
                                  </div>
                                  {!snapshot.isDragging && (
                                    <div className="flex items-center gap-1.5 md:gap-2 mt-1">
                                      <span className="text-[10px] md:text-xs opacity-75 capitalize truncate">
                                        {post.content_status.replace(/_/g, ' ')}
                                      </span>
                                      <span className="hidden md:inline text-xs opacity-75">•</span>
                                      <span className="hidden md:inline text-xs opacity-75 truncate">
                                        {brandLabels[post.brand] || post.brand}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {!snapshot.isDragging && (
                                  <ChevronRight className="w-3.5 md:w-4 h-3.5 md:h-4 opacity-50 flex-shrink-0" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </motion.div>
      </div>
        </div>
      </DragDropContext>

      {/* New Post Dialog */}
      <Dialog open={showNewPost} onOpenChange={setShowNewPost}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Title *
              </label>
              <Input
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                placeholder="Post title..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Channel *
                </label>
                <Select
                  value={newPost.brand}
                  onValueChange={(v) => setNewPost({ ...newPost, brand: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map(b => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Content Status
                </label>
                <Select
                  value={newPost.content_status}
                  onValueChange={(v) => setNewPost({ ...newPost, content_status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contentStatuses.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Scheduled Date
              </label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newPost.scheduled_date}
                  onChange={(e) => setNewPost({ ...newPost, scheduled_date: e.target.value })}
                  className="flex-1"
                />
                {newPost.scheduled_date && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewPost({ ...newPost, scheduled_date: '' })}
                    className="px-3"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Original Video Link
              </label>
              <Input
                value={newPost.original_video_link}
                onChange={(e) => setNewPost({ ...newPost, original_video_link: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                AI Platform
              </label>
              <Select
                value={newPost.ai_platform}
                onValueChange={(v) => setNewPost({ ...newPost, ai_platform: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select platform..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {aiPlatforms.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowNewPost(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => createPostMutation.mutate(newPost)}
                disabled={!newPost.title || !newPost.brand || createPostMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {createPostMutation.isPending ? 'Creating...' : 'Create Post'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Creator Dialog */}
      <Dialog open={showNewCreator} onOpenChange={() => {
        setShowNewCreator(false);
        setEditingCreator(null);
        setNewCreator({ name: '', instagram_link: '', youtube_link: '', brands: [] });
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCreator ? 'Edit Creator' : 'Add Creator'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Creator Name *
              </label>
              <Input
                value={newCreator.name}
                onChange={(e) => setNewCreator({ ...newCreator, name: e.target.value })}
                placeholder="Creator name..."
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Instagram Link *
              </label>
              <Input
                value={newCreator.instagram_link}
                onChange={(e) => setNewCreator({ ...newCreator, instagram_link: e.target.value })}
                placeholder="https://instagram.com/..."
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                YouTube Link
              </label>
              <Input
                value={newCreator.youtube_link}
                onChange={(e) => setNewCreator({ ...newCreator, youtube_link: e.target.value })}
                placeholder="https://youtube.com/..."
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Brands (select multiple)
              </label>
              <div className="space-y-2 border border-slate-200 rounded-lg p-3">
                {brands.map(brand => (
                  <div key={brand.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`brand-${brand.value}`}
                      checked={newCreator.brands?.includes(brand.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewCreator({ 
                            ...newCreator, 
                            brands: [...(newCreator.brands || []), brand.value] 
                          });
                        } else {
                          setNewCreator({ 
                            ...newCreator, 
                            brands: (newCreator.brands || []).filter(b => b !== brand.value) 
                          });
                        }
                      }}
                    />
                    <label 
                      htmlFor={`brand-${brand.value}`}
                      className="text-sm text-slate-700 cursor-pointer"
                    >
                      {brand.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowNewCreator(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (editingCreator) {
                    updateCreatorMutation.mutate({ id: editingCreator.id, data: newCreator });
                  } else {
                    createCreatorMutation.mutate(newCreator);
                  }
                }}
                disabled={!newCreator.name || !newCreator.instagram_link || (createCreatorMutation.isPending || updateCreatorMutation.isPending)}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {(createCreatorMutation.isPending || updateCreatorMutation.isPending) ? 'Saving...' : (editingCreator ? 'Update Creator' : 'Add Creator')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sliding Panel for Post Details */}
      <AnimatePresence>
        {selectedPost && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPost(null)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 h-screen w-full max-w-3xl bg-white shadow-2xl z-50 overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-semibold text-slate-900">Post Details</h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedPost(null);
                      navigate(createPageUrl('PostDetail') + `?id=${selectedPost.id}`);
                    }}
                  >
                    Open Full View
                  </Button>
                  <button
                    onClick={() => setSelectedPost(null)}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <Plus className="w-5 h-5 text-slate-500 rotate-45" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Header with Title */}
                <div>
                  {editingTitle ? (
                    <div className="flex items-center gap-2 mb-3">
                      <Input
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="text-2xl font-bold h-12"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updatePostMutation.mutate({ postId: selectedPost.id, data: { title: editedTitle } });
                          } else if (e.key === 'Escape') {
                            setEditingTitle(false);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => updatePostMutation.mutate({ postId: selectedPost.id, data: { title: editedTitle } })}
                        disabled={!editedTitle.trim()}
                        className="bg-violet-600 hover:bg-violet-700"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingTitle(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mb-3">
                      <h1 className="text-3xl font-bold text-slate-900">{selectedPost.title}</h1>
                      <button
                        onClick={() => {
                          setEditedTitle(selectedPost.title);
                          setEditingTitle(true);
                        }}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{brandLabels[selectedPost.brand]}</span>
                  </div>
                </div>

                {/* Status Selector */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Status</label>
                  <Select 
                    value={selectedPost.content_status} 
                    onValueChange={(v) => updatePostMutation.mutate({ postId: selectedPost.id, data: { content_status: v } })}
                  >
                    <SelectTrigger className={cn("h-9 w-full border", statusColors[selectedPost.content_status]?.bg || 'bg-slate-100')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {contentStatuses.map(s => (
                        <SelectItem key={s.value} value={s.value}>
                          <div className="flex items-center gap-2">
                            {React.createElement(statusColors[s.value]?.icon || AlertCircle, { className: "w-4 h-4" })}
                            <span>{s.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Grid of Editable Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Scheduled Date</label>
                    <Input
                      type="date"
                      value={selectedPost.scheduled_date || ''}
                      onChange={(e) => updatePostMutation.mutate({ postId: selectedPost.id, data: { scheduled_date: e.target.value } })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Assigned To</label>
                    <Select 
                      value={selectedPost.assigned_to_id || ''} 
                      onValueChange={(v) => {
                        const selectedUser = socialUsers.find(u => u.id === v);
                        updatePostMutation.mutate({ 
                          postId: selectedPost.id,
                          data: { 
                            assigned_to_id: v,
                            assigned_to_name: selectedUser?.full_name
                          }
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        {socialUsers.map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">AI Platform</label>
                  <Select
                    value={selectedPost.ai_platform || ''}
                    onValueChange={(v) => updatePostMutation.mutate({ postId: selectedPost.id, data: { ai_platform: v } })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {aiPlatforms.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Posted</label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedPost.posted || false}
                      onCheckedChange={(checked) => updatePostMutation.mutate({ 
                        postId: selectedPost.id,
                        data: { 
                          posted: checked,
                          posted_at: checked ? new Date().toISOString() : null,
                          content_status: checked ? 'posted' : 'ready_to_post'
                        }
                      })}
                      id="posted-checkbox-panel"
                    />
                    <label htmlFor="posted-checkbox-panel" className="text-sm text-slate-600 cursor-pointer">
                      {selectedPost.posted && selectedPost.posted_at
                        ? format(new Date(selectedPost.posted_at), 'MMM d, yyyy')
                        : 'Mark as posted'
                      }
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Original Video Link</label>
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      value={selectedPost.original_video_link || ''}
                      onChange={(e) => updatePostMutation.mutate({ postId: selectedPost.id, data: { original_video_link: e.target.value } })}
                      placeholder="https://..."
                    />
                    {selectedPost.original_video_link && (
                      <a 
                        href={selectedPost.original_video_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center text-violet-600"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Assets Section */}
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Files & Media</h3>
                  
                  {/* Drag and Drop Zone */}
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer mb-4",
                      dragActive ? "border-violet-500 bg-violet-50" : "border-slate-200 hover:border-slate-300",
                      uploading && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => !uploading && document.getElementById('panel-file-input').click()}
                  >
                    <input
                      id="panel-file-input"
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(file);
                          e.target.value = '';
                        }
                      }}
                      disabled={uploading}
                    />
                    {uploading ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-5 h-5 border-2 border-slate-200 border-t-violet-600 rounded-full animate-spin" />
                          <p className="text-sm text-slate-600 font-medium">
                            Uploading... {Math.round(uploadProgress)}%
                          </p>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-violet-600 h-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 text-center">
                          {(uploadLoaded / 1024 / 1024).toFixed(2)} MB / {(uploadTotal / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-3">
                        <Upload className="w-5 h-5 text-slate-400" />
                        <p className="text-sm text-slate-600">
                          Drag files or click to upload
                        </p>
                      </div>
                    )}
                  </div>

                  {assets.length > 0 && (
                    <div className="space-y-2">
                      {assets.map(asset => (
                        <div key={asset.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 truncate">{asset.name}</div>
                            <div className="text-xs text-slate-500 capitalize">{asset.asset_type.replace(/_/g, ' ')}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {asset.file_url && (
                              <a
                                href={asset.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg hover:bg-violet-100 text-violet-600 text-sm"
                              >
                                View
                              </a>
                            )}
                            <button
                              onClick={() => deleteAssetMutation.mutate(asset.id)}
                              className="p-2 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comments Section */}
                <div className="border-t border-slate-200 pt-6 pb-8">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Comments</h3>
                  <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto">
                    {notes.map(note => {
                      const noteAuthor = users.find(u => u.id === note.author_id);
                      return (
                        <div key={note.id} className="flex gap-3">
                          {noteAuthor?.profile_photo_url ? (
                            <img
                              src={noteAuthor.profile_photo_url}
                              alt={note.author_name}
                              className="w-8 h-8 rounded-full object-cover border-2 border-slate-100 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-sm font-medium shrink-0">
                              {note.author_name?.charAt(0) || '?'}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900">{note.author_name}</span>
                              <span className="text-xs text-slate-400">
                                {formatInEST(note.created_date)}
                              </span>
                            </div>
                            <p className="text-slate-600 mt-1 text-sm">{note.content}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 mb-8">
                    <Input
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a comment..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newNote.trim()) {
                          createNoteMutation.mutate(newNote);
                        }
                      }}
                    />
                    <Button
                      onClick={() => newNote.trim() && createNoteMutation.mutate(newNote)}
                      disabled={!newNote.trim()}
                      className="bg-violet-600 hover:bg-violet-700"
                    >
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}