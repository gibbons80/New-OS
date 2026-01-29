import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Calendar, Plus, Check, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from '@/components/ui/dialog';
  import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from '@/components/ui/popover';
  import { Calendar as CalendarComponent } from '@/components/ui/calendar';
  import { Badge } from '@/components/ui/badge';
  import { cn } from '@/lib/utils';
  import { toast } from 'sonner';
  import { motion } from 'framer-motion';
  import { Calendar as CalendarIcon } from 'lucide-react';

export default function TimeOffRequests({ user }) {
    const queryClient = useQueryClient();
    const [showNewRequest, setShowNewRequest] = useState(false);
    const [startDateOpen, setStartDateOpen] = useState(false);
    const [endDateOpen, setEndDateOpen] = useState(false);

  const formatTimeTo12Hour = (time24) => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'pm' : 'am';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, '0')}${period}`;
  };
    const [newRequest, setNewRequest] = useState({
      start_date: '',
      end_date: '',
      is_partial_day: false,
      start_time: '09:00',
      end_time: '17:00',
      request_type: 'personal',
      reason: '',
      covering_user_id: '',
      covering_user_name: ''
    });

  const isAdmin = user?.role === 'admin';

  const { data: requests = [] } = useQuery({
    queryKey: ['timeoff-requests'],
    queryFn: () => base44.entities.TimeOffRequest.list('-created_date')
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      const staffList = await base44.entities.Staff.list();
      
      return allUsers.filter(u => {
        const staffRecord = staffList.find(s => s.user_id === u.id);
        return staffRecord?.platform_access?.includes('schedule') || u.role === 'admin';
      });
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TimeOffRequest.create({
      ...data,
      user_id: user?.id,
      user_name: user?.full_name
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeoff-requests'] });
      setShowNewRequest(false);
      setNewRequest({ start_date: '', end_date: '', is_partial_day: false, start_time: '09:00', end_time: '17:00', request_type: 'personal', reason: '', covering_user_id: '', covering_user_name: '' });
      toast.success('Time off request submitted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit request');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimeOffRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeoff-requests'] });
      toast.success('Request updated');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TimeOffRequest.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeoff-requests'] });
      toast.success('Request deleted');
    }
  });

  const handleApprove = (request) => {
    updateMutation.mutate({
      id: request.id,
      data: {
        status: 'approved',
        reviewed_by_id: user?.id,
        reviewed_by_name: user?.full_name,
        reviewed_at: new Date().toISOString()
      }
    });
  };

  const handleDeny = (request) => {
    updateMutation.mutate({
      id: request.id,
      data: {
        status: 'denied',
        reviewed_by_id: user?.id,
        reviewed_by_name: user?.full_name,
        reviewed_at: new Date().toISOString()
      }
    });
  };

  const myRequests = requests.filter(r => r.user_id === user?.id);
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const allRequests = requests;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Time Off Requests</h1>
          <p className="text-slate-600 mt-2">Manage your time off and view team schedules</p>
        </div>
        <Button onClick={() => setShowNewRequest(true)} className="bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <Plus className="w-4 h-4 mr-2" />
          Request Time Off
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02, y: -4 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-100" />
            <div>
              <div className="text-4xl font-bold">{pendingRequests.length}</div>
              <div className="text-amber-100 text-sm">Pending Approval</div>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02, y: -4 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          <div className="flex items-center gap-3">
            <Check className="w-8 h-8 text-emerald-100" />
            <div>
              <div className="text-4xl font-bold">
                {requests.filter(r => r.status === 'approved').length}
              </div>
              <div className="text-emerald-100 text-sm">Approved</div>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02, y: -4 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-purple-100" />
            <div>
              <div className="text-4xl font-bold">{myRequests.length}</div>
              <div className="text-purple-100 text-sm">My Requests</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* My Requests */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-shadow duration-300"
      >
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">My Requests</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {myRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No time off requests yet</p>
            </div>
          ) : (
            myRequests.map(request => (
              <div key={request.id} className="p-6 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="font-medium text-slate-900">
                      {format(new Date(request.start_date + 'T00:00:00'), 'MMM d, yyyy')} - {format(new Date(request.end_date + 'T00:00:00'), 'MMM d, yyyy')}
                      {request.is_partial_day && request.start_time && request.end_time && (
                        <span className="ml-2 text-sm text-slate-600">({formatTimeTo12Hour(request.start_time)} - {formatTimeTo12Hour(request.end_time)})</span>
                      )}
                    </span>
                    <Badge className={cn(
                      request.status === 'pending' && "bg-amber-100 text-amber-700",
                      request.status === 'approved' && "bg-emerald-100 text-emerald-700",
                      request.status === 'denied' && "bg-red-100 text-red-700"
                    )}>
                      {request.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">{request.reason}</p>
                  {request.covering_user_name && (
                    <p className="text-xs text-slate-500 mt-2">
                      Coverage: {request.covering_user_name}
                    </p>
                  )}
                  {request.reviewed_by_name && (
                    <p className="text-xs text-slate-400 mt-2">
                      Reviewed by {request.reviewed_by_name} on {format(new Date(request.reviewed_at), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
                {request.status === 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(request.id)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </motion.div>

      {/* Admin: Pending Requests */}
      {isAdmin && pendingRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Pending Approval</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingRequests.map(request => (
              <div key={request.id} className="p-6 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="font-medium text-slate-900">{request.user_name}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-600">
                      {format(new Date(request.start_date + 'T00:00:00'), 'MMM d')} - {format(new Date(request.end_date + 'T00:00:00'), 'MMM d, yyyy')}
                      {request.is_partial_day && request.start_time && request.end_time && (
                        <span className="ml-2 text-sm">({formatTimeTo12Hour(request.start_time)} - {formatTimeTo12Hour(request.end_time)})</span>
                      )}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{request.reason}</p>
                  {request.covering_user_name && (
                    <p className="text-xs text-slate-500 mt-2">
                      Coverage: {request.covering_user_name}
                    </p>
                  )}
                  </div>
                  <div className="flex gap-2">
                  <Button
                   size="sm"
                   variant="outline"
                   onClick={() => handleDeny(request)}
                   className="text-red-600 hover:text-red-700"
                  >
                   <X className="w-4 h-4 mr-1" />
                   Deny
                  </Button>
                  <Button
                   size="sm"
                   onClick={() => handleApprove(request)}
                   className="bg-emerald-600 hover:bg-emerald-700"
                  >
                   <Check className="w-4 h-4 mr-1" />
                   Approve
                  </Button>
                  </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Admin: All Requests */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">All Requests</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {allRequests.map(request => (
              <div key={request.id} className="p-6 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="font-medium text-slate-900">{request.user_name}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-600">
                      {format(new Date(request.start_date + 'T00:00:00'), 'MMM d')} - {format(new Date(request.end_date + 'T00:00:00'), 'MMM d, yyyy')}
                      {request.is_partial_day && request.start_time && request.end_time && (
                        <span className="ml-2 text-sm">({formatTimeTo12Hour(request.start_time)} - {formatTimeTo12Hour(request.end_time)})</span>
                      )}
                    </span>
                    <Badge className={cn(
                      request.status === 'pending' && "bg-amber-100 text-amber-700",
                      request.status === 'approved' && "bg-emerald-100 text-emerald-700",
                      request.status === 'denied' && "bg-red-100 text-red-700"
                    )}>
                      {request.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">{request.reason}</p>
                  </div>
                  <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                   if (confirm('Delete this request?')) {
                     deleteMutation.mutate(request.id);
                   }
                  }}
                  className="text-red-600 hover:text-red-700"
                  >
                  <X className="w-4 h-4 mr-1" />
                  Delete
                  </Button>
                  </div>
                  ))}
          </div>
        </motion.div>
      )}

      {/* New Request Dialog */}
      <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Request Time Off</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4 overflow-y-auto flex-1">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Start Date</label>
              <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newRequest.start_date ? format(new Date(newRequest.start_date + 'T00:00:00'), 'MMM d, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={newRequest.start_date ? new Date(newRequest.start_date + 'T00:00:00') : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setNewRequest({ ...newRequest, start_date: format(date, 'yyyy-MM-dd') });
                        setStartDateOpen(false);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">End Date</label>
              <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newRequest.end_date ? format(new Date(newRequest.end_date + 'T00:00:00'), 'MMM d, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={newRequest.end_date ? new Date(newRequest.end_date + 'T00:00:00') : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setNewRequest({ ...newRequest, end_date: format(date, 'yyyy-MM-dd') });
                        setEndDateOpen(false);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_partial_day"
                checked={newRequest.is_partial_day}
                onChange={(e) => setNewRequest({ ...newRequest, is_partial_day: e.target.checked })}
                className="h-4 w-4 text-purple-600 border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="is_partial_day" className="text-sm font-medium text-slate-700 cursor-pointer">Partial Day Off</label>
            </div>
            {newRequest.is_partial_day && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Start Time</label>
                  <Input
                    type="time"
                    value={newRequest.start_time}
                    onChange={(e) => setNewRequest({ ...newRequest, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">End Time</label>
                  <Input
                    type="time"
                    value={newRequest.end_time}
                    onChange={(e) => setNewRequest({ ...newRequest, end_time: e.target.value })}
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Type</label>
                <select
                  value={newRequest.request_type}
                  onChange={(e) => setNewRequest({ ...newRequest, request_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="vacation">Vacation</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal Day</option>
                  <option value="unpaid">Unpaid Leave</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Covering (optional)</label>
                <select
                  value={newRequest.covering_user_id}
                  onChange={(e) => {
                    const selectedUser = users.find(u => u.id === e.target.value);
                    setNewRequest({
                      ...newRequest,
                      covering_user_id: e.target.value,
                      covering_user_name: selectedUser?.full_name || ''
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select team member</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Reason (optional)</label>
              <Textarea
                value={newRequest.reason}
                onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                placeholder="Additional details..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowNewRequest(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate(newRequest)}
                disabled={!newRequest.start_date || !newRequest.end_date || (newRequest.is_partial_day && (!newRequest.start_time || !newRequest.end_time)) || createMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}