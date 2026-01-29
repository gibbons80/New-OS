import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, GripVertical, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';

export default function AdminSettings({ user }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newCategoryLabel, setNewCategoryLabel] = useState('');

  const { data: settings = [] } = useQuery({
    queryKey: ['kb-categories'],
    queryFn: () => base44.entities.AppSetting.filter({ setting_type: 'kb_category' }, 'sort_order')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AppSetting.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-categories'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      setNewCategoryLabel('');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AppSetting.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-categories'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      setEditingItem(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AppSetting.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-categories'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    }
  });

  const generateValue = (label) => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const handleAddNew = () => {
    if (!newCategoryLabel.trim()) return;
    
    const data = {
      label: newCategoryLabel,
      value: generateValue(newCategoryLabel),
      setting_type: 'kb_category',
      sort_order: settings.length,
      is_active: true
    };
    
    createMutation.mutate(data);
  };

  const handleUpdateLabel = (item, newLabel) => {
    const data = {
      ...item,
      label: newLabel,
      value: generateValue(newLabel)
    };
    updateMutation.mutate({ id: item.id, data });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(settings);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    items.forEach((item, index) => {
      if (item.sort_order !== index) {
        updateMutation.mutate({
          id: item.id,
          data: { ...item, sort_order: index }
        });
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Admin Settings</h1>
        <p className="text-slate-500 mt-1 text-sm md:text-base">Manage system-wide settings and configurations</p>
      </div>

      {/* Knowledge Base Categories */}
      <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
              <h3 className="font-semibold text-slate-900 text-sm md:text-base">Knowledge Base Categories</h3>
            </div>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              {settings.length} {settings.length === 1 ? 'category' : 'categories'} configured
            </p>
          </div>
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-slate-600 hover:bg-slate-700 text-xs md:text-sm h-9 md:h-10 w-full md:w-auto"
          >
            <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2" />
            Edit Categories
          </Button>
        </div>
      </div>

      {/* Categories Management Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Manage Knowledge Base Categories</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Add New Category */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Add New Category
              </label>
              <div className="flex gap-2">
                <Input
                  value={newCategoryLabel}
                  onChange={(e) => setNewCategoryLabel(e.target.value)}
                  placeholder="e.g., Training, FAQ, Scripts..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCategoryLabel.trim()) {
                      handleAddNew();
                    }
                  }}
                />
                <Button
                  onClick={handleAddNew}
                  disabled={!newCategoryLabel.trim() || createMutation.isPending}
                  className="bg-slate-600 hover:bg-slate-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            {/* Existing Categories */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Current Categories
              </label>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="kb-categories-dialog">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2 max-h-[400px] overflow-y-auto"
                    >
                      {settings.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                          No categories yet. Add one above to get started.
                        </div>
                      ) : (
                        settings.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={cn(
                                  "flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg",
                                  snapshot.isDragging && "shadow-lg"
                                )}
                              >
                                <div {...provided.dragHandleProps}>
                                  <GripVertical className="w-5 h-5 text-slate-300 cursor-move" />
                                </div>

                                {editingItem?.id === item.id ? (
                                  <>
                                    <Input
                                      value={editingItem.label}
                                      onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
                                      className="flex-1"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleUpdateLabel(item, editingItem.label);
                                        } else if (e.key === 'Escape') {
                                          setEditingItem(null);
                                        }
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateLabel(item, editingItem.label)}
                                      disabled={!editingItem.label.trim()}
                                      className="bg-slate-600 hover:bg-slate-700"
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingItem(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex-1 font-medium text-slate-900">{item.label}</div>
                                    <button
                                      onClick={() => setEditingItem(item)}
                                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm(`Delete "${item.label}" category?`)) {
                                          deleteMutation.mutate(item.id);
                                        }
                                      }}
                                      className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <Button
                onClick={() => {
                  setShowDialog(false);
                  setEditingItem(null);
                  setNewCategoryLabel('');
                }}
                className="bg-slate-600 hover:bg-slate-700"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}