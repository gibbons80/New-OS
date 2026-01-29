import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { MessageSquare, Filter, ExternalLink, FileText, Clock, CheckCircle, XCircle, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import FeedbackDetailPanel from '@/components/FeedbackDetailPanel';
import FeedbackMetrics from '@/components/feedback/FeedbackMetrics';
import KanbanBoard from '@/components/feedback/KanbanBoard';
import AdvancedFilters from '@/components/feedback/AdvancedFilters';

export default function PlatformFeedback({ user }) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'table'
  const [showArchived, setShowArchived] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    app: 'all',
    department: 'all',
    priority: 'all',
    dateFrom: '',
    dateTo: '',
    searchQuery: ''
  });

  const isAdmin = user?.role === 'admin';

  const { data: allFeedback = [] } = useQuery({
    queryKey: ['feedback'],
    queryFn: () => base44.entities.Feedback.list('-created_date')
  });

  // Check URL params for feedback ID
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const feedbackId = urlParams.get('id');
    if (feedbackId && allFeedback.length > 0) {
      const feedbackItem = allFeedback.find(f => f.id === feedbackId);
      if (feedbackItem) {
        setSelectedFeedback(feedbackItem);
      }
    }
  }, [window.location.search, allFeedback]);

  // Update selected feedback when allFeedback changes
  useEffect(() => {
    if (selectedFeedback && allFeedback.length > 0) {
      const updatedFeedback = allFeedback.find(f => f.id === selectedFeedback.id);
      if (updatedFeedback) {
        setSelectedFeedback(updatedFeedback);
      }
    }
  }, [allFeedback]);

  // Filter feedback based on user role
  const feedback = allFeedback.filter(item => {
    // Filter by archived status
    const isArchived = item.archived === true;
    if (isArchived !== showArchived) return false;
    
    if (isAdmin) {
      // Admins see everything
      return true;
    } else {
      // Regular users see their own submissions + all completed/rejected
      return item.submitted_by_id === user?.id || 
             item.status === 'Completed' || 
             item.status === 'Rejected';
    }
  });

  // Apply additional filters
  const filteredFeedback = feedback.filter(item => {
    const statusMatch = filters.status === 'all' || item.status === filters.status;
    const categoryMatch = filters.category === 'all' || item.category === filters.category;
    const appMatch = filters.app === 'all' || item.app_id === filters.app;
    const departmentMatch = filters.department === 'all' || item.department === filters.department;
    const priorityMatch = filters.priority === 'all' || item.priority === filters.priority;
    
    // Date range filtering
    const dateFromMatch = !filters.dateFrom || new Date(item.created_date) >= new Date(filters.dateFrom);
    const dateToMatch = !filters.dateTo || new Date(item.created_date) <= new Date(filters.dateTo + 'T23:59:59');
    
    // Search filtering
    const searchMatch = !filters.searchQuery || 
      item.title.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(filters.searchQuery.toLowerCase());
    
    return statusMatch && categoryMatch && appMatch && departmentMatch && priorityMatch && 
           dateFromMatch && dateToMatch && searchMatch;
  });

  // Calculate stats
  const stats = {
    new: feedback.filter(f => f.status === 'New').length,
    inProgress: feedback.filter(f => f.status === 'In Progress').length,
    completed: feedback.filter(f => f.status === 'Completed').length,
    rejected: feedback.filter(f => f.status === 'Rejected').length,
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Platform Feedback</h1>
            <p className="text-slate-500 mt-1 text-sm md:text-base">
              {isAdmin 
                ? 'View and manage all user feedback' 
                : 'Track your submissions and see what has been resolved'}
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {isAdmin && (
              <>
                <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                  <Button
                    variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('kanban')}
                    className="rounded-none"
                  >
                    <LayoutGrid className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Kanban</span>
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="rounded-none"
                  >
                    <List className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Table</span>
                  </Button>
                </div>
                <Button
                  variant={showArchived ? "default" : "outline"}
                  onClick={() => setShowArchived(!showArchived)}
                  className="text-xs md:text-sm h-9 md:h-10"
                >
                  {showArchived ? 'Active' : 'Archived'}
                </Button>
              </>
            )}
            <Link to={createPageUrl('SubmitFeedback')}>
              <Button className="bg-blue-600 hover:bg-blue-700 text-xs md:text-sm h-9 md:h-10">
                <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4 md:mr-2" />
                <span className="hidden sm:inline">Submit Feedback</span>
                <span className="sm:hidden">Submit</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Dashboard - Admin Only */}
      {isAdmin && <FeedbackMetrics feedback={feedback} />}

      {/* Advanced Filters */}
      <AdvancedFilters filters={filters} onFilterChange={setFilters} />

      {/* View Toggle - Kanban or Table */}
      {filteredFeedback.length === 0 ? (
        <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200 p-8 md:p-12 text-center">
          <MessageSquare className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 text-sm md:text-base">No feedback found</p>
        </div>
      ) : viewMode === 'kanban' && isAdmin ? (
        <KanbanBoard feedback={filteredFeedback} onSelectFeedback={setSelectedFeedback} />
      ) : (
        <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200 overflow-hidden">
          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-slate-100">
            {filteredFeedback.map((item) => {
              const isMySubmission = item.submitted_by_id === user?.id;
              
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedFeedback(item)}
                  className={cn(
                    "p-4 cursor-pointer hover:bg-slate-50 transition-colors",
                    isMySubmission && "bg-blue-50/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-medium text-slate-900 text-sm">
                          {item.title}
                        </h3>
                        {isMySubmission && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded shrink-0">
                            Yours
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-2">{item.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-medium rounded",
                          item.status === 'New' && "bg-blue-100 text-blue-700",
                          item.status === 'In Progress' && "bg-amber-100 text-amber-700",
                          item.status === 'Completed' && "bg-emerald-100 text-emerald-700",
                          item.status === 'Rejected' && "bg-slate-100 text-slate-600"
                        )}>
                          {item.status}
                        </span>
                        <span className="text-[10px] text-slate-500 capitalize">{item.category}</span>
                        <span className="text-[10px] text-slate-500">•</span>
                        <span className="text-[10px] text-slate-500 capitalize">{item.app_id}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{item.submitted_by_name}</span>
                    <span>{format(new Date(item.created_date), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Category</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">App</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Department</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Title</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Submitted By</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Date</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeedback.map((item) => {
                  const isMySubmission = item.submitted_by_id === user?.id;
                  
                  return (
                    <tr 
                      key={item.id} 
                      className={cn(
                        "border-b border-slate-50 hover:bg-slate-50",
                        isMySubmission && "bg-blue-50/30"
                      )}
                    >
                      <td className="p-4">
                        {isAdmin ? (
                          <select
                            value={item.status}
                            onChange={async (e) => {
                              await base44.entities.Feedback.update(item.id, { status: e.target.value });
                              queryClient.invalidateQueries({ queryKey: ['feedback'] });
                            }}
                            className={cn(
                              "px-3 py-1.5 text-xs font-medium rounded-lg border-0 cursor-pointer",
                              item.status === 'New' && "bg-blue-100 text-blue-700",
                              item.status === 'In Progress' && "bg-amber-100 text-amber-700",
                              item.status === 'Completed' && "bg-emerald-100 text-emerald-700",
                              item.status === 'Rejected' && "bg-slate-100 text-slate-600"
                            )}
                          >
                            <option value="New">New</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        ) : (
                          <span className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-lg",
                            item.status === 'New' && "bg-blue-100 text-blue-700",
                            item.status === 'In Progress' && "bg-amber-100 text-amber-700",
                            item.status === 'Completed' && "bg-emerald-100 text-emerald-700",
                            item.status === 'Rejected' && "bg-slate-100 text-slate-600"
                          )}>
                            {item.status}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-slate-700">{item.category}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm capitalize text-slate-700">{item.app_id}</span>
                      </td>
                      <td className="p-4">
                        {item.department ? (
                          <span className="text-sm capitalize text-slate-700">{item.department.replace(/_/g, ' ')}</span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-slate-900 text-sm">
                            {item.title}
                            {isMySubmission && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                Your submission
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-slate-600">{item.submitted_by_name}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs text-slate-500">
                          {format(new Date(item.created_date), 'MMM d, yyyy')}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => setSelectedFeedback(item)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                        >
                          View Details
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {!isAdmin && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 md:p-4">
            <p className="text-xs md:text-sm text-slate-500">Your Submissions</p>
            <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
              {feedback.filter(f => f.submitted_by_id === user?.id).length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 md:p-4">
            <p className="text-xs md:text-sm text-slate-500">In Progress</p>
            <p className="text-xl md:text-2xl font-bold text-amber-600 mt-1">
              {feedback.filter(f => f.submitted_by_id === user?.id && f.status === 'In Progress').length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 md:p-4">
            <p className="text-xs md:text-sm text-slate-500">Completed</p>
            <p className="text-xl md:text-2xl font-bold text-emerald-600 mt-1">
              {feedback.filter(f => f.submitted_by_id === user?.id && f.status === 'Completed').length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 md:p-4">
            <p className="text-xs md:text-sm text-slate-500">Rejected</p>
            <p className="text-xl md:text-2xl font-bold text-slate-400 mt-1">
              {feedback.filter(f => f.submitted_by_id === user?.id && f.status === 'Rejected').length}
            </p>
          </div>
        </div>
      )}

      {/* Feedback Detail Panel */}
      <FeedbackDetailPanel
        feedback={selectedFeedback}
        isOpen={!!selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        onUpdate={(updatedFeedback) => setSelectedFeedback(updatedFeedback)}
        user={user}
      />
    </div>
  );
}