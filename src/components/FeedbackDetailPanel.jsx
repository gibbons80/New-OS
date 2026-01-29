import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { formatInEST } from '@/components/dateFormatter';
import { X, Send, ExternalLink, Calendar, User, Tag, Monitor, Upload, Image as ImageIcon, Link as LinkIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function FeedbackDetailPanel({ feedback, isOpen, onClose, onUpdate, user }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [commentImages, setCommentImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const isAdmin = user?.role === 'admin';

  const { data: allFeedback = [] } = useQuery({
    queryKey: ['feedback'],
    queryFn: () => base44.entities.Feedback.list('-created_date'),
    enabled: isAdmin
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['feedback-comments', feedback?.id],
    queryFn: () => base44.entities.FeedbackComment.filter({ 
      feedback_id: feedback.id 
    }, '-created_date'),
    enabled: !!feedback?.id
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus) => {
      await base44.entities.Feedback.update(feedback.id, { status: newStatus });
      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      if (onUpdate) {
        onUpdate({ ...feedback, status: newStatus });
      }
    }
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: async (newDepartment) => {
      await base44.entities.Feedback.update(feedback.id, { department: newDepartment });
      return newDepartment;
    },
    onSuccess: (newDepartment) => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      if (onUpdate) {
        onUpdate({ ...feedback, department: newDepartment });
      }
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (newCategory) => {
      await base44.entities.Feedback.update(feedback.id, { category: newCategory });
      return newCategory;
    },
    onSuccess: (newCategory) => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      if (onUpdate) {
        onUpdate({ ...feedback, category: newCategory });
      }
    }
  });

  const archiveMutation = useMutation({
    mutationFn: async (archived) => {
      await base44.entities.Feedback.update(feedback.id, { archived });
      return archived;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      onClose();
    }
  });

  const linkFeedbackMutation = useMutation({
    mutationFn: async (relatedId) => {
      const currentRelated = feedback.related_feedback_ids || [];
      if (!currentRelated.includes(relatedId)) {
        await base44.entities.Feedback.update(feedback.id, {
          related_feedback_ids: [...currentRelated, relatedId]
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      setShowLinkDialog(false);
    }
  });

  const unlinkFeedbackMutation = useMutation({
    mutationFn: async (relatedId) => {
      const currentRelated = feedback.related_feedback_ids || [];
      await base44.entities.Feedback.update(feedback.id, {
        related_feedback_ids: currentRelated.filter(id => id !== relatedId)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
    }
  });

  const createCommentMutation = useMutation({
    mutationFn: async ({ commentText, imageUrls }) => {
      // Create the comment
      await base44.entities.FeedbackComment.create({
        feedback_id: feedback.id,
        comment: commentText,
        author_id: user?.id,
        author_name: user?.full_name,
        author_role: user?.role,
        image_urls: imageUrls
      });

      // Create notification for the other party
      const notifyUserId = isAdmin ? feedback.submitted_by_id : 
                          comments.find(c => c.author_role === 'admin')?.author_id;
      
      if (notifyUserId && notifyUserId !== user?.id) {
        await base44.entities.Notification.create({
          user_id: notifyUserId,
          type: 'feedback_comment',
          title: 'New comment on your feedback',
          message: `${user?.full_name} commented on: ${feedback.title}`,
          link: `PlatformFeedback?id=${feedback.id}`,
          related_id: feedback.id,
          is_read: false
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-comments', feedback?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setNewComment('');
      setCommentImages([]);
    }
  });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImages(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      setCommentImages([...commentImages, ...urls]);
    } catch (error) {
      console.error('Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeCommentImage = (index) => {
    setCommentImages(commentImages.filter((_, i) => i !== index));
  };

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (newComment.trim() || commentImages.length > 0) {
      createCommentMutation.mutate({ 
        commentText: newComment.trim(), 
        imageUrls: commentImages 
      });
    }
  };

  if (!feedback) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 z-10">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-900 flex-1">{feedback.title}</h2>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => archiveMutation.mutate(!feedback.archived)}
                      disabled={archiveMutation.isPending}
                    >
                      {feedback.archived ? 'Unarchive' : 'Archive'}
                    </Button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
              </div>
              
              {/* Status, Category, Priority, App Row */}
              <div className="flex items-center gap-3 flex-wrap">
                {isAdmin ? (
                  <Select
                    value={feedback.status}
                    onValueChange={(value) => updateStatusMutation.mutate(value)}
                  >
                    <SelectTrigger className={cn(
                      "w-40 h-9 border-0 font-medium",
                      feedback.status === 'New' && "bg-blue-100 text-blue-700",
                      feedback.status === 'Up Next' && "bg-purple-100 text-purple-700",
                      feedback.status === 'In Progress' && "bg-amber-100 text-amber-700",
                      feedback.status === 'Completed' && "bg-emerald-100 text-emerald-700",
                      feedback.status === 'Rejected' && "bg-slate-100 text-slate-600"
                    )}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Up Next">Up Next</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg",
                    feedback.status === 'New' && "bg-blue-100 text-blue-700",
                    feedback.status === 'Up Next' && "bg-purple-100 text-purple-700",
                    feedback.status === 'In Progress' && "bg-amber-100 text-amber-700",
                    feedback.status === 'Completed' && "bg-emerald-100 text-emerald-700",
                    feedback.status === 'Rejected' && "bg-slate-100 text-slate-600"
                  )}>
                    {feedback.status}
                  </span>
                )}

                {/* Priority Selector */}
                {isAdmin ? (
                  <Select
                    value={feedback.priority || 'medium'}
                    onValueChange={async (value) => {
                      await base44.entities.Feedback.update(feedback.id, { priority: value });
                      queryClient.invalidateQueries({ queryKey: ['feedback'] });
                      if (onUpdate) onUpdate({ ...feedback, priority: value });
                    }}
                  >
                    <SelectTrigger className={cn(
                      "w-32 h-9 border-0 font-medium",
                      (feedback.priority === 'high' || !feedback.priority) && "bg-red-100 text-red-700",
                      feedback.priority === 'medium' && "bg-amber-100 text-amber-700",
                      feedback.priority === 'low' && "bg-slate-100 text-slate-600"
                    )}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="low">Low Priority</SelectItem>
                    </SelectContent>
                  </Select>
                ) : feedback.priority && (
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg",
                    feedback.priority === 'high' && "bg-red-100",
                    feedback.priority === 'medium' && "bg-amber-100",
                    feedback.priority === 'low' && "bg-slate-100"
                  )}>
                    <Tag className={cn(
                      "w-3.5 h-3.5",
                      feedback.priority === 'high' && "text-red-600",
                      feedback.priority === 'medium' && "text-amber-600",
                      feedback.priority === 'low' && "text-slate-600"
                    )} />
                    <span className={cn(
                      "text-sm capitalize",
                      feedback.priority === 'high' && "text-red-700",
                      feedback.priority === 'medium' && "text-amber-700",
                      feedback.priority === 'low' && "text-slate-700"
                    )}>{feedback.priority}</span>
                  </div>
                )}
                
{isAdmin ? (
                  <Select
                    value={feedback.category}
                    onValueChange={(value) => updateCategoryMutation.mutate(value)}
                  >
                    <SelectTrigger className="w-48 h-9 border-0 font-medium bg-slate-100 text-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bug Report">🐛 Bug Report</SelectItem>
                      <SelectItem value="Feature Request">✨ Feature Request</SelectItem>
                      <SelectItem value="UI/UX Improvement">🎨 UI/UX Improvement</SelectItem>
                      <SelectItem value="Other">💬 Other</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                    <Tag className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-sm text-slate-700">{feedback.category}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                  <Monitor className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-sm text-slate-700 capitalize">{feedback.app_id}</span>
                </div>

{isAdmin ? (
                  <Select
                    value={feedback.department || ''}
                    onValueChange={(value) => updateDepartmentMutation.mutate(value)}
                  >
                    <SelectTrigger className="w-48 h-9 border-0 font-medium bg-purple-100 text-purple-700">
                      <SelectValue placeholder="Select department..." />
                    </SelectTrigger>
                    <SelectContent>
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
                ) : feedback.department ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 rounded-lg">
                    <User className="w-3.5 h-3.5 text-purple-600" />
                    <span className="text-sm text-purple-700 capitalize">{feedback.department.replace(/_/g, ' ')}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Metadata Card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Submission Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-slate-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Submitted By</p>
                      <p className="text-sm font-medium text-slate-900">{feedback.submitted_by_name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-slate-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Date</p>
                      <p className="text-sm font-medium text-slate-900">
                        {formatInEST(feedback.created_date, 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Description</h3>
                <p className="text-slate-700 whitespace-pre-wrap">{feedback.description}</p>
              </div>

              {/* Page Link */}
              {feedback.page_link && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Page/Screen</h3>
                  <p className="text-slate-700">{feedback.page_link}</p>
                </div>
              )}

              {/* Screenshots */}
              {feedback.screenshot_urls?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Screenshots</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {feedback.screenshot_urls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative aspect-video rounded-lg overflow-hidden border border-slate-200 hover:border-blue-500 transition-colors"
                      >
                        <img
                          src={url}
                          alt={`Screenshot ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center">
                          <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Feedback - Admin Only */}
              {isAdmin && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900">Related Feedback</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowLinkDialog(!showLinkDialog)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Link
                    </Button>
                  </div>

                  {showLinkDialog && (
                    <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-600 mb-3">Select feedback to link:</p>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {allFeedback
                          .filter(f => f.id !== feedback.id && !(feedback.related_feedback_ids || []).includes(f.id))
                          .map(item => (
                            <button
                              key={item.id}
                              onClick={() => linkFeedbackMutation.mutate(item.id)}
                              className="w-full text-left p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-500 transition-colors"
                            >
                              <p className="text-sm font-medium text-slate-900">{item.title}</p>
                              <p className="text-xs text-slate-500 mt-1">{item.category} • {item.app_id}</p>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {feedback.related_feedback_ids && feedback.related_feedback_ids.length > 0 ? (
                    <div className="space-y-2">
                      {feedback.related_feedback_ids.map(relatedId => {
                        const relatedItem = allFeedback.find(f => f.id === relatedId);
                        if (!relatedItem) return null;

                        return (
                          <div
                            key={relatedId}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{relatedItem.title}</p>
                              <p className="text-xs text-slate-500">{relatedItem.category} • {relatedItem.app_id}</p>
                            </div>
                            <button
                              onClick={() => unlinkFeedbackMutation.mutate(relatedId)}
                              className="ml-3 text-slate-400 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No linked feedback</p>
                  )}
                </div>
              )}

              {/* Comments Section */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Comments ({comments.length})
                </h3>

                {/* Comments List */}
                <div className="space-y-4 mb-6">
                  {comments.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">
                      No comments yet. Be the first to comment!
                    </p>
                  ) : (
                    comments.map((comment) => {
                      const commentAuthor = users.find(u => u.id === comment.author_id);
                      return (
                      <div
                        key={comment.id}
                        className={cn(
                          "p-4 rounded-lg",
                          comment.author_role === 'admin' 
                            ? "bg-blue-50 border border-blue-100" 
                            : "bg-slate-50 border border-slate-100"
                        )}
                      >
                        <div className="flex items-start gap-3 mb-2">
                          {commentAuthor?.profile_photo_url ? (
                            <img
                              src={commentAuthor.profile_photo_url}
                              alt={comment.author_name}
                              className="w-8 h-8 rounded-full object-cover border-2 border-slate-100 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-sm font-medium shrink-0">
                              {comment.author_name?.charAt(0) || '?'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-slate-900">
                                {comment.author_name}
                              </span>
                              {comment.author_role === 'admin' && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded">
                                  Admin
                                </span>
                              )}
                              <span className="text-xs text-slate-500">
                                {formatInEST(comment.created_date, 'MMM d, h:mm a')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="text-slate-700 text-sm whitespace-pre-wrap ml-11">
                          {comment.comment}
                        </p>
                        {comment.image_urls?.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 mt-3 ml-11">
                            {comment.image_urls.map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative aspect-video rounded-lg overflow-hidden border border-slate-200 hover:border-blue-500 transition-colors"
                              >
                                <img
                                  src={url}
                                  alt={`Attachment ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center">
                                  <ExternalLink className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      );
                    })
                  )}
                </div>

                {/* Add Comment Form */}
                <form onSubmit={handleSubmitComment} className="space-y-3">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={3}
                    className="resize-none"
                  />
                  
                  {/* Image Upload */}
                  <div className="space-y-2">
                    <label className={cn(
                      "flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                      uploadingImages ? "border-slate-200 bg-slate-50" : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                    )}>
                      <ImageIcon className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {uploadingImages ? 'Uploading...' : 'Attach Images'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        disabled={uploadingImages}
                        className="hidden"
                      />
                    </label>

                    {commentImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {commentImages.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Upload ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg border border-slate-200"
                            />
                            <button
                              type="button"
                              onClick={() => removeCommentImage(index)}
                              className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={(!newComment.trim() && commentImages.length === 0) || createCommentMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {createCommentMutation.isPending ? 'Sending...' : 'Send Comment'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}