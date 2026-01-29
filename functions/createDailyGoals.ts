/**
 * Creates daily goals for all sales users based on their default goals
 * This function should be scheduled to run daily (e.g., at midnight)
 */

import { base44 } from '@/api/base44Client';

export default async function createDailyGoals() {
  const today = new Date().toISOString().split('T')[0];
  
  // Get all users with sales department access
  const users = await base44.entities.User.list();
  const salesUsers = users.filter(u => 
    u.departments?.includes('sales') || u.role === 'admin'
  );
  
  for (const user of salesUsers) {
    // Check if goal already exists for today
    const existingGoals = await base44.entities.DailyGoal.filter({
      user_id: user.id,
      date: today
    });
    
    // Only create if doesn't exist
    if (existingGoals.length === 0) {
      await base44.entities.DailyGoal.create({
        user_id: user.id,
        user_name: user.full_name,
        date: today,
        outreach_goal: user.default_outreach_goal || 100,
        conversation_goal: user.default_conversation_goal || 25,
        booking_goal: user.default_booking_goal || 2,
        department: 'sales'
      });
    }
  }
  
  return { success: true, date: today };
}