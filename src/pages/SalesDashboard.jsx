import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { Phone, MessageCircle, Calendar, TrendingUp, Plus } from 'lucide-react';
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
import StatCard from '@/components/sales/StatCard';
import GoalProgress from '@/components/sales/GoalProgress';
import TeamBookingCard from '@/components/sales/TeamBookingCard';
import LeaderboardItem from '@/components/sales/LeaderboardItem';
import NextBestActions from '@/components/sales/NextBestActions';
import MonthlyGoalProgress from '@/components/sales/MonthlyGoalProgress';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function SalesDashboard({ user }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [notifiedAchievements, setNotifiedAchievements] = useState(() => {
    const stored = localStorage.getItem(`achievements_${format(new Date(), 'yyyy-MM-dd')}`);
    return stored ? JSON.parse(stored) : [];
  });
  const [showNewLead, setShowNewLead] = useState(false);
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

  // Get current time in EST - compare as date strings, not Date objects
  const today = formatInTimeZone(new Date(), 'America/New_York', 'yyyy-MM-dd');

  // Fetch today's activities for current user
  const { data: activities = [] } = useQuery({
    queryKey: ['activities', today, user?.email],
    queryFn: () => base44.entities.Activity.filter({
      department: 'sales'
    }, '-created_date'),
    enabled: !!user
  });

  // Fetch today's bookings
  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', today],
    queryFn: () => base44.entities.Booking.filter({
      department: 'sales'
    }, '-created_date', 100)
  });

  // Fetch daily goals
  const { data: goals = [] } = useQuery({
    queryKey: ['dailyGoals', today, user?.id],
    queryFn: () => base44.entities.DailyGoal.filter({
      user_id: user?.id,
      date: today
    }),
    enabled: !!user
  });

  const { data: monthlyGoals = [] } = useQuery({
    queryKey: ['monthlyGoals', user?.id],
    queryFn: () => base44.entities.MonthlyGoal.filter({
      user_id: user?.id,
      department: 'sales'
    }),
    enabled: !!user
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    enabled: !!user
  });

  // Update newLead defaults when currentUser loads
  useEffect(() => {
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

  // Fetch leads for Next Best Actions
  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.filter({ department: 'sales' }, '-created_date', 1000),
    enabled: !!user
  });

  // Fetch tasks for manual follow-ups
  const { data: tasks = [] } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => base44.entities.Task.filter({ 
      owner_id: user?.id,
      department: 'sales'
    }),
    enabled: !!user
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => base44.entities.AppSetting.filter({ is_active: true }, 'sort_order')
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user
  });

  const contactTypes = appSettings.filter(s => s.setting_type === 'contact_type');
  const leadSources = appSettings.filter(s => s.setting_type === 'lead_source');
  const interestLevels = appSettings.filter(s => s.setting_type === 'interest_level');

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
      queryClient.invalidateQueries({ queryKey: ['leads'] });
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

  // Calculate today's stats in EST/EDT - compare date strings, not Date objects
  const todayActivities = activities.filter(a => {
    const actDateEST = formatInTimeZone(a.activity_at || a.created_date, 'America/New_York', 'yyyy-MM-dd');
    return actDateEST === today && a.performed_by_id === user?.id;
  });

  const todayBookings = bookings.filter(b => {
    const bookDateEST = formatInTimeZone(b.booked_at || b.created_date, 'America/New_York', 'yyyy-MM-dd');
    return bookDateEST === today && b.booked_by_id === user?.id;
  });

  const todayTeamBookings = bookings.filter(b => {
    const bookDateEST = formatInTimeZone(b.booked_at || b.created_date, 'America/New_York', 'yyyy-MM-dd');
    return bookDateEST === today;
  });

  // Count unique leads contacted today (only one outreach per lead per day)
  // Only count actual outreach activities (call, text, email, dm), not engagement, and exclude bookings
  const uniqueOutreachLeads = new Set(
    todayActivities
      .filter(a => ['call', 'text', 'email', 'dm'].includes(a.activity_type) && a.outcome !== 'booked')
      .map(a => a.lead_id)
  );
  const outreachCount = uniqueOutreachLeads.size;
  
  // Count unique leads with conversations (only one conversation per lead per day), exclude bookings
  const uniqueConversationLeads = new Set(
    todayActivities
      .filter(a => a.outcome === 'conversation' && a.outcome !== 'booked')
      .map(a => a.lead_id)
  );
  const conversationCount = uniqueConversationLeads.size;
  
  const bookingCount = todayBookings.length;

  // Calculate conversion rate over last 7 days in EST/EDT (by date, not 24-hour window)
  const last7DaysDates = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    return formatInTimeZone(date, 'America/New_York', 'yyyy-MM-dd');
  });
  
  const last7DaysActivities = activities.filter(a => {
    const actDateEST = formatInTimeZone(a.activity_at || a.created_date, 'America/New_York', 'yyyy-MM-dd');
    return last7DaysDates.includes(actDateEST) && a.performed_by_id === user?.id;
  });
  
  // Count unique leads for outreach (only actual outreach activities), exclude bookings
  const uniqueOutreachLeads168 = new Set(
    last7DaysActivities
      .filter(a => ['call', 'text', 'email', 'dm'].includes(a.activity_type) && a.outcome !== 'booked')
      .map(a => a.lead_id)
  );
  const last168HoursOutreach = uniqueOutreachLeads168.size;
  
  // Count bookings in last 7 days
  const last168HoursBookings = bookings.filter(b => {
    const bookDateEST = formatInTimeZone(b.booked_at || b.created_date, 'America/New_York', 'yyyy-MM-dd');
    return last7DaysDates.includes(bookDateEST) && b.booked_by_id === user?.id;
  }).length;
  
  const conversionRate = last168HoursOutreach > 0 
    ? ((last168HoursBookings / last168HoursOutreach) * 100).toFixed(1)
    : 0;

  const currentGoal = goals[0] || {
    outreach_goal: user?.default_outreach_goal || 50,
    conversation_goal: user?.default_conversation_goal || 10,
    booking_goal: user?.default_booking_goal || 2
  };

  // Calculate leaderboard in EST/EDT
  const calculateLeaderboard = () => {
    const userStats = {};
    
    // Track unique outreach and conversation leads per user
    const userOutreachLeads = {};
    const userConversationLeads = {};
    const userEngagements = {};
    const userBookingPoints = {};
    
    activities.forEach(a => {
      const actDateEST = formatInTimeZone(a.activity_at || a.created_date, 'America/New_York', 'yyyy-MM-dd');
      if (actDateEST === today) {
        const userId = a.performed_by_id;
        if (!userStats[userId]) {
          userStats[userId] = { name: a.performed_by_name || userId, outreach: 0, conversations: 0, bookings: 0, engagements: 0, bookingPoints: 0 };
        }
        
        // Track unique outreach leads per user (one per lead per day) - only actual outreach activities, exclude bookings
        if (['call', 'text', 'email', 'dm'].includes(a.activity_type) && a.outcome !== 'booked') {
          if (!userOutreachLeads[userId]) {
            userOutreachLeads[userId] = new Set();
          }
          userOutreachLeads[userId].add(a.lead_id);
        }
        
        // Track unique conversation leads per user, exclude bookings
        if (a.outcome === 'conversation' && a.outcome !== 'booked') {
          if (!userConversationLeads[userId]) {
            userConversationLeads[userId] = new Set();
          }
          userConversationLeads[userId].add(a.lead_id);
        }
        
        // Track engagements
        if (a.activity_type === 'engagement') {
          if (!userEngagements[userId]) {
            userEngagements[userId] = 0;
          }
          userEngagements[userId]++;
        }
        
        // Track booking points based on payment type
        if (a.outcome === 'booked') {
          if (!userBookingPoints[userId]) {
            userBookingPoints[userId] = 0;
          }
          const paymentType = a.payment_type || 'paid';
          if (paymentType === 'paid') {
            userBookingPoints[userId] += 150;
          } else if (paymentType === 'free_plus_paid') {
            userBookingPoints[userId] += 125;
          } else if (paymentType === 'free') {
            userBookingPoints[userId] += 100;
          }
        }
      }
    });
    
    // Set outreach counts based on unique leads
    Object.keys(userOutreachLeads).forEach(userId => {
      if (userStats[userId]) {
        userStats[userId].outreach = userOutreachLeads[userId].size;
      }
    });
    
    // Set conversation counts based on unique leads
    Object.keys(userConversationLeads).forEach(userId => {
      if (userStats[userId]) {
        userStats[userId].conversations = userConversationLeads[userId].size;
      }
    });
    
    // Set engagement counts
    Object.keys(userEngagements).forEach(userId => {
      if (userStats[userId]) {
        userStats[userId].engagements = userEngagements[userId];
      }
    });
    
    // Set booking points
    Object.keys(userBookingPoints).forEach(userId => {
      if (userStats[userId]) {
        userStats[userId].bookingPoints = userBookingPoints[userId];
      }
    });

    // Count bookings for display purposes
    bookings.forEach(b => {
      const bookDateEST = formatInTimeZone(b.booked_at || b.created_date, 'America/New_York', 'yyyy-MM-dd');
      if (bookDateEST === today) {
        const userId = b.booked_by_id;
        if (!userStats[userId]) {
          userStats[userId] = { name: b.booked_by_name || userId, outreach: 0, conversations: 0, bookings: 0, engagements: 0, bookingPoints: 0 };
        }
        userStats[userId].bookings++;
      }
    });

    // Calculate points: bookingPoints + conversations * 15 + outreach * 2 + engagements * 1
    return Object.entries(userStats)
      .map(([userId, stats]) => {
        const userData = users.find(u => u.id === userId);
        return {
          email: userData?.email || userId,
          name: stats.name,
          bookings: stats.bookings,
          conversations: stats.conversations,
          points: (stats.bookingPoints || 0) + stats.conversations * 15 + stats.outreach * 2 + stats.engagements * 1
        };
      })
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);
  };

  const leaderboard = calculateLeaderboard();

  // Listen for new lead event from NextBestActions
  useEffect(() => {
    const handleOpenNewLead = () => {
      // Reset to user's defaults when opening form
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
      setShowNewLead(true);
    };
    window.addEventListener('openNewLead', handleOpenNewLead);
    return () => window.removeEventListener('openNewLead', handleOpenNewLead);
  }, [currentUser]);

  // Track previous lengths to detect new data
  const prevActivitiesLength = useRef(0);
  const prevBookingsLength = useRef(0);

  // Achievement notifications
  useEffect(() => {
    const checkAchievements = () => {
      const achievements = [];
      
      // Check all sales users for achievements
      const salesUsers = {};
      
      // Collect user stats
      activities.forEach(a => {
        const actDateEST = formatInTimeZone(a.activity_at || a.created_date, 'America/New_York', 'yyyy-MM-dd');
        if (actDateEST === today) {
          const userId = a.performed_by_id;
          if (!salesUsers[userId]) {
            salesUsers[userId] = {
              name: a.performed_by_name || userId,
              outreachLeads: new Set(),
              conversationLeads: new Set(),
              bookings: 0
            };
          }
          // Only count actual outreach activities, exclude bookings
          if (['call', 'text', 'email', 'dm'].includes(a.activity_type) && a.outcome !== 'booked') {
            salesUsers[userId].outreachLeads.add(a.lead_id);
          }
          if (a.outcome === 'conversation' && a.outcome !== 'booked') {
            salesUsers[userId].conversationLeads.add(a.lead_id);
          }
        }
      });
      
      bookings.forEach(b => {
        const bookDateEST = formatInTimeZone(b.booked_at || b.created_date, 'America/New_York', 'yyyy-MM-dd');
        if (bookDateEST === today) {
          const userId = b.booked_by_id;
          if (!salesUsers[userId]) {
            salesUsers[userId] = {
              name: b.booked_by_name || userId,
              outreachLeads: new Set(),
              conversationLeads: new Set(),
              bookings: 0
            };
          }
          salesUsers[userId].bookings++;
          
          // Check for new booking
          const bookingKey = `booking_${b.id}`;
          if (!notifiedAchievements.includes(bookingKey)) {
            achievements.push({
              key: bookingKey,
              userId: userId,
              userName: b.booked_by_name,
              type: 'booking',
              message: `${b.booked_by_name} booked a new shoot! 🎉`
            });
          }
        }
      });
      
      // Check goals for each user
      Object.entries(salesUsers).forEach(([userId, stats]) => {
        const userGoal = goals.find(g => g.user_id === userId) || {
          outreach_goal: 50,
          conversation_goal: 10,
          booking_goal: 2
        };
        
        const outreach = stats.outreachLeads.size;
        const conversations = stats.conversationLeads.size;
        const bookingsCount = stats.bookings;
        

      });
      
      // Show toasts for new achievements
      if (achievements.length > 0) {
        const newKeys = achievements.map(a => a.key);
        const updated = [...notifiedAchievements, ...newKeys];
        setNotifiedAchievements(updated);
        localStorage.setItem(`achievements_${today}`, JSON.stringify(updated));
        
        achievements.forEach(achievement => {
          toast.success(achievement.message, {
            duration: 8000,
            position: 'top-right',
            action: {
              label: '🙌 High Five',
              onClick: async () => {
                // Find the user who got the achievement
                const achieverUserId = achievement.userId;
                if (achieverUserId && achieverUserId !== user?.id) {
                  // Create notification for the achiever
                  await base44.entities.Notification.create({
                    user_id: achieverUserId,
                    type: 'achievement',
                    title: 'High Five! 🙌',
                    message: `${user?.full_name} gave you a high five!`,
                    is_read: false
                  });
                }
              }
            }
          });
        });
      }
    };
    
    // Only check achievements if data has actually grown (new items added)
    const hasNewActivities = activities.length > prevActivitiesLength.current;
    const hasNewBookings = bookings.length > prevBookingsLength.current;
    
    if (hasNewActivities || hasNewBookings) {
      checkAchievements();
    }
    
    prevActivitiesLength.current = activities.length;
    prevBookingsLength.current = bookings.length;
  }, [activities, bookings, goals, notifiedAchievements, today]);

  // Subscribe to notifications for real-time high five toasts
  useEffect(() => {
    if (!user?.id) return;
    
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' && event.data?.user_id === user?.id && event.data?.type === 'achievement') {
        toast.success(event.data.message, {
          duration: 5000,
          icon: '🙌'
        });
      }
    });

    return unsubscribe;
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-blue-50/30 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 relative z-10 px-4 py-6 md:py-8">
      {/* Monthly Goal Progress */}
      {monthlyGoals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <MonthlyGoalProgress
            user={user}
            bookings={bookings}
            monthlyGoal={monthlyGoals[0]}
          />
        </motion.div>
      )}

      {/* Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6"
      >
        <StatCard
          title="Today's Outreach"
          value={outreachCount}
          icon={Phone}
          color="emerald"
        />
        <StatCard
          title="Conversations"
          value={conversationCount}
          icon={MessageCircle}
          color="blue"
        />
        <StatCard
          title="Today's Bookings"
          value={bookingCount}
          icon={Calendar}
          color="amber"
        />
        <StatCard
          title="Conversion Rate (7d)"
          value={`${conversionRate}%`}
          icon={TrendingUp}
          color="cyan"
        />
      </motion.div>

      {/* Main Content Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6"
      >
        {/* Left: Next Best Actions */}
        <div className="lg:col-span-2 order-1 lg:order-1">
          <NextBestActions 
            leads={leads}
            activities={activities}
            bookings={bookings}
            tasks={tasks}
            userId={user?.id}
            userEmail={user?.email}
            user={user}
            today={today}
          />
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4 md:space-y-6 order-2 lg:order-2">
          {/* Today's Goals */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-blue-50">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 bg-gradient-to-b from-emerald-600 to-blue-600 rounded-full" />
                <h2 className="text-xl font-bold text-slate-900">Today's Goals</h2>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <GoalProgress
                label="Outreach"
                current={outreachCount}
                goal={currentGoal.outreach_goal}
                icon={Phone}
                color="emerald"
              />
              <GoalProgress
                label="Conversations"
                current={conversationCount}
                goal={currentGoal.conversation_goal}
                icon={MessageCircle}
                color="blue"
              />
              <GoalProgress
                label="Bookings"
                current={bookingCount}
                goal={currentGoal.booking_goal}
                icon={Calendar}
                color="amber"
              />
            </div>
          </motion.div>

          {/* Leaderboard */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 bg-gradient-to-b from-amber-600 to-orange-600 rounded-full" />
                <h2 className="text-xl font-bold text-slate-900">Leaderboard</h2>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {leaderboard.length > 0 ? (
                leaderboard.map((entry, index) => (
                  <LeaderboardItem
                    key={entry.email}
                    rank={index + 1}
                    name={entry.name}
                    stats={entry}
                    isCurrentUser={entry.email === user?.email}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p>No activity yet today</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* New Lead Dialog */}
      <Dialog open={showNewLead} onOpenChange={setShowNewLead}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
      </div>
    </div>
  );
}