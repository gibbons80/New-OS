import React, { useState } from 'react';
import { Search, Filter, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const SAVED_VIEWS_KEY = 'feedback_saved_views';

export default function AdvancedFilters({ filters, onFilterChange }) {
  const [showFilters, setShowFilters] = useState(false);
  const [savedViews, setSavedViews] = useState(() => {
    const saved = localStorage.getItem(SAVED_VIEWS_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [viewName, setViewName] = useState('');

  const hasActiveFilters = 
    filters.status !== 'all' || 
    filters.category !== 'all' || 
    filters.app !== 'all' ||
    filters.department !== 'all' ||
    filters.priority !== 'all' ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.searchQuery;

  const clearFilters = () => {
    onFilterChange({
      status: 'all',
      category: 'all',
      app: 'all',
      department: 'all',
      priority: 'all',
      dateFrom: '',
      dateTo: '',
      searchQuery: ''
    });
  };

  const saveView = () => {
    if (!viewName.trim()) return;
    
    const newView = {
      id: Date.now().toString(),
      name: viewName,
      filters: { ...filters }
    };
    
    const updated = [...savedViews, newView];
    setSavedViews(updated);
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(updated));
    setViewName('');
  };

  const loadView = (view) => {
    onFilterChange(view.filters);
  };

  const deleteView = (viewId) => {
    const updated = savedViews.filter(v => v.id !== viewId);
    setSavedViews(updated);
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(updated));
  };

  return (
    <div className="mb-6">
      {/* Search and Filter Toggle */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search feedback by title, description..."
              value={filters.searchQuery}
              onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="whitespace-nowrap"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  •
                </span>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Status</label>
              <Select value={filters.status} onValueChange={(value) => onFilterChange({ ...filters, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Up Next">Up Next</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Category</label>
              <Select value={filters.category} onValueChange={(value) => onFilterChange({ ...filters, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Bug Report">Bug Report</SelectItem>
                  <SelectItem value="Feature Request">Feature Request</SelectItem>
                  <SelectItem value="UI/UX Improvement">UI/UX Improvement</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">App</label>
              <Select value={filters.app} onValueChange={(value) => onFilterChange({ ...filters, app: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Apps</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Priority</label>
              <Select value={filters.priority} onValueChange={(value) => onFilterChange({ ...filters, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Department</label>
              <Select value={filters.department} onValueChange={(value) => onFilterChange({ ...filters, department: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="customer_service">Customer Service</SelectItem>
                  <SelectItem value="editors">Editors</SelectItem>
                  <SelectItem value="photographers">Photographers</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="accounting">Accounting</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Date From</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Date To</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
              />
            </div>
          </div>

          {/* Save View */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Save current filters as..."
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && saveView()}
                className="flex-1"
              />
              <Button onClick={saveView} disabled={!viewName.trim()}>
                <Save className="w-4 h-4 mr-2" />
                Save View
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Views */}
      {savedViews.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {savedViews.map((view) => (
            <div
              key={view.id}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2"
            >
              <button
                onClick={() => loadView(view)}
                className="text-sm font-medium text-slate-700 hover:text-blue-600"
              >
                {view.name}
              </button>
              <button
                onClick={() => deleteView(view.id)}
                className="text-slate-400 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}