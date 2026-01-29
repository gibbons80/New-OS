import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, GripVertical, Eye, EyeOff, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const colorOptions = [
  { value: 'bg-slate-100', label: 'Gray', preview: 'bg-slate-100' },
  { value: 'bg-blue-100', label: 'Blue', preview: 'bg-blue-100' },
  { value: 'bg-emerald-100', label: 'Green', preview: 'bg-emerald-100' },
  { value: 'bg-yellow-100', label: 'Yellow', preview: 'bg-yellow-100' },
  { value: 'bg-orange-100', label: 'Orange', preview: 'bg-orange-100' },
  { value: 'bg-red-100', label: 'Red', preview: 'bg-red-100' },
  { value: 'bg-purple-100', label: 'Purple', preview: 'bg-purple-100' },
  { value: 'bg-pink-100', label: 'Pink', preview: 'bg-pink-100' },
  { value: 'bg-violet-100', label: 'Violet', preview: 'bg-violet-100' },
];

const autoSelectIcon = (label) => {
  const lowercaseLabel = label.toLowerCase();
  
  if (lowercaseLabel.includes('assign')) return 'AlertCircle';
  if (lowercaseLabel.includes('edit')) return 'Edit3';
  if (lowercaseLabel.includes('waiting') || lowercaseLabel.includes('wait')) {
    if (lowercaseLabel.includes('cta')) return 'Clock';
    if (lowercaseLabel.includes('caption')) return 'MessageSquare';
    return 'Clock';
  }
  if (lowercaseLabel.includes('ready') || lowercaseLabel.includes('post')) {
    if (lowercaseLabel.includes('posted')) return 'CheckCircle';
    return 'Send';
  }
  if (lowercaseLabel.includes('complete') || lowercaseLabel.includes('done')) return 'CheckCircle';
  
  return 'AlertCircle';
};

const settingTypes = [
  { id: 'brand', label: 'Channels', description: 'Social media channels' },
  { id: 'ai_platform', label: 'AI Platforms', description: 'AI tools and platforms' },
  { id: 'content_status', label: 'Content Status', description: 'Post workflow statuses' }
];

