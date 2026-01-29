import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Folder,
  FileText,
  GripVertical,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';

export default function LessonCategoryManager({
  courseId,
  courseName,
  onAddLesson,
  lessons = [],
  onEditLesson,
  onDeleteLesson,
}) {
  const queryClient = useQueryClient();
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    category_name: '',
    description: '',
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['lesson-categories', courseId],
    queryFn: () => base44.entities.LessonCategory.filter({ course_id: courseId }, 'order'),
    enabled: !!courseId,
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.LessonCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-categories'] });
      toast.success('Category created');
      resetCategoryForm();
    },
    onError: () => toast.error('Failed to create category'),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LessonCategory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-categories'] });
      toast.success('Category updated');
      resetCategoryForm();
    },
    onError: () => toast.error('Failed to update category'),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => base44.entities.LessonCategory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-categories'] });
      toast.success('Category deleted');
    },
    onError: () => toast.error('Failed to delete category'),
  });

  const resetCategoryForm = () => {
    setCategoryForm({ category_name: '', description: '' });
    setEditingCategory(null);
    setShowCategoryDialog(false);
  };

  const handleSaveCategory = () => {
    if (!categoryForm.category_name.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    const data = {
      course_id: courseId,
      course_name: courseName,
      ...categoryForm,
    };

    if (!editingCategory) {
      // Set order to be after the last category
      data.order = categories.length > 0 ? Math.max(...categories.map(c => c.order || 0)) + 1 : 0;
    }

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const handleDragEnd = async (result) => {
    const { source, destination } = result;

    if (!destination || source.index === destination.index) return;

    const reorderedCategories = Array.from(categories);
    const [movedCategory] = reorderedCategories.splice(source.index, 1);
    reorderedCategories.splice(destination.index, 0, movedCategory);

    // Update order values
    const updatePromises = reorderedCategories.map((cat, idx) =>
      base44.entities.LessonCategory.update(cat.id, { order: idx })
    );

    try {
      await Promise.all(updatePromises);
      queryClient.invalidateQueries({ queryKey: ['lesson-categories'] });
      toast.success('Categories reordered');
    } catch (error) {
      toast.error('Failed to reorder categories');
    }
  };

  const openEditCategoryDialog = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      category_name: category.category_name,
      description: category.description || '',
    });
    setShowCategoryDialog(true);
  };

  const openCreateCategoryDialog = () => {
    resetCategoryForm();
    setShowCategoryDialog(true);
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const getCategoryLessons = (categoryId) => {
    return lessons.filter((lesson) => lesson.category_id === categoryId);
  };

  const getUncategorizedLessons = () => {
    return lessons.filter((lesson) => !lesson.category_id);
  };

  return (
    <div className="space-y-4">
      {/* Categories with Drag & Drop */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="categories">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-3"
            >
              {categories.map((category, index) => {
                const categoryLessons = getCategoryLessons(category.id);
                const isExpanded = expandedCategories[category.id];

                return (
                  <Draggable key={category.id} draggableId={category.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`border border-slate-200 rounded-lg overflow-hidden transition-all ${
                          snapshot.isDragging ? 'shadow-lg ring-2 ring-indigo-500' : ''
                        }`}
                      >
                        {/* Category Header */}
                        <div className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                          <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-5 h-5 text-slate-400" />
                          </div>
                          <button
                            onClick={() => toggleCategory(category.id)}
                            className="p-1 hover:bg-slate-200 rounded transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-slate-600" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-slate-600" />
                            )}
                          </button>
                          <Folder className="w-5 h-5 text-blue-500" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900">{category.category_name}</h3>
                            {category.description && (
                              <p className="text-sm text-slate-500">{category.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onAddLesson(category.id)}
                              className="text-indigo-600 hover:bg-indigo-50"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Lesson
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditCategoryDialog(category)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Delete this category?')) {
                                  deleteCategoryMutation.mutate(category.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>

                        {/* Category Lessons */}
                        {isExpanded && (
                          <div className="divide-y">
                            {categoryLessons.length === 0 ? (
                              <div className="p-4 text-center text-slate-500">
                                <p className="text-sm">No lessons in this category</p>
                              </div>
                            ) : (
                              categoryLessons.map((lesson) => (
                                <div
                                  key={lesson.id}
                                  className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors"
                                >
                                  <FileText className="w-4 h-4 text-slate-400 ml-8" />
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-900">{lesson.lesson_title}</p>
                                    <p className="text-sm text-slate-500">
                                      {lesson.duration_minutes ? `${lesson.duration_minutes} min` : 'Duration not set'}
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onEditLesson(lesson)}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onDeleteLesson(lesson)}
                                    >
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Uncategorized Lessons */}
      {getUncategorizedLessons().length > 0 && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-3 p-4 bg-slate-50">
            <Folder className="w-5 h-5 text-slate-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">Uncategorized</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddLesson(null)}
              className="text-indigo-600 hover:bg-indigo-50"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Lesson
            </Button>
          </div>
          <div className="divide-y">
            {getUncategorizedLessons().map((lesson) => (
              <div
                key={lesson.id}
                className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors"
              >
                <FileText className="w-4 h-4 text-slate-400 ml-8" />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{lesson.lesson_title}</p>
                  <p className="text-sm text-slate-500">
                    {lesson.duration_minutes ? `${lesson.duration_minutes} min` : 'Duration not set'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditLesson(lesson)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteLesson(lesson)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Category Button */}
      <Button
        onClick={openCreateCategoryDialog}
        variant="outline"
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Category
      </Button>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={(open) => !open && resetCategoryForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                value={categoryForm.category_name}
                onChange={(e) =>
                  setCategoryForm((prev) => ({
                    ...prev,
                    category_name: e.target.value,
                  }))
                }
                placeholder="e.g., Fundamentals"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Optional description"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetCategoryForm}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveCategory}
              disabled={
                createCategoryMutation.isPending || updateCategoryMutation.isPending
              }
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {editingCategory ? 'Update' : 'Create'} Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}