import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, TrendingUp } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

export default function OnboardingProgress() {
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff-photographer-training'],
    queryFn: () => base44.entities.Staff.list(),
    initialData: [],
  });

  // Calculate average days from start_date to 15 shoots for photographers
  const calculateAverageDays = () => {
    // Filter photographers who have reached 15+ shoots and have a start_date
    const completedPhotographers = staff.filter(s => 
      s.worker_type === '1099_photographer' &&
      s.start_date &&
      (s.shoots_completed || 0) >= 15
    );

    if (completedPhotographers.length === 0) return null;

    // Calculate days from start to today (as proxy for when they hit 15 shoots)
    // In reality, you'd need a timestamp for when they hit exactly 15 shoots
    const daysTo15Shoots = completedPhotographers.map(s => {
      const startDate = parseISO(s.start_date);
      const today = new Date();
      return differenceInDays(today, startDate);
    }).filter(days => days >= 0 && days <= 365); // Filter reasonable values

    if (daysTo15Shoots.length === 0) return null;

    const average = daysTo15Shoots.reduce((sum, days) => sum + days, 0) / daysTo15Shoots.length;
    return Math.round(average);
  };

  const averageDays = calculateAverageDays();
  const totalPhotographers = staff.filter(s => s.worker_type === '1099_photographer').length;
  const completedPhotographers = staff.filter(s => s.worker_type === '1099_photographer' && (s.shoots_completed || 0) >= 15).length;

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
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Camera className="w-5 h-5 text-rose-600" />
              Avg. Days to 15 Shoots
            </h3>
            <p className="text-sm text-slate-500 mt-1">Photographer training milestone</p>
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

        <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Completed 15+ Shoots:</span>
            <span className="font-semibold text-slate-900">{completedPhotographers}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Total Photographers:</span>
            <span className="font-semibold text-slate-900">{totalPhotographers}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}