import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { formatInEST } from '@/components/dateFormatter';

export default function UpcomingStartDates() {
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff-upcoming-starts'],
    queryFn: () => base44.entities.Staff.list(),
    initialData: [],
  });

  // Get staff with upcoming start dates (within next 30 days)
  const today = new Date();
  const thirtyDaysFromNow = addDays(today, 30);

  const upcomingStarts = staff
    .filter(s => {
      if (!s.start_date) return false;
      const startDate = parseISO(s.start_date);
      return isAfter(startDate, today) && isBefore(startDate, thirtyDaysFromNow);
    })
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .slice(0, 5);

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
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-6">
          <Calendar className="w-5 h-5 text-rose-600" />
          Upcoming Start Dates
        </h3>

        {upcomingStarts.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">No upcoming start dates in the next 30 days</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingStarts.map(s => {
              const startDate = parseISO(s.start_date);
              const daysUntil = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
              
              return (
                <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-rose-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {s.preferred_name || s.legal_full_name}
                      </p>
                      <p className="text-sm text-slate-600">{s.primary_role || 'Staff Member'}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="text-sm font-semibold text-slate-900">
                      {format(startDate, 'MMM d, yyyy')}
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 text-xs mt-1">
                      {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}