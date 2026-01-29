import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap, AlertCircle, CheckCircle } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export default function TrainingDashboard({ user }) {
  const [linkedStaff, setLinkedStaff] = useState(null);

  const { data: staffData } = useQuery({
    queryKey: ['training-staff-dashboard', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const staffMembers = await base44.entities.Staff.filter({ user_id: user.id });
      return staffMembers[0] || null;
    },
    enabled: !!user?.id
  });

  useEffect(() => {
    if (staffData) {
      setLinkedStaff(staffData);
    }
  }, [staffData]);

  if (!linkedStaff) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-600" />
            Training Dashboard
          </h1>
          <p className="text-slate-500 mt-1">Learning & development resources</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <GraduationCap className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Training Profile</h3>
          <p className="text-slate-500">Your training profile is being set up</p>
        </div>
      </div>
    );
  }

  // Calculate training progress
  const startDate = linkedStaff.start_date ? parseISO(linkedStaff.start_date + 'Z') : null;
  const trainingDeadline = 45; // days
  let daysElapsed = 0;
  let daysRemaining = 0;
  let progressPercent = 0;
  let isCompleted = false;
  let isOverdue = false;

  if (startDate) {
    daysElapsed = differenceInDays(new Date(), startDate);
    daysRemaining = Math.max(0, trainingDeadline - daysElapsed);
    progressPercent = Math.min(100, (daysElapsed / trainingDeadline) * 100);
    isCompleted = daysRemaining === 0;
    isOverdue = daysElapsed > trainingDeadline;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-indigo-600" />
          Training Dashboard
        </h1>
        <p className="text-slate-500 mt-1">Learning & development resources</p>
      </div>

      {/* Training Progress Card */}
      {linkedStaff.photographer_status === 'training' && startDate && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Photo School Completion</h2>
              <p className="text-sm text-slate-500 mt-1">
                Started {format(toZonedTime(startDate, 'America/New_York'), 'MMMM d, yyyy')}
              </p>
            </div>
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${
              isOverdue 
                ? 'bg-red-100 text-red-700' 
                : isCompleted 
                ? 'bg-emerald-100 text-emerald-700'
                : daysRemaining <= 7
                ? 'bg-amber-100 text-amber-700'
                : 'bg-indigo-100 text-indigo-700'
            }`}>
              {isOverdue || isCompleted ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {isOverdue 
                ? 'Deadline Passed'
                : isCompleted 
                ? 'Completed!'
                : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`
              }
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <span className="text-sm text-slate-600">Progress</span>
              <span className="text-sm font-semibold text-slate-900">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isOverdue 
                    ? 'bg-red-500' 
                    : isCompleted 
                    ? 'bg-emerald-500'
                    : daysRemaining <= 7
                    ? 'bg-amber-500'
                    : 'bg-indigo-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>{daysElapsed} days elapsed</span>
              <span>{trainingDeadline} day deadline</span>
            </div>
          </div>

          {/* Status Message */}
          <div className="mt-6 p-4 rounded-lg bg-slate-50 border border-slate-200">
            {isOverdue ? (
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-red-600">Training deadline has passed.</span> Please contact your training manager to discuss next steps.
              </p>
            ) : isCompleted ? (
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-emerald-600">Training deadline reached!</span> Great work on completing your photo school requirements.
              </p>
            ) : daysRemaining <= 7 ? (
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-amber-600">Final stretch!</span> You have {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining to complete your training requirements.
              </p>
            ) : (
              <p className="text-sm text-slate-700">
                You have <span className="font-semibold">{daysRemaining} days</span> to complete your photo school training. Complete all requirements to advance to active status.
              </p>
            )}
          </div>
        </div>
      )}

      {linkedStaff.photographer_status !== 'training' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <GraduationCap className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Training Completed</h3>
          <p className="text-slate-500">Your training has been completed. Continue learning and developing your skills!</p>
        </div>
      )}
    </div>
  );
}