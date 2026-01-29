import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';

// Video Player Component with Signed URL
function VideoPlayer({ videoKey }) {
  const [videoUrl, setVideoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      try {
        setLoading(true);
        const { data } = await base44.functions.invoke('getSignedUrl', { file_key: videoKey });
        setVideoUrl(data.signed_url);
      } catch (err) {
        setError('Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    if (videoKey) {
      fetchSignedUrl();
    }
  }, [videoKey]);

  if (loading) {
    return (
      <div className="w-full aspect-video flex items-center justify-center bg-slate-900 rounded-lg">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full aspect-video flex items-center justify-center bg-slate-900 rounded-lg">
        <p className="text-white">{error}</p>
      </div>
    );
  }

  return (
    <video
      src={videoUrl}
      controls
      className="w-full aspect-video rounded-lg"
      controlsList="nodownload"
    >
      Your browser does not support the video tag.
    </video>
  );
}

export default function CourseViewer({ user }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('course_id');
  const lessonParam = searchParams.get('lesson');
  const queryClient = useQueryClient();

  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const courses = await base44.entities.Course.filter({ id: courseId });
      return courses[0];
    },
    enabled: !!courseId
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons', courseId],
    queryFn: () => base44.entities.Lesson.filter({ 
      course_id: courseId,
      is_active: true 
    }, 'order'),
    enabled: !!courseId
  });

  const { data: enrollment } = useQuery({
    queryKey: ['enrollment', courseId],
    queryFn: async () => {
      const staff = await base44.entities.Staff.filter({ user_id: user?.id });
      if (!staff || staff.length === 0) return null;
      
      const enrollments = await base44.entities.StaffCourseEnrollment.filter({ 
        staff_id: staff[0].id,
        course_id: courseId
      });
      return enrollments[0];
    },
    enabled: !!courseId && !!user?.id
  });

  const currentLessonIndex = lessonParam 
    ? lessons.findIndex(l => l.id === lessonParam)
    : 0;
  const currentLesson = lessons[currentLessonIndex];

  const markCompletedMutation = useMutation({
    mutationFn: async (lessonId) => {
      if (!enrollment) return;
      const completedLessons = enrollment.completed_lessons || [];
      if (!completedLessons.includes(lessonId)) {
        await base44.entities.StaffCourseEnrollment.update(enrollment.id, {
          completed_lessons: [...completedLessons, lessonId]
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['enrollment', courseId]);
    }
  });

  const isLessonCompleted = (lessonId) => {
    return enrollment?.completed_lessons?.includes(lessonId) || false;
  };

  const goToLesson = (lessonId) => {
    const url = `${createPageUrl('CourseViewer')}?course_id=${courseId}&lesson=${lessonId}`;
    navigate(url);
  };

  const goToNext = () => {
    if (currentLesson) {
      markCompletedMutation.mutate(currentLesson.id);
    }
    if (currentLessonIndex < lessons.length - 1) {
      goToLesson(lessons[currentLessonIndex + 1].id);
    }
  };

  const goToPrevious = () => {
    if (currentLessonIndex > 0) {
      goToLesson(lessons[currentLessonIndex - 1].id);
    }
  };

  const courseTypeLabels = {
    photo_shoot: 'Photo Shoot',
    marketing_and_coaching: 'Marketing & Coaching',
    add_on_training: 'Add-on Training'
  };

  if (!courseId || !course) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-slate-600">Course not found</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate(createPageUrl('TrainingVideos'))}
          >
            Back to Courses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl('TrainingVideos'))}
          className="text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Courses
        </Button>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-500">
            {enrollment?.progress_percent || 0}% Complete
          </div>
          <div className="h-2 w-32 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all"
              style={{ width: `${enrollment?.progress_percent || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Course Title */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
          {courseTypeLabels[course.course_type]}
        </div>
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
          {course.course_name}
        </h1>
        <p className="text-slate-600 text-lg">
          Lesson {currentLessonIndex + 1} of {lessons.length}
        </p>
      </div>

      {/* Video Player */}
      {currentLesson?.video_url && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <VideoPlayer videoKey={currentLesson.video_url} />
        </div>
      )}

      {/* Lesson Title & Duration */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {currentLesson?.lesson_title}
          </h2>
          {currentLesson?.duration_minutes && (
            <div className="flex items-center gap-2 text-slate-500">
              <Clock className="w-4 h-4" />
              <span>{currentLesson.duration_minutes} minutes</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={goToPrevious}
          disabled={currentLessonIndex === 0}
          size="lg"
          className="flex-1"
        >
          <ChevronLeft className="w-5 h-5 mr-2" />
          Previous Lesson
        </Button>
        <Button
          onClick={goToNext}
          disabled={currentLessonIndex === lessons.length - 1}
          size="lg"
          className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
        >
          {currentLessonIndex === lessons.length - 1 ? 'Complete Course' : 'Next Lesson'}
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>

      {/* Lesson Description */}
      {currentLesson?.lesson_description && (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-8 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">About this lesson</h3>
          <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
            {currentLesson.lesson_description}
          </p>
        </div>
      )}

      {/* Lesson Content */}
      {currentLesson?.content && (
        <div className="bg-white rounded-xl p-8 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Lesson Content</h3>
          <div 
            className="prose prose-slate prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: currentLesson.content }}
          />
        </div>
      )}

      {/* All Lessons */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Course Lessons ({lessons.length})
        </h3>
        <div className="space-y-2">
          {lessons.map((lesson, idx) => {
            const isCompleted = isLessonCompleted(lesson.id);
            const isCurrent = lesson.id === currentLesson?.id;
            return (
              <button
                key={lesson.id}
                onClick={() => goToLesson(lesson.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-lg transition-all text-left border-2",
                  isCurrent 
                    ? "bg-indigo-50 border-indigo-200" 
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <div className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold",
                  isCurrent ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                )}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium",
                    isCurrent ? "text-indigo-900" : "text-slate-900"
                  )}>
                    {lesson.lesson_title}
                  </p>
                  {lesson.duration_minutes && (
                    <p className="text-sm text-slate-500 mt-0.5">
                      {lesson.duration_minutes} min
                    </p>
                  )}
                </div>
                {isCurrent && (
                  <div className="flex-shrink-0 px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded-full">
                    Current
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}