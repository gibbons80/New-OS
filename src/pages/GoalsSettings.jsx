import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import { Target, Save, Users, Calendar } from 'lucide-react';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function GoalsSettings({ user }) {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState('all');
  const [goals, setGoals] = useState({
    outreach_goal: 100,
    conversation_goal: 25,
    booking_goal: 2
  });
  const [monthlyGoal, setMonthlyGoal] = useState({
    goal_type: 'standard',
    onboarding_day_1_60_goal: 30,
    onboarding_day_61_90_goal: 30,
    standard_monthly_goal: 45
  });
  const [startDate, setStartDate] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const salesUsers = users.filter(u => 
    u.departments?.includes('sales') || u.role === 'admin'
  );

  const { data: monthlyGoals = [] } = useQuery({
    queryKey: ['monthlyGoals'],
    queryFn: () => base44.entities.MonthlyGoal.filter({ department: 'sales' })
  });

  const updateUserGoalsMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.User.update(data.userId, {
        default_outreach_goal: data.outreach_goal,
        default_conversation_goal: data.conversation_goal,
        default_booking_goal: data.booking_goal,
        start_date: data.start_date
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const updateMonthlyGoalMutation = useMutation({
    mutationFn: async (data) => {
      const existingGoal = monthlyGoals.find(g => g.user_id === data.userId);
      if (existingGoal) {
        return base44.entities.MonthlyGoal.update(existingGoal.id, {
          goal_type: data.goal_type,
          onboarding_day_1_60_goal: data.onboarding_day_1_60_goal,
          onboarding_day_61_90_goal: data.onboarding_day_61_90_goal,
          standard_monthly_goal: data.standard_monthly_goal
        });
      } else {
        return base44.entities.MonthlyGoal.create({
          user_id: data.userId,
          user_name: data.userName,
          goal_type: data.goal_type,
          onboarding_day_1_60_goal: data.onboarding_day_1_60_goal,
          onboarding_day_61_90_goal: data.onboarding_day_61_90_goal,
          standard_monthly_goal: data.standard_monthly_goal,
          department: 'sales'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyGoals'] });
    }
  });

  const handleSetGoals = async () => {
    const selectedUserData = salesUsers.find(u => u.id === selectedUser);
    
    if (selectedUser === 'all') {
      // Set for all sales users
      for (const u of salesUsers) {
        await updateUserGoalsMutation.mutateAsync({
          userId: u.id,
          outreach_goal: goals.outreach_goal,
          conversation_goal: goals.conversation_goal,
          booking_goal: goals.booking_goal,
          start_date: startDate || u.start_date
        });
        await updateMonthlyGoalMutation.mutateAsync({
          userId: u.id,
          userName: u.full_name,
          goal_type: monthlyGoal.goal_type,
          onboarding_day_1_60_goal: monthlyGoal.onboarding_day_1_60_goal,
          onboarding_day_61_90_goal: monthlyGoal.onboarding_day_61_90_goal,
          standard_monthly_goal: monthlyGoal.standard_monthly_goal
        });
      }
    } else {
      await updateUserGoalsMutation.mutateAsync({
        userId: selectedUser,
        outreach_goal: goals.outreach_goal,
        conversation_goal: goals.conversation_goal,
        booking_goal: goals.booking_goal,
        start_date: startDate
      });
      await updateMonthlyGoalMutation.mutateAsync({
        userId: selectedUser,
        userName: selectedUserData?.full_name,
        goal_type: monthlyGoal.goal_type,
        onboarding_day_1_60_goal: monthlyGoal.onboarding_day_1_60_goal,
        onboarding_day_61_90_goal: monthlyGoal.onboarding_day_61_90_goal,
        standard_monthly_goal: monthlyGoal.standard_monthly_goal
      });
    }
  };

  // Update goal inputs when user selection changes
  useEffect(() => {
    if (selectedUser !== 'all') {
      const selectedUserData = salesUsers.find(u => u.id === selectedUser);
      const userMonthlyGoal = monthlyGoals.find(g => g.user_id === selectedUser);
      
      if (selectedUserData) {
        setGoals({
          outreach_goal: selectedUserData.default_outreach_goal || 100,
          conversation_goal: selectedUserData.default_conversation_goal || 25,
          booking_goal: selectedUserData.default_booking_goal || 2
        });
        setStartDate(selectedUserData.start_date || '');
        
        // Determine goal type based on start date
        const daysFromStart = selectedUserData.start_date 
          ? differenceInDays(new Date(), new Date(selectedUserData.start_date))
          : 999;
        
        if (userMonthlyGoal) {
          setMonthlyGoal({
            goal_type: userMonthlyGoal.goal_type,
            onboarding_day_1_60_goal: userMonthlyGoal.onboarding_day_1_60_goal || 30,
            onboarding_day_61_90_goal: userMonthlyGoal.onboarding_day_61_90_goal || 30,
            standard_monthly_goal: userMonthlyGoal.standard_monthly_goal || 45
          });
        } else {
          setMonthlyGoal({
            goal_type: daysFromStart <= 90 ? 'onboarding' : 'standard',
            onboarding_day_1_60_goal: 30,
            onboarding_day_61_90_goal: 30,
            standard_monthly_goal: 45
          });
        }
      }
    } else {
      setGoals({
        outreach_goal: 100,
        conversation_goal: 25,
        booking_goal: 2
      });
      setStartDate('');
      setMonthlyGoal({
        goal_type: 'standard',
        onboarding_day_1_60_goal: 30,
        onboarding_day_61_90_goal: 30,
        standard_monthly_goal: 45
      });
    }
  }, [selectedUser]);

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 p-4 md:p-0">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Daily Goals</h1>
        <p className="text-slate-600 mt-2">Set default daily targets for your sales team</p>
      </motion.div>

      {/* Goal Setting Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
      >
        <div className="p-4 md:p-6 border-b border-slate-100">
          <h2 className="text-base md:text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600" />
            Set Goals
          </h2>
        </div>
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* User Selection */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Team Member
            </label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sales Team</SelectItem>
                {salesUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rep Type Selection (only for individual users) */}
          {selectedUser !== 'all' && (
            <>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Rep Type
                </label>
                <Select 
                  key={`select-${selectedUser}-${monthlyGoal.goal_type}`}
                  value={monthlyGoal.goal_type} 
                  onValueChange={(v) => setMonthlyGoal({ ...monthlyGoal, goal_type: v })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard Rep</SelectItem>
                    <SelectItem value="onboarding">Onboarding Rep</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {monthlyGoal.goal_type === 'onboarding' && (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Start Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-12 justify-start text-left font-normal",
                          !startDate && "text-slate-500"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {startDate ? format(new Date(startDate + 'T00:00:00'), 'PPP') : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={startDate ? new Date(startDate + 'T00:00:00') : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            setStartDate(`${year}-${month}-${day}`);
                          } else {
                            setStartDate('');
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-slate-500 mt-1">
                    Used to track progress for onboarding goals
                  </p>
                </div>
              )}
            </>
          )}

          {/* Daily Goal Inputs */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Daily Goals</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-emerald-50 rounded-xl p-4">
              <label className="text-sm font-medium text-emerald-700 block mb-2">
                Outreach Goal
              </label>
              <Input
                type="number"
                value={goals.outreach_goal}
                onChange={(e) => setGoals({ ...goals, outreach_goal: parseInt(e.target.value) || 0 })}
                className="text-2xl font-bold text-center h-14"
              />
              <p className="text-xs text-emerald-600 mt-2 text-center">
                Calls, texts, emails, DMs
              </p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <label className="text-sm font-medium text-blue-700 block mb-2">
                Conversation Goal
              </label>
              <Input
                type="number"
                value={goals.conversation_goal}
                onChange={(e) => setGoals({ ...goals, conversation_goal: parseInt(e.target.value) || 0 })}
                className="text-2xl font-bold text-center h-14"
              />
              <p className="text-xs text-blue-600 mt-2 text-center">
                Successful conversations
              </p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <label className="text-sm font-medium text-amber-700 block mb-2">
                Booking Goal
              </label>
              <Input
                type="number"
                value={goals.booking_goal}
                onChange={(e) => setGoals({ ...goals, booking_goal: parseInt(e.target.value) || 0 })}
                className="text-2xl font-bold text-center h-14"
              />
              <p className="text-xs text-amber-600 mt-2 text-center">
                Booked shoots
              </p>
            </div>
            </div>
            </div>

            {/* Monthly Goal Inputs - Only for Standard Reps */}
            {(selectedUser === 'all' || monthlyGoal.goal_type === 'standard') && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Monthly Booking Goals</h3>
                <div className="bg-indigo-50 rounded-xl p-4">
                  <label className="text-xs font-medium text-indigo-700 block mb-2">
                    Monthly Bookings Goal
                  </label>
                  <Input
                    type="number"
                    value={monthlyGoal.standard_monthly_goal}
                    onChange={(e) => setMonthlyGoal({
                      ...monthlyGoal,
                      goal_type: 'standard',
                      standard_monthly_goal: parseInt(e.target.value) || 0
                    })}
                    className="text-2xl font-bold text-center h-14"
                  />
                  <p className="text-xs text-indigo-600 mt-2 text-center">
                    Experienced rep standard
                  </p>
                </div>
              </div>
            )}

            <Button
            onClick={handleSetGoals}
            disabled={updateUserGoalsMutation.isPending || updateMonthlyGoalMutation.isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700 h-12"
            >
            <Save className="w-4 h-4 mr-2" />
            {(updateUserGoalsMutation.isPending || updateMonthlyGoalMutation.isPending) ? 'Saving...' : 'Save Goals'}
            </Button>
        </div>
      </motion.div>

      {/* Current Goals */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
      >
        <div className="p-4 md:p-6 border-b border-slate-100">
          <h2 className="text-base md:text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-600" />
            Current Default Goals
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {salesUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No sales team members found</p>
            </div>
          ) : (
            salesUsers.map((u, idx) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + (idx * 0.05) }}
                className="p-3 md:p-4 hover:bg-slate-50 transition-colors duration-200"
              >
                <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-0">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium shrink-0">
                    {u.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 text-sm md:text-base">{u.full_name}</div>
                    {u.start_date && (
                      <div className="text-xs text-slate-500">
                        Started: {format(new Date(u.start_date), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 md:gap-4 ml-0 md:ml-14 text-sm">
                  <div className="text-center">
                    <div className="text-base md:text-lg font-bold text-emerald-600">
                      {u.default_outreach_goal ?? 100}
                    </div>
                    <div className="text-xs text-slate-500">Outreach</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base md:text-lg font-bold text-blue-600">
                      {u.default_conversation_goal ?? 25}
                    </div>
                    <div className="text-xs text-slate-500">Convos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base md:text-lg font-bold text-amber-600">
                      {u.default_booking_goal ?? 2}
                    </div>
                    <div className="text-xs text-slate-500">Daily</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base md:text-lg font-bold text-indigo-600">
                      {(() => {
                        const userMonthlyGoal = monthlyGoals.find(g => g.user_id === u.id);
                        const daysFromStart = u.start_date 
                          ? differenceInDays(new Date(), new Date(u.start_date))
                          : 999;
                        if (userMonthlyGoal?.goal_type === 'onboarding' && daysFromStart <= 90) {
                          return `${userMonthlyGoal.onboarding_day_1_60_goal}+${userMonthlyGoal.onboarding_day_61_90_goal}`;
                        }
                        return userMonthlyGoal?.standard_monthly_goal || 45;
                      })()}
                    </div>
                    <div className="text-xs text-slate-500">Monthly</div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}