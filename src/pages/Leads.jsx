import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  ChevronRight,
  X,
  Send,
  Activity,
  MessageCircle,
  Heart,
  FileText,
  Instagram,
  Facebook
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const statusColors = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-amber-100 text-amber-700',
  engaged: 'bg-purple-100 text-purple-700',
  nurture: 'bg-violet-100 text-violet-700',
  won: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-slate-100 text-slate-500',
};

const interestColors = {
  hot: 'bg-red-100 text-red-700',
  warm: 'bg-orange-100 text-orange-700',
  cold: 'bg-cyan-100 text-cyan-700',
};

export default function Leads({ user }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  
  const [search, setSearch] = useState(urlParams.get('search') || '');
  const [submittedSearch, setSubmittedSearch] = useState(urlParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(urlParams.get('status') || 'all');
  const [businessFilter, setBusinessFilter] = useState(urlParams.get('business') || 'all');
  const [activitySort, setActivitySort] = useState(urlParams.get('sort') || 'newest');
  const [ownerFilter, setOwnerFilter] = useState(urlParams.get('owner') || 'all');
  const [showNewLead, setShowNewLead] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [engagementMode, setEngagementMode] = useState(false);
  const [newActivity, setNewActivity] = useState({
    activity_type: 'call',
    outcome: 'no_response',
    notes: '',
    address: '',
    hdph_link: '',
    payment_type: 'paid'
  });
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    email: '',
    instagram_link: '',
    facebook_link: '',
    lead_source: 'referral',
    interest_level: 'warm',
    location: '',
    estimated_value: 2000,
    status: 'new',
    department: 'sales',
    business: 'windowstill'
  });
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const observerTargetMobile = useRef(null);
  const observerTargetDesktop = useRef(null);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    enabled: !!user
  });

  // Update newLead defaults when currentUser loads
  React.useEffect(() => {
    if (currentUser) {
      setNewLead(prev => ({
        ...prev,
        lead_source: currentUser?.default_lead_source || 'referral',
        interest_level: currentUser?.default_lead_interest_level || 'warm',
        location: currentUser?.default_lead_location || '',
        estimated_value: currentUser?.default_lead_estimated_value || 2000,
        business: currentUser?.default_lead_business || 'windowstill'
      }));
    }
  }, [currentUser]);

  const {
    data: leadsData,
    isLoading,
    error: leadsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['leads-infinite', submittedSearch, statusFilter, businessFilter, ownerFilter, activitySort],
    queryFn: async ({ pageParam = 0 }) => {
      const queryFilter = {
        department: 'sales',
      };

      if (statusFilter !== 'all') {
        queryFilter.status = statusFilter;
      }
      if (businessFilter !== 'all') {
        queryFilter.business = businessFilter;
      }
      if (ownerFilter !== 'all') {
        queryFilter.owner_id = ownerFilter;
      }

      const sortOrder = activitySort === 'newest' ? '-updated_date' : 'updated_date';

      const result = await base44.entities.Lead.filter(
        queryFilter,
        sortOrder,
        50,
        pageParam
      );
      return result;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 50) return undefined;
      return allPages.length * 50;
    },
    enabled: !!user && !submittedSearch,
    initialPageParam: 0
  });

  // Separate query for search results (only runs when submittedSearch is set)
  const { 
    data: searchResults = [], 
    isLoading: searchLoading 
  } = useQuery({
    queryKey: ['search-leads', submittedSearch],
    queryFn: async () => {
      if (!submittedSearch.trim()) return [];
      
      // Fetch all leads and filter client-side since server doesn't support OR queries
      const allLeads = await base44.entities.Lead.filter(
        { department: 'sales' },
        '-created_date',
        10000
      );
      
      const query = submittedSearch.toLowerCase();
      return allLeads.filter(lead => 
        lead.name?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.phone?.includes(query)
      );
    },
    enabled: !!submittedSearch.trim()
  });

  const leads = submittedSearch.trim() 
    ? searchResults 
    : (leadsData?.pages.flatMap(page => page) || []);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (businessFilter !== 'all') params.set('business', businessFilter);
    if (activitySort !== 'newest') params.set('sort', activitySort);
    if (ownerFilter !== 'all') params.set('owner', ownerFilter);
    
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [search, statusFilter, businessFilter, activitySort, ownerFilter]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTargetMobile.current) {
      observer.observe(observerTargetMobile.current);
    }
    if (observerTargetDesktop.current) {
      observer.observe(observerTargetDesktop.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (leadsError) {
    console.error('Leads query error:', leadsError);
  }

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => base44.entities.AppSetting.filter({ is_active: true }, 'sort_order')
  });

  const { data: todayActivities = [] } = useQuery({
    queryKey: ['today-activities'],
    queryFn: async () => {
      const nowEST = toZonedTime(new Date(), 'America/New_York');
      const todayStartEST = startOfDay(nowEST);
      const todayEndEST = endOfDay(nowEST);
      const activities = await base44.entities.Activity.filter({ 
        department: 'sales',
        activity_type: 'engagement'
      }, '-created_date', 1000);
      return activities.filter(a => {
        if (!a.activity_at) return false;
        const activityDateEST = toZonedTime(new Date(a.activity_at), 'America/New_York');
        return activityDateEST >= todayStartEST && activityDateEST <= todayEndEST;
      });
    },
    enabled: !!user,
    refetchInterval: 10000 // Refetch every 10 seconds
  });

  const salesUsers = users.filter(u => 
    u.departments?.includes('sales') || u.role === 'admin'
  );

  const contactTypes = appSettings.filter(s => s.setting_type === 'contact_type');
  const leadSources = appSettings.filter(s => s.setting_type === 'lead_source');
  const leadStatuses = appSettings.filter(s => s.setting_type === 'lead_status');
  const interestLevels = appSettings.filter(s => s.setting_type === 'interest_level');
  const activityTypes = appSettings.filter(s => s.setting_type === 'activity_type');
  const activityOutcomes = appSettings.filter(s => s.setting_type === 'activity_outcome');

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Validate at least one contact method is provided
      if (!data.phone?.trim() && !data.email?.trim() && !data.instagram_link?.trim() && !data.facebook_link?.trim()) {
        throw new Error('Please provide at least one contact method: phone, email, Instagram, or Facebook');
      }
      
      // Normalize phone number (remove all non-digits)
      const normalizePhone = (phone) => {
        if (!phone) return '';
        return phone.replace(/\D/g, '');
      };
      
      // Normalize social media links (lowercase, remove trailing slash, extract username)
      const normalizeSocialLink = (link) => {
        if (!link) return '';
        let normalized = link.toLowerCase().trim();
        normalized = normalized.replace(/\/$/, ''); // Remove trailing slash
        normalized = normalized.replace(/^https?:\/\//i, ''); // Remove protocol
        normalized = normalized.replace(/^www\./i, ''); // Remove www
        return normalized;
      };
      
      // Fetch ALL leads to check for duplicates
      const allLeads = await base44.entities.Lead.list();
      
      // Check email duplicate
      if (data.email?.trim()) {
        const emailMatches = allLeads.filter(lead => 
          lead.email?.toLowerCase().trim() === data.email.toLowerCase().trim()
        );
        
        if (emailMatches.length > 0) {
          const existingLead = emailMatches[0];
          throw new Error(`This lead already exists and is owned by ${existingLead.owner_name}. Email: ${existingLead.email}`);
        }
      }
      
      // Check phone duplicate
      if (data.phone?.trim()) {
        const normalizedNewPhone = normalizePhone(data.phone);
        if (normalizedNewPhone.length >= 10) {
          // Get last 10 digits for comparison (to ignore country codes)
          const newPhoneLast10 = normalizedNewPhone.slice(-10);
          
          const phoneMatches = allLeads.filter(lead => {
            if (!lead.phone) return false;
            const existingNormalized = normalizePhone(lead.phone);
            if (existingNormalized.length < 10) return false;
            const existingLast10 = existingNormalized.slice(-10);
            return newPhoneLast10 === existingLast10;
          });
          
          if (phoneMatches.length > 0) {
            const existingLead = phoneMatches[0];
            throw new Error(`This lead already exists and is owned by ${existingLead.owner_name}. Phone: ${existingLead.phone}`);
          }
        }
      }
      
      // Check Instagram link duplicate
      if (data.instagram_link?.trim()) {
        const normalizedNewInsta = normalizeSocialLink(data.instagram_link);
        const instaMatches = allLeads.filter(lead => {
          if (!lead.instagram_link) return false;
          const normalizedExisting = normalizeSocialLink(lead.instagram_link);
          return normalizedNewInsta === normalizedExisting;
        });
        
        if (instaMatches.length > 0) {
          const existingLead = instaMatches[0];
          throw new Error(`This lead already exists and is owned by ${existingLead.owner_name}. Instagram: ${existingLead.instagram_link}`);
        }
      }
      
      // Check Facebook link duplicate
      if (data.facebook_link?.trim()) {
        const normalizedNewFb = normalizeSocialLink(data.facebook_link);
        const fbMatches = allLeads.filter(lead => {
          if (!lead.facebook_link) return false;
          const normalizedExisting = normalizeSocialLink(lead.facebook_link);
          return normalizedNewFb === normalizedExisting;
        });
        
        if (fbMatches.length > 0) {
          const existingLead = fbMatches[0];
          throw new Error(`This lead already exists and is owned by ${existingLead.owner_name}. Facebook: ${existingLead.facebook_link}`);
        }
      }
      
      const newLeadData = await base44.entities.Lead.create({
        ...data,
        owner_id: user?.id,
        owner_name: user?.full_name
      });
      
      // If new lead has Instagram or Facebook, create engagement task
      if (data.status === 'new' && (data.instagram_link || data.facebook_link)) {
        await base44.entities.Task.create({
          title: `Daily Engagement - ${data.name || data.phone}`,
          description: 'Engage with this new lead on social media',
          owner_id: user?.id,
          owner_name: user?.full_name,
          related_to_type: 'lead',
          related_to_id: newLeadData.id,
          related_to_name: data.name || data.phone,
          status: 'open',
          department: 'sales',
          is_system_generated: true,
          due_date: new Date().toISOString().split('T')[0]
        });
      }
      
      return newLeadData;
    },
    onSuccess: (newLeadData) => {
      queryClient.invalidateQueries({ queryKey: ['leads-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      setShowNewLead(false);
      setNewLead({
        name: '',
        phone: '',
        email: '',
        instagram_link: '',
        facebook_link: '',
        lead_source: currentUser?.default_lead_source || 'referral',
        interest_level: currentUser?.default_lead_interest_level || 'warm',
        location: currentUser?.default_lead_location || '',
        estimated_value: currentUser?.default_lead_estimated_value || 2000,
        status: 'new',
        department: 'sales',
        business: currentUser?.default_lead_business || 'windowstill'
      });
      // Navigate to the new lead's detail page
      navigate(createPageUrl(`LeadDetail?id=${newLeadData.id}`));
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create lead');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads-infinite'] })
  });

  const quickEngagementMutation = useMutation({
    mutationFn: (leadId) => {
      const lead = leads.find(l => l.id === leadId);
      const todayEST = formatInTimeZone(new Date(), 'America/New_York', 'yyyy-MM-dd');
      const offset = formatInTimeZone(new Date(), 'America/New_York', 'XXX');
      const activityTimestamp = new Date(`${todayEST}T12:00:00${offset}`).toISOString();
      return base44.entities.Activity.create({
        lead_id: leadId,
        lead_name: lead?.name,
        activity_type: 'engagement',
        outcome: 'no_response',
        notes: 'Quick engagement from leads page',
        performed_by_id: user?.id,
        performed_by_name: user?.full_name,
        department: 'sales',
        activity_at: activityTimestamp
      });
    },
    onMutate: async (leadId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['today-activities'] });
      
      // Snapshot previous value
      const previousActivities = queryClient.getQueryData(['today-activities']);
      
      // Optimistically update to show engagement logged
      const nowEST = toZonedTime(new Date(), 'America/New_York');
      queryClient.setQueryData(['today-activities'], (old = []) => [
        ...old,
        {
          lead_id: leadId,
          created_by: user?.email,
          created_date: nowEST.toISOString(),
          activity_type: 'engagement'
        }
      ]);
      
      return { previousActivities };
    },
    onError: (err, leadId, context) => {
      // Rollback on error
      queryClient.setQueryData(['today-activities'], context.previousActivities);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['today-activities'] });
    }
  });

  const createActivityMutation = useMutation({
    mutationFn: (data) => {
      const todayEST = formatInTimeZone(new Date(), 'America/New_York', 'yyyy-MM-dd');
      const offset = formatInTimeZone(new Date(), 'America/New_York', 'XXX');
      const activityTimestamp = new Date(`${todayEST}T12:00:00${offset}`).toISOString();
      return base44.entities.Activity.create({
        ...data,
        lead_id: selectedLead?.id,
        lead_name: selectedLead?.name,
        performed_by_id: user?.id,
        performed_by_name: user?.full_name,
        department: 'sales',
        activity_at: activityTimestamp
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-infinite'] });
      setShowActivityDialog(false);
      setSelectedLead(null);
      setNewActivity({
        activity_type: 'call',
        outcome: 'no_response',
        notes: '',
        address: '',
        hdph_link: '',
        payment_type: 'paid'
      });

      // If booked, create a booking
      if (newActivity.outcome === 'booked') {
        const todayEST = formatInTimeZone(new Date(), 'America/New_York', 'yyyy-MM-dd');
        const offset = formatInTimeZone(new Date(), 'America/New_York', 'XXX');
        const bookingTimestamp = new Date(`${todayEST}T12:00:00${offset}`).toISOString();
        base44.entities.Booking.create({
          lead_id: selectedLead?.id,
          lead_name: selectedLead?.name,
          booked_by_id: user?.id,
          booked_by_name: user?.full_name,
          booked_at: bookingTimestamp,
          address: newActivity.address,
          hdph_link: newActivity.hdph_link,
          department: 'sales'
        });
        updateMutation.mutate({ id: selectedLead?.id, data: { status: 'won' } });
      } else if (selectedLead?.status !== 'won' && ['call', 'text', 'email', 'dm'].includes(newActivity.activity_type)) {
        // Call, Text, Email, DM move to contacted (but not if already won)
        updateMutation.mutate({ id: selectedLead?.id, data: { status: 'contacted' } });
      }
    }
  });

  const filteredAndSortedLeads = leads
    .filter(lead => {
      const matchesSearch = !search || 
        lead.name?.toLowerCase().includes(search.toLowerCase()) ||
        lead.phone?.includes(search) ||
        lead.email?.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      const matchesBusiness = businessFilter === 'all' || lead.business === businessFilter;
      const matchesOwner = ownerFilter === 'all' || lead.owner_id === ownerFilter;
      
      // If engagement mode is on, only show leads with social media links
      const matchesEngagementMode = !engagementMode || (lead.instagram_link || lead.facebook_link);
      
      return matchesSearch && matchesStatus && matchesBusiness && matchesOwner && matchesEngagementMode;
    })
    .sort((a, b) => {
      // Sort by most recent activity (using updated_date as proxy for last activity)
      const dateA = new Date(a.updated_date || a.created_date);
      const dateB = new Date(b.updated_date || b.created_date);
      
      if (activitySort === 'newest') {
        return dateB - dateA; // Newest first
      } else {
        return dateA - dateB; // Oldest first
      }
    });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-2 md:px-4 md:py-2 px-2 py-1">
            <span className="hidden md:inline text-sm font-medium text-slate-700">Engagement Mode</span>
            <Switch
              checked={engagementMode}
              onCheckedChange={setEngagementMode}
            />
          </div>
          <Button
            onClick={() => setShowNewLead(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="lg:hidden w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-600" />
            <span className="font-medium text-slate-900">Filters</span>
            {(statusFilter !== 'all' || businessFilter !== 'all' || ownerFilter !== 'all' || activitySort !== 'newest') && (
              <Badge className="bg-emerald-100 text-emerald-700 text-xs">Active</Badge>
            )}
          </div>
          <ChevronRight className={cn(
            "w-5 h-5 text-slate-400 transition-transform",
            filtersExpanded && "rotate-90"
          )} />
        </button>

        {/* Filters Content */}
        <div className={cn(
          "flex items-center gap-3 p-4 flex-wrap border-t border-slate-100 lg:border-0",
          "lg:flex",
          !filtersExpanded && "hidden"
        )}>
          <form 
            className="flex-1 min-w-[200px] relative"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmittedSearch(search);
            }}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search leads... (press Enter)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </form>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={cn(
              "w-36",
              statusFilter !== 'all' && "lg:bg-transparent",
              statusFilter === 'new' && "bg-blue-100 text-blue-700 border-blue-200",
              statusFilter === 'contacted' && "bg-amber-100 text-amber-700 border-amber-200",
              statusFilter === 'engaged' && "bg-purple-100 text-purple-700 border-purple-200",
              statusFilter === 'nurture' && "bg-violet-100 text-violet-700 border-violet-200",
              statusFilter === 'won' && "bg-emerald-100 text-emerald-700 border-emerald-200",
              statusFilter === 'lost' && "bg-slate-100 text-slate-500 border-slate-200"
            )}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="engaged">Engaged</SelectItem>
              <SelectItem value="nurture">Nurture</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
          <Select value={businessFilter} onValueChange={setBusinessFilter}>
            <SelectTrigger className={cn(
              "w-52",
              businessFilter !== 'all' && "lg:bg-transparent",
              businessFilter === 'windowstill' && "bg-blue-100 text-blue-700 border-blue-200",
              businessFilter === 'lifestyle_production_group' && "bg-purple-100 text-purple-700 border-purple-200"
            )}>
              <SelectValue placeholder="Business" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Businesses</SelectItem>
              <SelectItem value="windowstill">WindowStill</SelectItem>
              <SelectItem value="lifestyle_production_group">Lifestyle Production Group</SelectItem>
            </SelectContent>
          </Select>
          <Select value={activitySort} onValueChange={setActivitySort}>
            <SelectTrigger className={cn(
              "w-44",
              activitySort !== 'newest' && "lg:bg-transparent",
              activitySort === 'oldest' && "bg-cyan-100 text-cyan-700 border-cyan-200"
            )}>
              <SelectValue placeholder="Sort by Activity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest → Oldest</SelectItem>
              <SelectItem value="oldest">Oldest → Newest</SelectItem>
            </SelectContent>
          </Select>
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className={cn(
              "w-36",
              ownerFilter !== 'all' && "bg-indigo-100 text-indigo-700 border-indigo-200 lg:bg-transparent"
            )}>
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              {salesUsers.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile View */}
      <div className="lg:hidden space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            Loading...
          </div>
        ) : leadsError ? (
          <div className="bg-red-50 rounded-xl border border-red-200 p-12 text-center">
            <p className="text-red-700 font-medium mb-2">Error loading leads</p>
            <p className="text-red-600 text-sm">{leadsError?.message || 'Unknown error'}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Reload Page
            </Button>
          </div>
        ) : filteredAndSortedLeads.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            No leads found
          </div>
        ) : (
          filteredAndSortedLeads.map((lead) => (
            <div
              key={lead.id}
              onClick={() => !engagementMode && (window.location.href = createPageUrl(`LeadDetail?id=${lead.id}&search=${encodeURIComponent(search)}&status=${statusFilter}&business=${businessFilter}&sort=${activitySort}&owner=${ownerFilter}`))}
              className={cn(
                "bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow",
                !engagementMode && "cursor-pointer"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">
                    {lead.name || 'Unnamed Lead'}
                  </h3>
                  {lead.location && (
                    <div className="flex items-center gap-1 text-sm text-slate-400 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {lead.location}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-3">
                  {lead.instagram_link && (
                    <a
                      href={lead.instagram_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2.5 hover:bg-pink-50 rounded-lg transition-colors"
                      title="Instagram"
                    >
                      <Instagram className="w-5 h-5 text-[#E4405F]" />
                    </a>
                  )}
                  {lead.facebook_link && (
                    <a
                      href={lead.facebook_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2.5 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Facebook"
                    >
                      <Facebook className="w-5 h-5 text-[#1877F2]" />
                    </a>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      quickEngagementMutation.mutate(lead.id);
                    }}
                    disabled={quickEngagementMutation.isPending}
                    className={cn(
                      "p-2.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50",
                      todayActivities.some(a => a.lead_id === lead.id && a.performed_by_id === user?.id) ? "text-red-500" : "text-slate-400"
                    )}
                    title="Log Engagement"
                  >
                    <Heart 
                      className="w-5 h-5"
                      fill={todayActivities.some(a => a.lead_id === lead.id && a.performed_by_id === user?.id) ? "currentColor" : "none"}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
        {/* Mobile infinite scroll trigger */}
        <div ref={observerTargetMobile} className="h-16 flex items-center justify-center">
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-slate-400">
              <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              <span className="text-sm">Loading more...</span>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left p-4 text-sm font-medium text-slate-500">Name</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Contact</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Business</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Value</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Owner</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : leadsError ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="bg-red-50 rounded-xl border border-red-200 p-6">
                      <p className="text-red-700 font-medium mb-2">Error loading leads</p>
                      <p className="text-red-600 text-sm">{leadsError?.message || 'Unknown error'}</p>
                      <Button onClick={() => window.location.reload()} className="mt-4">
                        Reload Page
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : filteredAndSortedLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    No leads found
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {filteredAndSortedLeads.map((lead) => (
                    <motion.tr
                      key={lead.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => !engagementMode && (window.location.href = createPageUrl(`LeadDetail?id=${lead.id}&search=${encodeURIComponent(search)}&status=${statusFilter}&business=${businessFilter}&sort=${activitySort}&owner=${ownerFilter}`))}
                      className={cn(
                        "border-b border-slate-50 hover:bg-slate-50",
                        !engagementMode && "cursor-pointer"
                      )}
                    >
                      <td className="p-4">
                        <Link 
                          to={createPageUrl(`LeadDetail?id=${lead.id}&search=${encodeURIComponent(search)}&status=${statusFilter}&business=${businessFilter}&sort=${activitySort}&owner=${ownerFilter}`)}
                          className="font-medium text-slate-900 hover:text-emerald-600"
                        >
                          {lead.name || 'Unnamed Lead'}
                        </Link>
                        {lead.location && (
                          <div className="flex items-center gap-1 text-sm text-slate-400 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {lead.location}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {lead.phone && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Phone className="w-3 h-3" />
                              {lead.phone}
                            </div>
                          )}
                          {lead.email && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Mail className="w-3 h-3" />
                              {lead.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={cn("capitalize", statusColors[lead.status])}>
                          {lead.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-slate-700">
                          {lead.business === 'windowstill' ? 'WindowStill' : lead.business === 'lifestyle_production_group' ? 'Lifestyle Production Group' : '-'}
                        </span>
                      </td>
                      <td className="p-4">
                        {lead.estimated_value ? (
                          <div className="flex items-center gap-1 text-slate-700">
                            <DollarSign className="w-4 h-4" />
                            {lead.estimated_value.toLocaleString()}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const ownerUser = users.find(u => u.id === lead.owner_id);
                            return ownerUser?.profile_photo_url ? (
                              <img
                                src={ownerUser.profile_photo_url}
                                alt={lead.owner_name}
                                className="w-7 h-7 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-medium">
                                {lead.owner_name?.charAt(0) || '?'}
                              </div>
                            );
                          })()}
                          <span className="text-sm text-slate-600">{lead.owner_name || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {lead.instagram_link && (
                            <a
                              href={lead.instagram_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 hover:bg-pink-50 rounded-lg text-[#E4405F] transition-colors"
                              title="Instagram"
                            >
                              <Instagram className="w-4 h-4" />
                            </a>
                          )}
                          {lead.facebook_link && (
                            <a
                              href={lead.facebook_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 hover:bg-blue-50 rounded-lg text-[#1877F2] transition-colors"
                              title="Facebook"
                            >
                              <Facebook className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              quickEngagementMutation.mutate(lead.id);
                            }}
                            disabled={quickEngagementMutation.isPending}
                            className={cn(
                              "p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50",
                              todayActivities.some(a => a.lead_id === lead.id && a.performed_by_id === user?.id) ? "text-red-500" : "text-slate-400"
                            )}
                            title="Log Engagement"
                          >
                            <Heart 
                              className="w-4 h-4"
                              fill={todayActivities.some(a => a.lead_id === lead.id && a.performed_by_id === user?.id) ? "currentColor" : "none"}
                            />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
        {/* Infinite scroll trigger */}
        <div ref={observerTargetDesktop} className="h-20 flex items-center justify-center">
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-slate-400">
              <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              <span className="text-sm">Loading more leads...</span>
            </div>
          )}
        </div>
      </div>

      {/* New Lead Dialog */}
      <Dialog open={showNewLead} onOpenChange={setShowNewLead}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Name</label>
              <Input
                value={newLead.name}
                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                placeholder="Lead name (optional)"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Contact Type</label>
              <Select 
                value={newLead.contact_type || ''} 
                onValueChange={(v) => setNewLead({ ...newLead, contact_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contact type" />
                </SelectTrigger>
                <SelectContent>
                  {contactTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Phone</label>
                <Input
                  type="tel"
                  value={newLead.phone}
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
                    setNewLead({ ...newLead, phone: formatted });
                  }}
                  placeholder="(555) 123-4567"
                  maxLength="14"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Email</label>
                <Input
                  type="email"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  placeholder="Email address"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Instagram</label>
                <Input
                  value={newLead.instagram_link}
                  onChange={(e) => setNewLead({ ...newLead, instagram_link: e.target.value })}
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Facebook</label>
                <Input
                  value={newLead.facebook_link}
                  onChange={(e) => setNewLead({ ...newLead, facebook_link: e.target.value })}
                  placeholder="https://facebook.com/..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Lead Source</label>
                <Select 
                  value={newLead.lead_source} 
                  onValueChange={(v) => setNewLead({ ...newLead, lead_source: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {leadSources.map(source => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Interest Level</label>
                <Select 
                  value={newLead.interest_level} 
                  onValueChange={(v) => setNewLead({ ...newLead, interest_level: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {interestLevels.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Location</label>
                <Input
                  value={newLead.location}
                  onChange={(e) => setNewLead({ ...newLead, location: e.target.value })}
                  placeholder="City, State"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Est. Value</label>
                <Input
                  type="number"
                  value={newLead.estimated_value}
                  onChange={(e) => setNewLead({ ...newLead, estimated_value: parseFloat(e.target.value) || '' })}
                  placeholder="$0"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Business *</label>
              <Select 
                value={newLead.business} 
                onValueChange={(v) => setNewLead({ ...newLead, business: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="windowstill">WindowStill</SelectItem>
                  <SelectItem value="lifestyle_production_group">Lifestyle Production Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowNewLead(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createMutation.mutate(newLead)}
                disabled={createMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Create Lead
              </Button>
            </div>
          </div>
          </DialogContent>
          </Dialog>

          {/* Log Activity Dialog */}
          <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
          <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Log Activity - {selectedLead?.name || 'Lead'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div>
              <label className="text-base font-medium text-slate-900 block mb-3">Activity Type</label>
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
                    onClick={() => setNewActivity({ ...newActivity, activity_type: value })}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                      newActivity.activity_type === value
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <Icon className={cn(
                      "w-6 h-6",
                      newActivity.activity_type === value ? "text-blue-600" : "text-slate-400"
                    )} />
                    <span className={cn(
                      "text-sm font-medium",
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
                    {activityOutcomes.map(outcome => (
                      <SelectItem key={outcome.value} value={outcome.value}>
                        {outcome.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {newActivity.outcome === 'booked' && newActivity.activity_type !== 'engagement' && newActivity.activity_type !== 'note' && (
              <>
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
                disabled={createActivityMutation.isPending}
                className="bg-slate-700 hover:bg-slate-800 px-6"
              >
                Log Activity
              </Button>
            </div>
          </div>
          </DialogContent>
          </Dialog>
          </div>
          );
          }