export default function SocialSettings({ user }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('brand');
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    value: '',
    label: '',
    color: 'bg-slate-100',
    account_type: '',
    platform_type: '',
    is_active: true
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => base44.entities.AppSetting.list('sort_order')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AppSetting.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      setShowDialog(false);
      setFormData({ value: '', label: '', is_active: true });
      setEditingItem(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AppSetting.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      setShowDialog(false);
      setFormData({ value: '', label: '', is_active: true });
      setEditingItem(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AppSetting.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app-settings'] })
  });

  const filteredSettings = settings.filter(s => s.setting_type === activeTab);

  const generateValue = (label) => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const openDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        value: item.value,
        label: item.label,
        color: item.color || 'bg-slate-100',
        icon: item.icon || 'AlertCircle',
        account_type: item.account_type || '',
        platform_type: item.platform_type || '',
        is_active: item.is_active
      });
    } else {
      setEditingItem(null);
      setFormData({ value: '', label: '', color: 'bg-slate-100', icon: 'AlertCircle', account_type: '', platform_type: '', is_active: true });
    }
    setShowDialog(true);
  };

  const handleSave = () => {
    const data = {
      ...formData,
      setting_type: activeTab,
      sort_order: editingItem?.sort_order || filteredSettings.length
    };

    // Auto-assign icon for content_status if not editing
    if (activeTab === 'content_status' && !editingItem) {
      data.icon = autoSelectIcon(formData.label);
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleActive = (item) => {
    updateMutation.mutate({
      id: item.id,
      data: { ...item, is_active: !item.is_active }
    });
  };

  const handleDragEnd = async (result) => {
    if (!result.destination || result.source.index === result.destination.index) return;

    const items = Array.from(filteredSettings);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Optimistically update the UI
    queryClient.setQueryData(['app-settings'], (old) => {
      const updated = old.map(item => {
        const newIndex = items.findIndex(i => i.id === item.id);
        if (newIndex !== -1) {
          return { ...item, sort_order: newIndex };
        }
        return item;
      });
      return updated;
    });

    // Update all items with new sort_order
    try {
      await Promise.all(
        items.map((item, index) => 
          base44.entities.AppSetting.update(item.id, { sort_order: index })
        )
      );
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    } catch (error) {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Social Media Settings</h1>
        <p className="text-slate-500 mt-1 text-sm md:text-base">Manage channels, platforms, and content options</p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6 h-auto">
          {settingTypes.map(type => (
            <TabsTrigger key={type.id} value={type.id} className="text-xs md:text-sm py-2 md:py-3">
              <span className="hidden sm:inline">{type.label}</span>
              <span className="sm:hidden">{type.id === 'brand' ? 'Channels' : type.id === 'ai_platform' ? 'AI' : 'Status'}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {settingTypes.map(type => (
          <TabsContent key={type.id} value={type.id}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden shadow-lg"
            >
              <div className="p-3 md:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <div>
                  <h3 className="text-sm md:text-base font-semibold text-slate-900">{type.label}</h3>
                  <p className="text-xs md:text-sm text-slate-500 mt-0.5">{type.description}</p>
                </div>
                <Button
                  onClick={() => openDialog()}
                  className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Add New</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId={`settings-${type.id}`}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="divide-y divide-slate-100"
                    >
                      {filteredSettings.length === 0 ? (
                        <div className="p-8 md:p-12 text-center text-slate-400 text-sm md:text-base">
                          No {type.label.toLowerCase()} configured yet
                        </div>
                      ) : (
                        filteredSettings.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={cn(
                                  "p-3 md:p-4 flex items-center gap-2 md:gap-4 transition-colors bg-white",
                                  !item.is_active && "opacity-50",
                                  snapshot.isDragging && "shadow-lg"
                                )}
                              >
                                <div {...provided.dragHandleProps}>
                                  <GripVertical className="w-4 h-4 md:w-5 md:h-5 text-slate-300 cursor-move" />
                                </div>

                                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 md:gap-3 min-w-0">
                                  <div className="font-medium text-sm md:text-base text-slate-900 truncate">{item.label}</div>
                                  {item.setting_type === 'brand' && item.account_type && (
                                    <span className="text-[10px] md:text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded w-fit">
                                      {item.account_type}
                                    </span>
                                  )}
                                  {item.setting_type === 'content_status' && item.color && (
                                    <div className="flex items-center gap-2">
                                      <div className={cn("w-12 md:w-16 h-5 md:h-6 rounded border border-slate-200", item.color)} />
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 md:gap-2">
                                  <button
                                    onClick={() => toggleActive(item)}
                                    className={cn(
                                      "p-1.5 md:p-2 rounded-lg transition-colors",
                                      item.is_active 
                                        ? "hover:bg-slate-100 text-slate-600"
                                        : "hover:bg-slate-100 text-slate-400"
                                    )}
                                    title={item.is_active ? 'Deactivate' : 'Activate'}
                                  >
                                    {item.is_active ? (
                                      <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                    ) : (
                                      <EyeOff className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                    )}
                                  </button>
                                  
                                  <button
                                    onClick={() => openDialog(item)}
                                    className="p-1.5 md:p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                  </button>
                                  
                                  <button
                                    onClick={() => {
                                      if (confirm('Delete this item?')) {
                                        deleteMutation.mutate(item.id);
                                      }
                                    }}
                                    className="p-1.5 md:p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                  </button>
                                </div>
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
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">
              {editingItem ? 'Edit' : 'Add'} {settingTypes.find(t => t.id === activeTab)?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Display Label *
              </label>
              <Input
                value={formData.label}
                onChange={(e) => {
                  const newLabel = e.target.value;
                  const updates = { 
                    ...formData, 
                    label: newLabel,
                    value: generateValue(newLabel)
                  };
                  
                  // Auto-assign icon for content_status as user types
                  if (activeTab === 'content_status') {
                    updates.icon = autoSelectIcon(newLabel);
                  }
                  
                  setFormData(updates);
                }}
                placeholder="e.g., Brad's Instagram"
              />
              <p className="text-xs text-slate-500 mt-1">
                Shown to users in dropdowns
              </p>
            </div>

            {activeTab === 'brand' && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Account Type
                  </label>
                  <Select 
                    value={formData.account_type} 
                    onValueChange={(value) => setFormData({ ...formData, account_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Instagram">Instagram</SelectItem>
                      <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                      <SelectItem value="Facebook">Facebook</SelectItem>
                      <SelectItem value="YouTube">YouTube</SelectItem>
                      <SelectItem value="TikTok">TikTok</SelectItem>
                      <SelectItem value="Twitter">Twitter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Platform for Stats Tracking
                  </label>
                  <Select 
                    value={formData.platform_type} 
                    onValueChange={(value) => setFormData({ ...formData, platform_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform(s)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    Used for stats tracking feature
                  </p>
                </div>
              </>
            )}

            {activeTab === 'content_status' && (
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Color
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {colorOptions.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border-2 transition-all hover:shadow-md",
                        formData.color === color.value 
                          ? "border-violet-600 bg-violet-50" 
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className={cn("w-6 h-6 rounded border border-slate-200", color.preview)} />
                      <span className="text-sm font-medium text-slate-700">{color.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.value || !formData.label || createMutation.isPending || updateMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {editingItem ? 'Save Changes' : 'Add Item'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}