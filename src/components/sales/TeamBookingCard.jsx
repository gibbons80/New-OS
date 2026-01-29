import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ThumbsUp, MessageCircle, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function TeamBookingCard({ booking, currentUser }) {
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const queryClient = useQueryClient();

  // Fetch notes (likes and comments) for this booking
  const { data: notes = [] } = useQuery({
    queryKey: ['booking-notes', booking.id],
    queryFn: () => base44.entities.Note.filter({
      related_to_type: 'booking',
      related_to_id: booking.id,
      department: 'sales'
    }),
    enabled: expanded
  });

  const likes = notes.filter(n => n.category === 'general' && n.content === 'liked');
  const comments = notes.filter(n => n.category === 'general' && n.content !== 'liked');
  const hasLiked = likes.some(l => l.author_id === currentUser?.id);

  const toggleLikeMutation = useMutation({
    mutationFn: async () => {
      if (hasLiked) {
        const myLike = likes.find(l => l.author_id === currentUser?.id);
        await base44.entities.Note.delete(myLike.id);
      } else {
        await base44.entities.Note.create({
          content: 'liked',
          category: 'general',
          related_to_type: 'booking',
          related_to_id: booking.id,
          author_id: currentUser?.id,
          author_name: currentUser?.full_name,
          department: 'sales'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-notes', booking.id] });
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: async (text) => {
      await base44.entities.Note.create({
        content: text,
        category: 'general',
        related_to_type: 'booking',
        related_to_id: booking.id,
        author_id: currentUser?.id,
        author_name: currentUser?.full_name,
        department: 'sales'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-notes', booking.id] });
      setCommentText('');
    }
  });

  const handleAddComment = (e) => {
    e.preventDefault();
    if (commentText.trim()) {
      addCommentMutation.mutate(commentText);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium">
          {booking.booked_by_name?.charAt(0) || 'U'}
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">
              {booking.booked_by_name}
            </span>
            <span className="text-slate-500">booked a shoot!</span>
          </div>
          <div className="text-sm text-slate-400">
            {booking.address && <span>{booking.address} • </span>}
            {format(new Date(booking.created_date), 'h:mm a')}
          </div>
        </div>
        <ChevronDown className={cn(
          "w-5 h-5 text-slate-400 transition-transform",
          expanded && "rotate-180"
        )} />
      </button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-100"
          >
            <div className="p-4 space-y-4">
              {/* Like and Comment Actions */}
              <div className="flex items-center gap-4">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLikeMutation.mutate();
                  }}
                  disabled={toggleLikeMutation.isPending}
                  className={cn(
                    "flex items-center gap-2 text-sm transition-colors",
                    hasLiked 
                      ? "text-blue-600 hover:text-blue-700" 
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <ThumbsUp className={cn("w-4 h-4", hasLiked && "fill-current")} />
                  <span>{likes.length}</span>
                </button>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <MessageCircle className="w-4 h-4" />
                  <span>{comments.length}</span>
                </div>
              </div>

              {/* Comments Section */}
              {comments.length > 0 && (
                <div className="space-y-2">
                  {comments.map(comment => (
                    <div key={comment.id} className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600 font-medium">
                          {comment.author_name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-medium text-slate-700">
                            {comment.author_name}
                          </div>
                          <div className="text-sm text-slate-600 mt-0.5">
                            {comment.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Comment */}
              <form onSubmit={handleAddComment} className="flex items-center gap-2">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a congratulations..."
                  className="flex-1 h-9"
                  onClick={(e) => e.stopPropagation()}
                />
                <Button 
                  type="submit"
                  size="sm"
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}