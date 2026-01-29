import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatInEST } from '../dateFormatter';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EquipmentDetailDialog({ equipment, isOpen, onClose, user }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');

  const { data: comments = [] } = useQuery({
    queryKey: ['equipment-comments', equipment?.id],
    queryFn: () => equipment ? base44.entities.EquipmentComment.filter({
      equipment_id: equipment.id
    }, '-created_date') : [],
    enabled: !!equipment
  });

  const createCommentMutation = useMutation({
    mutationFn: (comment) => base44.entities.EquipmentComment.create({
      equipment_id: equipment.id,
      equipment_name: equipment.name,
      comment,
      author_id: user?.id,
      author_name: user?.full_name
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-comments', equipment.id] });
      setNewComment('');
    }
  });

  if (!equipment) return null;

  const categories = {
    camera: 'Camera',
    lens: 'Lens',
    audio: 'Audio',
    lighting: 'Lighting',
    drone: 'Drone',
    accessory: 'Accessory',
    other: 'Other'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            {equipment.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Equipment Info */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500 font-medium">Model:</span>
                <p className="text-slate-900 mt-1">{equipment.model}</p>
              </div>
              {equipment.serial_number && (
                <div>
                  <span className="text-slate-500 font-medium">Serial Number:</span>
                  <p className="text-slate-900 mt-1">{equipment.serial_number}</p>
                </div>
              )}
              <div>
                <span className="text-slate-500 font-medium">Category:</span>
                <p className="mt-1">
                  <Badge variant="outline">{categories[equipment.category]}</Badge>
                </p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Status:</span>
                <p className="mt-1">
                  {equipment.in_service ? (
                    <Badge className="bg-amber-100 text-amber-700">In Service</Badge>
                  ) : equipment.in_stock ? (
                    <Badge className="bg-emerald-100 text-emerald-700">In Stock</Badge>
                  ) : (
                    <Badge className="bg-blue-100 text-blue-700">Checked Out</Badge>
                  )}
                </p>
              </div>
            </div>
            {equipment.assigned_to_name && (
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-medium text-sm">Assigned To:</span>
                <p className="text-slate-900 mt-1">{equipment.assigned_to_name}</p>
              </div>
            )}
            {equipment.notes && (
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-medium text-sm">Notes:</span>
                <p className="text-slate-700 mt-1">{equipment.notes}</p>
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comments ({comments.length})
            </h3>
            
            {comments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No comments yet</p>
            ) : (
              <div className="space-y-3 mb-4">
                <AnimatePresence>
                  {comments.map(comment => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-white border border-slate-200 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-slate-900 text-sm">{comment.author_name}</span>
                        <span className="text-xs text-slate-400">
                          {formatInEST(comment.created_date, 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <p className="text-slate-700 text-sm">{comment.comment}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Add Comment */}
            <div className="flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newComment.trim()) {
                    createCommentMutation.mutate(newComment.trim());
                  }
                }}
              />
              <Button
                onClick={() => newComment.trim() && createCommentMutation.mutate(newComment.trim())}
                disabled={!newComment.trim() || createCommentMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}