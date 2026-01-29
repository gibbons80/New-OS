import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Settings, Plus, Edit2, Trash2, Loader2, CheckCircle, GripVertical, Upload, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ThirdPartyPhotographerCSVImport from '@/components/cs/ThirdPartyPhotographerCSVImport';

export default function CSSettings({ user }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({
    group_name: '',
    services: []
  });
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isGeocodingStaff, setIsGeocodingStaff] = useState(false);
  const [isGeocodingThirdParty, setIsGeocodingThirdParty] = useState(false);

  const { data: serviceGroups = [] } = useQuery({
    queryKey: ['cs-service-groups'],
    queryFn: () => base44.entities.CSServiceGroup.list('order')
  });

  const { data: serviceTemplates = [] } = useQuery({
    queryKey: ['service-templates'],
    queryFn: () => base44.entities.ServiceTemplate.list('service_name')
  });

  const createGroupMutation = useMutation({
    mutationFn: (data) => base44.entities.CSServiceGroup.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['cs-service-groups']);
      toast.success('Service group created');
      resetForm();
    },
    onError: () => toast.error('Failed to create group')
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CSServiceGroup.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['cs-service-groups']);
      toast.success('Service group updated');
      resetForm();
    },
    onError: () => toast.error('Failed to update group')
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id) => base44.entities.CSServiceGroup.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['cs-service-groups']);
      toast.success('Service group deleted');
    },
    onError: () => toast.error('Failed to delete group')
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (updates) => {
      await Promise.all(
        updates.map(({ id, order }) =>
          base44.entities.CSServiceGroup.update(id, { order })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cs-service-groups']);
    }
  });

  const resetForm = () => {
    setGroupForm({ group_name: '', services: [] });
    setEditingGroup(null);
    setShowDialog(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (group) => {
    setEditingGroup(group);
    setGroupForm({
      group_name: group.group_name,
      services: group.services || []
    });
    setShowDialog(true);
  };

  const handleToggleService = (serviceName) => {
    setGroupForm(prev => {
      const isSelected = prev.services.includes(serviceName);
      if (isSelected) {
        return {
          ...prev,
          services: prev.services.filter(name => name !== serviceName)
        };
      } else {
        return {
          ...prev,
          services: [...prev.services, serviceName]
        };
      }
    });
  };

  const handleSave = () => {
    if (!groupForm.group_name.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    if (groupForm.services.length === 0) {
      toast.error('Please select at least one service');
      return;
    }

    const data = {
      ...groupForm,
      order: editingGroup ? editingGroup.order : serviceGroups.length
    };

    if (editingGroup) {
      updateGroupMutation.mutate({ id: editingGroup.id, data });
    } else {
      createGroupMutation.mutate(data);
    }
  };

  const handleGeocodeThirdParty = async () => {
    if (!confirm('This will geocode all third-party photographers without coordinates. This may take a few minutes. Continue?')) {
      return;
    }

    setIsGeocodingThirdParty(true);
    try {
      const result = await base44.functions.invoke('geocodeThirdPartyPhotographers');
      toast.success(`Updated ${result.data.updated} photographers. ${result.data.failed} failed.`);
      if (result.data.errors && result.data.errors.length > 0) {
        console.log('Geocoding errors:', result.data.errors);
      }
    } catch (error) {
      toast.error('Geocoding failed: ' + error.message);
    } finally {
      setIsGeocodingThirdParty(false);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(serviceGroups);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updates = items.map((item, index) => ({
      id: item.id,
      order: index
    }));

    updateOrderMutation.mutate(updates);
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
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-cyan-600" />
          Customer Service Settings
        </h1>
        <p className="text-slate-500 mt-1">Configure customer service preferences and workflows</p>
      </div>

      {/* Service Groups Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Service Groups</h2>
            <p className="text-sm text-slate-500 mt-1">
              Group related services together for easier filtering on the map
            </p>
          </div>
          <Button onClick={openCreateDialog} className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="w-4 h-4 mr-2" />
            New Group
          </Button>
        </div>

        {serviceGroups.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
            <p className="text-slate-500">No service groups yet</p>
            <Button
              variant="outline"
              size="sm"
              onClick={openCreateDialog}
              className="mt-4"
            >
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
                          className={`border border-slate-200 rounded-lg p-4 bg-slate-50 transition-shadow ${
                            snapshot.isDragging ? 'shadow-lg' : 'hover:border-cyan-300'
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
                              <p className="text-sm text-slate-500 mt-1">
                                {group.services.length} service{group.services.length !== 1 ? 's' : ''}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-3">
                                {group.services.map(service => (
                                  <Badge key={service} variant="secondary" className="text-xs">
                                    {service}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(group)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Delete this service group?')) {
                                    deleteGroupMutation.mutate(group.id);
                                  }
                                }}
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
      </div>

      {/* Staff Photographer Geocoding */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Geocode Staff Locations</h2>
            <p className="text-sm text-slate-500 mt-1">
              Convert staff photographer addresses to map coordinates
            </p>
          </div>
          <Button 
           variant="outline"
           onClick={async () => {
             if (!confirm('This will geocode all staff photographers with addresses. Continue?')) return;
             setIsGeocodingStaff(true);
             try {
               const result = await base44.functions.invoke('geocodeStaffPhotographers');
               toast.success(`Updated ${result.data.updated} staff. ${result.data.failed} failed.`);
             } catch (error) {
               toast.error('Geocoding failed: ' + error.message);
             } finally {
               setIsGeocodingStaff(false);
             }
           }}
           disabled={isGeocodingStaff}
          >
           {isGeocodingStaff ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
           Geocode Staff
          </Button>
        </div>
      </div>

      {/* Third-Party Photographer Import */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Import Third-Party Photographers</h2>
            <p className="text-sm text-slate-500 mt-1">
              Upload a CSV file to bulk import third-party photographer data
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={handleGeocodeThirdParty}
              disabled={isGeocodingThirdParty}
            >
              {isGeocodingThirdParty ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
              Fix Map Locations
            </Button>
            <Button onClick={() => setShowImportDialog(true)} className="bg-cyan-600 hover:bg-cyan-700">
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Import Dialog */}
      <ThirdPartyPhotographerCSVImport 
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? 'Edit Service Group' : 'Create Service Group'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="groupName">Group Name *</Label>
              <Input
                id="groupName"
                value={groupForm.group_name}
                onChange={(e) => setGroupForm(prev => ({ ...prev, group_name: e.target.value }))}
                placeholder="e.g., Real Estate Photography, Drone Certified"
              />
            </div>

            <div>
              <Label>Services in this Group *</Label>
              <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto p-2 border rounded-lg bg-slate-50 mt-2">
                {serviceTemplates.map(template => {
                  const isInAnotherGroup = serviceGroups.some(g => 
                    g.id !== editingGroup?.id && g.services?.includes(template.service_name)
                  );
                  const isSelected = groupForm.services.includes(template.service_name);
                  
                  return (
                    <button
                      key={template.id}
                      onClick={() => !isInAnotherGroup && handleToggleService(template.service_name)}
                      disabled={isInAnotherGroup}
                      className={`p-3 text-left rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-50 text-cyan-900'
                          : isInAnotherGroup
                          ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? 'border-cyan-500 bg-cyan-500'
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
              {groupForm.services.length > 0 && (
                <p className="text-sm text-slate-600 mt-2">
                  {groupForm.services.length} service{groupForm.services.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createGroupMutation.isPending || updateGroupMutation.isPending}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {(createGroupMutation.isPending || updateGroupMutation.isPending) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingGroup ? 'Update Group' : 'Create Group'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}