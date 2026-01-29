import React from 'react';
import { format, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

const statusColors = {
  needs_assigned: 'bg-red-100 border-red-300',
  editing: 'bg-blue-100 border-blue-300',
  waiting_on_cta: 'bg-amber-100 border-amber-300',
  waiting_on_caption: 'bg-amber-100 border-amber-300',
  ready_to_post: 'bg-emerald-100 border-emerald-300',
  posted: 'bg-slate-100 border-slate-300',
};

export default function CalendarDay({ date, posts, onPostClick }) {
  const dayPosts = posts.filter(p => 
    p.scheduled_date && isSameDay(new Date(p.scheduled_date), date)
  );

  return (
    <div className={cn(
      "min-h-[120px] border border-slate-100 p-2",
      isToday(date) && "bg-violet-50"
    )}>
      <div className={cn(
        "text-sm font-medium mb-2",
        isToday(date) ? "text-violet-600" : "text-slate-600"
      )}>
        {format(date, 'd')}
      </div>
      <div className="space-y-1">
        {dayPosts.slice(0, 3).map(post => (
          <button
            key={post.id}
            onClick={() => onPostClick(post)}
            className={cn(
              "w-full text-left text-xs p-1.5 rounded border truncate hover:opacity-80 transition-opacity",
              statusColors[post.content_status]
            )}
          >
            {post.title}
          </button>
        ))}
        {dayPosts.length > 3 && (
          <div className="text-xs text-slate-400 pl-1">
            +{dayPosts.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
}