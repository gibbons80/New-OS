import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { Trophy, Medal, Award, TrendingUp, Phone, MessageCircle, Calendar, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function Leaderboard({ user }) {
  const [timeframe, setTimeframe] = useState('today');

  const { data: activities = [] } = useQuery({
    queryKey: ['all-activities'],
    queryFn: () => base44.entities.Activity.filter({ department: 'sales' }, '-created_date', 5000)
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['all-bookings'],
    queryFn: () => base44.entities.Booking.filter({ department: 'sales' }, '-created_date', 2000)
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const getTimeRange = () => {
    const timezone = 'America/New_York';
    const todayEST = formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');
    const nowEST = toZonedTime(new Date(), timezone);
    
    switch (timeframe) {
      case 'today':
        return { dateStr: todayEST };
      case 'yesterday':
        const yesterdayEST = new Date(nowEST);
        yesterdayEST.setDate(yesterdayEST.getDate() - 1);
        return { dateStr: formatInTimeZone(yesterdayEST, timezone, 'yyyy-MM-dd') };
      case 'week':
        const weekStart = startOfWeek(nowEST);
        const weekEnd = endOfWeek(nowEST);
        return { 
          startStr: formatInTimeZone(weekStart, timezone, 'yyyy-MM-dd'),
          endStr: formatInTimeZone(weekEnd, timezone, 'yyyy-MM-dd')
        };
      case 'month':
        const monthStart = startOfMonth(nowEST);
        const monthEnd = endOfMonth(nowEST);
        return { 
          startStr: formatInTimeZone(monthStart, timezone, 'yyyy-MM-dd'),
          endStr: formatInTimeZone(monthEnd, timezone, 'yyyy-MM-dd')
        };
      default:
        return { dateStr: todayEST };
    }
  };

  const calculateLeaderboard = () => {
    const timeRange = getTimeRange();
    const userStats = {};
    
    // Track unique outreach and conversation leads per user
    const userOutreachLeads = {};
    const userConversationLeads = {};
    const userEngagements = {};
    const userBookingPoints = {};

    // Count activities
    activities.forEach(a => {
      const actDateEST = formatInTimeZone(a.activity_at || a.created_date, 'America/New_York', 'yyyy-MM-dd');
      
      let isInRange = false;
      if (timeRange.dateStr) {
        // Today
        isInRange = actDateEST === timeRange.dateStr;
      } else {
        // Week or Month
        isInRange = actDateEST >= timeRange.startStr && actDateEST <= timeRange.endStr;
      }
      
      if (isInRange) {
        const userId = a.performed_by_id;
        if (!userStats[userId]) {
          userStats[userId] = { 
            name: a.performed_by_name || userId, 
            email: userId,
            outreach: 0, 
            conversations: 0, 
            bookings: 0,
            engagements: 0,
            bookingPoints: 0
          };
        }
        
        // Track unique outreach leads per user (only actual outreach activities)
        if (['call', 'text', 'email', 'dm'].includes(a.activity_type)) {
          if (!userOutreachLeads[userId]) {
            userOutreachLeads[userId] = new Set();
          }
          userOutreachLeads[userId].add(a.lead_id);
        }
        
        // Track unique conversation leads per user
        if (a.outcome === 'conversation') {
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

    // Count bookings
    bookings.forEach(b => {
      const bookDateEST = formatInTimeZone(b.booked_at || b.created_date, 'America/New_York', 'yyyy-MM-dd');
      
      let isInRange = false;
      if (timeRange.dateStr) {
        // Today
        isInRange = bookDateEST === timeRange.dateStr;
      } else {
        // Week or Month
        isInRange = bookDateEST >= timeRange.startStr && bookDateEST <= timeRange.endStr;
      }
      
      if (isInRange) {
        const userId = b.booked_by_id;
        if (!userStats[userId]) {
          userStats[userId] = { 
            name: b.booked_by_name || userId, 
            email: userId,
            outreach: 0, 
            conversations: 0, 
            bookings: 0,
            engagements: 0,
            bookingPoints: 0
          };
        }
        userStats[userId].bookings++;
      }
    });

    // Calculate points: bookingPoints + conversations * 15 + outreach * 2 + engagements * 1
    return Object.entries(userStats)
      .map(([userId, stats]) => {
        const userData = users.find(u => u.id === userId);
        return {
          ...stats,
          email: userData?.email || userId,
          points: (stats.bookingPoints || 0) + stats.conversations * 15 + stats.outreach * 2 + stats.engagements * 1,
          profile_photo_url: userData?.profile_photo_url
        };
      })
      .sort((a, b) => b.points - a.points);
  };

  const leaderboard = calculateLeaderboard();

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-amber-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-slate-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-orange-400" />;
    return <span className="text-lg font-bold text-slate-400">{rank}</span>;
  };

  const getRankBg = (rank) => {
    if (rank === 1) return 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200';
    if (rank === 2) return 'bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200';
    if (rank === 3) return 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200';
    return 'bg-white border-slate-200';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 p-3 md:p-0">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-4xl font-bold text-slate-900">Leaderboard</h1>
          <p className="text-sm md:text-base text-slate-600 mt-2">See how you stack up against the team</p>
        </div>
        <div className="flex items-center gap-1 md:gap-2 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          {['today', 'yesterday', 'week', 'month'].map((t) => (
            <Button
              key={t}
              variant="ghost"
              size="sm"
              onClick={() => setTimeframe(t)}
              className={cn(
                "capitalize rounded-lg text-xs md:text-sm px-2 md:px-3 whitespace-nowrap",
                timeframe === t && "bg-white shadow-sm"
              )}
            >
              {t}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-2 md:gap-4 mt-4 md:mt-8">
          {/* 2nd Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.05, y: -4 }}
            className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl md:rounded-2xl p-3 md:p-6 text-center mt-4 md:mt-8 shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            {leaderboard[1]?.profile_photo_url ? (
              <img
                src={leaderboard[1].profile_photo_url}
                alt={leaderboard[1].name}
                className="w-10 h-10 md:w-16 md:h-16 rounded-full object-cover mx-auto shadow-lg border-2 border-white"
              />
            ) : (
              <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-white mx-auto flex items-center justify-center shadow-lg">
                <span className="text-lg md:text-2xl font-bold text-slate-600">
                  {leaderboard[1]?.name?.charAt(0) || '?'}
                </span>
              </div>
            )}
            <Medal className="w-5 h-5 md:w-8 md:h-8 text-slate-400 mx-auto mt-2 md:mt-3" />
            <h3 className="font-bold text-slate-900 mt-1 md:mt-2 text-xs md:text-base truncate px-1">{leaderboard[1]?.name}</h3>
            <p className="text-lg md:text-2xl font-bold text-slate-700 mt-0.5 md:mt-1">{leaderboard[1]?.points}</p>
            <p className="text-xs md:text-sm text-slate-500">pts</p>
          </motion.div>

          {/* 1st Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.05, y: -8 }}
            className="bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl md:rounded-2xl p-3 md:p-6 text-center shadow-xl hover:shadow-2xl transition-shadow duration-300"
          >
            {leaderboard[0]?.profile_photo_url ? (
              <img
                src={leaderboard[0].profile_photo_url}
                alt={leaderboard[0].name}
                className="w-12 h-12 md:w-20 md:h-20 rounded-full object-cover mx-auto shadow-lg border-2 border-white"
              />
            ) : (
              <div className="w-12 h-12 md:w-20 md:h-20 rounded-full bg-white mx-auto flex items-center justify-center shadow-lg">
                <span className="text-xl md:text-3xl font-bold text-amber-600">
                  {leaderboard[0]?.name?.charAt(0) || '?'}
                </span>
              </div>
            )}
            <Trophy className="w-6 h-6 md:w-10 md:h-10 text-amber-500 mx-auto mt-2 md:mt-3" />
            <h3 className="font-bold text-slate-900 mt-1 md:mt-2 text-xs md:text-base truncate px-1">{leaderboard[0]?.name}</h3>
            <p className="text-xl md:text-3xl font-bold text-amber-700 mt-0.5 md:mt-1">{leaderboard[0]?.points}</p>
            <p className="text-xs md:text-sm text-slate-600">pts</p>
          </motion.div>

          {/* 3rd Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.05, y: -4 }}
            className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl md:rounded-2xl p-3 md:p-6 text-center mt-6 md:mt-12 shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            {leaderboard[2]?.profile_photo_url ? (
              <img
                src={leaderboard[2].profile_photo_url}
                alt={leaderboard[2].name}
                className="w-8 h-8 md:w-14 md:h-14 rounded-full object-cover mx-auto shadow-lg border-2 border-white"
              />
            ) : (
              <div className="w-8 h-8 md:w-14 md:h-14 rounded-full bg-white mx-auto flex items-center justify-center shadow-lg">
                <span className="text-base md:text-xl font-bold text-orange-600">
                  {leaderboard[2]?.name?.charAt(0) || '?'}
                </span>
              </div>
            )}
            <Award className="w-4 h-4 md:w-7 md:h-7 text-orange-400 mx-auto mt-2 md:mt-3" />
            <h3 className="font-bold text-slate-900 mt-1 md:mt-2 text-xs md:text-base truncate px-1">{leaderboard[2]?.name}</h3>
            <p className="text-base md:text-xl font-bold text-orange-700 mt-0.5 md:mt-1">{leaderboard[2]?.points}</p>
            <p className="text-xs md:text-sm text-slate-500">pts</p>
          </motion.div>
        </div>
      )}

      {/* Full Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl border border-slate-200 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
      >
        <div className="p-3 md:p-6 border-b border-slate-100">
          <h2 className="text-base md:text-lg font-semibold text-slate-900">Full Rankings</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {leaderboard.length === 0 ? (
            <div className="p-8 md:p-12 text-center text-slate-400">
              <TrendingUp className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm md:text-base">No activity recorded yet</p>
            </div>
          ) : (
            leaderboard.map((entry, index) => {
              const rank = index + 1;
              const isCurrentUser = entry.email === user?.email;
              return (
                <motion.div
                  key={entry.email}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    "flex items-center gap-2 md:gap-4 p-3 md:p-4 transition-colors",
                    isCurrentUser && "bg-emerald-50",
                    !isCurrentUser && "hover:bg-slate-50"
                  )}
                >
                  <div className="w-6 h-6 md:w-10 md:h-10 flex items-center justify-center shrink-0">
                    {rank <= 3 ? (
                      <div className="scale-75 md:scale-100">
                        {getRankIcon(rank)}
                      </div>
                    ) : (
                      <span className="text-sm md:text-lg font-bold text-slate-400">{rank}</span>
                    )}
                  </div>
                  {entry.profile_photo_url ? (
                    <img
                      src={entry.profile_photo_url}
                      alt={entry.name}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium text-base md:text-lg shrink-0">
                      {entry.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm md:text-base truncate">
                      {entry.name}
                      {isCurrentUser && <span className="text-emerald-600 ml-1 md:ml-2">(You)</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-0.5 md:mt-1 text-xs md:text-sm text-slate-500">
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <Phone className="w-3 h-3" />
                        <span className="hidden sm:inline">{entry.outreach} outreach</span>
                        <span className="sm:hidden">{entry.outreach}</span>
                      </span>
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <MessageCircle className="w-3 h-3" />
                        <span className="hidden sm:inline">{entry.conversations} convos</span>
                        <span className="sm:hidden">{entry.conversations}</span>
                      </span>
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <Calendar className="w-3 h-3" />
                        <span className="hidden sm:inline">{entry.bookings} bookings</span>
                        <span className="sm:hidden">{entry.bookings}</span>
                      </span>
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <Heart className="w-3 h-3" />
                        <span className="hidden sm:inline">{entry.engagements} engage</span>
                        <span className="sm:hidden">{entry.engagements}</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg md:text-2xl font-bold text-slate-900">{entry.points}</div>
                    <div className="text-xs text-slate-400 hidden md:block">points</div>
                    <div className="text-xs text-slate-400 md:hidden">pts</div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>

      {/* Points Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl border border-slate-200 p-4 md:p-6 shadow-lg"
      >
        <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-3">How Points Are Calculated</h3>
        <div className="text-xs md:text-sm text-slate-600 space-y-2">
          <div className="flex justify-between items-center">
            <span>Paid Booking</span>
            <span className="font-semibold text-slate-900">150 pts</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Free + Paid Booking</span>
            <span className="font-semibold text-slate-900">125 pts</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Free Booking</span>
            <span className="font-semibold text-slate-900">100 pts</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Conversation</span>
            <span className="font-semibold text-slate-900">15 pts</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Outreach</span>
            <span className="font-semibold text-slate-900">2 pts</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Engagement</span>
            <span className="font-semibold text-slate-900">1 pt</span>
          </div>
        </div>
      </motion.div>
      </div>
      );
      }