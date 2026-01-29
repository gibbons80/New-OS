import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

const STAGES = [
  { id: 'my_interview_completed', label: 'My Interview Done', icon: '✅', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'scheduling_interview', label: 'Scheduling', icon: '📅', color: 'bg-blue-100 text-blue-700' },
  { id: 'interviewing', label: 'Interviewing', icon: '🎤', color: 'bg-purple-100 text-purple-700' },
  { id: 'interview_completed', label: 'Interview Done', icon: '😊', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'request_to_hire', label: 'Request to Hire', icon: '🤝', color: 'bg-cyan-100 text-cyan-700' },
  { id: 'offer_sent', label: 'Offer Sent', icon: '📬', color: 'bg-pink-100 text-pink-700' },
  { id: 'hired', label: 'Hired', icon: '🎉', color: 'bg-green-100 text-green-700' },
];

export default function HiringFunnelOverview() {
  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['candidates-funnel'],
    queryFn: () => base44.entities.Candidate.list(),
    initialData: [],
  });

  // Count candidates per stage (excluding rejected)
  const stageCounts = STAGES.map(stage => ({
    ...stage,
    count: candidates.filter(c => c.stage === stage.id).length
  }));

  const totalActive = candidates.filter(c => c.stage !== 'rejected').length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/3"></div>
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
              Hiring Funnel
            </h3>
            <p className="text-sm text-slate-500 mt-1">{totalActive} active candidates</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {stageCounts.map(stage => (
            <div key={stage.id} className="text-center">
              <div className={`${stage.color} rounded-lg p-3 mb-2`}>
                <div className="text-2xl mb-1">{stage.icon}</div>
                <div className="text-2xl font-bold">{stage.count}</div>
              </div>
              <p className="text-xs text-slate-600 font-medium">{stage.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}