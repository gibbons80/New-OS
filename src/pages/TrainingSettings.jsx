import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Settings, Plus, Edit2, Trash2, CheckCircle, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function TrainingSettings({ user }) {
  const queryClient = useQueryClient();
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({
    group_name: '',
    description: '',
    service_template_ids: [],
    service_names: []
  });

  // Queries
  const { data: serviceTemplates = [] } = useQuery({
    queryKey: ['service-templates'],
    queryFn: () => base44.entities.ServiceTemplate.list('service_name')
  });

  const { data: serviceGroups = [] } = useQuery({
    queryKey: ['service-groups'],
    queryFn: () => base44.entities.TrainingServiceGroup.list('sort_order')
  });

  // Mutations
  const createGroupMutation = useMutation({
    mutationFn: (data) => base44.entities.TrainingServiceGroup.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-groups'] });
      toast.success('Service group created');
      setShowGroupDialog(false);
      setGroupForm({ group_name: '', description: '', service_template_ids: [], service_names: [] });
    },
    onError: () => toast.error('Failed to create group')
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TrainingServiceGroup.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-groups'] });
      toast.success('Service group updated');
      setShowGroupDialog(false);
      setEditingGroup(null);
      setGroupForm({ group_name: '', description: '', service_template_ids: [], service_names: [] });
    },
    onError: () => toast.error('Failed to update group')
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id) => base44.entities.TrainingServiceGroup.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-groups'] });
      toast.success('Service group deleted');
    },
    onError: () => toast.error('Failed to delete group')
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (updates) => {
      await Promise.all(
        updates.map(({ id, sort_order }) =>
          base44.entities.TrainingServiceGroup.update(id, { sort_order })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-groups'] });
    }
  });

  // Handlers
  const handleOpenDialog = (group = null) => {
    if (group) {
      setEditingGroup(group);
      setGroupForm({
        group_name: group.group_name,
        description: group.description || '',
        service_template_ids: group.service_template_ids || [],
        service_names: group.service_names || []
      });
    } else {
      setEditingGroup(null);
      setGroupForm({ group_name: '', description: '', service_template_ids: [], service_names: [] });
    }
    setShowGroupDialog(true);
  };

  const handleToggleService = (templateId, serviceName) => {
    setGroupForm(prev => {
      const isSelected = prev.service_template_ids.includes(templateId);
      if (isSelected) {
        return {
          ...prev,
          service_template_ids: prev.service_template_ids.filter(id => id !== templateId),
          service_names: prev.service_names.filter(name => name !== serviceName)
        };
      } else {
        return {
          ...prev,
          service_template_ids: [...prev.service_template_ids, templateId],
          service_names: [...prev.service_names, serviceName]
        };
      }
    });
  };

  const handleSaveGroup = () => {
    if (!groupForm.group_name.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    if (groupForm.service_template_ids.length === 0) {
      toast.error('Please select at least one service');
      return;
    }

    const data = {
      ...groupForm,
      is_active: true,
      sort_order: editingGroup?.sort_order || (() => {
        const maxSortOrder = serviceGroups.reduce((max, group) => Math.max(max, group.sort_order || 0), -1);
        return maxSortOrder + 1;
      })()
    };

    if (editingGroup) {
      updateGroupMutation.mutate({ id: editingGroup.id, data });
    } else {
      createGroupMutation.mutate(data);
    }
  };

  const handleDeleteGroup = (group) => {
    if (confirm(`Delete "${group.group_name}"? This will not affect existing sign-offs.`)) {
      deleteGroupMutation.mutate(group.id);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(serviceGroups);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updates = items.map((item, index) => ({
      id: item.id,
      sort_order: index
    }));

    updateOrderMutation.mutate(updates);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600" />
          Training Settings
        </h1>
        <p className="text-slate-500 mt-1">Configure training app settings</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Service Sign-Off Groups</CardTitle>
            <Button onClick={() => handleOpenDialog()} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              New Group
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {serviceGroups.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg">
              <Settings className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 mb-4">No service groups created yet</p>
              <Button onClick={() => handleOpenDialog()} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create First Group
              </Button>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="service-groups">
                {(provided) => (
                  <div 
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3"
                  >
                    {serviceGroups.map((group, index) => (
                      <Draggable key={group.id} draggableId={group.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`p-4 bg-slate-50 rounded-lg border border-slate-200 transition-shadow ${
                              snapshot.isDragging ? 'shadow-lg' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                {...provided.dragHandleProps}
                                className="mt-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
                              >
                                <GripVertical className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-slate-900">{group.group_name}</h3>
                                {group.description && (
                                  <p className="text-sm text-slate-500 mt-1">{group.description}</p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {group.service_names?.map((name, idx) => (
                                    <span key={idx} className="text-xs px-2 py-1 bg-white border border-slate-200 rounded text-slate-600">
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenDialog(group)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteGroup(group)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Group Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Edit' : 'Create'} Service Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Group Name *
              </label>
              <Input
                value={groupForm.group_name}
                onChange={(e) => setGroupForm({ ...groupForm, group_name: e.target.value })}
                placeholder="e.g., Real Estate Photography, Drone Certified"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Description (Optional)
              </label>
              <Textarea
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                placeholder="Describe what this group represents..."
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Services in this Group *
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto p-2 border rounded-lg bg-slate-50">
                {serviceTemplates.map(template => {
                  const isInAnotherGroup = serviceGroups.some(g => 
                    g.id !== editingGroup?.id && g.service_template_ids?.includes(template.id)
                  );
                  const isSelected = groupForm.service_template_ids.includes(template.id);
                  
                  return (
                    <button
                      key={template.id}
                      onClick={() => !isInAnotherGroup && handleToggleService(template.id, template.service_name)}
                      disabled={isInAnotherGroup}
                      className={`p-3 text-left rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                          : isInAnotherGroup
                          ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500'
                            : 'border-slate-300'
                        }`}>
                          {isSelected && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="text-sm font-medium">{template.service_name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {groupForm.service_template_ids.length > 0 && (
                <p className="text-sm text-slate-600 mt-2">
                  {groupForm.service_template_ids.length} service{groupForm.service_template_ids.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowGroupDialog(false);
                setEditingGroup(null);
                setGroupForm({ group_name: '', description: '', service_template_ids: [], service_names: [] });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveGroup}
              disabled={createGroupMutation.isPending || updateGroupMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {editingGroup ? 'Update' : 'Create'} Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}