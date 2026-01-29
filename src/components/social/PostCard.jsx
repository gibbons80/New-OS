import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Calendar, User, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusConfig = {
  needs_assigned: { label: 'Needs Assigned', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  editing: { label: 'Editing', color: 'bg-blue-100 text-blue-700', icon: Clock },
  waiting_on_cta: { label: 'Waiting on CTA', color: 'bg-amber-100 text-amber-700', icon: Clock },
  waiting_on_caption: { label: 'Waiting on Caption', color: 'bg-amber-100 text-amber-700', icon: Clock },
  ready_to_post: { label: 'Ready to Post', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  posted: { label: 'Posted', color: 'bg-slate-100 text-slate-500', icon: CheckCircle },
};

const brandColors = {
  brad_personal: 'border-l-violet-500',
  brads_youtube: 'border-l-red-500',
  lifestyle_production_group: 'border-l-emerald-500',
  windowstill: 'border-l-blue-500',
};

const brandLabels = {
  brad_personal: 'Brad\'s Instagram',
  brads_youtube: 'Brad\'s YouTube',
  lifestyle_production_group: 'Lifestyle Production',
  windowstill: 'WindowStill',
};

export default function PostCard({ post }) {
  const status = statusConfig[post.content_status] || statusConfig.needs_assigned;
  const StatusIcon = status.icon;

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const assignedUser = users.find(u => u.id === post.assigned_to_id);

  const isOverdue = post.scheduled_date && 
    new Date(post.scheduled_date) < new Date() && 
    !post.posted;

  return (
    <Link 
      to={createPageUrl(`PostDetail?id=${post.id}`)}
      className={cn(
        "block bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all border-l-4",
        brandColors[post.brand],
        isOverdue && "ring-2 ring-red-200"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 line-clamp-1">{post.title}</h3>
          <p className="text-sm text-slate-500 mt-0.5">{brandLabels[post.brand]}</p>
        </div>
        <Badge className={cn("shrink-0", status.color)}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {status.label}
        </Badge>
      </div>

      <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
        {post.scheduled_date && !isNaN(new Date(post.scheduled_date).getTime()) && (
          <div className={cn(
            "flex items-center gap-1",
            isOverdue && "text-red-500"
          )}>
            <Calendar className="w-4 h-4" />
            {formatInTimeZone(new Date(post.scheduled_date), 'Etc/GMT+5', 'MMM d')}
          </div>
        )}
        {post.assigned_to_name && (
          <div className="flex items-center gap-1.5">
            {assignedUser?.profile_photo_url ? (
              <img
                src={assignedUser.profile_photo_url}
                alt={post.assigned_to_name}
                className="w-5 h-5 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <User className="w-4 h-4" />
            )}
            <span className="truncate">{post.assigned_to_name}</span>
          </div>
        )}
      </div>

      {isOverdue && post.scheduled_date && !isNaN(new Date(post.scheduled_date).getTime()) && (
        <div className="mt-3 text-xs text-red-500 font-medium">
          Overdue - scheduled for {formatInTimeZone(new Date(post.scheduled_date), 'Etc/GMT+5', 'MMM d')} EST
        </div>
      )}
    </Link>
  );
}