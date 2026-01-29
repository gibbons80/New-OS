import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { 
  Calendar,
  Filter,
  CheckCircle,
  ArrowRight,
  AlertCircle,
  User
} from 'lucide-react';
import DailyPlanDetailPanel from '@/components/tasks/DailyPlanDetailPanel';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export default function TasksDailyPlans({ user }) {
  const today = formatInTimeZone(new Date(), 'America/New_York', 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedDailyPlan, setSelectedDailyPlan] = useState(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Fetch all users
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  // Fetch daily plans
  const { data: allPlans = [] } = useQuery({
    queryKey: ['daily-plans', selectedDate, selectedUser, selectedDepartment],
    queryFn: async () => {
      const filters = { 
        date: selectedDate,
        archived: { $ne: true }
      };
      if (selectedUser !== 'all') filters.user_id = selectedUser;
      if (selectedDepartment !== 'all') filters.department = selectedDepartment;
      
      return await base44.entities.DailyPlan.filter(filters);
    }
  });

  const activeUsers = allUsers.filter(u => u.full_name && u.full_name.trim());

  // Calculate stats
  const stats = {
    total: allPlans.length,
    morningSubmitted: allPlans.filter(p => p.status !== 'not_started').length,
    eodSubmitted: allPlans.filter(p => p.status === 'eod_submitted').length,
    missing: activeUsers.length - allPlans.length
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900">Daily Plans Dashboard</h1>
        <p className="text-slate-600 mt-2 text-sm md:text-base">
          Review and audit team daily planning submissions
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden shadow-lg"
      >
        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="lg:hidden w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-600" />
            <span className="font-medium text-slate-900">Filters</span>
            {(selectedUser !== 'all' || selectedDepartment !== 'all') && (
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">Active</span>
            )}
          </div>
          <ChevronRight className={cn(
            "w-5 h-5 text-slate-400 transition-transform",
            filtersExpanded && "rotate-90"
          )} />
        </button>

        {/* Filters Content */}
        <div className={cn(
          "p-4 space-y-3 border-t border-slate-100 lg:border-0",
          "lg:flex lg:items-center lg:gap-4 lg:flex-wrap lg:space-y-0",
          !filtersExpanded && "hidden lg:flex"
        )}>
          <div className="hidden lg:flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Filters:</span>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1.5 lg:hidden">Date</label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full lg:w-48"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1.5 lg:hidden">User</label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {activeUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1.5 lg:hidden">Department</label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="social">Social</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02, y: -4 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl md:rounded-2xl p-4 md:p-6 text-white shadow-lg"
        >
          <p className="text-slate-100 text-xs md:text-sm">Total Plans</p>
          <p className="text-2xl md:text-4xl font-bold mt-1 md:mt-2">{stats.total}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02, y: -4 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl md:rounded-2xl p-4 md:p-6 text-white shadow-lg"
        >
          <p className="text-blue-100 text-xs md:text-sm">Morning</p>
          <p className="text-2xl md:text-4xl font-bold mt-1 md:mt-2">{stats.morningSubmitted}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02, y: -4 }}
          transition={{ delay: 0.25 }}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl md:rounded-2xl p-4 md:p-6 text-white shadow-lg"
        >
          <p className="text-emerald-100 text-xs md:text-sm">EOD</p>
          <p className="text-2xl md:text-4xl font-bold mt-1 md:mt-2">{stats.eodSubmitted}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02, y: -4 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl md:rounded-2xl p-4 md:p-6 text-white shadow-lg"
        >
          <p className="text-red-100 text-xs md:text-sm">Missing</p>
          <p className="text-2xl md:text-4xl font-bold mt-1 md:mt-2">{stats.missing}</p>
        </motion.div>
      </div>

      {/* Mobile Plans List */}
      <div className="lg:hidden space-y-3">
        {allPlans.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-8 text-center shadow-lg"
          >
            <p className="text-slate-400 text-sm">No plans found for selected filters</p>
          </motion.div>
        ) : (
          allPlans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedDailyPlan(plan)}
              className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-4 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-900 truncate">{plan.user_name}</span>
                  </div>
                  <p className="text-xs text-slate-500 capitalize">{plan.department}</p>
                </div>
                <span className={cn(
                  "px-2 py-1 text-[10px] font-medium rounded-lg shrink-0",
                  plan.status === 'not_started' && "bg-slate-100 text-slate-600",
                  plan.status === 'morning_submitted' && "bg-blue-100 text-blue-700",
                  plan.status === 'eod_submitted' && "bg-emerald-100 text-emerald-700"
                )}>
                  {plan.status === 'not_started' && 'Not Started'}
                  {plan.status === 'morning_submitted' && 'Morning ✓'}
                  {plan.status === 'eod_submitted' && 'EOD ✓'}
                </span>
              </div>
              
              <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-100">
                <div>
                  <p className="text-[10px] text-slate-500">Planned</p>
                  <p className="text-sm font-semibold text-slate-900">{plan.morning_tasks?.length || 0}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Done</p>
                  <p className="text-sm font-semibold text-emerald-600">{plan.eod_tasks_completed?.length || 0}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Rolled</p>
                  <p className="text-sm font-semibold text-amber-600">{plan.rolled_over_tasks?.length || 0}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Added</p>
                  <p className="text-sm font-semibold text-blue-600">{plan.eod_tasks_added?.length || 0}</p>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="hidden lg:block bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left p-4 text-sm font-medium text-slate-500">User</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Department</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Planned</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Completed</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Rolled Over</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Added</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {allPlans.length === 0 ? (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      No plans found for selected filters
                    </td>
                  </motion.tr>
                ) : (
                  allPlans.map((plan, index) => (
                    <motion.tr 
                      key={plan.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.03 }}
                      whileHover={{ backgroundColor: 'rgb(248 250 252)' }}
                      className="border-b border-slate-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedDailyPlan(plan)}
                    >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-900">{plan.user_name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm capitalize text-slate-600">{plan.department}</span>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-3 py-1 text-xs font-medium rounded-lg",
                        plan.status === 'not_started' && "bg-slate-100 text-slate-600",
                        plan.status === 'morning_submitted' && "bg-blue-100 text-blue-700",
                        plan.status === 'eod_submitted' && "bg-emerald-100 text-emerald-700"
                      )}>
                        {plan.status === 'not_started' && 'Not Started'}
                        {plan.status === 'morning_submitted' && 'Morning ✓'}
                        {plan.status === 'eod_submitted' && 'EOD ✓'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-slate-900">{plan.morning_tasks?.length || 0}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-emerald-600 font-medium">
                        {plan.eod_tasks_completed?.length || 0}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-amber-600 font-medium">
                        {plan.rolled_over_tasks?.length || 0}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-blue-600 font-medium">
                        {plan.eod_tasks_added?.length || 0}
                      </span>
                    </td>
                  </motion.tr>
                ))
              )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      <DailyPlanDetailPanel 
        plan={selectedDailyPlan} 
        onClose={() => setSelectedDailyPlan(null)} 
      />
    </div>
  );
}