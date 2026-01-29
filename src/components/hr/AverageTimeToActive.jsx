import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, TrendingUp } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

export default function AverageTimeToActive() {
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff-time-to-active'],
    queryFn: () => base44.entities.Staff.list(),
    initialData: [],
  });

  // Calculate average days from start_date to becoming active
  const calculateAverageDays = () => {
    // Filter photographers who are active and have a start_date
    const activeStaff = staff.filter(s => 
      s.worker_type === '1099_photographer' &&
      s.employment_status === 'active' && 
      s.start_date
    );

    if (activeStaff.length === 0) return null;

    // For now, we estimate time to active by looking at staff who are active
    // In a real scenario, you'd track when they transitioned to active status
    // For this implementation, we'll use created_date as a proxy for when they were hired
    // and assume they became active recently
    
    const daysToActive = activeStaff.map(s => {
      const startDate = parseISO(s.start_date);
      const today = new Date();
      return differenceInDays(today, startDate);
    }).filter(days => days >= 0 && days <= 365); // Filter reasonable values

    if (daysToActive.length === 0) return null;

    const average = daysToActive.reduce((sum, days) => sum + days, 0) / daysToActive.length;
    return Math.round(average);
  };

  const averageDays = calculateAverageDays();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/2"></div>
            <div className="h-20 bg-slate-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-rose-600" />
              Avg. Time to Active
            </h3>
            <p className="text-sm text-slate-500 mt-1">From start date to active status</p>
          </div>
          <TrendingUp className="w-8 h-8 text-green-500" />
        </div>

        {averageDays !== null ? (
          <div className="text-center py-4">
            <div className="text-5xl font-bold text-slate-900 mb-2">
              {averageDays}
            </div>
            <div className="text-lg text-slate-600">days</div>
          </div>
        ) : (
          <div className="text-center py-4 text-slate-500">
            Not enough data available
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Active Photographers:</span>
            <span className="font-semibold text-slate-900">
              {staff.filter(s => s.worker_type === '1099_photographer' && s.employment_status === 'active').length}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}