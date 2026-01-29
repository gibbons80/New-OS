import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

export default function EquipmentSettings({ user }) {
  const queryClient = useQueryClient();
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategory, setNewCategory] = useState({ value: '', label: '' });

  const { data: categories = [] } = useQuery({
    queryKey: ['equipment-categories'],
    queryFn: () => base44.entities.AppSetting.filter({ 
      setting_type: 'equipment_category',
      is_active: true 
    }, 'sort_order')
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.AppSetting.create({
      setting_type: 'equipment_category',
      value: data.value,
      label: data.label,
      is_active: true,
      sort_order: categories.length
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-categories'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      setShowAddCategory(false);
      setNewCategory({ value: '', label: '' });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AppSetting.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-categories'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      setEditingCategory(null);
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => base44.entities.AppSetting.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-categories'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    }
  });

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-orange-600" />
          Equipment Settings
        </h1>
        <p className="text-slate-500 mt-1">Manage equipment categories</p>
      </motion.div>

      {/* Equipment Categories */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
      >
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Equipment Categories</h3>
          <Button
            size="sm"
            onClick={() => setShowAddCategory(true)}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Category
          </Button>
        </div>
        <div className="p-4">
          <AnimatePresence>
            {categories.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No categories yet</p>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    {editingCategory?.id === category.id ? (
                      <>
                        <Input
                          value={editingCategory.label}
                          onChange={(e) => setEditingCategory({ ...editingCategory, label: e.target.value })}
                          placeholder="Category name..."
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={() => updateCategoryMutation.mutate({
                            id: category.id,
                            data: { label: editingCategory.label }
                          })}
                          disabled={!editingCategory.label.trim()}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingCategory(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">{category.label}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingCategory(category)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteCategoryMutation.mutate(category.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Add Category Dialog */}
      <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Equipment Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Category Name *
              </label>
              <Input
                value={newCategory.label}
                onChange={(e) => {
                  const label = e.target.value;
                  const value = label.toLowerCase().replace(/\s+/g, '_');
                  setNewCategory({ label, value });
                }}
                placeholder="e.g., Camera"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddCategory(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => createCategoryMutation.mutate(newCategory)}
                disabled={!newCategory.label.trim() || createCategoryMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {createCategoryMutation.isPending ? 'Adding...' : 'Add Category'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}