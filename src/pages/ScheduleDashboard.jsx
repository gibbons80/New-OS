import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, User, Clock, Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';

const HOURS = Array.from({ length: 24 }, (_, i) => i); // Midnight to midnight
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function ScheduleDashboard({ user }) {
  const queryClient = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [viewMode, setViewMode] = useState('day'); // 'week' or 'day'
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    user_id: '',
    user_name: '',
    day_of_week: '',
    start_time: '09:00',
    end_time: '17:00',
    notes: ''
  });
  const [resizing, setResizing] = useState(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, width: 0, left: 0 });
  const [creating, setCreating] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const isAdmin = user?.role === 'admin';

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => base44.entities.Schedule.filter({ is_active: true })
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Use the backend function to fetch all users on the schedule, bypassing RLS
      const response = await base44.functions.invoke('getAllScheduleUsers');
      return response.data || [];
    }
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.filter({ employment_status: 'active' })
  });

  const { data: timeOffRequests = [] } = useQuery({
    queryKey: ['timeoff-approved'],
    queryFn: () => base44.entities.TimeOffRequest.filter({ status: 'approved' })
  });

  const { data: hrDepartments = [] } = useQuery({
    queryKey: ['hr-departments'],
    queryFn: async () => {
      const settings = await base44.entities.AppSetting.filter({ setting_type: 'hr_department' }, 'sort_order');
      return settings;
    }
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({ scheduleId, data }) => base44.entities.Schedule.update(scheduleId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] })
  });

  const createScheduleMutation = useMutation({
    mutationFn: (data) => base44.entities.Schedule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setShowScheduleDialog(false);
    }
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (scheduleId) => base44.entities.Schedule.delete(scheduleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] })
  });

  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setScheduleForm({
      user_id: schedule.user_id,
      user_name: schedule.user_name,
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      notes: schedule.notes || ''
    });
    setShowScheduleDialog(true);
  };

  const handleAddSchedule = (userId, userName, dayOfWeek) => {
    setEditingSchedule(null);
    setScheduleForm({
      user_id: userId,
      user_name: userName,
      day_of_week: dayOfWeek,
      start_time: '09:00',
      end_time: '17:00',
      notes: ''
    });
    setShowScheduleDialog(true);
  };

  const handleSaveSchedule = () => {
    if (editingSchedule) {
      updateScheduleMutation.mutate({
        scheduleId: editingSchedule.id,
        data: {
          start_time: scheduleForm.start_time,
          end_time: scheduleForm.end_time,
          notes: scheduleForm.notes
        }
      });
      setShowScheduleDialog(false);
    } else {
      createScheduleMutation.mutate({
        ...scheduleForm,
        is_active: true
      });
    }
  };

  const weekDays = DAYS.map((day, idx) => ({
    day,
    date: addDays(selectedWeek, idx),
    label: format(addDays(selectedWeek, idx), 'EEE, MMM d')
  }));

  const parseTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
  };

  const formatTime = (hour) => {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const formatTimeTo12Hour = (time24) => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'pm' : 'am';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, '0')}${period}`;
  };

  const getScheduleForUserDay = (userId, day) => {
    return schedules.filter(s => s.user_id === userId && s.day_of_week === day);
  };

  const isUserOnTimeOff = (userId, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return timeOffRequests.some(req => 
      req.user_id === userId && 
      dateStr >= req.start_date && 
      dateStr <= req.end_date
    );
  };

  const getTimeOffForUserDay = (userId, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return timeOffRequests.filter(req => 
      req.user_id === userId && 
      dateStr >= req.start_date && 
      dateStr <= req.end_date
    );
  };

  const hasFullDayTimeOff = (userId, date) => {
    const timeOffs = getTimeOffForUserDay(userId, date);
    return timeOffs.some(req => !req.is_partial_day);
  };

  const isScheduleBlockedByTimeOff = (schedule, userId, date) => {
    const timeOffs = getTimeOffForUserDay(userId, date);

    for (const timeOff of timeOffs) {
      if (!timeOff.is_partial_day) {
        // Full day time off blocks entire schedule
        return true;
      }
    }
    return false;
  };

  const splitScheduleAroundTimeOff = (schedule, userId, date) => {
    const timeOffs = getTimeOffForUserDay(userId, date);
    const scheduleStart = parseTime(schedule.start_time);
    const scheduleEnd = parseTime(schedule.end_time);

    // Check for full day time off
    if (timeOffs.some(req => !req.is_partial_day)) {
      return [];
    }

    // Get all partial day time offs that overlap
    const overlappingTimeOffs = timeOffs.filter(timeOff => {
      if (!timeOff.is_partial_day || !timeOff.start_time || !timeOff.end_time) return false;
      const timeOffStart = parseTime(timeOff.start_time);
      const timeOffEnd = parseTime(timeOff.end_time);
      return scheduleStart < timeOffEnd && scheduleEnd > timeOffStart;
    });

    if (overlappingTimeOffs.length === 0) {
      // No overlap, return original schedule
      return [{
        ...schedule,
        start_time: schedule.start_time,
        end_time: schedule.end_time
      }];
    }

    // Split schedule into segments
    const segments = [];
    let currentStart = scheduleStart;

    overlappingTimeOffs
      .sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time))
      .forEach(timeOff => {
        const timeOffStart = parseTime(timeOff.start_time);
        const timeOffEnd = parseTime(timeOff.end_time);

        // Add segment before time off
        if (currentStart < timeOffStart) {
          segments.push({
            ...schedule,
            start_time: formatTime(currentStart),
            end_time: formatTime(timeOffStart)
          });
        }

        // Move current start to after time off
        currentStart = Math.max(currentStart, timeOffEnd);
      });

    // Add remaining segment after last time off
    if (currentStart < scheduleEnd) {
      segments.push({
        ...schedule,
        start_time: formatTime(currentStart),
        end_time: formatTime(scheduleEnd)
      });
    }

    return segments;
  };

  const handleDragEnd = (result) => {
    if (!isAdmin || !result.destination) return;

    // Handle drag logic here if needed for admin
    console.log('Drag ended:', result);
  };

  const handleTodayClick = () => {
    const today = new Date();
    setSelectedDay(today);
    setViewMode('day');
  };

  const handleWeekNavigation = (direction) => {
    if (viewMode === 'week') {
      setSelectedWeek(addDays(selectedWeek, direction * 7));
    } else {
      setSelectedDay(addDays(selectedDay, direction));
    }
  };

  const handleCreateStart = (e, userId, userName, dayOfWeek) => {
    if (!isAdmin) {
      e.preventDefault();
      return;
    }
    const timeGrid = e.currentTarget;
    const rect = timeGrid.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const percentPosition = (relativeX / rect.width) * 100;
    const hourPosition = (percentPosition / 100) * 24;
    const roundedHour = Math.round(hourPosition * 2) / 2;
    
    setCreating({
      userId,
      userName,
      dayOfWeek,
      startHour: roundedHour,
      endHour: roundedHour
    });
  };

  React.useEffect(() => {
    if (creating && isAdmin) {
      const handleMouseMove = (e) => {
        const timeGrid = document.querySelector('.time-grid-container');
        if (!timeGrid) return;

        const containerRect = timeGrid.getBoundingClientRect();
        const relativeX = Math.max(0, Math.min(containerRect.width, e.clientX - containerRect.left));
        const percentPosition = (relativeX / containerRect.width) * 100;
        const hourPosition = (percentPosition / 100) * 24;
        const roundedHour = Math.round(hourPosition * 2) / 2;

        setCreating(prev => ({
          ...prev,
          endHour: Math.max(prev.startHour + 0.5, roundedHour)
        }));
      };

      const handleMouseUp = () => {
        if (creating.endHour > creating.startHour) {
          createScheduleMutation.mutate({
            user_id: creating.userId,
            user_name: creating.userName,
            day_of_week: creating.dayOfWeek,
            start_time: formatTime(creating.startHour),
            end_time: formatTime(creating.endHour),
            notes: '',
            is_active: true
          });
        }
        setCreating(null);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [creating, isAdmin, createScheduleMutation]);

  React.useEffect(() => {
    if (!resizing || !isAdmin) return;

    const handleMouseMove = (e) => {
      const schedule = schedules.find(s => s.id === resizing.scheduleId);
      if (!schedule) return;

      const timeGrid = document.querySelector('.time-grid-container');
      if (!timeGrid) return;

      const containerRect = timeGrid.getBoundingClientRect();
      const relativeX = Math.max(0, Math.min(containerRect.width, e.clientX - containerRect.left));
      const percentPosition = (relativeX / containerRect.width) * 100;
      const hourPosition = (percentPosition / 100) * 24;

      // Round to nearest 30 minutes (on the hour or half-hour)
      const roundedHour = Math.round(hourPosition * 2) / 2;

      let newStartTime = schedule.start_time;
      let newEndTime = schedule.end_time;

      if (resizing.edge === 'start') {
         const maxStart = parseTime(schedule.end_time) - 0.25;
         newStartTime = formatTime(Math.max(0, Math.min(maxStart, roundedHour)));
       } else {
         const minEnd = parseTime(schedule.start_time) + 0.25;
         newEndTime = formatTime(Math.max(minEnd, Math.min(24, roundedHour)));
       }

      // Update visual position immediately
       const element = document.querySelector(`[data-schedule-id="${schedule.id}"]`);
       if (element) {
         const startHour = parseTime(resizing.edge === 'start' ? newStartTime : schedule.start_time);
         const endHour = parseTime(resizing.edge === 'end' ? newEndTime : schedule.end_time);
         const startPercent = (startHour / 24) * 100;
         const widthPercent = ((endHour - startHour) / 24) * 100;
         element.style.left = `${startPercent}%`;
         element.style.width = `${widthPercent}%`;
       }

      setResizing({ ...resizing, newStartTime, newEndTime });
    };

    const handleMouseUp = () => {
      if (resizing.newStartTime || resizing.newEndTime) {
        const schedule = schedules.find(s => s.id === resizing.scheduleId);
        updateScheduleMutation.mutate({
          scheduleId: resizing.scheduleId,
          data: {
            start_time: resizing.newStartTime || schedule.start_time,
            end_time: resizing.newEndTime || schedule.end_time,
            notes: schedule.notes
          }
        });
      }
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, schedules, isAdmin, updateScheduleMutation]);

  const currentDayOfWeek = DAYS[format(selectedDay, 'i') - 1];

  // Generate department colors from HR settings
  const colorPalette = [
    { from: 'from-purple-400', to: 'to-purple-500', hover: 'hover:from-purple-500 hover:to-purple-600', bg: 'bg-purple-500' },
    { from: 'from-blue-400', to: 'to-blue-500', hover: 'hover:from-blue-500 hover:to-blue-600', bg: 'bg-blue-500' },
    { from: 'from-emerald-400', to: 'to-emerald-500', hover: 'hover:from-emerald-500 hover:to-emerald-600', bg: 'bg-emerald-500' },
    { from: 'from-amber-400', to: 'to-amber-500', hover: 'hover:from-amber-500 hover:to-amber-600', bg: 'bg-amber-500' },
    { from: 'from-rose-400', to: 'to-rose-500', hover: 'hover:from-rose-500 hover:to-rose-600', bg: 'bg-rose-500' },
    { from: 'from-cyan-400', to: 'to-cyan-500', hover: 'hover:from-cyan-500 hover:to-cyan-600', bg: 'bg-cyan-500' },
    { from: 'from-indigo-400', to: 'to-indigo-500', hover: 'hover:from-indigo-500 hover:to-indigo-600', bg: 'bg-indigo-500' },
    { from: 'from-pink-400', to: 'to-pink-500', hover: 'hover:from-pink-500 hover:to-pink-600', bg: 'bg-pink-500' },
    { from: 'from-teal-400', to: 'to-teal-500', hover: 'hover:from-teal-500 hover:to-teal-600', bg: 'bg-teal-500' },
    { from: 'from-orange-400', to: 'to-orange-500', hover: 'hover:from-orange-500 hover:to-orange-600', bg: 'bg-orange-500' },
  ];
  
  const departmentColors = {};
  hrDepartments.forEach((dept, idx) => {
    departmentColors[dept.label] = colorPalette[idx % colorPalette.length];
  });

  const getUserDepartment = (userId) => {
    const userStaff = staff.find(s => s.user_id === userId);
    return userStaff?.department;
  };

  const getDepartmentColor = (userId) => {
    const dept = getUserDepartment(userId);
    return dept ? departmentColors[dept] : colorPalette[0];
  };

  const filteredUsers = selectedDepartments.length === 0 
    ? users 
    : users.filter(u => {
        const dept = getUserDepartment(u.id);
        return dept && selectedDepartments.includes(dept);
      });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-sm border-b border-slate-200 p-4 flex items-center justify-between shadow-sm flex-wrap gap-4"
      >
        <div className="flex items-center gap-4 flex-wrap">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleWeekNavigation(-1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                <Calendar className="w-4 h-4 text-slate-600" />
                <span className="text-lg font-semibold text-slate-900">
                  {viewMode === 'week' 
                    ? `Week of ${format(selectedWeek, 'MMM d, yyyy')}`
                    : format(selectedDay, 'EEEE, MMM d, yyyy')}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <div className="space-y-3 p-3">
                <div className="text-sm font-medium text-slate-700">Select a date</div>
                <CalendarComponent
                  mode="single"
                  selected={selectedDay}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDay(date);
                      setShowDatePicker(false);
                    }
                  }}
                />
              </div>
            </PopoverContent>
          </Popover>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleWeekNavigation(1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={handleTodayClick}
          >
            Today
          </Button>
          {viewMode === 'day' && (
            <Button
              variant="outline"
              onClick={() => {
                setViewMode('week');
                setSelectedWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
              }}
            >
              Week View
            </Button>
          )}
        </div>
        
        {/* Department Filter and Legend */}
        {hrDepartments.length > 0 && (
          <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-600">Filter:</span>
              <div className="flex items-center gap-2 flex-wrap">
                {hrDepartments.filter(d => d.is_active).map(dept => {
                  const colors = departmentColors[dept.label];
                  const isSelected = selectedDepartments.includes(dept.label);
                  return (
                    <button
                      key={dept.id}
                      onClick={() => {
                        setSelectedDepartments(prev =>
                          prev.includes(dept.label)
                            ? prev.filter(d => d !== dept.label)
                            : [...prev, dept.label]
                        );
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all",
                        isSelected
                          ? cn("bg-white border border-slate-300", colors?.bg || 'bg-slate-400')
                          : "bg-white/50 hover:bg-white border border-slate-200"
                      )}
                    >
                      <div className={cn("w-2.5 h-2.5 rounded-full", colors?.bg || 'bg-slate-400')} />
                      <span className="text-xs font-medium text-slate-700">{dept.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Schedule Grid */}
      <div className="flex-1 overflow-auto bg-slate-50">
        {viewMode === 'week' ? (
          <div className="min-w-[1400px]">
                    {/* Header Row - Days */}
                    <div className="sticky top-0 bg-white border-b border-slate-200 z-10">
                      <div className="flex">
                        <div className="w-48 shrink-0 border-r border-slate-200 p-3 font-medium text-slate-700">
                          Team Members
                        </div>
                        {weekDays.map(({ day, label }) => (
                          <div key={day} className="flex-1 min-w-[150px] p-3 text-center border-r border-slate-200">
                            <div className="font-medium text-slate-900">{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* User Rows */}
                    <DragDropContext onDragEnd={isAdmin ? handleDragEnd : () => {}}>
              {filteredUsers.map((u, userIdx) => (
              <div key={u.id} className={cn(
                "flex border-b border-slate-200",
                userIdx % 2 === 0 ? "bg-white" : "bg-slate-50"
              )}>
                {/* User Info */}
                <div className="w-48 shrink-0 border-r border-slate-200 p-3 flex items-center gap-3">
                  {u.profile_photo_url ? (
                    <img
                      src={u.profile_photo_url}
                      alt={u.full_name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-purple-600" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-900 truncate text-sm">{u.full_name}</div>
                    <div className="text-xs text-slate-500 truncate">{u.email}</div>
                  </div>
                </div>

                {/* Schedule Blocks for Each Day */}
                {weekDays.map(({ day, date }) => {
                  const daySchedules = getScheduleForUserDay(u.id, day);
                  const onTimeOff = isUserOnTimeOff(u.id, date);
                  const hasFullDay = hasFullDayTimeOff(u.id, date);

                  return (
                    <Droppable key={`${u.id}-${day}`} droppableId={`${u.id}-${day}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            "flex-1 min-w-[150px] min-h-[80px] border-r border-slate-200 p-2 relative",
                            snapshot.isDraggingOver && "bg-purple-50"
                          )}
                        >
                          {hasFullDay ? (
                            <div className="h-full w-full flex items-center justify-center bg-gray-300 opacity-60 rounded">
                              <div className="text-xs font-medium text-slate-700">Time Off</div>
                            </div>
                          ) : daySchedules.length > 0 ? (
                            daySchedules.map((schedule, idx) => (
                              <Draggable
                                key={schedule.id}
                                draggableId={schedule.id}
                                index={idx}
                                isDragDisabled={!isAdmin}
                              >
                                {(provided, snapshot) => (
                                  <div
                                   ref={provided.innerRef}
                                   {...provided.draggableProps}
                                   {...provided.dragHandleProps}
                                   className={cn(
                                     "mb-1 rounded-lg px-3 py-2 text-sm",
                                     "bg-gradient-to-r text-white",
                                     getDepartmentColor(u.id).bg,
                                     "shadow-sm hover:shadow-md transition-shadow",
                                     snapshot.isDragging && "shadow-lg rotate-2"
                                   )}
                                  >
                                    <div className="font-medium">
                                      {formatTimeTo12Hour(schedule.start_time)} - {formatTimeTo12Hour(schedule.end_time)}
                                    </div>
                                    {schedule.notes && (
                                      <div className="text-xs text-purple-100 mt-1 truncate">
                                        {schedule.notes}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            ))
                          ) : onTimeOff ? (
                              <div className="h-full flex items-center justify-center">
                                <div className="text-xs font-medium text-black bg-gray-200 px-2 py-1 rounded text-center">
                                  Time Off
                                </div>
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                                Off
                              </div>
                            )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </div>
              ))}
            </DragDropContext>
          </div>
        ) : (
          /* Day View - Time Grid */
          <div className="min-w-[1200px] bg-white">
            {/* Title Bar */}
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-semibold text-slate-900">
                {format(selectedDay, 'EEEE, MMMM d, yyyy')}
              </h2>
            </div>

            {/* Time Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 z-10">
              <div className="flex">
                <div className="w-48 shrink-0 border-r border-slate-200 p-3"></div>
                {HOURS.map(hour => (
                   <div key={hour} className="flex-1 p-1 text-center border-r border-slate-100">
                     <div className="text-xs font-medium text-slate-600">
                       {hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`}
                     </div>
                   </div>
                 ))}
              </div>
            </div>

            {/* User Rows with Schedule Blocks */}
            <div className="divide-y divide-slate-100">
              {filteredUsers.map((u, userIdx) => {
                const schedules = getScheduleForUserDay(u.id, currentDayOfWeek);
                const onTimeOff = isUserOnTimeOff(u.id, selectedDay);

                return (
                  <div key={u.id} className={cn(
                    "flex relative",
                    userIdx % 2 === 0 ? "bg-white" : "bg-slate-50"
                  )}>
                    {/* User Info */}
                    <div className="w-48 shrink-0 border-r border-slate-200 p-4 flex items-center gap-3">
                      {u.profile_photo_url ? (
                        <img
                          src={u.profile_photo_url}
                          alt={u.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-purple-600" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-slate-900 truncate text-sm">{u.full_name}</div>
                      </div>
                    </div>

                    {/* Time Grid */}
                    <div className="flex-1 relative min-h-[80px] flex">
                      {HOURS.map(hour => (
                        <div key={hour} className="flex-1 border-r border-slate-100"></div>
                      ))}

                      {/* Schedule Blocks Overlay */}
                      <div 
                        className={cn("absolute inset-0 px-1 py-3 time-grid-container", !isAdmin && "cursor-not-allowed")}
                        onMouseDown={(e) => {
                          if (isAdmin && !onTimeOff && e.target === e.currentTarget) {
                            handleCreateStart(e, u.id, u.full_name, currentDayOfWeek);
                          }
                        }}
                      >
                        {/* Time Off Blocks */}
                        {getTimeOffForUserDay(u.id, selectedDay).map(timeOff => {
                          if (timeOff.is_partial_day && timeOff.start_time && timeOff.end_time) {
                            const startHour = parseTime(timeOff.start_time);
                            const endHour = parseTime(timeOff.end_time);
                            const startPercent = (startHour / 24) * 100;
                            const widthPercent = ((endHour - startHour) / 24) * 100;

                            return (
                              <div
                                key={`timeoff-${timeOff.id}`}
                                className="absolute h-[calc(100%-1rem)] rounded-lg bg-gray-300 opacity-60 flex items-center justify-center"
                                style={{
                                  left: `${startPercent}%`,
                                  width: `${widthPercent}%`
                                }}
                              >
                                <span className="text-xs font-medium text-black">Time Off</span>
                              </div>
                            );
                          } else {
                            // Full day time off
                            return (
                              <div
                                key={`timeoff-${timeOff.id}`}
                                className="absolute inset-0 rounded-lg bg-gray-300 opacity-60 flex items-center justify-center"
                              >
                                <span className="text-xs font-medium text-black">Time Off</span>
                              </div>
                            );
                          }
                        })}

                        {/* Schedule and Create Preview */}
                        {(
                          <>
                            {schedules
                              .filter(s => !isScheduleBlockedByTimeOff(s, u.id, selectedDay))
                              .flatMap(schedule => splitScheduleAroundTimeOff(schedule, u.id, selectedDay))
                              .map((scheduleSegment, segIdx) => {
                                const startHour = parseTime(scheduleSegment.start_time);
                                const endHour = parseTime(scheduleSegment.end_time);
                                const duration = endHour - startHour;

                                // Calculate position as percentage
                                const startPercent = (startHour / 24) * 100;
                                const widthPercent = (duration / 24) * 100;

                                return (
                                  <div
                                    key={`${scheduleSegment.id}-${segIdx}`}
                                    data-schedule-id={scheduleSegment.id}
                                  className={cn(
                                    "absolute h-[calc(100%-1rem)] rounded-lg bg-gradient-to-r text-white px-3 py-2 shadow-sm overflow-visible group cursor-pointer transition-all select-none",
                                    getDepartmentColor(u.id).from,
                                    getDepartmentColor(u.id).to,
                                    getDepartmentColor(u.id).hover
                                  )}
                                  style={{
                                    left: `${startPercent}%`,
                                    width: `${widthPercent}%`
                                  }}
                                  onClick={() => isAdmin && handleEditSchedule(scheduleSegment)}
                                >
                                  {/* Left resize handle */}
                                  {isAdmin && (
                                    <div
                                      className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/20 transition-colors z-10"
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setResizing({ scheduleId: scheduleSegment.id, edge: 'start' });
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  )}
                                  
                                  <div className="text-xs font-semibold">
                                    {formatTimeTo12Hour(scheduleSegment.start_time)} - {formatTimeTo12Hour(scheduleSegment.end_time)}
                                  </div>
                                  {scheduleSegment.notes && (
                                    <div className="text-xs text-purple-100 mt-1 truncate">
                                      {scheduleSegment.notes}
                                    </div>
                                  )}
                                  {isAdmin && (
                                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-20">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditSchedule(scheduleSegment);
                                        }}
                                        className="p-1 rounded bg-white/20 hover:bg-white/30"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (confirm('Delete this schedule?')) {
                                            deleteScheduleMutation.mutate(scheduleSegment.id);
                                          }
                                        }}
                                        className="p-1 rounded bg-white/20 hover:bg-white/30"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                  
                                  {/* Right resize handle */}
                                  {isAdmin && (
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/20 transition-colors z-10"
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setResizing({ scheduleId: scheduleSegment.id, edge: 'end' });
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  )}
                                </div>
                              );
                            })}
                            
                            {/* Creating preview */}
                             {creating && creating.userId === u.id && creating.dayOfWeek === currentDayOfWeek && (
                               <div
                                 className="absolute h-[calc(100%-1rem)] rounded-lg bg-purple-300 opacity-50 pointer-events-none"
                                 style={{
                                   left: `${((Math.min(creating.startHour, creating.endHour)) / 24) * 100}%`,
                                   width: `${((Math.abs(creating.endHour - creating.startHour)) / 24) * 100}%`
                                 }}
                               />
                             )}
                            
                            {!onTimeOff && isAdmin && (
                              <button
                                onClick={() => handleAddSchedule(u.id, u.full_name, currentDayOfWeek)}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-600 flex items-center justify-center transition-colors opacity-0 hover:opacity-100"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            )}
                            </>
                            )}
                            </div>
                            </div>
                            </div>
                            );
                            })}
                            </div>
                            </div>
                            )}
                            </div>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSchedule ? 'Edit Schedule' : 'Add Schedule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-900 block mb-2">
                {scheduleForm.user_name}
              </label>
              <p className="text-xs text-slate-500 capitalize">{scheduleForm.day_of_week}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-900 block mb-2">Start Time</label>
                <Input
                  type="time"
                  value={scheduleForm.start_time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-900 block mb-2">End Time</label>
                <Input
                  type="time"
                  value={scheduleForm.end_time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-900 block mb-2">Notes (optional)</label>
              <Textarea
                value={scheduleForm.notes}
                onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                placeholder="Add any notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSchedule} className="bg-purple-600 hover:bg-purple-700">
              {editingSchedule ? 'Update' : 'Add'} Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}