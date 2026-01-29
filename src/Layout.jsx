import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import Sidebar from '@/components/Sidebar';
import AppSwitcher from '@/components/AppSwitcher';
import { Bell, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toaster } from 'sonner';

const publicPages = [];
const noSidebarPages = ['HomePage'];

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentApp, setCurrentApp] = useState('sales');
  const [showAppSwitcher, setShowAppSwitcher] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch count of open leads (not grabbed)
  const { data: openLeadsCount = 0 } = useQuery({
    queryKey: ['open-leads-count'],
    queryFn: async () => {
      const leads = await base44.entities.Lead.filter({
        is_open_for_reassignment: true,
        reassigned_owner_id: null
      });
      return leads.length;
    },
    enabled: !!user,
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    // Auto-detect app from page name (order matters - check most specific first)
    if (currentPageName === 'HomePage') {
      setCurrentApp('home');
    } else if (currentPageName === 'AdminDashboard' || 
        currentPageName === 'TeamManagement' ||
        currentPageName === 'PlatformFeedback' ||
        currentPageName === 'AdminSettings') {
      setCurrentApp('admin');
    } else if (currentPageName === 'SocialDashboard' ||
               currentPageName === 'SocialPosts' ||
               currentPageName === 'SocialCalendar' ||
               currentPageName === 'SocialStats' ||
               currentPageName === 'PostDetail' ||
               currentPageName === 'SocialSettings') {
      setCurrentApp('social');
    } else if (currentPageName === 'TasksMyWork' ||
               currentPageName === 'TasksDailyPlans' ||
               currentPageName === 'TasksPastSubmissions' ||
               currentPageName === 'TasksSettings') {
      setCurrentApp('tasks');
    } else if (currentPageName === 'ScheduleDashboard' ||
               currentPageName === 'TimeOffRequests' ||
               currentPageName === 'ScheduleSettings') {
      setCurrentApp('schedule');
    } else if (currentPageName === 'CustomerServiceDashboard' ||
               currentPageName === 'CSMap' ||
               currentPageName === 'CSKnowledgeBase' ||
               currentPageName === 'CSSettings' ||
               currentPageName === 'ThirdPartyPhotographers' ||
               currentPageName === 'ThirdPartyPhotographerDetail' ||
               currentPageName === 'Photographers') {
      setCurrentApp('customer_service');
    } else if (currentPageName === 'TrainingDashboard' ||
               currentPageName === 'TrainingVideos' ||
               currentPageName === 'TrainingKnowledgeBase' ||
               currentPageName === 'TrainingPhotographersStatus' ||
               currentPageName === 'PhotographerDetail' ||
               currentPageName === 'TrainingVideoSettings' ||
               currentPageName === 'TrainingSettings') {
      setCurrentApp('training');
    } else if (currentPageName === 'EquipmentDashboard' ||
               currentPageName === 'EquipmentSettings' ||
               currentPageName === 'EquipmentStaffDirectory') {
      setCurrentApp('equipment');
    } else if (currentPageName === 'EditorsDashboard' ||
               currentPageName === 'EditorsSettings') {
      setCurrentApp('editors');
    } else if (currentPageName === 'HRAccountingDashboard' ||
               currentPageName === 'Hiring' ||
               currentPageName === 'HRStaff' ||
               currentPageName === 'HRExpenseReport' ||
               currentPageName === 'HRKnowledgeBase' ||
               currentPageName === 'AccessTemplates' ||
               currentPageName === 'HRAccountingSettings') {
      setCurrentApp('hr_accounting');
    } else if (currentPageName === 'SalesDashboard' ||
               currentPageName === 'Leads' ||
               currentPageName === 'LeadDetail' ||
               currentPageName === 'OpenLeads' ||
               currentPageName === 'Leaderboard' ||
               currentPageName === 'SalesTrainer' ||
               currentPageName === 'GoalsSettings' ||
               currentPageName === 'SalesSettings' ||
               currentPageName === 'NextBestActionsConfig' ||
               currentPageName === 'AISalesAssistantSettings') {
      setCurrentApp('sales');
    } else if (currentPageName === 'KnowledgeBase') {
      // Knowledge Base is shared - keep current app
      return;
    } else if (currentPageName === 'SubmitFeedback' || 
               currentPageName === 'UserSettings') {
      // Global pages - keep current app
      return;
    }
  }, [currentPageName]);

  const loadUser = async () => {
    try {
      console.log('1. Checking if user is authenticated...');
      const isAuth = await base44.auth.isAuthenticated();
      console.log('2. isAuthenticated result:', isAuth);

      if (!isAuth) {
        console.log('3. User is NOT authenticated, redirecting to login');
        setLoading(false);
        return;
      }

      console.log('4. User IS authenticated, fetching user data...');
      const userData = await base44.auth.me();
      console.log('5. User data received:', userData);
      console.log('6. User email:', userData?.email);

      // Check if account is inactive
      if (userData?.is_active === false) {
        base44.auth.logout();
        return;
      }

      setUser(userData);

      if (!currentPageName || currentPageName === 'Home') {
        navigate(createPageUrl('HomePage'));
      }

      // Only try to link staff if we have a valid user
      if (userData?.email) {
        console.log('7. Calling linkStaffToUser...');
        const result = await base44.functions.invoke('linkStaffToUser', {});
        console.log('8. linkStaffToUser completed:', result);
      }
    } catch (error) {
      console.error('ERROR in loadUser:', error.message);
      console.error('Stack:', error.stack);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const handleAppSelect = (appId) => {
    setCurrentApp(appId);
    setShowAppSwitcher(false);
    setMobileMenuOpen(false);
    // Navigate to appropriate dashboard
    if (appId === 'home') {
      navigate(createPageUrl('HomePage'));
    } else if (appId === 'sales') {
      navigate(createPageUrl('SalesDashboard'));
    } else if (appId === 'social') {
      navigate(createPageUrl('SocialDashboard'));
    } else if (appId === 'tasks') {
      navigate(createPageUrl('TasksMyWork'));
    } else if (appId === 'schedule') {
      navigate(createPageUrl('ScheduleDashboard'));
    } else if (appId === 'customer_service') {
      navigate(createPageUrl('CustomerServiceDashboard'));
    } else if (appId === 'training') {
      navigate(createPageUrl('TrainingDashboard'));
    } else if (appId === 'equipment') {
      navigate(createPageUrl('EquipmentDashboard'));
    } else if (appId === 'editors') {
      navigate(createPageUrl('EditorsDashboard'));
    } else if (appId === 'hr_accounting') {
      navigate(createPageUrl('HRAccountingDashboard'));
    } else if (appId === 'admin') {
      navigate(createPageUrl('AdminDashboard'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // App-specific color themes
  const appThemes = {
    sales: {
      gradient: 'from-emerald-50/30 via-blue-50/20 to-purple-50/30',
      accent1: 'bg-emerald-400/10',
      accent2: 'bg-blue-400/10',
      accent3: 'bg-purple-400/10'
    },
    social: {
      gradient: 'from-violet-50/30 via-purple-50/20 to-fuchsia-50/30',
      accent1: 'bg-violet-400/10',
      accent2: 'bg-purple-400/10',
      accent3: 'bg-fuchsia-400/10'
    },
    tasks: {
      gradient: 'from-blue-50/30 via-cyan-50/20 to-indigo-50/30',
      accent1: 'bg-blue-400/10',
      accent2: 'bg-cyan-400/10',
      accent3: 'bg-indigo-400/10'
    },
    schedule: {
      gradient: 'from-violet-50/30 via-purple-50/20 to-fuchsia-50/30',
      accent1: 'bg-violet-400/10',
      accent2: 'bg-purple-400/10',
      accent3: 'bg-fuchsia-400/10'
    },
    customer_service: {
      gradient: 'from-cyan-50/30 via-teal-50/20 to-emerald-50/30',
      accent1: 'bg-cyan-400/10',
      accent2: 'bg-teal-400/10',
      accent3: 'bg-emerald-400/10'
    },
    training: {
      gradient: 'from-indigo-50/30 via-blue-50/20 to-violet-50/30',
      accent1: 'bg-indigo-400/10',
      accent2: 'bg-blue-400/10',
      accent3: 'bg-violet-400/10'
    },
    equipment: {
      gradient: 'from-orange-50/30 via-amber-50/20 to-red-50/30',
      accent1: 'bg-orange-400/10',
      accent2: 'bg-amber-400/10',
      accent3: 'bg-red-400/10'
    },
    editors: {
      gradient: 'from-purple-50/30 via-fuchsia-50/20 to-pink-50/30',
      accent1: 'bg-purple-400/10',
      accent2: 'bg-fuchsia-400/10',
      accent3: 'bg-pink-400/10'
    },
    hr_accounting: {
      gradient: 'from-rose-50/30 via-pink-50/20 to-red-50/30',
      accent1: 'bg-rose-400/10',
      accent2: 'bg-pink-400/10',
      accent3: 'bg-red-400/10'
    },
    admin: {
      gradient: 'from-slate-50/30 via-gray-50/20 to-zinc-50/30',
      accent1: 'bg-slate-400/10',
      accent2: 'bg-gray-400/10',
      accent3: 'bg-zinc-400/10'
    },
    home: {
      gradient: 'from-slate-50 via-emerald-50/30 to-blue-50/30',
      accent1: 'bg-emerald-400/10',
      accent2: 'bg-blue-400/10',
      accent3: 'bg-purple-400/10'
    }
  };

  const theme = appThemes[currentApp] || appThemes.home;

  // Skip layout for public/auth pages
  if (publicPages.includes(currentPageName) || !user) {
    return <>{children}</>;
  }

  // Check department access
  const userDepartments = user?.departments || [];
  const isAdmin = user?.role === 'admin';

  // No sidebar layout for specific pages
  if (noSidebarPages.includes(currentPageName)) {
    return (
      <div className={cn("min-h-screen bg-gradient-to-br from-slate-50", theme.gradient, "relative overflow-hidden")}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={cn("absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl", theme.accent1)} />
          <div className={cn("absolute top-1/3 -left-32 w-80 h-80 rounded-full blur-3xl", theme.accent2)} />
          <div className={cn("absolute -bottom-24 right-1/4 w-96 h-96 rounded-full blur-3xl", theme.accent3)} />
        </div>
        <div className="relative z-10">
          <Toaster position={isMobile ? "bottom-center" : "top-right"} />
          {React.cloneElement(children, { user, currentApp, onAppSwitcherOpen: () => setShowAppSwitcher(true) })}
        </div>
        <AppSwitcher
          isOpen={showAppSwitcher}
          onClose={() => setShowAppSwitcher(false)}
          currentApp={currentApp}
          onAppSelect={handleAppSelect}
          userDepartments={isAdmin ? ['sales', 'social', 'admin'] : userDepartments}
          userAppOrder={user?.app_order}
        />
      </div>
    );
  }
  const hasAccess = isAdmin || (currentApp === 'admin' ? isAdmin : userDepartments.includes(currentApp));

  if (!hasAccess && userDepartments.length > 0) {
    // Auto-switch to accessible app
    handleAppSelect(userDepartments[0]);
    return null;
  }

  return (
    <div className={cn("min-h-screen bg-gradient-to-br from-slate-50", theme.gradient, "flex relative overflow-hidden")}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cn("absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl", theme.accent1)} />
        <div className={cn("absolute top-1/3 -left-32 w-80 h-80 rounded-full blur-3xl", theme.accent2)} />
        <div className={cn("absolute -bottom-24 right-1/4 w-96 h-96 rounded-full blur-3xl", theme.accent3)} />
      </div>
      <Toaster position={isMobile ? "bottom-center" : "top-right"} />
      
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:translate-x-0",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar
          currentApp={currentApp}
          currentPage={currentPageName}
          user={user}
          onAppSwitcherOpen={() => setShowAppSwitcher(true)}
          onLogout={handleLogout}
          isAdmin={isAdmin}
          onNavigate={() => setMobileMenuOpen(false)}
          onClose={() => setMobileMenuOpen(false)}
          openLeadsCount={openLeadsCount}
        />
      </div>

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden lg:ml-64 relative z-10">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-slate-200 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-slate-600" />
              ) : (
                <Menu className="w-5 h-5 text-slate-600" />
              )}
            </button>
            <h1 className="text-base md:text-lg font-semibold text-slate-900">
              {currentPageName?.replace(/([A-Z])/g, ' $1').trim()}
            </h1>
            </div>
            </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {React.cloneElement(children, { user, currentApp })}
        </main>
      </div>

      <AppSwitcher
        isOpen={showAppSwitcher}
        onClose={() => setShowAppSwitcher(false)}
        currentApp={currentApp}
        onAppSelect={handleAppSelect}
        userDepartments={isAdmin ? ['sales', 'social', 'admin'] : userDepartments}
        userAppOrder={user?.app_order}
      />
    </div>
  );
}