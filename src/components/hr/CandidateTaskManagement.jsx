import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { formatInEST } from '@/components/dateFormatter';
import { formatDistanceToNow } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import CandidateDetailPanel from './CandidateDetailPanel';

export default function CandidateTaskManagement({ user }) {
  const queryClient = useQueryClient();
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);

  // Fetch all candidate-related tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['candidate-tasks'],
    queryFn: async () => {
      const allTasks = await base44.entities.Task.list('-due_date', 500);
      return allTasks.filter(t => t.related_to_type === 'candidate');
    },
  });

  // Fetch selected candidate
  const { data: selectedCandidate } = useQuery({
    queryKey: ['candidate', selectedCandidateId],
    queryFn: () => base44.entities.Candidate.get(selectedCandidateId),
    enabled: !!selectedCandidateId,
  });

  // Mutation to mark task as done
  const completeMutation = useMutation({
    mutationFn: (taskId) => base44.entities.Task.update(taskId, { status: 'done' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['candidate-tasks'] }),
  });

  const handleTaskClick = (task) => {
    setSelectedCandidateId(task.related_to_id);
    setIsDetailPanelOpen(true);
  };

  // Categorize tasks by due date (EST timezone)
  const categorizedTasks = React.useMemo(() => {
    const todayEST = formatInTimeZone(new Date(), 'America/New_York', 'yyyy-MM-dd');

    const categorized = {
      overdue: [],
      today: [],
      upcoming: [],
    };

    tasks.forEach(task => {
      if (task.status === 'done') return;

      if (task.due_date < todayEST) {
        categorized.overdue.push(task);
      } else if (task.due_date === todayEST) {
        categorized.today.push(task);
      } else {
        categorized.upcoming.push(task);
      }
    });

    return categorized;
  }, [tasks]);

  const TaskItem = ({ task, categoryColor }) => (
    <div 
      className="flex items-start gap-3 p-3 bg-slate-50/50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer hover:bg-slate-100"
      onClick={() => handleTaskClick(task)}
    >
      <Button
        size="icon"
        variant="ghost"
        className="mt-0.5 h-6 w-6"
        onClick={(e) => {
          e.stopPropagation();
          completeMutation.mutate(task.id);
        }}
      >
        <CheckCircle2 className={`w-4 h-4 ${categoryColor}`} />
      </Button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{task.related_to_name}</p>
        {task.due_time && (
          <p className="text-xs text-slate-400 mt-0.5">{task.due_time}</p>
        )}
      </div>
      <span className="text-xs text-slate-400 whitespace-nowrap">
        {formatDistanceToNow(new Date(task.due_date), { addSuffix: false })}
      </span>
    </div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Overdue */}
        <Card className={categorizedTasks.overdue.length > 0 ? 'border-red-200 bg-red-50/30' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-red-600" />
              Overdue ({categorizedTasks.overdue.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {categorizedTasks.overdue.length > 0 ? (
              categorizedTasks.overdue.map(task => (
                <TaskItem key={task.id} task={task} categoryColor="text-red-600" />
              ))
            ) : (
              <p className="text-xs text-slate-500">No overdue tasks</p>
            )}
          </CardContent>
        </Card>

        {/* Today */}
        <Card className={categorizedTasks.today.length > 0 ? 'border-amber-200 bg-amber-50/30' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-amber-600" />
              Today ({categorizedTasks.today.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {categorizedTasks.today.length > 0 ? (
              categorizedTasks.today.map(task => (
                <TaskItem key={task.id} task={task} categoryColor="text-amber-600" />
              ))
            ) : (
              <p className="text-xs text-slate-500">No tasks for today</p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming */}
        <Card className={categorizedTasks.upcoming.length > 0 ? 'border-blue-200 bg-blue-50/30' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-blue-600" />
              Upcoming ({categorizedTasks.upcoming.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {categorizedTasks.upcoming.length > 0 ? (
              categorizedTasks.upcoming.map(task => (
                <TaskItem key={task.id} task={task} categoryColor="text-blue-600" />
              ))
            ) : (
              <p className="text-xs text-slate-500">No upcoming tasks</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Candidate Detail Panel */}
      {selectedCandidate && (
        <Sheet open={isDetailPanelOpen} onOpenChange={setIsDetailPanelOpen}>
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{selectedCandidate.preferred_name || selectedCandidate.legal_full_name}</SheetTitle>
            </SheetHeader>
            <CandidateDetailPanel
              candidate={selectedCandidate}
              onSave={() => {
                queryClient.invalidateQueries({ queryKey: ['candidate', selectedCandidateId] });
                queryClient.invalidateQueries({ queryKey: ['candidate-tasks'] });
              }}
              onCancel={() => setIsDetailPanelOpen(false)}
              user={user}
            />
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}