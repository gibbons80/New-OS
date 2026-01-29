import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatInEST } from '../dateFormatter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, Send, X, Upload, Image as ImageIcon, Edit2, Save, CheckCircle, User, Wrench, Trash2, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function EquipmentDetailPanel({ equipment, onClose, user }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [checkoutReason, setCheckoutReason] = useState('');

  const { data: equipmentData } = useQuery({
    queryKey: ['equipment', equipment?.id],
    queryFn: async () => {
      const allEquipment = await base44.entities.Equipment.list();
      return allEquipment.find(e => e.id === equipment.id);
    },
    enabled: !!equipment,
    initialData: equipment
  });

  const currentEquipment = equipmentData || equipment;

  const { data: comments = [] } = useQuery({
    queryKey: ['equipment-comments', equipment?.id],
    queryFn: () => equipment ? base44.entities.EquipmentComment.filter({
      equipment_id: equipment.id
    }, '-created_date') : [],
    enabled: !!equipment
  });

  const { data: history = [] } = useQuery({
    queryKey: ['equipment-history', equipment?.id],
    queryFn: () => equipment ? base44.entities.EquipmentHistory.filter({
      equipment_id: equipment.id
    }, '-action_date') : [],
    enabled: !!equipment
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list()
  });

  const { data: categorySettings = [] } = useQuery({
    queryKey: ['equipment-categories'],
    queryFn: () => base44.entities.AppSetting.filter({ 
      setting_type: 'equipment_category',
      is_active: true 
    }, 'sort_order')
  });

  const updateEquipmentMutation = useMutation({
    mutationFn: async ({ id, data, logHistory }) => {
      const updatedEquipment = await base44.entities.Equipment.update(id, data);
      
      if (logHistory) {
        await base44.entities.EquipmentHistory.create({
          equipment_id: id,
          equipment_name: currentEquipment.name,
          action: logHistory.action,
          assigned_to_id: logHistory.assigned_to_id || null,
          assigned_to_name: logHistory.assigned_to_name || null,
          checked_out_by_id: logHistory.action === 'checked_out' ? user?.id : null,
          checked_out_by_name: logHistory.action === 'checked_out' ? user?.full_name : null,
          checked_in_by_id: logHistory.action === 'checked_in' ? user?.id : null,
          checked_in_by_name: logHistory.action === 'checked_in' ? user?.full_name : null,
          reason: logHistory.reason || null,
          action_date: new Date().toISOString()
        });
      }
      
      return updatedEquipment;
    },
    onSuccess: (updatedEquipment) => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-history'] });
      queryClient.setQueryData(['equipment'], (old) => 
        old?.map(item => item.id === updatedEquipment.id ? updatedEquipment : item)
      );
      setIsEditing(false);
      setShowCheckoutDialog(false);
      setSelectedStaffId('');
      setCheckoutReason('');
    }
  });

  const deleteEquipmentMutation = useMutation({
    mutationFn: (id) => base44.entities.Equipment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      onClose();
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => base44.entities.EquipmentComment.delete(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-comments', equipment.id] });
    }
  });

  React.useEffect(() => {
    if (currentEquipment) {
      setEditData({
        name: currentEquipment.name,
        model: currentEquipment.model,
        serial_number: currentEquipment.serial_number || '',
        category: currentEquipment.category,
        notes: currentEquipment.notes || ''
      });
    }
  }, [currentEquipment]);

  const createCommentMutation = useMutation({
    mutationFn: async (data) => {
      let photoUrls = [];
      
      if (selectedPhotos.length > 0) {
        setUploadingPhotos(true);
        try {
          const uploadPromises = selectedPhotos.map(async (photo) => {
            const { file_url } = await base44.integrations.Core.UploadFile({ file: photo });
            return file_url;
          });
          photoUrls = await Promise.all(uploadPromises);
        } catch (error) {
          console.error('Photo upload failed:', error);
          throw error;
        } finally {
          setUploadingPhotos(false);
        }
      }
      
      return base44.entities.EquipmentComment.create({
        equipment_id: currentEquipment.id,
        equipment_name: currentEquipment.name,
        comment: data.comment,
        photo_urls: photoUrls,
        author_id: user?.id,
        author_name: user?.full_name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-comments', equipment.id] });
      setNewComment('');
      setSelectedPhotos([]);
    }
  });

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedPhotos(prev => [...prev, ...files]);
  };

  const removePhoto = (index) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!newComment.trim() && selectedPhotos.length === 0) return;
    createCommentMutation.mutate({ comment: newComment.trim() || '(Photo)' });
  };

  if (!equipment) return null;

  const categories = categorySettings.reduce((acc, cat) => {
    acc[cat.value] = cat.label;
    return acc;
  }, {});

  return (
    <>
      <AnimatePresence>
        {equipment && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 h-screen w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  {currentEquipment.name}
                </h2>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateEquipmentMutation.mutate({ id: currentEquipment.id, data: editData })}
                        disabled={updateEquipmentMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this equipment?')) {
                            deleteEquipmentMutation.mutate(currentEquipment.id);
                          }
                        }}
                        disabled={deleteEquipmentMutation.isPending}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Equipment Info */}
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-2">Equipment Name</label>
                        <Input
                          value={editData.name}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium text-slate-700 block mb-2">Model</label>
                          <Input
                            value={editData.model}
                            onChange={(e) => setEditData({ ...editData, model: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700 block mb-2">Serial Number</label>
                          <Input
                            value={editData.serial_number}
                            onChange={(e) => setEditData({ ...editData, serial_number: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-2">Category</label>
                        <Select
                          value={editData.category}
                          onValueChange={(v) => setEditData({ ...editData, category: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categorySettings.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-2">Notes</label>
                        <Textarea
                          value={editData.notes}
                          onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                          rows={3}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-slate-500 font-medium">Model:</span>
                          <p className="text-slate-900 mt-1">{currentEquipment.model}</p>
                        </div>
                        {currentEquipment.serial_number && (
                          <div>
                            <span className="text-slate-500 font-medium">Serial Number:</span>
                            <p className="text-slate-900 mt-1">{currentEquipment.serial_number}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500 font-medium">Category:</span>
                          <p className="mt-1">
                            <Badge variant="outline">{categories[currentEquipment.category]}</Badge>
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">Status:</span>
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant={currentEquipment.in_stock && !currentEquipment.in_service ? "default" : "outline"}
                              onClick={() => updateEquipmentMutation.mutate({
                                id: currentEquipment.id,
                                data: {
                                  in_stock: true,
                                  in_service: false,
                                  assigned_to_id: null,
                                  assigned_to_name: null,
                                  checked_out_date: null
                                },
                                logHistory: currentEquipment.assigned_to_id ? {
                                  action: 'checked_in',
                                  assigned_to_id: currentEquipment.assigned_to_id,
                                  assigned_to_name: currentEquipment.assigned_to_name
                                } : null
                              })}
                              className={currentEquipment.in_stock && !currentEquipment.in_service ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              In Stock
                            </Button>
                            <Button
                              size="sm"
                              variant={!currentEquipment.in_stock ? "default" : "outline"}
                              onClick={() => setShowCheckoutDialog(true)}
                              className={!currentEquipment.in_stock ? "bg-blue-600 hover:bg-blue-700" : ""}
                            >
                              <User className="w-3 h-3 mr-1" />
                              Checked Out
                            </Button>
                            <Button
                              size="sm"
                              variant={currentEquipment.in_service ? "default" : "outline"}
                              onClick={() => updateEquipmentMutation.mutate({
                                id: currentEquipment.id,
                                data: { 
                                  in_service: !currentEquipment.in_service,
                                  in_stock: !currentEquipment.in_service ? true : currentEquipment.in_stock,
                                  assigned_to_id: !currentEquipment.in_service ? null : currentEquipment.assigned_to_id,
                                  assigned_to_name: !currentEquipment.in_service ? null : currentEquipment.assigned_to_name
                                }
                              })}
                              className={currentEquipment.in_service ? "bg-amber-600 hover:bg-amber-700" : ""}
                            >
                              <Wrench className="w-3 h-3 mr-1" />
                              Need Repair
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-slate-500 font-medium text-sm block mb-2">Assigned To:</span>
                        {currentEquipment.in_stock ? (
                          <p className="text-slate-400 text-sm">Not assigned</p>
                        ) : (
                          <Select
                            value={currentEquipment.assigned_to_id || ''}
                            onValueChange={(v) => {
                              const selectedStaff = staff.find(s => s.id === v);
                              updateEquipmentMutation.mutate({
                                id: currentEquipment.id,
                                data: {
                                  assigned_to_id: v,
                                  assigned_to_name: selectedStaff?.preferred_name || selectedStaff?.legal_full_name
                                }
                              });
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select staff member..." />
                            </SelectTrigger>
                            <SelectContent>
                              {staff.map(s => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.preferred_name || s.legal_full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      {currentEquipment.notes && (
                        <div className="pt-2 border-t border-slate-200">
                          <span className="text-slate-500 font-medium text-sm">Notes:</span>
                          <p className="text-slate-700 mt-1">{currentEquipment.notes}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Activity Section - Combined History & Comments */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Activity ({history.length + comments.length})
                  </h3>

                  {/* Add Comment - Moved to Top */}
                  <div className="space-y-3 mb-6">
                    {selectedPhotos.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedPhotos.map((photo, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={URL.createObjectURL(photo)}
                              alt={`Preview ${idx + 1}`}
                              className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                            />
                            <button
                              onClick={() => removePhoto(idx)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit();
                          }
                        }}
                      />
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoSelect}
                        className="hidden"
                        id="photo-upload"
                      />
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('photo-upload').click()}
                        disabled={uploadingPhotos}
                      >
                        <ImageIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={(!newComment.trim() && selectedPhotos.length === 0) || createCommentMutation.isPending || uploadingPhotos}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {uploadingPhotos || createCommentMutation.isPending ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {history.length === 0 && comments.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">No activity yet</p>
                  ) : (
                    <div className="space-y-4 mb-4">
                      <AnimatePresence>
                        {[...history.map(h => ({ ...h, type: 'history', date: h.action_date })), 
                          ...comments.map(c => ({ ...c, type: 'comment', date: c.created_date }))]
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .map(item => {
                            if (item.type === 'history') {
                              return (
                                <motion.div
                                  key={`history-${item.id}`}
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="bg-slate-50 rounded-lg p-3 border border-slate-200"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      {item.action === 'checked_out' ? (
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                          <User className="w-4 h-4 text-blue-600" />
                                        </div>
                                      ) : (
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-sm font-medium text-slate-900">
                                          {item.action === 'checked_out' ? 'Checked Out' : 'Checked In'}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          {formatInEST(item.action_date, 'MMM d, yyyy h:mm a')}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="ml-10 space-y-1 text-sm">
                                    {item.assigned_to_name && (
                                      <p className="text-slate-700">
                                        <span className="text-slate-500">Assigned to:</span> {item.assigned_to_name}
                                      </p>
                                    )}
                                    {item.action === 'checked_out' && item.checked_out_by_name && (
                                      <p className="text-slate-700">
                                        <span className="text-slate-500">Checked out by:</span> {item.checked_out_by_name}
                                      </p>
                                    )}
                                    {item.action === 'checked_in' && item.checked_in_by_name && (
                                      <p className="text-slate-700">
                                        <span className="text-slate-500">Checked in by:</span> {item.checked_in_by_name}
                                      </p>
                                    )}
                                    {item.reason && (
                                      <p className="text-slate-700">
                                        <span className="text-slate-500">Reason:</span> {item.reason}
                                      </p>
                                    )}
                                  </div>
                                </motion.div>
                              );
                            } else {
                              const commentAuthor = users.find(u => u.id === item.author_id);
                              return (
                          <motion.div
                            key={`comment-${item.id}`}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-white border border-slate-200 rounded-lg p-4"
                          >
                            <div className="flex items-start gap-3 mb-2">
                              {commentAuthor?.profile_photo_url ? (
                                <img
                                  src={commentAuthor.profile_photo_url}
                                  alt={item.author_name}
                                  className="w-8 h-8 rounded-full object-cover border-2 border-slate-100 shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-sm font-medium shrink-0">
                                  {item.author_name?.charAt(0) || '?'}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-slate-900 text-sm">{item.author_name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">
                                      {formatInEST(item.created_date, 'MMM d, yyyy h:mm a')}
                                    </span>
                                    {(item.author_id === user?.id || user?.role === 'admin') && (
                                      <button
                                        onClick={() => {
                                          if (confirm('Delete this comment?')) {
                                            deleteCommentMutation.mutate(item.id);
                                          }
                                        }}
                                        disabled={deleteCommentMutation.isPending}
                                        className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="ml-11">
                              <p className="text-slate-700 text-sm mb-2">{item.comment}</p>
                              {item.photo_urls && item.photo_urls.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                  {item.photo_urls.map((url, idx) => (
                                    <a
                                      key={idx}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="relative group rounded-lg overflow-hidden border border-slate-200 hover:border-blue-300 transition-colors"
                                    >
                                      <img
                                        src={url}
                                        alt={`Photo ${idx + 1}`}
                                        className="w-full h-32 object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                              );
                            }
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
        </AnimatePresence>

        {/* Checkout Dialog */}
        <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Check Out Equipment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Assign To</label>
              <Select
                value={selectedStaffId}
                onValueChange={setSelectedStaffId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member..." />
                </SelectTrigger>
                <SelectContent>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.preferred_name || s.legal_full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Reason (Optional)</label>
              <Textarea
                value={checkoutReason}
                onChange={(e) => setCheckoutReason(e.target.value)}
                placeholder="e.g., Shoot at Main Street, Training session..."
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => {
                setShowCheckoutDialog(false);
                setCheckoutReason('');
              }}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const selectedStaff = staff.find(s => s.id === selectedStaffId);
                  updateEquipmentMutation.mutate({
                    id: currentEquipment.id,
                    data: {
                      in_stock: false,
                      in_service: false,
                      assigned_to_id: selectedStaffId,
                      assigned_to_name: selectedStaff?.preferred_name || selectedStaff?.legal_full_name,
                      checked_out_date: new Date().toISOString()
                    },
                    logHistory: {
                      action: 'checked_out',
                      assigned_to_id: selectedStaffId,
                      assigned_to_name: selectedStaff?.preferred_name || selectedStaff?.legal_full_name,
                      reason: checkoutReason || null
                    }
                  });
                }}
                disabled={!selectedStaffId || updateEquipmentMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Check Out
              </Button>
            </div>
          </div>
        </DialogContent>
        </Dialog>
        </>
        );
        }