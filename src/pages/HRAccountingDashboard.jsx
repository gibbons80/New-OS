import React from 'react';
import { Briefcase } from 'lucide-react';
import HiringFunnelOverview from '@/components/hr/HiringFunnelOverview';
import AverageTimeToActive from '@/components/hr/AverageTimeToActive';
import StaffStatusBreakdown from '@/components/hr/StaffStatusBreakdown';
import OnboardingProgress from '@/components/hr/OnboardingProgress';
import CandidateTaskManagement from '@/components/hr/CandidateTaskManagement';

export default function HRAccountingDashboard({ user }) {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-rose-600" />
          HR/Accounting Dashboard
        </h1>
        <p className="text-slate-500 mt-1">People & finance management overview</p>
      </div>

      {/* Hiring Funnel */}
      <HiringFunnelOverview />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AverageTimeToActive />
        <StaffStatusBreakdown />
        <OnboardingProgress />
      </div>

      {/* Candidate Task Management */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-rose-100 flex items-center justify-center">
            <svg className="w-3 h-3 text-rose-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
              <path fillRule="evenodd" d="M3 7a1 1 0 011-1h5v2H4v6h12v-6h-5V6h5a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V7z" clipRule="evenodd" />
            </svg>
          </div>
          Hiring Tasks
        </h2>
        <CandidateTaskManagement user={user} />
      </div>
    </div>
  );
}