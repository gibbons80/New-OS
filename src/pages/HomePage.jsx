import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  TrendingUp,
  Bell,
  Trophy,
  Target,
  Grid3X3,
  Video,
  GraduationCap,
  Briefcase,
  CheckCircle,
  MessageCircle,
  Wrench,
  Shield,
  Calendar,
  Sparkles,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const appIcons = {
  sales: TrendingUp,
  social: Video,
  tasks: CheckCircle,
  customer_service: MessageCircle,
  training: GraduationCap,
  equipment: Wrench,
  hr_accounting: Briefcase,
  admin: Shield
};

const appColors = {
  sales: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
  social: 'bg-gradient-to-br from-violet-400 to-violet-600',
  tasks: 'bg-gradient-to-br from-blue-400 to-blue-600',
  customer_service: 'bg-gradient-to-br from-cyan-400 to-cyan-600',
  training: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
  equipment: 'bg-gradient-to-br from-orange-400 to-orange-600',
  hr_accounting: 'bg-gradient-to-br from-rose-400 to-rose-600',
  admin: 'bg-gradient-to-br from-slate-400 to-slate-600'
};

const appLabels = {
  sales: 'Sales',
  social: 'Social Media',
  tasks: 'Tasks',
  customer_service: 'Customer Service',
  training: 'Training',
  equipment: 'Equipment',
  hr_accounting: 'HR/Accounting',
  admin: 'Admin'
};

