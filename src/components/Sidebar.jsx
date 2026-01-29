import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Target,
  Trophy,
  CheckSquare,
  Settings,
  Calendar,
  FileText,
  Video,
  BookOpen,
  ChevronDown,
  LogOut,
  Grid3X3,
  Unlock,
  X,
  Sparkles,
  MessageSquare,
  CheckCircle,
  ClipboardList,
  History,
  TrendingUp,
  Inbox,
  GraduationCap,
  Wrench,
  Briefcase,
  Map,
  Receipt,
  Film,
  Merge,
  CalendarDays,
  Clock,
  Database,
  KeyRound,
  Building2,
  Briefcase as BriefcaseIcon
} from 'lucide-react';

const salesNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, page: 'SalesDashboard' },
  { id: 'leads', label: 'Leads', icon: Users, page: 'Leads' },
  { id: 'openleads', label: 'Open Leads', icon: Unlock, page: 'OpenLeads' },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, page: 'Leaderboard' },
  { id: 'salestrainer', label: 'Sales Trainer', icon: GraduationCap, page: 'SalesTrainer' },
  { id: 'kb', label: 'Knowledge Base', icon: BookOpen, page: 'KnowledgeBase' },
  { id: 'usersettings', label: 'Settings', icon: Settings, page: 'SalesUserSettings' },
];

const salesAdminItems = [
  { id: 'mergeleads', label: 'Merge Leads', icon: Merge, page: 'MergeLeads' },
  { id: 'goals', label: 'Goals Settings', icon: Target, page: 'GoalsSettings' },
  { id: 'adminsettings', label: 'Admin Settings', icon: Settings, page: 'SalesSettings' },
];

const socialNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, page: 'SocialDashboard' },
  { id: 'stats', label: 'Stats', icon: TrendingUp, page: 'SocialStats' },
  { id: 'posts', label: 'All Posts', icon: Video, page: 'SocialPosts' },
  { id: 'kb', label: 'Knowledge Base', icon: BookOpen, page: 'KnowledgeBase' },
];

const socialAdminItems = [
  { id: 'settings', label: 'Settings', icon: Settings, page: 'SocialSettings' },
];

const tasksNavItems = [
  { id: 'mywork', label: 'My Work', icon: CheckCircle, page: 'TasksMyWork' },
  { id: 'past', label: 'Past Submissions', icon: History, page: 'TasksPastSubmissions' },
  { id: 'kb', label: 'Knowledge Base', icon: BookOpen, page: 'KnowledgeBase' },
  { id: 'settings', label: 'Settings', icon: Settings, page: 'TasksSettings' },
];

const tasksAdminItems = [
  { id: 'plans', label: 'Daily Plans', icon: ClipboardList, page: 'TasksDailyPlans' },
];

const scheduleNavItems = [
  { id: 'dashboard', label: 'Team Schedule', icon: CalendarDays, page: 'ScheduleDashboard' },
  { id: 'timeoff', label: 'Time Off Requests', icon: Clock, page: 'TimeOffRequests' },
  { id: 'kb', label: 'Knowledge Base', icon: BookOpen, page: 'KnowledgeBase' },
];

const scheduleAdminItems = [
  { id: 'settings', label: 'Settings', icon: Settings, page: 'ScheduleSettings' },
];

const customerServiceNavItems = [
  { id: 'inbox', label: 'Inbox', icon: Inbox, page: 'CustomerServiceDashboard' },
  { id: 'map', label: 'Map', icon: Map, page: 'CSMap' },
  { id: 'photographers', label: 'Photographers', icon: Users, page: 'Photographers' },
  { id: 'thirdparty', label: '3rd Party Photographers', icon: Building2, page: 'ThirdPartyPhotographers' },
  { id: 'kb', label: 'Knowledge Base', icon: BookOpen, page: 'CSKnowledgeBase' },
];

const customerServiceAdminItems = [
  { id: 'settings', label: 'CS Settings', icon: Settings, page: 'CSSettings' },
];

const trainingNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, page: 'TrainingDashboard' },
  { id: 'videos', label: 'Training Videos', icon: Video, page: 'TrainingVideos' },
  { id: 'kb', label: 'Knowledge Base', icon: BookOpen, page: 'TrainingKnowledgeBase' },
];

const trainingAdminItems = [
  { id: 'videosettings', label: 'Video Settings', icon: Video, page: 'TrainingVideoSettings' },
  { id: 'settings', label: 'Settings', icon: Settings, page: 'TrainingSettings' },
];

const trainingTrainerItems = [
  { id: 'trainerdashboard', label: 'Trainer Dashboard', icon: LayoutDashboard, page: 'TrainerDashboard' },
  { id: 'photographers', label: 'Photographers Status', icon: Users, page: 'TrainingPhotographersStatus' },
];

const equipmentNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, page: 'EquipmentDashboard' },
  { id: 'staff', label: 'All Staff', icon: Users, page: 'EquipmentStaffDirectory' },
  { id: 'kb', label: 'Knowledge Base', icon: BookOpen, page: 'KnowledgeBase' },
  { id: 'settings', label: 'Settings', icon: Settings, page: 'EquipmentSettings' },
];

const equipmentAdminItems = [
  { id: 'davinci', label: 'DaVinci Codes', icon: KeyRound, page: 'DaVinciCodes' },
];

const editorsNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, page: 'EditorsDashboard' },
  { id: 'kb', label: 'Knowledge Base', icon: BookOpen, page: 'KnowledgeBase' },
  { id: 'settings', label: 'Settings', icon: Settings, page: 'EditorsSettings' },
];

const editorsAdminItems = [];

const hrAccountingNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, page: 'HRAccountingDashboard' },
  { id: 'hiring', label: 'Hiring', icon: BriefcaseIcon, page: 'Hiring' },
  { id: 'staff', label: 'Staff', icon: Users, page: 'HRStaff' },
  { id: 'expense', label: 'Expense Report', icon: Receipt, page: 'HRExpenseReport' },
  { id: 'kb', label: 'Knowledge Base', icon: BookOpen, page: 'HRKnowledgeBase' },
];

const hrAccountingAdminItems = [
  { id: 'settings', label: 'Settings', icon: Settings, page: 'HRAccountingSettings' },
];

const adminNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, page: 'AdminDashboard' },
  { id: 'homepage', label: 'Home Page Settings', icon: Settings, page: 'HomePageSettings' },
  { id: 'team', label: 'Team Management', icon: Users, page: 'TeamManagement' },
  { id: 'feedback', label: 'Platform Feedback', icon: MessageSquare, page: 'PlatformFeedback' },
  { id: 'auditlog', label: 'Audit Log', icon: Database, page: 'AuditLog' },
  { id: 'kb', label: 'Knowledge Base', icon: BookOpen, page: 'KnowledgeBase' },
  { id: 'settings', label: 'Settings', icon: Settings, page: 'AdminSettings' },
];

const adminAdminItems = [];

