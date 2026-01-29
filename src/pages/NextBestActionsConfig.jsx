import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Plus, Edit2, Trash2, GripVertical, Eye, EyeOff, ArrowLeft, Info, Check, X } from 'lucide-react';
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
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';

export default function NextBestActionsConfig({ user }) {
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState(null);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newRule, setNewRule] = useState({
    label: '',
    description: '',
    frequency_days: '',
    days_after_trigger: '',
    trigger: '',
    urgency: 'medium',
    completion_criteria: 'any_outreach'
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['nba-rules'],
    queryFn: () => base44.entities.AppSetting.filter({ 
      setting_type: 'next_best_actions' 
    }, 'sort_order')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AppSetting.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nba-rules'] });
      queryClient.invalidateQueries({ queryKey: ['sales-settings'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      setShowAddNew(false);
      setNewRule({
        label: '',
        description: '',
        frequency_days: '',
        days_after_trigger: '',
        trigger: '',
        urgency: 'medium',
        completion_criteria: 'any_outreach'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AppSetting.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nba-rules'] });
      queryClient.invalidateQueries({ queryKey: ['sales-settings'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      setEditingItem(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AppSetting.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nba-rules'] });
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

  const handleAddNew = () => {
    if (!newRule.label.trim()) return;
    
    const config = { ...newRule };
    delete config.label;
    if (config.frequency_days) config.frequency_days = parseInt(config.frequency_days);
    if (config.days_after_trigger) config.days_after_trigger = parseInt(config.days_after_trigger);
    
    const data = {
      label: newRule.label,
      value: generateValue(newRule.label),
      setting_type: 'next_best_actions',
      sort_order: rules.length,
      is_active: true,
      config: config
    };
    
    createMutation.mutate(data);
  };

  const toggleActive = (item) => {
    updateMutation.mutate({
      id: item.id,
      data: { ...item, is_active: !item.is_active }
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(rules);
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
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link 
          to={createPageUrl('SalesSettings')}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sales Settings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Next Best Actions Configuration</h1>
            <p className="text-slate-500 mt-1">
              {rules.filter(r => r.is_active).length} active rules • {rules.length} total
            </p>
          </div>
          <Button
            onClick={() => setShowAddNew(!showAddNew)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Rule
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">These rules determine when follow-up actions appear in "Next Best Actions"</p>
            <p className="text-blue-600 mt-1">Toggle rules on/off to customize your workflow. Drag to reorder priority.</p>
          </div>
        </div>
      </div>

      {/* Add New Rule Form */}
      {showAddNew && (
        <div className="mb-6 p-6 bg-emerald-50 border border-emerald-200 rounded-xl">
          <h3 className="font-semibold text-slate-900 mb-4">Add New Rule</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Rule Name</label>
              <Input
                value={newRule.label}
                onChange={(e) => setNewRule({ ...newRule, label: e.target.value })}
                placeholder="e.g., Follow-up after 7 days"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Description</label>
              <Textarea
                value={newRule.description}
                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                placeholder="Describe when this rule should trigger..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Frequency (days)</label>
                <Input
                  type="number"
                  value={newRule.frequency_days}
                  onChange={(e) => setNewRule({ ...newRule, frequency_days: e.target.value })}
                  placeholder="e.g., 3"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Days After Trigger</label>
                <Input
                  type="number"
                  value={newRule.days_after_trigger}
                  onChange={(e) => setNewRule({ ...newRule, days_after_trigger: e.target.value })}
                  placeholder="e.g., 7"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Trigger Event</label>
              <Input
                value={newRule.trigger}
                onChange={(e) => setNewRule({ ...newRule, trigger: e.target.value })}
                placeholder="e.g., 'first call', 'booking'"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Priority</label>
              <Select 
                value={newRule.urgency} 
                onValueChange={(v) => setNewRule({ ...newRule, urgency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Completion Criteria</label>
              <Select 
                value={newRule.completion_criteria} 
                onValueChange={(v) => setNewRule({ ...newRule, completion_criteria: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any_outreach">Any Outreach (call, text, email, dm)</SelectItem>
                  <SelectItem value="engagement">Engagement Activity</SelectItem>
                  <SelectItem value="conversation">Conversation Only</SelectItem>
                  <SelectItem value="booking">Booking Only</SelectItem>
                  <SelectItem value="manual">Manual Completion</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">What marks this action as completed</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAddNew(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddNew}
                disabled={!newRule.label.trim() || createMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Add Rule
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="nba-rules">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="divide-y divide-slate-100"
              >
                {rules.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    No rules configured yet. Add one above to get started.
                  </div>
                ) : (
                  rules.map((rule, index) => (
                    <Draggable key={rule.id} draggableId={rule.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            "p-6",
                            snapshot.isDragging && "shadow-lg bg-slate-50",
                            !rule.is_active && "opacity-50"
                          )}
                        >
                          {editingItem?.id === rule.id ? (
                            // Edit Mode
                            <div className="space-y-4">
                              <Input
                                value={editingItem.label}
                                onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
                                placeholder="Rule name"
                              />
                              <Textarea
                                value={editingItem.config?.description || ''}
                                onChange={(e) => setEditingItem({ 
                                  ...editingItem, 
                                  config: { ...editingItem.config, description: e.target.value }
                                })}
                                placeholder="Description"
                                rows={2}
                              />
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs text-slate-600 block mb-1">Frequency (days)</label>
                                  <Input
                                    type="number"
                                    value={editingItem.config?.frequency_days || ''}
                                    onChange={(e) => setEditingItem({ 
                                      ...editingItem, 
                                      config: { ...editingItem.config, frequency_days: e.target.value }
                                    })}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-slate-600 block mb-1">Days After Trigger</label>
                                  <Input
                                    type="number"
                                    value={editingItem.config?.days_after_trigger || ''}
                                    onChange={(e) => setEditingItem({ 
                                      ...editingItem, 
                                      config: { ...editingItem.config, days_after_trigger: e.target.value }
                                    })}
                                  />
                                </div>
                              </div>
                              <Input
                                value={editingItem.config?.trigger || ''}
                                onChange={(e) => setEditingItem({ 
                                  ...editingItem, 
                                  config: { ...editingItem.config, trigger: e.target.value }
                                })}
                                placeholder="Trigger event"
                              />
                              <Select 
                                value={editingItem.config?.urgency || 'medium'} 
                                onValueChange={(v) => setEditingItem({ 
                                  ...editingItem, 
                                  config: { ...editingItem.config, urgency: v }
                                })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low Priority</SelectItem>
                                  <SelectItem value="medium">Medium Priority</SelectItem>
                                  <SelectItem value="high">High Priority</SelectItem>
                                </SelectContent>
                              </Select>
                              <div>
                                <label className="text-xs text-slate-600 block mb-1">Completion Criteria</label>
                                <Select 
                                  value={editingItem.config?.completion_criteria || 'any_outreach'} 
                                  onValueChange={(v) => setEditingItem({ 
                                    ...editingItem, 
                                    config: { ...editingItem.config, completion_criteria: v }
                                  })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="any_outreach">Any Outreach</SelectItem>
                                    <SelectItem value="engagement">Engagement Activity</SelectItem>
                                    <SelectItem value="conversation">Conversation Only</SelectItem>
                                    <SelectItem value="booking">Booking Only</SelectItem>
                                    <SelectItem value="manual">Manual Completion</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingItem(null)}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const config = { ...editingItem.config };
                                    if (config.frequency_days) config.frequency_days = parseInt(config.frequency_days);
                                    if (config.days_after_trigger) config.days_after_trigger = parseInt(config.days_after_trigger);
                                    
                                    updateMutation.mutate({
                                      id: rule.id,
                                      data: {
                                        ...editingItem,
                                        value: generateValue(editingItem.label),
                                        config
                                      }
                                    });
                                  }}
                                  disabled={!editingItem.label.trim()}
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // View Mode
                            <div className="flex items-start gap-4">
                              <div {...provided.dragHandleProps} className="pt-1">
                                <GripVertical className="w-5 h-5 text-slate-300 cursor-move" />
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h3 className="font-semibold text-slate-900 text-lg">{rule.label}</h3>
                                    {rule.config?.description && (
                                      <p className="text-slate-600 mt-1">{rule.config.description}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => toggleActive(rule)}
                                      className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        rule.is_active 
                                          ? "hover:bg-slate-100 text-slate-600"
                                          : "hover:bg-slate-100 text-slate-400"
                                      )}
                                      title={rule.is_active ? 'Deactivate' : 'Activate'}
                                    >
                                      {rule.is_active ? (
                                        <Eye className="w-4 h-4" />
                                      ) : (
                                        <EyeOff className="w-4 h-4" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => setEditingItem(rule)}
                                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm(`Delete "${rule.label}"?`)) {
                                          deleteMutation.mutate(rule.id);
                                        }
                                      }}
                                      className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {rule.config && (
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    {rule.config.frequency_days && (
                                      <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                                        Every {rule.config.frequency_days} day{rule.config.frequency_days > 1 ? 's' : ''}
                                      </span>
                                    )}
                                    {rule.config.days_after_trigger !== undefined && (
                                      <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                                        {rule.config.days_after_trigger === 0 ? 'Immediately' : `Day ${rule.config.days_after_trigger}`} after {rule.config.trigger}
                                      </span>
                                    )}
                                    {rule.config.urgency && (
                                      <span className={cn(
                                        "px-3 py-1 rounded-full text-sm font-medium",
                                        rule.config.urgency === 'high' && "bg-red-100 text-red-700",
                                        rule.config.urgency === 'medium' && "bg-amber-100 text-amber-700",
                                        rule.config.urgency === 'low' && "bg-slate-100 text-slate-600"
                                      )}>
                                        {rule.config.urgency} priority
                                      </span>
                                    )}
                                    {rule.config.completion_criteria && (
                                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                        ✓ {rule.config.completion_criteria === 'any_outreach' ? 'Any Outreach' : 
                                           rule.config.completion_criteria === 'engagement' ? 'Engagement' :
                                           rule.config.completion_criteria === 'conversation' ? 'Conversation' :
                                           rule.config.completion_criteria === 'booking' ? 'Booking' : 'Manual'}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
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
    </div>
  );
}