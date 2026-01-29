import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Users, 
  Phone, 
  MessageCircle, 
  Calendar,
  TrendingUp,
  AlertCircle,
  Video,
  CheckCircle,
  Target,
  Award,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock
} from 'lucide-react';
import SocialStatsOverview from '@/components/social/SocialStatsOverview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function AdminDashboard({ user }) {
  const queryClient = useQueryClient();
  const [timeframe, setTimeframe] = useState('today');
  const [progressView, setProgressView] = useState('today');
  const [teamProgressExpanded, setTeamProgressExpanded] = useState(false);
  
  // Get current date in EST as string for comparison
  const today = formatInTimeZone(new Date(), 'America/New_York', 'yyyy-MM-dd');
  
  const [selectedDate, setSelectedDate] = useState(today);

  const { data: activities = [] } = useQuery({
    queryKey: ['all-activities'],
    queryFn: () => base44.entities.Activity.filter({ department: 'sales' }, '-created_date', 5000),
    refetchInterval: 30000 // Refetch every 30 seconds to keep data fresh
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['all-bookings'],
    queryFn: () => base44.entities.Booking.filter({ department: 'sales' }, '-created_date', 2000),
    refetchInterval: 30000 // Refetch every 30 seconds to keep data fresh
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.filter({ department: 'sales' }, '-created_date', 1000)
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['social-posts'],
    queryFn: () => base44.entities.SocialPost.filter({ department: 'social' }, '-created_date', 500)
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: dailyGoals = [] } = useQuery({
    queryKey: ['dailyGoals', today],
    queryFn: () => base44.entities.DailyGoal.filter({ 
      date: today
    })
  });

  const { data: monthlyGoals = [] } = useQuery({
    queryKey: ['monthlyGoals'],
    queryFn: () => base44.entities.MonthlyGoal.list()
  });

  const { data: dailyPlans = [] } = useQuery({
    queryKey: ['admin-daily-plans'],
    queryFn: () => base44.entities.DailyPlan.filter({ 
      date: { $gte: format(subDays(new Date(), 30), 'yyyy-MM-dd') } 
    }, '-date')
  });



  // Calculate stats for last 14 days in EST
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(new Date(), i);
    const dateEST = formatInTimeZone(date, 'America/New_York', 'yyyy-MM-dd');
    
    const dayActivities = activities.filter(a => {
      const actDateEST = formatInTimeZone(a.activity_at || a.created_date, 'America/New_York', 'yyyy-MM-dd');
      return actDateEST === dateEST;
    });

    const dayBookings = bookings.filter(b => {
      const bookDateEST = formatInTimeZone(b.booked_at || b.created_date, 'America/New_York', 'yyyy-MM-dd');
      return bookDateEST === dateEST;
    });

    // Count unique leads for outreach (only actual outreach activities)
    const uniqueLeads = new Set(
      dayActivities
        .filter(a => ['call', 'text', 'email', 'dm'].includes(a.activity_type))
        .map(a => a.lead_id)
    );
    
    // Count unique leads for conversations
    const uniqueConvoLeads = new Set(
      dayActivities
        .filter(a => a.outcome === 'conversation')
        .map(a => a.lead_id)
    );

    return {
      date: formatInTimeZone(date, 'America/New_York', 'MMM d'),
      outreach: uniqueLeads.size,
      conversations: uniqueConvoLeads.size,
      bookings: dayBookings.length
    };
  }).reverse();

  // Today's stats in EST
  const todayActivities = activities.filter(a => {
    const actDateEST = formatInTimeZone(a.activity_at || a.created_date, 'America/New_York', 'yyyy-MM-dd');
    return actDateEST === today;
  });

  const todayBookings = bookings.filter(b => {
    const bookDateEST = formatInTimeZone(b.booked_at || b.created_date, 'America/New_York', 'yyyy-MM-dd');
    return bookDateEST === today;
  });

  // Yesterday's stats in EST
  const yesterday = formatInTimeZone(subDays(new Date(), 1), 'America/New_York', 'yyyy-MM-dd');
  const yesterdayActivities = activities.filter(a => {
    const actDateEST = formatInTimeZone(a.activity_at || a.created_date, 'America/New_York', 'yyyy-MM-dd');
    return actDateEST === yesterday;
  });

  const yesterdayBookings = bookings.filter(b => {
    const bookDateEST = formatInTimeZone(b.booked_at || b.created_date, 'America/New_York', 'yyyy-MM-dd');
    return bookDateEST === yesterday;
  });

  // Custom date stats in EST
  const customDateActivities = activities.filter(a => {
    const actDateEST = formatInTimeZone(a.activity_at || a.created_date, 'America/New_York', 'yyyy-MM-dd');
    return actDateEST === selectedDate;
  });
  const customDateBookings = bookings.filter(b => {
    const bookDateEST = formatInTimeZone(b.booked_at || b.created_date, 'America/New_York', 'yyyy-MM-dd');
    return bookDateEST === selectedDate;
  });

  // Select activities and bookings based on progressView
  const progressActivities = progressView === 'today' ? todayActivities : 
                             progressView === 'yesterday' ? yesterdayActivities : 
                             customDateActivities;
  const progressBookings = progressView === 'today' ? todayBookings : 
                          progressView === 'yesterday' ? yesterdayBookings : 
                          customDateBookings;

  // Social stats
  const readyToPost = posts.filter(p => p.content_status === 'ready_to_post' && !p.posted).length;
  const blockedContent = posts.filter(p => 
    ['waiting_on_cta', 'waiting_on_caption'].includes(p.content_status)
  ).length;
  const overduePosts = posts.filter(p => 
    p.scheduled_date && new Date(p.scheduled_date) < new Date() && !p.posted
  ).length;

  // Tasks stats
  const completedPlans = dailyPlans.filter(p => p.status === 'eod_submitted').length;
  const incompletePlans = dailyPlans.filter(p => p.status !== 'eod_submitted').length;
  const completionRate = dailyPlans.length > 0 
    ? ((completedPlans / dailyPlans.length) * 100).toFixed(0)
    : 0;
  const totalRolledOverTasks = dailyPlans.reduce((sum, plan) => 
    sum + (plan.rolled_over_tasks?.length || 0), 0
  );

  // Calculate timeframe stats in EST
  const days = timeframe === 'today' ? 1 : timeframe === 'yesterday' ? 1 : timeframe === '7d' ? 7 : timeframe === '14d' ? 14 : 30;
  const startOffset = timeframe === 'yesterday' ? 1 : 0;
  const timeframeDates = Array.from({length: days}, (_, i) => {
    const date = subDays(new Date(), i + startOffset);
    return formatInTimeZone(date, 'America/New_York', 'yyyy-MM-dd');
  });
  
  const timeframeActivities = activities.filter(a => {
    const actDateEST = formatInTimeZone(a.activity_at || a.created_date, 'America/New_York', 'yyyy-MM-dd');
    return timeframeDates.includes(actDateEST);
  });
  const timeframeBookings = bookings.filter(b => {
    const bookDateEST = formatInTimeZone(b.booked_at || b.created_date, 'America/New_York', 'yyyy-MM-dd');
    return timeframeDates.includes(bookDateEST);
  });

  // Count unique lead+day combinations for outreach (only actual outreach activities)
  const uniqueLeadDays = new Set(
    timeframeActivities
      .filter(a => ['call', 'text', 'email', 'dm'].includes(a.activity_type))
      .map(a => {
        const day = formatInTimeZone(a.activity_at || a.created_date, 'America/New_York', 'yyyy-MM-dd');
        return `${a.lead_id}-${day}`;
      })
  );
  const timeframeOutreachCount = uniqueLeadDays.size;

  // Count unique lead+day combinations for conversations
  const uniqueConvoLeadDays = new Set(
    timeframeActivities
      .filter(a => a.outcome === 'conversation')
      .map(a => {
        const day = formatInTimeZone(a.activity_at || a.created_date, 'America/New_York', 'yyyy-MM-dd');
        return `${a.lead_id}-${day}`;
      })
  );
  const timeframeConversations = uniqueConvoLeadDays.size;

  // Count engagements
  const timeframeEngagements = timeframeActivities.filter(a => a.activity_type === 'engagement').length;

  // Calculate conversion rate (bookings / outreach)
  const conversionRate = timeframeOutreachCount > 0 
    ? ((timeframeBookings.length / timeframeOutreachCount) * 100).toFixed(1)
    : 0;
  
  // Calculate active reps (users who logged activities in timeframe)
  const activeReps = new Set(timeframeActivities.map(a => a.performed_by_id)).size;

  // Calculate leaderboard
  const salesUsers = users.filter(u => u.departments?.includes('sales') || u.role === 'admin');
  const userStats = salesUsers.map(u => {
    const userActivities = timeframeActivities.filter(a => a.performed_by_id === u.id);
    const userBookings = timeframeBookings.filter(b => b.booked_by_id === u.id);

    // Count unique lead+day combinations for user outreach in EST (only actual outreach activities)
    const userUniqueLeadDays = new Set(
      userActivities
        .filter(a => ['call', 'text', 'email', 'dm'].includes(a.activity_type))
        .map(a => {
          const day = formatInTimeZone(a.activity_at || a.created_date, 'America/New_York', 'yyyy-MM-dd');
          return `${a.lead_id}-${day}`;
        })
    );
    const userOutreach = userUniqueLeadDays.size;

    // Count unique lead+day combinations for user conversations in EST
    const userUniqueConvoLeadDays = new Set(
      userActivities
        .filter(a => a.outcome === 'conversation')
        .map(a => {
          const day = formatInTimeZone(a.activity_at || a.created_date, 'America/New_York', 'yyyy-MM-dd');
          return `${a.lead_id}-${day}`;
        })
    );
    const userConvos = userUniqueConvoLeadDays.size;
    
    return {
      user: u,
      bookings: userBookings.length,
      conversations: userConvos,
      outreach: userOutreach
    };
    }).sort((a, b) => {
      // Sort by bookings first, then conversations, then outreach
      if (b.bookings !== a.bookings) return b.bookings - a.bookings;
      if (b.conversations !== a.conversations) return b.conversations - a.conversations;
      return b.outreach - a.outreach;
    });

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-600 mt-2 text-sm md:text-base">Overview of all departments</p>
      </motion.div>

      {/* Sales Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            Sales Overview
          </h2>
          <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => setTimeframe('today')}
              className={cn(
                "px-2.5 md:px-3 py-1.5 md:py-1 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap",
                timeframe === 'today' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Today
            </button>
            <button
              onClick={() => setTimeframe('yesterday')}
              className={cn(
                "px-2.5 md:px-3 py-1.5 md:py-1 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap",
                timeframe === 'yesterday' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Yesterday
            </button>
            <button
              onClick={() => setTimeframe('7d')}
              className={cn(
                "px-2.5 md:px-3 py-1.5 md:py-1 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap",
                timeframe === '7d' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              7d
            </button>
            <button
              onClick={() => setTimeframe('14d')}
              className={cn(
                "px-2.5 md:px-3 py-1.5 md:py-1 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap",
                timeframe === '14d' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              14d
            </button>
            <button
              onClick={() => setTimeframe('30d')}
              className={cn(
                "px-2.5 md:px-3 py-1.5 md:py-1 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap",
                timeframe === '30d' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              MTD
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl md:rounded-2xl p-4 md:p-6 text-white"
          >
            <Phone className="w-6 h-6 md:w-8 md:h-8 opacity-80 mb-2 md:mb-3" />
            <p className="text-2xl md:text-4xl font-bold">{timeframeOutreachCount}</p>
            <p className="text-emerald-100 mt-1 text-xs md:text-sm">Total Outreach</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl md:rounded-2xl p-4 md:p-6 text-white"
          >
            <MessageCircle className="w-6 h-6 md:w-8 md:h-8 opacity-80 mb-2 md:mb-3" />
            <p className="text-2xl md:text-4xl font-bold">{timeframeConversations}</p>
            <p className="text-blue-100 mt-1 text-xs md:text-sm">Conversations</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl md:rounded-2xl p-4 md:p-6 text-white"
          >
            <Calendar className="w-6 h-6 md:w-8 md:h-8 opacity-80 mb-2 md:mb-3" />
            <p className="text-2xl md:text-4xl font-bold">{timeframeBookings.length}</p>
            <p className="text-amber-100 mt-1 text-xs md:text-sm">Bookings</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl md:rounded-2xl p-4 md:p-6 text-white"
          >
            <TrendingUp className="w-6 h-6 md:w-8 md:h-8 opacity-80 mb-2 md:mb-3" />
            <p className="text-2xl md:text-4xl font-bold">{conversionRate}%</p>
            <p className="text-cyan-100 mt-1 text-xs md:text-sm">Conversion Rate</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl md:rounded-2xl p-4 md:p-6 text-white"
          >
            <TrendingUp className="w-6 h-6 md:w-8 md:h-8 opacity-80 mb-2 md:mb-3" />
            <p className="text-2xl md:text-4xl font-bold">{timeframeEngagements}</p>
            <p className="text-purple-100 mt-1 text-xs md:text-sm">Engagements</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl md:rounded-2xl p-4 md:p-6 text-white"
          >
            <Users className="w-6 h-6 md:w-8 md:h-8 opacity-80 mb-2 md:mb-3" />
            <p className="text-2xl md:text-4xl font-bold">{activeReps}</p>
            <p className="text-slate-300 mt-1 text-xs md:text-sm">Active Reps</p>
          </motion.div>
        </div>

        {/* Activity Trend Chart and Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl border border-slate-200 p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-4 md:mb-6">Activity Trend (Last 14 Days)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={last14Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  stroke="#94a3b8"
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  stroke="#94a3b8"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="outreach" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Outreach"
                  dot={{ fill: '#10b981', r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="conversations" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Conversations"
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="bookings" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Bookings"
                  dot={{ fill: '#f59e0b', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Sidebar */}
          <div className="space-y-4 md:space-y-6">
            {/* Top Performers */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl border border-slate-200 p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-3 md:mb-4">Top Performers</h3>
              <div className="space-y-2 md:space-y-3">
                {userStats.slice(0, 10).map((stat, idx) => (
                  <div key={stat.user.id} className="flex items-center gap-2 md:gap-3">
                    <div className={cn(
                      "w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold shrink-0",
                      idx === 0 && "bg-yellow-100 text-yellow-700",
                      idx === 1 && "bg-slate-200 text-slate-700",
                      idx === 2 && "bg-orange-100 text-orange-700"
                    )}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 text-xs md:text-sm truncate">
                        {stat.user.full_name}
                      </div>
                      <div className="text-[10px] md:text-xs text-slate-500">
                        {stat.bookings} bookings • {stat.conversations} convos
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Link to={createPageUrl('Leaderboard')}>
                <Button variant="outline" className="w-full mt-3 md:mt-4 text-xs md:text-sm h-9 md:h-10">
                  <Award className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                  View Full Leaderboard
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Team Summary - Today's Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl border border-slate-200 overflow-hidden mt-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          <div className="p-4 md:p-6 border-b border-slate-100">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 md:gap-3">
                <button
                  onClick={() => setTeamProgressExpanded(!teamProgressExpanded)}
                  className="p-1.5 md:p-2 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                >
                  {teamProgressExpanded ? (
                    <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm md:text-lg font-semibold text-slate-900">
                    {progressView === 'today' ? "Today's" : 
                    progressView === 'yesterday' ? "Yesterday's" : 
                    format(new Date(selectedDate + 'T00:00:00'), 'MMM d, yyyy')} Team Progress
                  </h3>
                  <p className="text-xs md:text-sm text-slate-500 mt-0.5 md:mt-1">Individual performance vs daily goals</p>
                </div>
              </div>
              <div className="flex gap-1.5 md:gap-2 items-center flex-wrap">
                <button
                  onClick={() => setProgressView('yesterday')}
                  className={cn(
                    "px-2.5 md:px-3 py-1 rounded-lg text-xs md:text-sm font-medium transition-colors",
                    progressView === 'yesterday' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  Yesterday
                </button>
                <button
                  onClick={() => setProgressView('today')}
                  className={cn(
                    "px-2.5 md:px-3 py-1 rounded-lg text-xs md:text-sm font-medium transition-colors",
                    progressView === 'today' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  Today
                </button>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setProgressView('custom');
                  }}
                  className="w-32 md:w-40 h-8 md:h-9 text-xs md:text-sm"
                />
              </div>
            </div>
          </div>
          {teamProgressExpanded && (
            <div className="divide-y divide-slate-100">
              {salesUsers.map(u => {
              const userActivities = progressActivities.filter(a => a.performed_by_id === u.id);
              const userBookings = progressBookings.filter(b => b.booked_by_id === u.id);
              
              // Count unique outreach leads (only actual outreach activities)
              const userOutreachLeads = new Set(
                userActivities
                  .filter(a => ['call', 'text', 'email', 'dm'].includes(a.activity_type))
                  .map(a => a.lead_id)
              );
              const userOutreach = userOutreachLeads.size;
              
              // Count unique conversation leads
              const userConversationLeads = new Set(
                userActivities
                  .filter(a => a.outcome === 'conversation')
                  .map(a => a.lead_id)
              );
              const userConversations = userConversationLeads.size;
              
              // Get user's goals
              const userGoal = dailyGoals.find(g => g.user_id === u.id) || {
                outreach_goal: u.default_outreach_goal || 50,
                conversation_goal: u.default_conversation_goal || 10,
                booking_goal: u.default_booking_goal || 2
              };
              
              // Calculate percentages
              const outreachPercent = Math.min((userOutreach / userGoal.outreach_goal) * 100, 100);
              const conversationPercent = Math.min((userConversations / userGoal.conversation_goal) * 100, 100);
              const bookingPercent = Math.min((userBookings.length / userGoal.booking_goal) * 100, 100);
              
              const monthlyGoal = monthlyGoals.find(g => g.user_id === u.id);
              const monthlyTarget = monthlyGoal?.goal_type === 'onboarding' 
                ? `${monthlyGoal.onboarding_day_1_60_goal} / ${monthlyGoal.onboarding_day_61_90_goal}`
                : monthlyGoal?.standard_monthly_goal || 45;

              // Calculate current month bookings
              const currentMonthStart = formatInTimeZone(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'America/New_York', 'yyyy-MM-dd');
              const userMonthBookings = bookings.filter(b => {
                const bookDateEST = formatInTimeZone(b.booked_at || b.created_date, 'America/New_York', 'yyyy-MM-dd');
                return b.booked_by_id === u.id && bookDateEST >= currentMonthStart;
              }).length;

              return (
                <div key={u.id} className="p-3 md:p-4">
                  <div className="flex items-center gap-3 md:gap-4 mb-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium text-sm md:text-base shrink-0">
                      {u.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 text-sm md:text-base truncate">{u.full_name}</div>
                      <div className="text-[10px] md:text-xs text-slate-500">
                        Monthly: {userMonthBookings} / {monthlyGoal?.goal_type === 'onboarding' 
                          ? `${monthlyTarget} (Onboarding)` 
                          : monthlyTarget}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 md:gap-4 md:ml-14">
                    {/* Outreach */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] md:text-xs text-slate-600">Outreach</span>
                        <span className="text-[10px] md:text-xs font-medium text-slate-900">
                          {userOutreach}/{userGoal.outreach_goal}
                        </span>
                      </div>
                      <div className="h-1.5 md:h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                          style={{ width: `${outreachPercent}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Conversations */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] md:text-xs text-slate-600">Convos</span>
                        <span className="text-[10px] md:text-xs font-medium text-slate-900">
                          {userConversations}/{userGoal.conversation_goal}
                        </span>
                      </div>
                      <div className="h-1.5 md:h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                          style={{ width: `${conversationPercent}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Bookings */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] md:text-xs text-slate-600">Bookings</span>
                        <span className="text-[10px] md:text-xs font-medium text-slate-900">
                          {userBookings.length}/{userGoal.booking_goal}
                        </span>
                      </div>
                      <div className="h-1.5 md:h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500"
                          style={{ width: `${bookingPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Social Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center">
            <Video className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <h2 className="text-lg md:text-xl font-bold text-slate-900">Social Media Overview</h2>
        </div>
        <SocialStatsOverview />
      </motion.div>

      {/* Tasks Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
            <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <h2 className="text-lg md:text-xl font-bold text-slate-900">Tasks Overview (Last 30 Days)</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl md:rounded-2xl p-4 md:p-6 text-white"
          >
            <CheckCircle className="w-6 h-6 md:w-8 md:h-8 opacity-80 mb-2 md:mb-3" />
            <p className="text-2xl md:text-4xl font-bold">{completionRate}%</p>
            <p className="text-blue-100 mt-1 text-xs md:text-sm">Completion Rate</p>
            <p className="text-[10px] md:text-xs text-blue-200 mt-1">{completedPlans}/{dailyPlans.length} plans completed</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl md:rounded-2xl p-4 md:p-6 text-white"
          >
            <AlertCircle className="w-6 h-6 md:w-8 md:h-8 opacity-80 mb-2 md:mb-3" />
            <p className="text-2xl md:text-4xl font-bold">{totalRolledOverTasks}</p>
            <p className="text-amber-100 mt-1 text-xs md:text-sm">Rolled-Over Tasks</p>
            <p className="text-[10px] md:text-xs text-amber-200 mt-1">Tasks moved to next day</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl md:rounded-2xl p-4 md:p-6 text-white"
          >
            <CheckCircle className="w-6 h-6 md:w-8 md:h-8 opacity-80 mb-2 md:mb-3" />
            <p className="text-2xl md:text-4xl font-bold">{completedPlans}</p>
            <p className="text-emerald-100 mt-1 text-xs md:text-sm">Completed Plans</p>
            <p className="text-[10px] md:text-xs text-emerald-200 mt-1">Full EOD submissions</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl md:rounded-2xl p-4 md:p-6 text-white"
          >
            <Clock className="w-6 h-6 md:w-8 md:h-8 opacity-80 mb-2 md:mb-3" />
            <p className="text-2xl md:text-4xl font-bold">{incompletePlans}</p>
            <p className="text-slate-100 mt-1 text-xs md:text-sm">Incomplete Plans</p>
            <p className="text-[10px] md:text-xs text-slate-200 mt-1">Missing or partial</p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}