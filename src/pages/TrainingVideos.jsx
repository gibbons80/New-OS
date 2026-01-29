import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  PlayCircle, 
  CheckCircle2, 
  Clock,
  ChevronRight,
  BookOpen,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function TrainingVideos({ user }) {
  const navigate = useNavigate();

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['my-course-enrollments'],
    queryFn: async () => {
      const staff = await base44.entities.Staff.filter({ user_id: user?.id });
      if (!staff || staff.length === 0) return [];
      
      const enrollments = await base44.entities.StaffCourseEnrollment.filter({ 
        staff_id: staff[0].id 
      });
      return enrollments;
    },
    enabled: !!user?.id
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.filter({ is_active: true }, 'order')
  });



  const isAdmin = user?.role === 'admin';
  
  const enrolledCourses = isAdmin 
    ? courses 
    : courses.filter(course => enrollments.some(e => e.course_id === course.id));

  const getEnrollmentForCourse = (courseId) => {
    return enrollments.find(e => e.course_id === courseId);
  };

  const courseTypeLabels = {
    photo_shoot: 'Photo Shoot',
    marketing_and_coaching: 'Marketing & Coaching',
    add_on_training: 'Add-on Training'
  };

  const statusColors = {
    enrolled: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700'
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
          <p className="text-slate-500">Loading courses...</p>
        </div>
      </div>
    );
  }

  if (enrolledCourses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">No Courses Yet</h2>
          <p className="text-slate-600">
            You haven't been enrolled in any training courses yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Training Courses</h1>
        <p className="text-slate-500 mt-1">Access your enrolled courses and lessons</p>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
        {enrolledCourses.map(course => {
          const enrollment = getEnrollmentForCourse(course.id);
          return (
            <div 
              key={course.id}
              onClick={() => navigate(`${createPageUrl('CourseViewer')}?course_id=${course.id}`)}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group flex flex-col h-full"
            >
              {/* Thumbnail - 3x2 aspect ratio */}
              <div className="relative w-full aspect-video bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                {course.thumbnail_url ? (
                  <img 
                    src={course.thumbnail_url} 
                    alt={course.course_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen className="w-16 h-16 text-white/80" />
                )}
                <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-slate-900/30 transition-colors" />
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col flex-grow">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-grow">
                    <h3 className="font-semibold text-slate-900 text-lg mb-1 line-clamp-2">
                      {course.course_name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {courseTypeLabels[course.course_type]}
                    </p>
                  </div>
                  <Badge className={cn("text-xs flex-shrink-0", statusColors[enrollment?.enrollment_status || 'enrolled'])}>
                    {(enrollment?.enrollment_status || 'enrolled').replace('_', ' ')}
                  </Badge>
                </div>

                {course.description && (
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    {course.description}
                  </p>
                )}

                {/* Progress */}
                <div className="space-y-2 mt-auto pt-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Progress</span>
                    <span>{enrollment?.progress_percent || 0}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all"
                      style={{ width: `${enrollment?.progress_percent || 0}%` }}
                    />
                  </div>
                </div>

                <Button 
                  className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => navigate(`${createPageUrl('CourseViewer')}?course_id=${course.id}`)}
                >
                  Start Course
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}