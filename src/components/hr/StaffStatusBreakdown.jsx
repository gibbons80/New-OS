import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700', icon: '📝' },
  onboarding: { label: 'Onboarding', color: 'bg-blue-100 text-blue-700', icon: '🎓' },
  active: { label: 'Active', color: 'bg-green-100 text-green-700', icon: '✅' },
  paused: { label: 'Paused', color: 'bg-yellow-100 text-yellow-700', icon: '⏸️' },
  terminated: { label: 'Terminated', color: 'bg-red-100 text-red-700', icon: '❌' },
};

export default function StaffStatusBreakdown() {
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff-status-breakdown'],
    queryFn: () => base44.entities.Staff.list(),
    initialData: [],
  });

  const statusCounts = Object.keys(STATUS_CONFIG).map(status => ({
    status,
    ...STATUS_CONFIG[status],
    count: staff.filter(s => s.employment_status === status).length
  }));

  const totalStaff = staff.length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/2"></div>
            <div className="h-32 bg-slate-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-600" />
              Staff Status
            </h3>
            <p className="text-sm text-slate-500 mt-1">{totalStaff} total staff members</p>
          </div>
        </div>

        <div className="space-y-3">
          {statusCounts.map(({ status, label, color, icon, count }) => {
            const percentage = totalStaff > 0 ? (count / totalStaff) * 100 : 0;
            return (
              <div key={status}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{count}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`${color.split(' ')[0]} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}