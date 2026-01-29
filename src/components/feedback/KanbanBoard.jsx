import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Clock, CheckCircle, XCircle, FileText, Tag, Monitor, Link as LinkIcon, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const columns = [
  { id: 'New', title: 'New', icon: FileText, color: 'blue' },
  { id: 'Up Next', title: 'Up Next', icon: Clock, color: 'purple' },
  { id: 'In Progress', title: 'In Progress', icon: Clock, color: 'amber' },
  { id: 'Completed', title: 'Completed', icon: CheckCircle, color: 'emerald' },
];

export default function KanbanBoard({ feedback, onSelectFeedback }) {
  const queryClient = useQueryClient();

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    
    // Optimistic update
    queryClient.setQueryData(['feedback'], (oldData) => {
      if (!oldData) return oldData;
      return oldData.map(item => 
        item.id === draggableId ? { ...item, status: newStatus } : item
      );
    });

    try {
      await base44.entities.Feedback.update(draggableId, { status: newStatus });
    } catch (error) {
      console.error('Failed to update feedback status:', error);
      // Revert on error
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
    }
  };

  const getFeedbackByStatus = (status) => {
    return feedback.filter(f => f.status === status);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {columns.map((column) => {
          const Icon = column.icon;
          const items = getFeedbackByStatus(column.id);
          
          return (
            <div key={column.id} className="flex flex-col">
              {/* Column Header */}
              <div className={cn(
                "rounded-t-xl p-4 flex items-center justify-between",
                column.color === 'blue' && "bg-blue-100",
                column.color === 'purple' && "bg-purple-100",
                column.color === 'amber' && "bg-amber-100",
                column.color === 'emerald' && "bg-emerald-100",
                column.color === 'slate' && "bg-slate-100"
              )}>
                <div className="flex items-center gap-2">
                  <Icon className={cn(
                    "w-4 h-4",
                    column.color === 'blue' && "text-blue-600",
                    column.color === 'purple' && "text-purple-600",
                    column.color === 'amber' && "text-amber-600",
                    column.color === 'emerald' && "text-emerald-600",
                    column.color === 'slate' && "text-slate-600"
                  )} />
                  <span className={cn(
                    "font-semibold text-sm",
                    column.color === 'blue' && "text-blue-900",
                    column.color === 'purple' && "text-purple-900",
                    column.color === 'amber' && "text-amber-900",
                    column.color === 'emerald' && "text-emerald-900",
                    column.color === 'slate' && "text-slate-900"
                  )}>
                    {column.title}
                  </span>
                </div>
                <span className={cn(
                  "text-xs font-medium px-2 py-1 rounded-full",
                  column.color === 'blue' && "bg-blue-200 text-blue-800",
                  column.color === 'purple' && "bg-purple-200 text-purple-800",
                  column.color === 'amber' && "bg-amber-200 text-amber-800",
                  column.color === 'emerald' && "bg-emerald-200 text-emerald-800",
                  column.color === 'slate' && "bg-slate-200 text-slate-800"
                )}>
                  {items.length}
                </span>
              </div>

              {/* Droppable Area */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "bg-slate-50 rounded-b-xl p-2 min-h-[400px] flex-1 transition-colors",
                      snapshot.isDraggingOver && "bg-slate-100"
                    )}
                  >
                    <div className="space-y-2">
                      {items.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => onSelectFeedback(item)}
                              className={cn(
                                "bg-white rounded-lg p-3 border border-slate-200 cursor-pointer hover:shadow-md transition-all",
                                snapshot.isDragging && "shadow-lg rotate-2"
                              )}
                            >
                              {/* Priority Badge */}
                              {item.priority && (
                                <div className="flex items-center justify-between mb-2">
                                  <span className={cn(
                                    "text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1",
                                    item.priority === 'high' && "bg-red-100 text-red-700",
                                    item.priority === 'medium' && "bg-amber-100 text-amber-700",
                                    item.priority === 'low' && "bg-slate-100 text-slate-600"
                                  )}>
                                    <Flag className="w-3 h-3" />
                                    {item.priority}
                                  </span>
                                  {item.related_feedback_ids && item.related_feedback_ids.length > 0 && (
                                    <LinkIcon className="w-3 h-3 text-blue-500" />
                                  )}
                                </div>
                              )}

                              <h4 className="font-medium text-sm text-slate-900 mb-2 line-clamp-2">
                                {item.title}
                              </h4>
                              <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                                {item.description}
                              </p>
                              
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <span className="text-xs text-slate-600 flex items-center gap-1">
                                  <Tag className="w-3 h-3" />
                                  {item.category.replace(' Report', '').replace(' Request', '')}
                                </span>
                                <span className="text-xs text-slate-600 flex items-center gap-1">
                                  <Monitor className="w-3 h-3" />
                                  {item.app_id}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                                <span className="truncate">{item.submitted_by_name}</span>
                                <span>{format(new Date(item.created_date), 'MMM d')}</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}