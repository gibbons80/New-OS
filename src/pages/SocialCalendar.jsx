import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const statusColors = {
  needs_assigned: 'bg-red-100 border-red-300 text-red-700',
  editing: 'bg-blue-100 border-blue-300 text-blue-700',
  waiting_on_cta: 'bg-amber-100 border-amber-300 text-amber-700',
  waiting_on_caption: 'bg-amber-100 border-amber-300 text-amber-700',
  ready_to_post: 'bg-emerald-100 border-emerald-300 text-emerald-700',
  posted: 'bg-slate-100 border-slate-300 text-slate-500',
};

const brandColors = {
  brad_personal: 'border-l-violet-500',
  lifestyle_production_group: 'border-l-emerald-500',
  windowstill: 'border-l-blue-500',
};

export default function SocialCalendar({ user }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [brandFilter, setBrandFilter] = useState('all');

  const { data: posts = [] } = useQuery({
    queryKey: ['social-posts'],
    queryFn: () => base44.entities.SocialPost.filter({ department: 'social' }, '-created_date', 500)
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const filteredPosts = posts.filter(p => 
    brandFilter === 'all' || p.brand === brandFilter
  );

  const getPostsForDay = (date) => {
    return filteredPosts.filter(p => 
      p.scheduled_date && isSameDay(new Date(p.scheduled_date), date)
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Content Calendar</h1>
          <p className="text-slate-500 mt-1">Plan and schedule your social content</p>
        </div>
        <Link to={createPageUrl('SocialPosts')}>
          <Button className="bg-violet-600 hover:bg-violet-700">
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </Button>
        </Link>
      </div>

      {/* Calendar Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h2 className="text-xl font-semibold text-slate-900 w-48 text-center">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
        </div>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            <SelectItem value="brad_personal">Brad Personal</SelectItem>
            <SelectItem value="lifestyle_production_group">Lifestyle Production</SelectItem>
            <SelectItem value="windowstill">WindowStill</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-slate-500 bg-slate-50">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, idx) => {
            const dayPosts = getPostsForDay(date);
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isOverdue = dayPosts.some(p => 
              new Date(p.scheduled_date) < new Date() && !p.posted
            );

            return (
              <div 
                key={idx}
                className={cn(
                  "min-h-[140px] border-b border-r border-slate-100 p-2",
                  !isCurrentMonth && "bg-slate-50",
                  isToday(date) && "bg-violet-50"
                )}
              >
                <div className={cn(
                  "text-sm font-medium mb-2 flex items-center justify-between",
                  isToday(date) ? "text-violet-600" : 
                  isCurrentMonth ? "text-slate-900" : "text-slate-400"
                )}>
                  <span>{format(date, 'd')}</span>
                  {dayPosts.length > 0 && (
                    <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                      {dayPosts.length}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {dayPosts.slice(0, 3).map(post => (
                    <Link
                      key={post.id}
                      to={createPageUrl(`PostDetail?id=${post.id}`)}
                      className={cn(
                        "block text-xs p-1.5 rounded border truncate transition-opacity hover:opacity-80 border-l-2",
                        statusColors[post.content_status],
                        brandColors[post.brand]
                      )}
                    >
                      {post.title}
                    </Link>
                  ))}
                  {dayPosts.length > 3 && (
                    <div className="text-xs text-slate-400 pl-1">
                      +{dayPosts.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 flex-wrap">
        <div className="text-sm text-slate-500">Status:</div>
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded border", color.split(' ')[0], color.split(' ')[1])} />
            <span className="text-sm text-slate-600 capitalize">
              {status.replace(/_/g, ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}