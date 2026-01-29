import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Video,
  Upload,
  Trash2,
  Edit2,
  Plus,
  Loader2,
  FileVideo,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactQuill from 'react-quill';
import LessonCategoryManager from '@/components/training/LessonCategoryManager';

// Video Preview Component with Signed URL
function VideoPreview({ videoKey, onDelete, isDeleting = false }) {
  const [videoUrl, setVideoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching signed URL for:', videoKey);
        const response = await base44.functions.invoke('getSignedUrl', { file_key: videoKey });
        console.log('Signed URL response:', response);
        if (response?.data?.signed_url) {
          setVideoUrl(response.data.signed_url);
        } else {
          setError('Invalid response from server');
        }
      } catch (err) {
        console.error('Failed to load video:', err);
        setError(err.message || 'Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    if (videoKey) {
      fetchSignedUrl();
    }
  }, [videoKey]);

  return (
    <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden">
      {loading ? (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      ) : error ? (
        <div className="w-full h-full flex flex-col items-center justify-center text-white p-4">
          <p className="text-red-400 mb-2">Error loading video</p>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      ) : videoUrl ? (
        <video 
          key={videoUrl}
          src={videoUrl}
          controls
          className="w-full h-full"
          onError={(e) => {
            console.error('Video element error:', e);
            setError('Failed to play video');
          }}
        >
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white">
          <p className="text-slate-400">No video URL</p>
        </div>
      )}
      <Button
        variant="destructive"
        size="sm"
        className="absolute top-2 right-2 z-10"
        onClick={onDelete}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <X className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}

