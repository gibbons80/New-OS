import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  CheckCircle2, 
  ChevronRight, 
  Clock,
  Phone,
  MessageSquare,
  Calendar,
  Repeat,
  AlertCircle,
  Instagram,
  Facebook,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays, addDays, startOfDay } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import LeadDetailPanel from './LeadDetailPanel';

export default function NextBestActions({ leads, activities, bookings, tasks, userId, userEmail, user, today }) {
  const queryClient = useQueryClient();
  const [completingId, setCompletingId] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState(null);

  // Fetch NBA rules configuration
  const { data: nbaRules = [] } = useQuery({
    queryKey: ['nba-rules'],
    queryFn: () => base44.entities.AppSetting.filter({ 
      setting_type: 'next_best_actions' 
    })
  });

  const completeActionMutation = useMutation({
    mutationFn: async ({ actionId, leadId, leadName }) => {
      // For manual tasks, mark as done
      if (actionId && actionId.startsWith('task-')) {
        const taskId = actionId.replace('task-', '');
        await base44.entities.Task.update(taskId, {
          status: 'done'
        });
      }
      // For engagement tasks, log the activity
      else if (actionId && actionId.startsWith('engage-')) {
        const todayEST = formatInTimeZone(new Date(), 'America/New_York', 'yyyy-MM-dd');
        const offset = formatInTimeZone(new Date(), 'America/New_York', 'XXX');
        const activityTimestamp = new Date(`${todayEST}T12:00:00${offset}`).toISOString();
        await base44.entities.Activity.create({
          lead_id: leadId,
          lead_name: leadName,
          activity_type: 'engagement',
          outcome: 'no_response',
          notes: 'Daily engagement completed',
          performed_by_id: userId,
          performed_by_name: userEmail,
          department: 'sales',
          activity_at: activityTimestamp
        });
      }
    },
    onSuccess: async () => {
      setCompletingId(null);
      await queryClient.refetchQueries({ queryKey: ['my-tasks'] });
      await queryClient.refetchQueries({ queryKey: ['activities'] });
      await queryClient.refetchQueries({ queryKey: ['leads'] });
      await queryClient.refetchQueries({ queryKey: ['bookings'] });
    }
  });

  const handleComplete = (action, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCompletingId(action.id);
    completeActionMutation.mutate({
      actionId: action.id,
      leadId: action.leadId,
      leadName: action.leadName
    });
  };

  const calculateActions = useCallback(() => {
    const actions = [];
    const todayDate = new Date(today);
    const todayJsDate = new Date();

    // Helper: Get last activity date for a lead
    const getLastActivityDate = (leadId) => {
      const leadActivities = activities
        .filter(a => a.lead_id === leadId)
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      return leadActivities[0] ? new Date(leadActivities[0].created_date) : null;
    };

    // Helper: Get first DM activity date
    const getFirstDMDate = (leadId) => {
      const firstDM = activities
        .filter(a => a.lead_id === leadId && a.activity_type === 'dm')
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      return firstDM[0] ? new Date(firstDM[0].created_date) : null;
    };

    // Helper: Get last conversation activity date
    const getLastConversationDate = (leadId) => {
      const lastConvo = activities
        .filter(a => a.lead_id === leadId && a.outcome === 'conversation')
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      return lastConvo[0] ? new Date(lastConvo[0].created_date) : null;
    };

    // Process each lead
    leads.forEach(lead => {
      // Skip if lead doesn't belong to the current user
      if (lead.owner_id !== userId && lead.reassigned_owner_id !== userId) return;

      const leadCreatedDate = new Date(lead.created_date);
      const lastActivityDate = getLastActivityDate(lead.id);
      const daysSinceCreation = differenceInDays(todayJsDate, leadCreatedDate);
      const daysSinceLastActivity = lastActivityDate 
        ? differenceInDays(todayJsDate, lastActivityDate) 
        : daysSinceCreation;

      // Skip if lead is lost
      if (lead.status === 'lost') return;

      // Store lead social links for engagement tasks
      const leadSocialLinks = {
        instagram: lead.instagram_link,
        facebook: lead.facebook_link
      };

      // Engagement Logic for New/Engaged Leads (only if they have social media)
      if ((lead.status === 'new' || lead.status === 'engaged') && lead.status !== 'won' && lead.status !== 'lost' && (lead.instagram_link || lead.facebook_link)) {
        const hasBooked = bookings.some(b => b.lead_id === lead.id);
        const lastConversationDate = getLastConversationDate(lead.id);
        const hasContacted = activities.some(a => a.lead_id === lead.id && ['call', 'text', 'email', 'dm'].includes(a.activity_type));
        
        // Get last engagement date
        const lastEngagement = activities
          .filter(a => a.lead_id === lead.id && a.activity_type === 'engagement')
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
        const lastEngagementDate = lastEngagement ? new Date(lastEngagement.created_date) : null;
        
        // Check if engagement was logged today
        const engagementTodayExists = activities.some(a => 
          a.lead_id === lead.id && 
          a.activity_type === 'engagement' && 
          format(new Date(a.created_date), 'yyyy-MM-dd') === today
        );
        
        // Get first contact date
        const firstContact = activities
          .filter(a => a.lead_id === lead.id && ['call', 'text', 'email', 'dm'].includes(a.activity_type))
          .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))[0];
        const firstContactDate = firstContact ? new Date(firstContact.created_date) : null;
        
        if (hasBooked) {
          // After booking: engage every 5 days
          const daysSinceLastEng = lastEngagementDate ? differenceInDays(todayJsDate, lastEngagementDate) : 5;
          if (daysSinceLastEng >= 5 && !engagementTodayExists) {
            actions.push({
              id: `engage-${lead.id}-booked`,
              leadId: lead.id,
              leadName: lead.name || lead.phone,
              action: 'Engage (Booked Client)',
              type: 'engagement',
              dueDate: todayDate,
              urgency: 'low',
              icon: MessageSquare,
              color: 'emerald',
              socialLinks: leadSocialLinks
            });
          }
        } else if (lastConversationDate) {
          // After conversation: engage every other day until booking
          const daysSinceLastEng = lastEngagementDate ? differenceInDays(todayJsDate, lastEngagementDate) : 2;
          if (daysSinceLastEng >= 2 && !engagementTodayExists) {
            actions.push({
              id: `engage-${lead.id}-convo`,
              leadId: lead.id,
              leadName: lead.name || lead.phone,
              action: 'Every Other Day Engagement',
              type: 'engagement',
              dueDate: todayDate,
              urgency: 'medium',
              icon: MessageSquare,
              color: 'amber',
              socialLinks: leadSocialLinks
            });
          }
        } else if (hasContacted && firstContactDate) {
          // After contacted: 5 more days of daily engagement OR until conversation
          const daysSinceContact = differenceInDays(todayJsDate, firstContactDate);
          if (daysSinceContact <= 5) {
            const daysSinceLastEng = lastEngagementDate ? differenceInDays(todayJsDate, lastEngagementDate) : 1;
            if (daysSinceLastEng >= 1 && !engagementTodayExists) {
              actions.push({
                id: `engage-${lead.id}-contacted`,
                leadId: lead.id,
                leadName: lead.name || lead.phone,
                action: 'Daily Engagement (Post-Contact)',
                type: 'engagement',
                dueDate: todayDate,
                urgency: 'medium',
                icon: MessageSquare,
                color: 'orange',
                socialLinks: leadSocialLinks
              });
            }
          }
        } else {
          // Not contacted yet: engage every day
          const daysSinceLastEng = lastEngagementDate ? differenceInDays(todayJsDate, lastEngagementDate) : 1;
          if (daysSinceLastEng >= 1 && !engagementTodayExists) {
            actions.push({
              id: `engage-${lead.id}-new`,
              leadId: lead.id,
              leadName: lead.name || lead.phone,
              action: 'Daily Engagement (New Lead)',
              type: 'engagement',
              dueDate: todayDate,
              urgency: 'high',
              icon: MessageSquare,
              color: 'purple',
              socialLinks: leadSocialLinks
            });
          }
        }
      }

      // DM Leads (social_media source)
      if (lead.lead_source === 'social_media' && lead.status !== 'won') {
        const firstDMDate = getFirstDMDate(lead.id);
        const lastConversationDate = getLastConversationDate(lead.id);
        const hasBooked = bookings.some(b => b.lead_id === lead.id);

        // DM Follow-ups (from initial DM)
        if (firstDMDate) {
          const daysSinceFirstDM = differenceInDays(todayJsDate, firstDMDate);
          
          // Helper to check if action should be shown based on completion criteria
          const shouldShowDMAction = (daysThreshold, actionLabel) => {
            if (daysSinceFirstDM < daysThreshold) return false;
            
            // Find the NBA rule configuration for this specific action
            const ruleConfig = nbaRules.find(r => 
              r.label === actionLabel && r.is_active
            );
            
            const completionCriteria = ruleConfig?.config?.completion_criteria || 'any_outreach';
            
            // Check if completion criteria is met
            const activitiesAfterFirstDM = activities.filter(a => 
              a.lead_id === lead.id && 
              new Date(a.created_date) > firstDMDate
            );
            
            if (completionCriteria === 'any_outreach') {
              return !activitiesAfterFirstDM.some(a => 
                ['call', 'text', 'email', 'dm'].includes(a.activity_type)
              );
            } else if (completionCriteria === 'engagement') {
              return !activitiesAfterFirstDM.some(a => 
                a.activity_type === 'engagement'
              );
            } else if (completionCriteria === 'conversation') {
              return !activitiesAfterFirstDM.some(a => 
                a.outcome === 'conversation'
              );
            } else if (completionCriteria === 'booking') {
              return !bookings.some(b => 
                b.lead_id === lead.id && 
                new Date(b.created_date) > firstDMDate
              );
            }
            
            // Default: only hide if subsequent DM exists
            return !activitiesAfterFirstDM.some(a => a.activity_type === 'dm');
          };
          
          if (shouldShowDMAction(30, 'DM Follow-up (Day 30)')) {
            actions.push({
              id: `dm-${lead.id}-day30`,
              leadId: lead.id,
              leadName: lead.name || lead.phone,
              action: 'DM Follow-up (Day 30)',
              type: 'dm',
              dueDate: addDays(firstDMDate, 30),
              urgency: 'high',
              icon: MessageSquare,
              color: 'purple',
              socialLinks: leadSocialLinks
            });
          } else if (shouldShowDMAction(14, 'DM Follow-up (Day 14)')) {
            actions.push({
              id: `dm-${lead.id}-day14`,
              leadId: lead.id,
              leadName: lead.name || lead.phone,
              action: 'DM Follow-up (Day 14)',
              type: 'dm',
              dueDate: addDays(firstDMDate, 14),
              urgency: 'medium',
              icon: MessageSquare,
              color: 'purple',
              socialLinks: leadSocialLinks
            });
          } else if (shouldShowDMAction(3, 'DM Follow-up (Day 3)')) {
            actions.push({
              id: `dm-${lead.id}-day3`,
              leadId: lead.id,
              leadName: lead.name || lead.phone,
              action: 'DM Follow-up (Day 3)',
              type: 'dm',
              dueDate: addDays(firstDMDate, 3),
              urgency: 'low',
              icon: MessageSquare,
              color: 'purple',
              socialLinks: leadSocialLinks
            });
          }
        }
      }

      // Cold Call Leads
      if (lead.lead_source === 'cold_outreach' && lead.status !== 'won') {
        if (daysSinceLastActivity >= 4) {
          actions.push({
            id: `cold-${lead.id}-day4`,
            leadId: lead.id,
            leadName: lead.name || lead.phone,
            action: 'Cold Call Follow-up (Day 4)',
            type: 'call',
            dueDate: addDays(lastActivityDate || leadCreatedDate, 4),
            urgency: 'high',
            icon: Phone,
            color: 'blue',
            socialLinks: leadSocialLinks
          });
        } else if (daysSinceLastActivity >= 2) {
          actions.push({
            id: `cold-${lead.id}-day2`,
            leadId: lead.id,
            leadName: lead.name || lead.phone,
            action: 'Cold Call Follow-up (Day 2)',
            type: 'call',
            dueDate: addDays(lastActivityDate || leadCreatedDate, 2),
            urgency: 'medium',
            icon: Phone,
            color: 'blue',
            socialLinks: leadSocialLinks
          });
        } else if (daysSinceCreation >= 0 && !lastActivityDate) {
          actions.push({
            id: `cold-${lead.id}-initial`,
            leadId: lead.id,
            leadName: lead.name || lead.phone,
            action: 'Initial Cold Call',
            type: 'call',
            dueDate: leadCreatedDate,
            urgency: 'high',
            icon: Phone,
            color: 'blue',
            socialLinks: leadSocialLinks
          });
        }
      }

      // First-time booking check-ins
      const leadBookings = bookings
        .filter(b => b.lead_id === lead.id)
        .sort((a, b) => new Date(b.booked_at || b.created_date) - new Date(a.booked_at || a.created_date));

      if (leadBookings.length === 1) {
        const bookingDate = new Date(leadBookings[0].booked_at || leadBookings[0].created_date);
        const daysSinceBooking = differenceInDays(todayJsDate, bookingDate);

        // Check if there's been any outreach activity after this booking
        const outreachAfterBooking = activities
          .filter(a => a.lead_id === lead.id && ['call', 'text', 'email', 'dm'].includes(a.activity_type))
          .some(a => new Date(a.created_date) > bookingDate);

        if (!outreachAfterBooking) {
          if (daysSinceBooking >= 7) {
            actions.push({
              id: `checkin-${lead.id}-day7`,
              leadId: lead.id,
              leadName: lead.name || lead.phone,
              action: 'Post-Booking Check-in (Day 7)',
              type: 'call',
              dueDate: addDays(bookingDate, 7),
              urgency: 'medium',
              icon: Calendar,
              color: 'emerald',
              socialLinks: leadSocialLinks
            });
          } else if (daysSinceBooking >= 3) {
            actions.push({
              id: `checkin-${lead.id}-day3`,
              leadId: lead.id,
              leadName: lead.name || lead.phone,
              action: 'Post-Booking Check-in (Day 3)',
              type: 'call',
              dueDate: addDays(bookingDate, 3),
              urgency: 'low',
              icon: Calendar,
              color: 'emerald',
              socialLinks: leadSocialLinks
            });
          }
        }
      }

      // Repeat booking outreach
      if (leadBookings.length >= 1) {
        const lastBooking = leadBookings[0];
        const lastBookingDate = new Date(lastBooking.booked_at || lastBooking.created_date);
        const daysSinceLastBooking = differenceInDays(todayJsDate, lastBookingDate);

        // Check if there's been any outreach activity after this booking
        const outreachAfterBooking = activities
          .filter(a => a.lead_id === lead.id && ['call', 'text', 'email', 'dm'].includes(a.activity_type))
          .some(a => new Date(a.created_date) > lastBookingDate);

        if (!outreachAfterBooking) {
          if (daysSinceLastBooking >= 60) {
            actions.push({
              id: `repeat-${lead.id}-day60`,
              leadId: lead.id,
              leadName: lead.name || lead.phone,
              action: 'Repeat Booking Outreach (Day 60)',
              type: 'call',
              dueDate: addDays(lastBookingDate, 60),
              urgency: 'high',
              icon: Repeat,
              color: 'amber',
              socialLinks: leadSocialLinks
            });
          } else if (daysSinceLastBooking >= 30) {
            actions.push({
              id: `repeat-${lead.id}-day30`,
              leadId: lead.id,
              leadName: lead.name || lead.phone,
              action: 'Repeat Booking Outreach (Day 30)',
              type: 'call',
              dueDate: addDays(lastBookingDate, 30),
              urgency: 'medium',
              icon: Repeat,
              color: 'amber',
              socialLinks: leadSocialLinks
            });
          }
        }
      }
    });

    // Add manual follow-ups from tasks (only for current user)
    tasks
      .filter(t => t.status === 'open' && t.related_to_type === 'lead' && t.owner_id === userId)
      .forEach(task => {
        // Skip if this is a "Daily Engagement" task (we already have auto-generated engagement actions)
        if (task.title?.toLowerCase().includes('daily engagement') && !task.title?.toLowerCase().includes('(')) {
          return;
        }
        
        const dueDate = task.due_date ? new Date(task.due_date) : new Date();
        const isOverdue = differenceInDays(todayJsDate, dueDate) > 0;
        
        // Find the lead to get social links
        const taskLead = leads.find(l => l.id === task.related_to_id);
        const taskLeadSocialLinks = taskLead ? {
          instagram: taskLead.instagram_link,
          facebook: taskLead.facebook_link
        } : null;
        
        actions.push({
          id: `task-${task.id}`,
          leadId: task.related_to_id,
          leadName: task.related_to_name,
          action: task.title,
          type: 'manual',
          dueDate: dueDate,
          urgency: isOverdue ? 'high' : 'low',
          icon: AlertCircle,
          color: 'slate',
          socialLinks: taskLeadSocialLinks
        });
      });

    // Sort by urgency and due date
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    return actions
      .sort((a, b) => {
        if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
          return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        }
        return a.dueDate.getTime() - b.dueDate.getTime();
      })
      .slice(0, 10); // Show top 10
  }, [leads, activities, bookings, tasks, today]);

  const actionItems = useMemo(() => {
    return calculateActions();
  }, [calculateActions]);

  const urgencyColors = {
    high: 'bg-red-50 border-red-200 text-red-700',
    medium: 'bg-amber-50 border-amber-200 text-amber-700',
    low: 'bg-slate-50 border-slate-200 text-slate-700'
  };

  const iconColors = {
    emerald: 'text-emerald-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    amber: 'text-amber-600',
    slate: 'text-slate-600',
    orange: 'text-orange-600'
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base md:text-lg font-semibold text-slate-900">Next Best Actions</h3>
            <p className="text-xs md:text-sm text-slate-500 mt-1 hidden sm:block">Prioritized follow-ups for today</p>
          </div>
          <Button
            onClick={() => {
              const event = new CustomEvent('openNewLead');
              window.dispatchEvent(event);
            }}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Lead
          </Button>
        </div>
        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
          <AnimatePresence>
          {actionItems.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>All caught up! No pending actions.</p>
            </div>
          ) : (
            actionItems.map((action) => {
              const Icon = action.icon;
              const isCompleting = completingId === action.id;

              return (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-3 md:p-4 hover:bg-slate-50 transition-colors"
                  >
                  <div 
                    onClick={() => setSelectedLeadId(action.leadId)} 
                    className="flex items-center gap-2 md:gap-4 cursor-pointer w-full"
                  >
                    <div className={cn(
                      "w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0",
                      urgencyColors[action.urgency]
                    )}>
                      <Icon className={cn("w-4 h-4 md:w-5 md:h-5", iconColors[action.color])} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm md:text-base font-medium text-slate-900 truncate">
                        {action.action}
                      </div>
                      {action.leadName && (
                        <div className="text-xs text-slate-500">
                          {action.leadName}
                        </div>
                      )}
                      <div className="text-xs md:text-sm text-slate-500 flex items-center gap-2 flex-wrap">
                        {action.urgency === 'high' && (
                          <span className="text-red-600 text-xs font-medium">Urgent</span>
                        )}
                      </div>
                      {action.socialLinks && (action.socialLinks.instagram || action.socialLinks.facebook) && (
                        <div className="flex items-center gap-1 md:gap-2 mt-2" onClick={(e) => e.preventDefault()}>
                          {action.socialLinks.instagram && (
                            <a
                              href={action.socialLinks.instagram}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 bg-pink-50 text-pink-600 rounded text-xs hover:bg-pink-100 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Instagram className="w-3 h-3" />
                              Instagram
                            </a>
                          )}
                          {action.socialLinks.facebook && (
                            <a
                              href={action.socialLinks.facebook}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Facebook className="w-3 h-3" />
                              Facebook
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {(action.type === 'manual' || action.type === 'engagement') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => handleComplete(action, e)}
                          disabled={isCompleting || completeActionMutation.isPending}
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 w-8 p-0"
                        >
                          {isCompleting ? (
                            <Clock className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>

    {/* Lead Detail Panel */}
    <AnimatePresence>
      {selectedLeadId && (
        <LeadDetailPanel
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          user={user}
        />
      )}
    </AnimatePresence>
    </>
  );
}