import { differenceInDays, addDays, format } from 'date-fns';

export const calculateLeadActions = (lead, activities, bookings, tasks, today) => {
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

  const leadCreatedDate = new Date(lead.created_date);
  const lastActivityDate = getLastActivityDate(lead.id);
  const daysSinceCreation = differenceInDays(todayJsDate, leadCreatedDate);
  const daysSinceLastActivity = lastActivityDate 
    ? differenceInDays(todayJsDate, lastActivityDate) 
    : daysSinceCreation;

  // Skip if lead is lost
  if (lead.status === 'lost') return actions;

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
          action: 'Engage (Booked Client)',
          type: 'engagement',
          dueDate: todayDate,
          urgency: 'low'
        });
      }
    } else if (lastConversationDate) {
      // After conversation: engage every other day until booking
      const daysSinceLastEng = lastEngagementDate ? differenceInDays(todayJsDate, lastEngagementDate) : 2;
      if (daysSinceLastEng >= 2 && !engagementTodayExists) {
        actions.push({
          id: `engage-${lead.id}-convo`,
          action: 'Every Other Day Engagement',
          type: 'engagement',
          dueDate: todayDate,
          urgency: 'medium'
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
            action: 'Daily Engagement (Post-Contact)',
            type: 'engagement',
            dueDate: todayDate,
            urgency: 'medium'
          });
        }
      }
    } else {
      // Not contacted yet: engage every day
      const daysSinceLastEng = lastEngagementDate ? differenceInDays(todayJsDate, lastEngagementDate) : 1;
      if (daysSinceLastEng >= 1 && !engagementTodayExists) {
        actions.push({
          id: `engage-${lead.id}-new`,
          action: 'Daily Engagement (New Lead)',
          type: 'engagement',
          dueDate: todayDate,
          urgency: 'high'
        });
      }
    }
  }

  // DM Leads (social_media source)
  if (lead.lead_source === 'social_media' && lead.status !== 'won') {
    const firstDMDate = getFirstDMDate(lead.id);

    // DM Follow-ups (from initial DM)
    if (firstDMDate) {
      const daysSinceFirstDM = differenceInDays(todayJsDate, firstDMDate);
      
      if (daysSinceFirstDM >= 30) {
        actions.push({
          id: `dm-${lead.id}-day30`,
          action: 'DM Follow-up (Day 30)',
          type: 'dm',
          dueDate: addDays(firstDMDate, 30),
          urgency: 'high'
        });
      } else if (daysSinceFirstDM >= 14) {
        actions.push({
          id: `dm-${lead.id}-day14`,
          action: 'DM Follow-up (Day 14)',
          type: 'dm',
          dueDate: addDays(firstDMDate, 14),
          urgency: 'medium'
        });
      } else if (daysSinceFirstDM >= 3) {
        actions.push({
          id: `dm-${lead.id}-day3`,
          action: 'DM Follow-up (Day 3)',
          type: 'dm',
          dueDate: addDays(firstDMDate, 3),
          urgency: 'low'
        });
      }
    }
  }

  // Cold Call Leads
  if (lead.lead_source === 'cold_outreach' && lead.status !== 'won') {
    if (daysSinceLastActivity >= 4) {
      actions.push({
        id: `cold-${lead.id}-day4`,
        action: 'Cold Call Follow-up (Day 4)',
        type: 'call',
        dueDate: addDays(lastActivityDate || leadCreatedDate, 4),
        urgency: 'high'
      });
    } else if (daysSinceLastActivity >= 2) {
      actions.push({
        id: `cold-${lead.id}-day2`,
        action: 'Cold Call Follow-up (Day 2)',
        type: 'call',
        dueDate: addDays(lastActivityDate || leadCreatedDate, 2),
        urgency: 'medium'
      });
    } else if (daysSinceCreation >= 0 && !lastActivityDate) {
      actions.push({
        id: `cold-${lead.id}-initial`,
        action: 'Initial Cold Call',
        type: 'call',
        dueDate: leadCreatedDate,
        urgency: 'high'
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

    // Check if there's been a conversation after this booking
    const conversationAfterBooking = activities
      .filter(a => a.lead_id === lead.id && a.outcome === 'conversation')
      .some(a => new Date(a.created_date) > bookingDate);

    if (!conversationAfterBooking) {
      if (daysSinceBooking >= 7) {
        actions.push({
          id: `checkin-${lead.id}-day7`,
          action: 'Post-Booking Check-in (Day 7)',
          type: 'call',
          dueDate: addDays(bookingDate, 7),
          urgency: 'medium'
        });
      } else if (daysSinceBooking >= 3) {
        actions.push({
          id: `checkin-${lead.id}-day3`,
          action: 'Post-Booking Check-in (Day 3)',
          type: 'call',
          dueDate: addDays(bookingDate, 3),
          urgency: 'low'
        });
      }
    }
  }

  // Repeat booking outreach
  if (leadBookings.length >= 1) {
    const lastBooking = leadBookings[0];
    const lastBookingDate = new Date(lastBooking.booked_at || lastBooking.created_date);
    const daysSinceLastBooking = differenceInDays(todayJsDate, lastBookingDate);

    // Check if there's been a conversation after this booking
    const conversationAfterBooking = activities
      .filter(a => a.lead_id === lead.id && a.outcome === 'conversation')
      .some(a => new Date(a.created_date) > lastBookingDate);

    if (!conversationAfterBooking) {
      if (daysSinceLastBooking >= 60) {
        actions.push({
          id: `repeat-${lead.id}-day60`,
          action: 'Repeat Booking Outreach (Day 60)',
          type: 'call',
          dueDate: addDays(lastBookingDate, 60),
          urgency: 'high'
        });
      } else if (daysSinceLastBooking >= 30) {
        actions.push({
          id: `repeat-${lead.id}-day30`,
          action: 'Repeat Booking Outreach (Day 30)',
          type: 'call',
          dueDate: addDays(lastBookingDate, 30),
          urgency: 'medium'
        });
      }
    }
  }

  // Add manual follow-ups from tasks
  tasks
    .filter(t => t.status === 'open' && t.related_to_type === 'lead' && t.related_to_id === lead.id)
    .forEach(task => {
      // Skip if this is a "Daily Engagement" task (we already have auto-generated engagement actions)
      if (task.title?.toLowerCase().includes('daily engagement') && !task.title?.toLowerCase().includes('(')) {
        return;
      }
      
      const dueDate = task.due_date ? new Date(task.due_date) : new Date();
      const isOverdue = differenceInDays(todayJsDate, dueDate) > 0;
      
      actions.push({
        id: task.id,
        taskId: task.id,
        action: task.title,
        type: 'manual',
        dueDate: dueDate,
        urgency: task.priority || (isOverdue ? 'high' : 'medium'),
        task: task
      });
    });

  // Sort by urgency and due date
  const urgencyOrder = { high: 0, medium: 1, low: 2 };
  return actions.sort((a, b) => {
    if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    }
    return a.dueDate.getTime() - b.dueDate.getTime();
  });
};