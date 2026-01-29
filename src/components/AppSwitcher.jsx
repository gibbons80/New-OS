import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, TrendingUp, Video, Shield, X, CheckCircle, MessageCircle, GraduationCap, Wrench, Briefcase, Film, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const apps = [
  {
    id: 'home',
    name: 'Home',
    icon: Home,
    color: 'from-slate-400 to-slate-600',
    description: 'Your workspace hub'
  },
  {
    id: 'sales',
    name: 'Sales',
    icon: TrendingUp,
    color: 'from-emerald-400 to-emerald-600',
    description: 'Leads, outreach & bookings'
  },
  {
    id: 'social',
    name: 'Social Media',
    icon: Video,
    color: 'from-violet-400 to-violet-600',
    description: 'Content & scheduling'
  },
  {
    id: 'tasks',
    name: 'Tasks',
    icon: CheckCircle,
    color: 'from-blue-400 to-blue-600',
    description: 'Daily planning & task management'
  },
  {
    id: 'schedule',
    name: 'Schedule',
    icon: Calendar,
    color: 'from-purple-400 to-purple-600',
    description: 'Team schedules & time off'
  },
  {
    id: 'customer_service',
    name: 'Customer Service',
    icon: MessageCircle,
    color: 'from-cyan-400 to-cyan-600',
    description: 'Inbox, conversations, support'
  },
  {
    id: 'training',
    name: 'Training',
    icon: GraduationCap,
    color: 'from-indigo-400 to-indigo-600',
    description: 'Learning & development'
  },
  {
    id: 'equipment',
    name: 'Equipment',
    icon: Wrench,
    color: 'from-orange-400 to-orange-600',
    description: 'Tools & inventory'
  },
  {
    id: 'editors',
    name: 'Editors',
    icon: Film,
    color: 'from-purple-400 to-purple-600',
    description: 'Photo & video editing'
  },
  {
    id: 'hr_accounting',
    name: 'HR/Accounting',
    icon: Briefcase,
    color: 'from-rose-400 to-rose-600',
    description: 'People & finance'
  },
  {
    id: 'admin',
    name: 'Admin',
    icon: Shield,
    color: 'from-slate-400 to-slate-600',
    description: 'Platform administration'
  }
];

export default function AppSwitcher({ isOpen, onClose, currentApp, onAppSelect, userDepartments, userAppOrder }) {
  let availableApps = apps.filter(app => {
    if (app.id === 'home') return true;
    return userDepartments?.includes(app.id) || userDepartments?.includes('admin');
  });

  // Sort apps based on user's custom order
  if (userAppOrder && Array.isArray(userAppOrder)) {
    availableApps = availableApps.sort((a, b) => {
      const indexA = userAppOrder.indexOf(a.id);
      const indexB = userAppOrder.indexOf(b.id);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col w-full max-w-lg max-h-[85vh] border border-slate-200" onClick={(e) => e.stopPropagation()}>
              <div className="p-7 border-b border-slate-200 flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-blue-50 to-purple-50">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Switch App</h2>
                  <p className="text-sm text-slate-600 mt-1">Select your workspace</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-white/80 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="p-5 space-y-3 overflow-y-auto">
                {availableApps.map((app) => {
                  const Icon = app.icon;
                  const isActive = currentApp === app.id;
                  return (
                    <motion.button
                      key={app.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onAppSelect(app.id);
                        onClose();
                      }}
                      className={cn(
                        "w-full flex items-center gap-4 p-5 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                        isActive 
                          ? "bg-slate-900 text-white shadow-lg" 
                          : "bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 hover:border-slate-300 hover:shadow-md"
                      )}
                    >
                      <div className={cn(
                        "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300",
                        app.color
                      )}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">{app.name}</div>
                        <div className={cn(
                          "text-sm",
                          isActive ? "text-slate-300" : "text-slate-500"
                        )}>
                          {app.description}
                        </div>
                      </div>
                      {isActive && (
                        <div className="ml-auto">
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}