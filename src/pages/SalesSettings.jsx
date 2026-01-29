import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Plus, Edit2, Trash2, GripVertical, Eye, EyeOff, Settings, Palette, Info, Bell, TrendingUp, Calendar, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  { value: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Gray' },
  { value: 'bg-red-100 text-red-700 border-red-200', label: 'Red' },
  { value: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Orange' },
  { value: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Amber' },
  { value: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Yellow' },
  { value: 'bg-lime-100 text-lime-700 border-lime-200', label: 'Lime' },
  { value: 'bg-green-100 text-green-700 border-green-200', label: 'Green' },
  { value: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Emerald' },
  { value: 'bg-teal-100 text-teal-700 border-teal-200', label: 'Teal' },
  { value: 'bg-cyan-100 text-cyan-700 border-cyan-200', label: 'Cyan' },
  { value: 'bg-sky-100 text-sky-700 border-sky-200', label: 'Sky' },
  { value: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Blue' },
  { value: 'bg-indigo-100 text-indigo-700 border-indigo-200', label: 'Indigo' },
  { value: 'bg-violet-100 text-violet-700 border-violet-200', label: 'Violet' },
  { value: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Purple' },
  { value: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200', label: 'Fuchsia' },
  { value: 'bg-pink-100 text-pink-700 border-pink-200', label: 'Pink' },
  { value: 'bg-rose-100 text-rose-700 border-rose-200', label: 'Rose' },
];

const settingTypes = [
  { id: 'contact_type', label: 'Contact Types', description: 'Types of contacts/leads' },
  { id: 'lead_source', label: 'Lead Sources', description: 'Where leads come from' },
  { id: 'lead_status', label: 'Lead Statuses', description: 'Lead workflow stages' },
  { id: 'interest_level', label: 'Interest Levels', description: 'Lead priority levels' },
  { id: 'activity_type', label: 'Activity Types', description: 'Types of outreach activities' },
  { id: 'activity_outcome', label: 'Activity Outcomes', description: 'Results of activities' },
  { id: 'next_best_actions', label: 'Next Best Actions Config', description: 'Automated follow-up rules' },
  { id: 'achievements', label: 'Achievement Notifications', description: 'Toast notifications for team achievements', isSpecial: true }
];

export default function SalesSettings({ user }) {
  const queryClient = useQueryClient();
  const [activeSettingType, setActiveSettingType] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemColor, setNewItemColor] = useState('bg-slate-100 text-slate-700 border-slate-200');

  const { data: settings = [] } = useQuery({
    queryKey: ['sales-settings'],
    queryFn: () => base44.entities.AppSetting.list('sort_order')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AppSetting.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-settings'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      setNewItemLabel('');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AppSetting.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-settings'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      setEditingItem(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AppSetting.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-settings'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    }
  });

  const generateValue = (label) => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const getSettingsByType = (typeId) => {
    return settings.filter(s => s.setting_type === typeId);
  };

  const handleAddNew = () => {
    if (!newItemLabel.trim() || !activeSettingType) return;
    
    const filteredSettings = getSettingsByType(activeSettingType);
    const data = {
      label: newItemLabel,
      value: generateValue(newItemLabel),
      setting_type: activeSettingType,
      sort_order: filteredSettings.length,
      is_active: true,
      color: newItemColor
    };
    
    createMutation.mutate(data);
    setNewItemLabel('');
    setNewItemColor('bg-slate-100 text-slate-700 border-slate-200');
  };

  const handleUpdateLabel = (item, newLabel) => {
    const data = {
      ...item,
      label: newLabel,
      value: generateValue(newLabel)
    };
    updateMutation.mutate({ id: item.id, data });
  };

  const toggleActive = (item) => {
    updateMutation.mutate({
      id: item.id,
      data: { ...item, is_active: !item.is_active }
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination || !activeSettingType) return;

    const filteredSettings = getSettingsByType(activeSettingType);
    const items = Array.from(filteredSettings);
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
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Admin Settings</h1>
        <p className="text-slate-600 mt-2">Manage configurable options for the sales app</p>
      </motion.div>

      <div className="space-y-4">
        {settingTypes.map(type => {
          const typeSettings = getSettingsByType(type.id);
          const isNextBestActions = type.id === 'next_best_actions';
          const isAchievements = type.id === 'achievements';

          return (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: settingTypes.indexOf(type) * 0.05 }}
              whileHover={{ y: -4 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <div className="p-6 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {isAchievements ? <Bell className="w-5 h-5 text-slate-600" /> : <Settings className="w-5 h-5 text-slate-600" />}
                    <h3 className="font-semibold text-slate-900">{type.label}</h3>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {isNextBestActions 
                      ? `${typeSettings.filter(s => s.is_active).length} active rules` 
                      : isAchievements 
                      ? type.description
                      : `${typeSettings.length} ${typeSettings.length === 1 ? 'option' : 'options'} configured`
                    }
                  </p>
                </div>
                {isNextBestActions ? (
                  <Link to={createPageUrl('NextBestActionsConfig')}>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      <Edit2 className="w-4 h-4 mr-2" />
                      View Rules
                    </Button>
                  </Link>
                ) : isAchievements ? (
                  <Button
                    onClick={() => {
                      setActiveSettingType(type.id);
                      setShowDialog(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Info className="w-4 h-4 mr-2" />
                    View Triggers
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setActiveSettingType(type.id);
                      setShowDialog(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Options
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Management Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {activeSettingType === 'achievements' ? 'Achievement Notification Triggers' : `Manage ${settingTypes.find(t => t.id === activeSettingType)?.label}`}
            </DialogTitle>
          </DialogHeader>
          
          {activeSettingType === 'achievements' ? (
            <div className="space-y-4 mt-4 max-h-[600px] overflow-y-auto">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">About Achievement Notifications</p>
                    <p>Toast notifications appear automatically when team members reach certain milestones. These celebrate achievements and keep the team motivated.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {/* Daily Milestones */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="p-3 bg-emerald-50 border-b border-emerald-200">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-semibold text-emerald-900">Daily Milestones</h4>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <Award className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">First Booking of the Day</p>
                        <p className="text-sm text-slate-600 mt-1">Triggered when any team member logs their first booking of the current day</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <Award className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">3 Bookings in a Day</p>
                        <p className="text-sm text-slate-600 mt-1">Triggered when a team member reaches 3 bookings in the current day</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <Award className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">6 Bookings in a Day</p>
                        <p className="text-sm text-slate-600 mt-1">Triggered when a team member reaches 6 bookings in the current day</p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Weekly Milestones */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="p-3 bg-violet-50 border-b border-violet-200">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-violet-600" />
                      <h4 className="font-semibold text-violet-900">Weekly Milestones</h4>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <Award className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">20 Bookings in a Week</p>
                        <p className="text-sm text-slate-600 mt-1">Triggered when a team member reaches 20 bookings in the current week (Mon-Sun)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <Award className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">30 Bookings in a Week</p>
                        <p className="text-sm text-slate-600 mt-1">Triggered when a team member reaches 30 bookings in the current week</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monthly Milestones */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="p-3 bg-amber-50 border-b border-amber-200">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      <h4 className="font-semibold text-amber-900">Monthly Milestones</h4>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <Award className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">Monthly Goal Reached</p>
                        <p className="text-sm text-slate-600 mt-1">Triggered when a team member reaches their monthly booking goal (varies by user: 30 for days 1-60, 45 for standard reps)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <Award className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">60 Bookings in a Month</p>
                        <p className="text-sm text-slate-600 mt-1">Triggered when a team member reaches 60 bookings in the current month</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <Award className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">70 Bookings in a Month</p>
                        <p className="text-sm text-slate-600 mt-1">Triggered when a team member reaches 70 bookings in the current month</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <Award className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">80 Bookings in a Month</p>
                        <p className="text-sm text-slate-600 mt-1">Triggered when a team member reaches 80 bookings in the current month</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <Award className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">90 Bookings in a Month</p>
                        <p className="text-sm text-slate-600 mt-1">Triggered when a team member reaches 90 bookings in the current month</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <Award className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">100 Bookings in a Month</p>
                        <p className="text-sm text-slate-600 mt-1">Triggered when a team member reaches 100 bookings in the current month</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-200">
                <Button
                  onClick={() => {
                    setShowDialog(false);
                    setActiveSettingType(null);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
          <div className="space-y-4 mt-4">
            {/* Add New */}
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Add New Option
              </label>
              <div className="space-y-3">
                <Input
                  value={newItemLabel}
                  onChange={(e) => setNewItemLabel(e.target.value)}
                  placeholder="e.g., New option..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newItemLabel.trim()) {
                      handleAddNew();
                    }
                  }}
                />
                <div className="flex gap-2">
                  <Select value={newItemColor} onValueChange={setNewItemColor}>
                    <SelectTrigger className="flex-1">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map(color => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={cn("w-4 h-4 rounded border", color.value)} />
                            <span>{color.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddNew}
                    disabled={!newItemLabel.trim() || createMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>

              {/* Existing Options */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Current Options
                </label>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId={`sales-settings-${activeSettingType}`}>
                  {(provided) => {
                    const filteredSettings = activeSettingType ? getSettingsByType(activeSettingType) : [];
                    return (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="space-y-2 max-h-[400px] overflow-y-auto"
                      >
                        {filteredSettings.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                          No options yet. Add one above to get started.
                        </div>
                      ) : (
                        filteredSettings.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={cn(
                                  "flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg",
                                  snapshot.isDragging && "shadow-lg",
                                  !item.is_active && "opacity-50"
                                )}
                              >
                                <div {...provided.dragHandleProps}>
                                  <GripVertical className="w-5 h-5 text-slate-300 cursor-move" />
                                </div>

                                {editingItem?.id === item.id ? (
                                  <>
                                    <div className="flex-1 space-y-2">
                                      <Input
                                        value={editingItem.label}
                                        onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleUpdateLabel(item, editingItem.label);
                                          } else if (e.key === 'Escape') {
                                            setEditingItem(null);
                                          }
                                        }}
                                      />
                                      <Select 
                                        value={editingItem.color || 'bg-slate-100 text-slate-700 border-slate-200'} 
                                        onValueChange={(v) => setEditingItem({ ...editingItem, color: v })}
                                      >
                                        <SelectTrigger>
                                          <div className="flex items-center gap-2">
                                            <Palette className="w-4 h-4" />
                                            <SelectValue />
                                          </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                          {colorOptions.map(color => (
                                            <SelectItem key={color.value} value={color.value}>
                                              <div className="flex items-center gap-2">
                                                <div className={cn("w-4 h-4 rounded border", color.value)} />
                                                <span>{color.label}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        updateMutation.mutate({
                                          id: item.id,
                                          data: {
                                            ...item,
                                            label: editingItem.label,
                                            value: generateValue(editingItem.label),
                                            color: editingItem.color
                                          }
                                        });
                                      }}
                                      disabled={!editingItem.label.trim()}
                                      className="bg-emerald-600 hover:bg-emerald-700"
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
                                    <div className="flex-1 flex items-center gap-2">
                                      {item.color && (
                                        <div className={cn("w-3 h-3 rounded-full border", item.color)} />
                                      )}
                                      <span className="font-medium text-slate-900">{item.label}</span>
                                    </div>
                                    <button
                                      onClick={() => toggleActive(item)}
                                      className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        item.is_active 
                                          ? "hover:bg-slate-100 text-slate-600"
                                          : "hover:bg-slate-100 text-slate-400"
                                      )}
                                      title={item.is_active ? 'Deactivate' : 'Activate'}
                                    >
                                      {item.is_active ? (
                                        <Eye className="w-4 h-4" />
                                      ) : (
                                        <EyeOff className="w-4 h-4" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => setEditingItem(item)}
                                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm(`Delete "${item.label}"?`)) {
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
                    );
                  }}
                </Droppable>
              </DragDropContext>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <Button
                onClick={() => {
                  setShowDialog(false);
                  setEditingItem(null);
                  setNewItemLabel('');
                  setNewItemColor('bg-slate-100 text-slate-700 border-slate-200');
                  setActiveSettingType(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Done
              </Button>
            </div>
          </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}