export default function Sidebar({ 
  currentApp, 
  currentPage, 
  user, 
  onAppSwitcherOpen,
  onLogout,
  isAdmin,
  onNavigate,
  onClose,
  openLeadsCount = 0
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);
  const navItems = currentApp === 'sales' ? salesNavItems : currentApp === 'social' ? socialNavItems : currentApp === 'tasks' ? tasksNavItems : currentApp === 'schedule' ? scheduleNavItems : currentApp === 'customer_service' ? customerServiceNavItems : currentApp === 'training' ? trainingNavItems : currentApp === 'equipment' ? equipmentNavItems : currentApp === 'editors' ? editorsNavItems : currentApp === 'hr_accounting' ? hrAccountingNavItems : adminNavItems;
  const adminItems = currentApp === 'sales' ? salesAdminItems : currentApp === 'social' ? socialAdminItems : currentApp === 'tasks' ? tasksAdminItems : currentApp === 'schedule' ? scheduleAdminItems : currentApp === 'customer_service' ? customerServiceAdminItems : currentApp === 'training' ? trainingAdminItems : currentApp === 'equipment' ? equipmentAdminItems : currentApp === 'editors' ? editorsAdminItems : currentApp === 'hr_accounting' ? hrAccountingAdminItems : adminAdminItems;
  const trainerItems = currentApp === 'training' ? trainingTrainerItems : [];

  const appColors = {
    sales: {
      bg: 'bg-emerald-600',
      hover: 'hover:bg-emerald-700',
      active: 'bg-emerald-500/20 text-emerald-100',
      gradient: 'from-emerald-600 to-emerald-700'
    },
    social: {
      bg: 'bg-violet-600',
      hover: 'hover:bg-violet-700', 
      active: 'bg-violet-500/20 text-violet-100',
      gradient: 'from-violet-600 to-violet-700'
    },
    tasks: {
      bg: 'bg-blue-600',
      hover: 'hover:bg-blue-700',
      active: 'bg-blue-500/20 text-blue-100',
      gradient: 'from-blue-600 to-blue-700'
    },
    schedule: {
      bg: 'bg-purple-600',
      hover: 'hover:bg-purple-700',
      active: 'bg-purple-500/20 text-purple-100',
      gradient: 'from-purple-600 to-purple-700'
    },
    customer_service: {
      bg: 'bg-cyan-600',
      hover: 'hover:bg-cyan-700',
      active: 'bg-cyan-500/20 text-cyan-100',
      gradient: 'from-cyan-600 to-cyan-700'
    },
    training: {
      bg: 'bg-indigo-600',
      hover: 'hover:bg-indigo-700',
      active: 'bg-indigo-500/20 text-indigo-100',
      gradient: 'from-indigo-600 to-indigo-700'
    },
    equipment: {
      bg: 'bg-orange-600',
      hover: 'hover:bg-orange-700',
      active: 'bg-orange-500/20 text-orange-100',
      gradient: 'from-orange-600 to-orange-700'
    },
    editors: {
      bg: 'bg-purple-600',
      hover: 'hover:bg-purple-700',
      active: 'bg-purple-500/20 text-purple-100',
      gradient: 'from-purple-600 to-purple-700'
    },
    hr_accounting: {
      bg: 'bg-rose-600',
      hover: 'hover:bg-rose-700',
      active: 'bg-rose-500/20 text-rose-100',
      gradient: 'from-rose-600 to-rose-700'
    },
    admin: {
      bg: 'bg-slate-600',
      hover: 'hover:bg-slate-700',
      active: 'bg-slate-500/20 text-slate-100',
      gradient: 'from-slate-600 to-slate-700'
    }
  };

  const colors = appColors[currentApp] || appColors.sales;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [showUserMenu]);

  return (
    <div className={cn(
      "w-64 h-full flex flex-col bg-gradient-to-b relative",
      colors.gradient
    )}>
      {/* Close Button (Mobile) */}
      {onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="lg:hidden absolute top-4 right-4 z-50 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      )}

      {/* App Header */}
      <div className="p-4 border-b border-white/10">
        <button
          onClick={onAppSwitcherOpen}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
            <Grid3X3 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-white font-semibold text-sm">WindowStill</div>
            <div className="text-white/70 text-xs capitalize">
              {currentApp === 'customer_service' ? 'Customer Service' : 
               currentApp === 'hr_accounting' ? 'HR/Accounting' :
               currentApp === 'editors' ? 'Editors' :
               currentApp === 'schedule' ? 'Schedule' :
               currentApp} App
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-white/60" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.page;
          return (
            <Link
              key={item.id}
              to={createPageUrl(item.page)}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive 
                  ? "bg-white text-slate-900 shadow-lg" 
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
              {item.page === 'OpenLeads' && openLeadsCount > 0 && (
                <span className={cn(
                  "ml-auto px-2 py-0.5 text-xs font-semibold rounded-full",
                  isActive
                    ? "bg-slate-900 text-white"
                    : "bg-white/20 text-white"
                )}>
                  {openLeadsCount}
                </span>
              )}
            </Link>
          );
        })}

        {(user?.is_trainer || isAdmin) && trainerItems.length > 0 && (
          <>
            <div className="pt-4 pb-2 px-3">
              <div className="text-xs font-medium text-white/50 uppercase tracking-wider">
                Trainer
              </div>
            </div>
            {trainerItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.page;
              return (
                <Link
                  key={item.id}
                  to={createPageUrl(item.page)}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    isActive 
                      ? "bg-white text-slate-900 shadow-lg" 
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}

        {isAdmin && (
          <>
            {currentApp !== 'admin' && (
              <div className="pt-4 pb-2 px-3">
                <div className="text-xs font-medium text-white/50 uppercase tracking-wider">
                  Admin
                </div>
              </div>
            )}
            {adminItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.page;
              return (
                <Link
                  key={item.id}
                  to={createPageUrl(item.page)}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    isActive 
                      ? "bg-white text-slate-900 shadow-lg" 
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User Section */}
      <div ref={menuRef} className="p-3 border-t border-white/10 relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
        >
          {user?.profile_photo_url ? (
            <img
              src={user.profile_photo_url}
              alt={user?.full_name}
              className="w-9 h-9 rounded-full object-cover border-2 border-white/30"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-medium text-sm">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0 text-left">
            <div className="text-white font-medium text-sm truncate">
              {user?.full_name || 'User'}
            </div>
            <div className="text-white/60 text-xs truncate">
              {user?.role || 'user'}
            </div>
          </div>
          <ChevronDown className={cn(
            "w-4 h-4 text-white/60 transition-transform",
            showUserMenu && "rotate-180"
          )} />
        </button>

        <AnimatePresence>
          {showUserMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200"
            >
              <Link
                to={createPageUrl('SubmitFeedback')}
                onClick={() => {
                  setShowUserMenu(false);
                  onNavigate();
                }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <MessageSquare className="w-5 h-5 text-slate-600" />
                <span className="text-sm font-medium text-slate-900">Submit Feedback</span>
              </Link>
              <Link
                to={createPageUrl('UserSettings')}
                onClick={() => {
                  setShowUserMenu(false);
                  onNavigate();
                }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <Settings className="w-5 h-5 text-slate-600" />
                <span className="text-sm font-medium text-slate-900">Profile Settings</span>
              </Link>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-t border-slate-100"
              >
                <LogOut className="w-5 h-5 text-slate-600" />
                <span className="text-sm font-medium text-slate-900">Log Out</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}