export default function TrainingVideoSettings({ user }) {
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null);
  const [showLessonDialog, setShowLessonDialog] = useState(false);
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFileSize, setUploadFileSize] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [dragActiveThumbnail, setDragActiveThumbnail] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const videoInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);
  const uploadStartTimeRef = useRef(null);

  const [lessonForm, setLessonForm] = useState({
    lesson_title: '',
    lesson_description: '',
    content: '',
    duration_minutes: '',
    video_url: '',
    category_id: null,
    order: 0
  });
  const [courseForm, setCourseForm] = useState({
    course_name: '',
    course_type: 'photography',
    thumbnail_url: ''
  });
  const [deletingVideo, setDeletingVideo] = useState(false);

  const { data: courses = [] } = useQuery({
    queryKey: ['courses-admin'],
    queryFn: () => base44.entities.Course.list('-order')
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons-admin', selectedCourse?.id],
    queryFn: () => base44.entities.Lesson.filter({ course_id: selectedCourse.id }, 'order'),
    enabled: !!selectedCourse?.id
  });

  const createLessonMutation = useMutation({
    mutationFn: (data) => base44.entities.Lesson.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['lessons-admin']);
      toast.success('Lesson created successfully');
      resetForm();
    },
    onError: () => toast.error('Failed to create lesson')
  });

  const updateLessonMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lesson.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['lessons-admin']);
      toast.success('Lesson updated successfully');
      resetForm();
    },
    onError: () => toast.error('Failed to update lesson')
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (lesson) => {
      // Delete video from S3 first if it exists
      if (lesson.video_url) {
        try {
          await base44.functions.invoke('deleteFromS3', { key: lesson.video_url });
        } catch (error) {
          console.error('Failed to delete video from S3:', error);
        }
      }
      // Then delete the lesson
      return base44.entities.Lesson.delete(lesson.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lessons-admin']);
      toast.success('Lesson deleted');
    },
    onError: () => toast.error('Failed to delete lesson')
  });

  const createCourseMutation = useMutation({
    mutationFn: (data) => base44.entities.Course.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['courses-admin']);
      toast.success('Course created successfully');
      resetCourseForm();
    },
    onError: () => toast.error('Failed to create course')
  });

  const updateCourseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Course.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['courses-admin']);
      setSelectedCourse(prev => ({ ...prev, ...courseForm }));
      toast.success('Course updated successfully');
      resetCourseForm();
    },
    onError: () => toast.error('Failed to update course')
  });

  const handleVideoUpload = async (file) => {
    if (!file) return;
    
    if (!file.type.startsWith('video/')) {
      toast.error('Please upload a video file');
      return;
    }

    setUploading(true);
    setUploadFileSize(file.size);
    setUploadProgress(10); // Start at 10%
    uploadStartTimeRef.current = Date.now();

    try {
      // First upload to get a temporary URL
      setUploadProgress(25); // Uploading to temp storage
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      
      setUploadProgress(60); // Moving to S3
      // Then move it to S3 (no size limit - S3 handles direct uploads)
      const { data } = await base44.functions.invoke('uploadToS3', { 
        source_url: uploadResult.file_url,
        folder: 'training-videos',
        file_name: file.name,
        content_type: file.type
      });
      
      setUploadProgress(100); // Complete
      setLessonForm(prev => ({ ...prev, video_url: data.file_key }));
      toast.success('Video uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload video');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadFileSize(null);
      uploadStartTimeRef.current = null;
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleVideoUpload(e.dataTransfer.files[0]);
    }
  };

  const resetForm = () => {
    setLessonForm({
      lesson_title: '',
      lesson_description: '',
      content: '',
      duration_minutes: '',
      video_url: '',
      category_id: selectedCategoryId,
      order: lessons.length
    });
    setEditingLesson(null);
    setShowLessonDialog(false);
  };

  const resetCourseForm = () => {
    setCourseForm({
      course_name: '',
      course_type: 'photography',
      thumbnail_url: ''
    });
    setEditingCourse(null);
    setShowCourseDialog(false);
  };

  const openEditCourseDialog = (course) => {
    setEditingCourse(course);
    setCourseForm({
      course_name: course.course_name || '',
      course_type: course.course_type || 'photography',
      thumbnail_url: course.thumbnail_url || ''
    });
    setShowCourseDialog(true);
  };

  const openCreateCourseDialog = () => {
    resetCourseForm();
    setShowCourseDialog(true);
  };

  const openEditDialog = (lesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      lesson_title: lesson.lesson_title,
      lesson_description: lesson.lesson_description || '',
      content: lesson.content || '',
      duration_minutes: lesson.duration_minutes || '',
      video_url: lesson.video_url || '',
      order: lesson.order || 0
    });
    setShowLessonDialog(true);
  };

  const openCreateDialog = () => {
    setSelectedCategoryId(null);
    resetForm();
    setShowLessonDialog(true);
  };

  const handleSave = () => {
    if (!lessonForm.lesson_title.trim()) {
      toast.error('Please enter a lesson title');
      return;
    }

    const data = {
      course_id: selectedCourse.id,
      course_name: selectedCourse.course_name,
      ...lessonForm,
      duration_minutes: lessonForm.duration_minutes ? Number(lessonForm.duration_minutes) : null,
      category_id: selectedCategoryId || null
    };

    if (editingLesson) {
      updateLessonMutation.mutate({ id: editingLesson.id, data });
    } else {
      createLessonMutation.mutate(data);
    }
  };

  const handleAddLessonFromCategory = (categoryId) => {
    setSelectedCategoryId(categoryId);
    setLessonForm(prev => ({ ...prev, category_id: categoryId }));
    setShowLessonDialog(true);
  };

  const handleDeleteVideo = async () => {
    if (!lessonForm.video_url) return;
    
    setDeletingVideo(true);
    try {
      await base44.functions.invoke('deleteFromS3', { file_key: lessonForm.video_url });
      setLessonForm(prev => ({ ...prev, video_url: '' }));
      toast.success('Video removed');
    } catch (error) {
      console.error('Delete video error:', error);
      toast.error('Failed to delete video');
    } finally {
      setDeletingVideo(false);
    }
  };

  const handleThumbnailUpload = async (file) => {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setThumbnailUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setCourseForm(prev => ({ ...prev, thumbnail_url: result.file_url }));
      toast.success('Thumbnail uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload thumbnail');
    } finally {
      setThumbnailUploading(false);
    }
  };

  const handleSaveCourse = () => {
    if (!courseForm.course_name.trim()) {
      toast.error('Please enter a course name');
      return;
    }

    if (editingCourse) {
      updateCourseMutation.mutate({ id: editingCourse.id, data: courseForm });
    } else {
      createCourseMutation.mutate({ ...courseForm, order: courses.length });
    }
  };

  const handleThumbnailDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActiveThumbnail(true);
    } else if (e.type === 'dragleave') {
      setDragActiveThumbnail(false);
    }
  };

  const handleThumbnailDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveThumbnail(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleThumbnailUpload(e.dataTransfer.files[0]);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-slate-600">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Manage Training Videos</h1>
        <p className="text-slate-500 mt-1">Upload and organize video lessons for courses</p>
      </div>

      {/* Course Selection */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <Label className="mb-0">Select Course</Label>
          <Button 
            size="sm"
            onClick={openCreateCourseDialog}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Course
          </Button>
        </div>
        <Select 
          value={selectedCourse?.id || ''} 
          onValueChange={(courseId) => {
            const course = courses.find(c => c.id === courseId);
            setSelectedCourse(course);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a course" />
          </SelectTrigger>
          <SelectContent>
            {courses.map(course => (
              <SelectItem key={course.id} value={course.id}>
                {course.course_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedCourse && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEditCourseDialog(selectedCourse)}
            className="mt-3 w-full"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Course Details
          </Button>
        )}
      </div>

      {selectedCourse && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <LessonCategoryManager 
            courseId={selectedCourse.id}
            courseName={selectedCourse.course_name}
            onAddLesson={handleAddLessonFromCategory}
            lessons={lessons}
            onEditLesson={openEditDialog}
            onDeleteLesson={(lesson) => {
              if (confirm('Delete this lesson?')) {
                deleteLessonMutation.mutate(lesson);
              }
            }}
          />
        </div>
      )}

      {/* Course Dialog */}
      <Dialog open={showCourseDialog} onOpenChange={(open) => !open && resetCourseForm()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCourse ? 'Edit Course' : 'Create New Course'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div>
              <Label htmlFor="courseName">Course Name *</Label>
              <Input
                id="courseName"
                value={courseForm.course_name}
                onChange={(e) => setCourseForm(prev => ({ ...prev, course_name: e.target.value }))}
                placeholder="e.g., Real Estate Photography Basics"
              />
            </div>

            <div>
              <Label className="mb-2 block">Thumbnail Image</Label>
              {courseForm.thumbnail_url ? (
                <div className="space-y-2">
                  <img 
                    src={courseForm.thumbnail_url} 
                    alt="Course thumbnail" 
                    className="w-full max-h-64 object-cover rounded-lg border border-slate-200"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCourseForm(prev => ({ ...prev, thumbnail_url: '' }))}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove Image
                  </Button>
                </div>
              ) : (
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                    dragActiveThumbnail ? "border-indigo-500 bg-indigo-50" : "border-slate-300 hover:border-slate-400"
                  )}
                  onDragEnter={handleThumbnailDrag}
                  onDragLeave={handleThumbnailDrag}
                  onDragOver={handleThumbnailDrag}
                  onDrop={handleThumbnailDrop}
                >
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleThumbnailUpload(e.target.files[0])}
                  />
                  {thumbnailUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                      <p className="text-slate-600">Uploading...</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-700 mb-2">
                        Drag and drop an image here, or click to browse
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => thumbnailInputRef.current?.click()}
                      >
                        Select Image
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetCourseForm}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveCourse}
              disabled={createCourseMutation.isPending || updateCourseMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {(createCourseMutation.isPending || updateCourseMutation.isPending) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingCourse ? 'Update Course' : 'Create Course'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={showLessonDialog} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLesson ? 'Edit Lesson' : 'Create New Lesson'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Video Upload */}
            <div>
              <Label className="mb-2 block">Video</Label>
              {lessonForm.video_url ? (
                <VideoPreview 
                  videoKey={lessonForm.video_url}
                  onDelete={handleDeleteVideo}
                  isDeleting={deletingVideo}
                />
              ) : (
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-12 text-center transition-colors",
                    dragActive ? "border-indigo-500 bg-indigo-50" : "border-slate-300 hover:border-slate-400"
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => handleVideoUpload(e.target.files[0])}
                  />
                  {uploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                      <p className="text-slate-600">Uploading video...</p>
                      {uploadFileSize && (
                        <p className="text-sm text-slate-500">
                          {(uploadFileSize / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      )}
                      <div className="w-full max-w-xs bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500">{uploadProgress}% complete</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-700 mb-2">
                        Drag and drop a video here, or click to browse
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => videoInputRef.current?.click()}
                      >
                        Select Video
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">Lesson Title *</Label>
                <Input
                  id="title"
                  value={lessonForm.lesson_title}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, lesson_title: e.target.value }))}
                  placeholder="e.g., Introduction to Real Estate Photography"
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={lessonForm.duration_minutes}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, duration_minutes: e.target.value }))}
                  placeholder="15"
                />
              </div>
              <div>
                <Label htmlFor="order">Order</Label>
                <Input
                  id="order"
                  type="number"
                  value={lessonForm.order}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, order: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Short Description</Label>
              <Textarea
                id="description"
                value={lessonForm.lesson_description}
                onChange={(e) => setLessonForm(prev => ({ ...prev, lesson_description: e.target.value }))}
                placeholder="Brief overview of this lesson"
                rows={3}
              />
            </div>

            {/* Rich Content Editor */}
            <div>
              <Label className="mb-2 block">Lesson Content (text & images)</Label>
              <ReactQuill
                value={lessonForm.content}
                onChange={(value) => setLessonForm(prev => ({ ...prev, content: value }))}
                modules={{
                  toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline'],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    ['link', 'image'],
                    ['clean']
                  ]
                }}
                placeholder="Add text, images, and formatting..."
                className="bg-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={createLessonMutation.isPending || updateLessonMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {(createLessonMutation.isPending || updateLessonMutation.isPending) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Lesson'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}