export default function HomePage({ user, onAppSwitcherOpen }) {
  const navigate = useNavigate();

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.filter({ is_active: true }, '-priority,-created_date'),
    enabled: !!user
  });

  const { data: companyGoals = [] } = useQuery({
    queryKey: ['company-goals'],
    queryFn: () => base44.entities.CompanyGoal.filter({ is_active: true }, '-created_date'),
    enabled: !!user
  });

  const { data: appUsageData = [] } = useQuery({
    queryKey: ['app-usage', user?.id],
    queryFn: () => base44.entities.AppUsage.filter({ user_id: user.id }, '-usage_count'),
    enabled: !!user
  });

  const userDepartments = user?.role === 'admin' 
    ? ['sales', 'social', 'tasks', 'customer_service', 'training', 'equipment', 'hr_accounting', 'admin']
    : user?.departments || [];

  // Use user's preferred app order if available, otherwise fall back to usage-based order
  const userAppOrder = user?.app_order || [];
  
  // Filter user's preferred order to only include apps they have access to
  const orderedAccessibleApps = userAppOrder.filter(appId => userDepartments.includes(appId));
  
  // Get top 5 most used apps that the user has access to (for fallback)
  const topApps = appUsageData
    .filter(usage => userDepartments.includes(usage.app_id))
    .slice(0, 5)
    .map(usage => usage.app_id);

  // Use preferred order if available, otherwise use usage-based order
  const quickAccessApps = orderedAccessibleApps.length > 0
    ? [...new Set([...orderedAccessibleApps, ...userDepartments])].slice(0, 5)
    : [...new Set([...topApps, ...userDepartments])].slice(0, 5);

  const handleAppClick = async (appId) => {
    // Track app usage
    try {
      const existingUsage = appUsageData.find(u => u.app_id === appId);
      if (existingUsage) {
        await base44.entities.AppUsage.update(existingUsage.id, {
          usage_count: existingUsage.usage_count + 1,
          last_accessed: new Date().toISOString()
        });
      } else {
        await base44.entities.AppUsage.create({
          user_id: user.id,
          app_id: appId,
          usage_count: 1,
          last_accessed: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to track app usage:', error);
    }

    // Navigate to app
    if (appId === 'sales') {
      navigate(createPageUrl('SalesDashboard'));
    } else if (appId === 'social') {
      navigate(createPageUrl('SocialDashboard'));
    } else if (appId === 'tasks') {
      navigate(createPageUrl('TasksMyWork'));
    } else if (appId === 'customer_service') {
      navigate(createPageUrl('CustomerServiceDashboard'));
    } else if (appId === 'training') {
      navigate(createPageUrl('TrainingDashboard'));
    } else if (appId === 'equipment') {
      navigate(createPageUrl('EquipmentDashboard'));
    } else if (appId === 'hr_accounting') {
      navigate(createPageUrl('HRAccountingDashboard'));
    } else if (appId === 'admin') {
      navigate(createPageUrl('AdminDashboard'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 relative z-10">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 md:mb-14"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-3">
                Welcome back, {user?.full_name?.split(' ')[0]}! 👋
              </h1>
              <p className="text-slate-600 text-lg">Track your goals and navigate your workspace</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={onAppSwitcherOpen}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-12 px-6"
              >
                <Grid3X3 className="w-5 h-5 mr-2" />
                All Apps
              </Button>
              <Button
                onClick={() => base44.auth.logout()}
                variant="outline"
                className="h-12 px-6 border-slate-200 hover:bg-slate-100"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Log Out
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Quick Access */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-1 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full" />
            <h2 className="text-2xl font-bold text-slate-900">Quick Access</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {quickAccessApps.map((appId, index) => {
              const Icon = appIcons[appId];
              if (!Icon) return null;
              return (
                <motion.button
                  key={appId}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.05, type: "spring", stiffness: 200 }}
                  whileHover={{ scale: 1.05, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAppClick(appId)}
                  className="group relative overflow-hidden p-6 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-md hover:shadow-2xl transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transform group-hover:scale-110 transition-transform duration-300 relative z-10", appColors[appId])}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <span className="font-semibold text-slate-900 text-sm block relative z-10">{appLabels[appId]}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Announcements & Company Goals - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Announcements */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-1 bg-gradient-to-b from-blue-600 to-cyan-600 rounded-full" />
              <h2 className="text-2xl font-bold text-slate-900">Announcements</h2>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300">
              {announcements.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center mx-auto mb-5 border border-blue-100">
                    <Bell className="w-10 h-10 text-blue-400" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">No Announcements</h3>
                  <p className="text-sm text-slate-500">New announcements will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                  {announcements.map((announcement, index) => (
                    <motion.div
                      key={announcement.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="group p-6 hover:bg-gradient-to-br hover:from-blue-50 hover:to-cyan-50/50 transition-all duration-300 cursor-default"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-md">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 mb-2 text-base group-hover:text-blue-700 transition-colors">
                            {announcement.title}
                          </h3>
                          <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed mb-3">
                            {announcement.content}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {announcement.created_by_name}
                            </Badge>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(announcement.created_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Company Goals */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-1 bg-gradient-to-b from-emerald-600 to-teal-600 rounded-full" />
              <h2 className="text-2xl font-bold text-slate-900">Company Goals</h2>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300">
              {companyGoals.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center mx-auto mb-5 border border-emerald-100">
                    <Trophy className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">Coming Soon</h3>
                  <p className="text-sm text-slate-500">Company goals will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                  {companyGoals.map((goal, index) => {
                    const progress = Math.min((goal.current_value / goal.target_value) * 100, 100);
                    return (
                      <motion.div
                        key={goal.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                        className="group p-6 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-teal-50/50 transition-all duration-300"
                      >
                        <h3 className="font-semibold text-slate-900 mb-3 text-base group-hover:text-emerald-700 transition-colors">
                          {goal.title}
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600 font-medium">
                              {goal.current_value.toLocaleString()} / {goal.target_value.toLocaleString()} {goal.unit}
                            </span>
                            <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm">
                              {progress.toFixed(0)}%
                            </Badge>
                          </div>
                          <div className="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 1, delay: 0.7 + index * 0.1 }}
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full shadow-sm"
                            />
                          </div>
                          {goal.end_date && (
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Due {format(new Date(goal.end_date), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* My Personal Goals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-1 bg-gradient-to-b from-purple-600 to-pink-600 rounded-full" />
            <h2 className="text-2xl font-bold text-slate-900">My Personal Goals</h2>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
            <div className="text-center py-20 px-6">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center mx-auto mb-6 border border-purple-100 shadow-lg">
                <Target className="w-12 h-12 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Coming Soon</h3>
              <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                Personal goal tracking will be available here to help you monitor your individual progress and achievements
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}