import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Mail, 
  Settings,
  Shield,
  CheckCircle,
  Trash2,
  Clock,
  MessageCircle,
  GraduationCap,
  Wrench,
  Briefcase,
  Film,
  Search,
  ChevronDown,
  ChevronUp,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function TeamManagement({ user }) {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState(null);
  const [showPending, setShowPending] = useState(true);
  const [deletingUser, setDeletingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState({});

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Fetch all users including pending invites
      const allUsers = await base44.entities.User.list();
      return allUsers;
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => base44.entities.User.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const toggleDepartment = (userId, department, currentDepts = []) => {
    const newDepts = currentDepts.includes(department)
      ? currentDepts.filter(d => d !== department)
      : [...currentDepts, department];
    
    updateUserMutation.mutate({ id: userId, data: { departments: newDepts } });
  };

  const handleRoleChange = (userId, roleValue) => {
    if (roleValue === 'trainer') {
      updateUserMutation.mutate({ id: userId, data: { role: 'user', is_trainer: true } });
    } else {
      updateUserMutation.mutate({ id: userId, data: { role: roleValue, is_trainer: false } });
    }
  };

  const getUserRoleDisplay = (user) => {
    if (user.is_trainer) return 'trainer';
    return user.role;
  };

  const handleDeleteUser = () => {
    if (deletingUser) {
      deleteUserMutation.mutate(deletingUser.id);
      setDeletingUser(null);
    }
  };

  // Separate users into active and pending
  // Active users have a full_name or at least some profile data
  // Pending invites typically only have email and role
  const activeUsers = users.filter(u => u.full_name && u.full_name.trim().length > 0);
  const pendingInvites = users.filter(u => !u.full_name || u.full_name.trim().length === 0);

  // Filter users by search query
  const filteredActiveUsers = activeUsers.filter(u => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return u.full_name?.toLowerCase().includes(query) || 
           u.email?.toLowerCase().includes(query);
  });

  const filteredPendingInvites = pendingInvites.filter(u => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return u.email?.toLowerCase().includes(query);
  });

  return (
    <div className="max-w-[90rem] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Team Management</h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">
            {activeUsers.length} active
          </p>
        </div>
        <div className="flex gap-2">
          {pendingInvites.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowPending(!showPending)}
              className="gap-1.5 md:gap-2 text-xs md:text-sm h-9 md:h-10"
            >
              <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Pending</span> ({pendingInvites.length})
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="pl-9 md:pl-10 h-10 md:h-12 text-sm md:text-base"
        />
      </div>

      {/* Pending Invites */}
      {showPending && filteredPendingInvites.length > 0 && (
        <div className="bg-amber-50 rounded-xl md:rounded-2xl border border-amber-200 overflow-hidden">
          <div className="p-3 md:p-4 border-b border-amber-200 bg-amber-100">
            <h3 className="font-semibold text-amber-900 flex items-center gap-2 text-sm md:text-base">
              <Clock className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden md:inline">Pending Invitations - Configure Access Before They Join</span>
              <span className="md:hidden">Pending Invites</span>
            </h3>
          </div>
          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-amber-100">
            {filteredPendingInvites.map((invite, index) => (
              <motion.div
                key={invite.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className="p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-medium shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-amber-900 truncate">{invite.email}</div>
                    <div className="text-xs text-amber-600">Invitation pending</div>
                  </div>
                </div>

                <div className="space-y-3 ml-13">
                  <div>
                    <label className="text-xs text-amber-700 mb-1 block">Role</label>
                    <Select
                       value={getUserRoleDisplay(invite)}
                       onValueChange={(newRole) => handleRoleChange(invite.id, newRole)}
                     >
                       <SelectTrigger className="w-full bg-white h-9">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="user">User</SelectItem>
                         <SelectItem value="trainer">Trainer</SelectItem>
                         <SelectItem value="admin">Admin</SelectItem>
                       </SelectContent>
                     </Select>
                  </div>

                  {/* Compensation Access Control */}
                  {(user?.role === 'admin' || user?.can_manage_compensation_access) && (
                    <div className="border-t border-amber-200 pt-3">
                      <label className="text-xs text-amber-700 mb-2 block flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5" />
                        Compensation Access
                      </label>
                      <button
                        onClick={() => {
                          const newValue = !invite.can_view_compensation_hr;
                          updateUserMutation.mutate({
                            id: invite.id,
                            data: { can_view_compensation_hr: newValue }
                          });
                        }}
                        className={cn(
                          "w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-xs",
                          invite.can_view_compensation_hr
                            ? "bg-amber-100 border-amber-200 text-amber-700"
                            : "bg-white border-slate-200 text-slate-400"
                        )}
                      >
                        {invite.can_view_compensation_hr && <CheckCircle className="w-3 h-3" />}
                        Can View/Edit Compensation
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-amber-700 mb-2 block">Departments</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => toggleDepartment(invite.id, 'sales', invite.departments)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-xs",
                          invite.departments?.includes('sales')
                            ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                            : "bg-white border-slate-200 text-slate-400"
                        )}
                      >
                        {invite.departments?.includes('sales') && <CheckCircle className="w-3 h-3" />}
                        Sales
                      </button>
                      <button
                        onClick={() => toggleDepartment(invite.id, 'social', invite.departments)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-xs",
                          invite.departments?.includes('social')
                            ? "bg-violet-100 border-violet-200 text-violet-700"
                            : "bg-white border-slate-200 text-slate-400"
                        )}
                      >
                        {invite.departments?.includes('social') && <CheckCircle className="w-3 h-3" />}
                        Social
                      </button>
                      <button
                        onClick={() => toggleDepartment(invite.id, 'schedule', invite.departments)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-xs",
                          invite.departments?.includes('schedule')
                            ? "bg-purple-100 border-purple-200 text-purple-700"
                            : "bg-white border-slate-200 text-slate-400"
                        )}
                      >
                        {invite.departments?.includes('schedule') && <CheckCircle className="w-3 h-3" />}
                        Schedule
                      </button>
                      <button
                        onClick={() => toggleDepartment(invite.id, 'customer_service', invite.departments)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-xs",
                          invite.departments?.includes('customer_service')
                            ? "bg-cyan-100 border-cyan-200 text-cyan-700"
                            : "bg-white border-slate-200 text-slate-400"
                        )}
                      >
                        {invite.departments?.includes('customer_service') && <CheckCircle className="w-3 h-3" />}
                        CS
                      </button>
                      <button
                        onClick={() => toggleDepartment(invite.id, 'training', invite.departments)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-xs",
                          invite.departments?.includes('training')
                            ? "bg-indigo-100 border-indigo-200 text-indigo-700"
                            : "bg-white border-slate-200 text-slate-400"
                        )}
                      >
                        {invite.departments?.includes('training') && <CheckCircle className="w-3 h-3" />}
                        Training
                      </button>
                      <button
                        onClick={() => toggleDepartment(invite.id, 'equipment', invite.departments)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-xs",
                          invite.departments?.includes('equipment')
                            ? "bg-orange-100 border-orange-200 text-orange-700"
                            : "bg-white border-slate-200 text-slate-400"
                        )}
                      >
                        {invite.departments?.includes('equipment') && <CheckCircle className="w-3 h-3" />}
                        Equipment
                      </button>
                      <button
                        onClick={() => toggleDepartment(invite.id, 'editors', invite.departments)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-xs",
                          invite.departments?.includes('editors')
                            ? "bg-purple-100 border-purple-200 text-purple-700"
                            : "bg-white border-slate-200 text-slate-400"
                        )}
                      >
                        {invite.departments?.includes('editors') && <CheckCircle className="w-3 h-3" />}
                        Editors
                      </button>
                      <button
                        onClick={() => toggleDepartment(invite.id, 'hr_accounting', invite.departments)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-xs",
                          invite.departments?.includes('hr_accounting')
                            ? "bg-rose-100 border-rose-200 text-rose-700"
                            : "bg-white border-slate-200 text-slate-400"
                        )}
                      >
                        {invite.departments?.includes('hr_accounting') && <CheckCircle className="w-3 h-3" />}
                        HR/Acct
                      </button>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletingUser({ id: invite.id, name: invite.email, isPending: true })}
                    className="w-full text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Cancel Invitation
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-amber-200">
                  <th className="sticky left-0 z-10 bg-amber-50 text-left p-4 text-sm font-medium text-amber-700">Email</th>
                  <th className="text-left p-4 text-sm font-medium text-amber-700">Role</th>
                  <th className="text-left p-4 text-sm font-medium text-amber-700">Sales</th>
                  <th className="text-left p-4 text-sm font-medium text-amber-700">Social</th>
                  <th className="text-left p-4 text-sm font-medium text-amber-700">Tasks</th>
                  <th className="text-left p-4 text-sm font-medium text-amber-700">Schedule</th>
                  <th className="text-left p-4 text-sm font-medium text-amber-700">CS</th>
                  <th className="text-left p-4 text-sm font-medium text-amber-700">Training</th>
                  <th className="text-left p-4 text-sm font-medium text-amber-700">Equipment</th>
                  <th className="text-left p-4 text-sm font-medium text-amber-700">Editors</th>
                  <th className="text-left p-4 text-sm font-medium text-amber-700">HR/Acct</th>
                  <th className="text-left p-4 text-sm font-medium text-amber-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPendingInvites.map((invite, index) => (
                  <motion.tr
                    key={invite.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-amber-100 hover:bg-amber-50"
                  >
                    <td className="sticky left-0 z-10 bg-amber-50 p-4 border-r border-amber-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-medium">
                          <Mail className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium text-amber-900">{invite.email}</div>
                          <div className="text-xs text-amber-600">Invitation pending</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Select
                        value={invite.role}
                        onValueChange={(newRole) => updateUserMutation.mutate({ id: invite.id, data: { role: newRole } })}
                      >
                        <SelectTrigger className="w-28 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="trainer">Trainer</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleDepartment(invite.id, 'sales', invite.departments)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
                          invite.departments?.includes('sales')
                            ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                            : "bg-white border-slate-200 text-slate-400"
                        )}
                      >
                        {invite.departments?.includes('sales') && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Sales
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleDepartment(invite.id, 'social', invite.departments)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
                          invite.departments?.includes('social')
                            ? "bg-violet-100 border-violet-200 text-violet-700"
                            : "bg-white border-slate-200 text-slate-400"
                        )}
                      >
                        {invite.departments?.includes('social') && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Social
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleDepartment(invite.id, 'tasks', invite.departments)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
                          invite.departments?.includes('tasks')
                            ? "bg-blue-100 border-blue-200 text-blue-700"
                            : "bg-white border-slate-200 text-slate-400"
                        )}
                      >
                        {invite.departments?.includes('tasks') && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Tasks
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleDepartment(invite.id, 'schedule', invite.departments)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
                          invite.departments?.includes('schedule')
                            ? "bg-purple-100 border-purple-200 text-purple-700"
                            : "bg-white border-slate-200 text-slate-400"
                        )}
                      >
                        {invite.departments?.includes('schedule') && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Schedule
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleDepartment(invite.id, 'customer_service', invite.departments)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
                          invite.departments?.includes('customer_service')
                            ? "bg-cyan-100 border-cyan-200 text-cyan-700"
                            : "bg-white border-slate-200 text-slate-400"
                        )}
                      >
                        {invite.departments?.includes('customer_service') && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        CS
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleDepartment(invite.id, 'training', invite.departments)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
                          invite.departments?.includes('training')
                            ? "bg-indigo-100 border-indigo-200 text-indigo-700"
                            : "bg-white border-slate-200 text-slate-400"
                        )}
                      >
                        {invite.departments?.includes('training') && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Training
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleDepartment(invite.id, 'equipment', invite.departments)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
                          invite.departments?.includes('equipment')
                            ? "bg-orange-100 border-orange-200 text-orange-700"
                            : "bg-white border-slate-200 text-slate-400"
                        )}
                      >
                        {invite.departments?.includes('equipment') && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Equipment
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleDepartment(invite.id, 'editors', invite.departments)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
                          invite.departments?.includes('editors')
                            ? "bg-purple-100 border-purple-200 text-purple-700"
                            : "bg-white border-slate-200 text-slate-400"
                        )}
                      >
                        {invite.departments?.includes('editors') && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Editors
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleDepartment(invite.id, 'hr_accounting', invite.departments)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
                          invite.departments?.includes('hr_accounting')
                            ? "bg-rose-100 border-rose-200 text-rose-700"
                            : "bg-white border-slate-200 text-slate-400"
                        )}
                      >
                        {invite.departments?.includes('hr_accounting') && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        HR/Acct
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setDeletingUser({ id: invite.id, name: invite.email, isPending: true })}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Cancel
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Active Users List */}
      <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-3 md:p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-900 text-sm md:text-base">Active Team Members</h3>
        </div>
        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              Loading...
            </div>
          ) : filteredActiveUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              {searchQuery ? 'No team members found matching your search' : 'No active team members yet'}
            </div>
          ) : (
            filteredActiveUsers.map((u, index) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className="p-4"
              >
                <button
                  onClick={() => setExpandedCards(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                  className="w-full"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {u.profile_photo_url ? (
                      <img
                        src={u.profile_photo_url}
                        alt={u.full_name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-slate-100 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium shrink-0">
                        {u.full_name?.charAt(0) || u.email?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-medium text-slate-900 truncate">{u.full_name || 'Unnamed'}</div>
                      <div className="text-sm text-slate-500 truncate">{u.email}</div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {u.departments?.map(dept => (
                          <span key={dept} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {dept === 'customer_service' ? 'CS' : dept === 'hr_accounting' ? 'HR' : dept}
                          </span>
                        ))}
                      </div>
                    </div>
                    {expandedCards[u.id] ? (
                      <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                  </div>
                </button>

                {expandedCards[u.id] && (
                  <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Role</label>
                    <Select
                      value={getUserRoleDisplay(u)}
                      onValueChange={(newRole) => handleRoleChange(u.id, newRole)}
                    >
                      <SelectTrigger className="w-full h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="trainer">Trainer</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Compensation Access Control */}
                  {(user?.role === 'admin' || user?.can_manage_compensation_access) && (
                    <div className="border-t pt-3">
                      <label className="text-xs text-slate-500 mb-2 block flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5" />
                        Compensation Access
                      </label>
                      <button
                        onClick={() => {
                          const newValue = !u.can_view_compensation_hr;
                          updateUserMutation.mutate({
                            id: u.id,
                            data: { can_view_compensation_hr: newValue }
                          });
                        }}
                        className={cn(
                          "w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border transition-colors text-xs",
                          u.can_view_compensation_hr
                            ? "bg-amber-100 border-amber-200 text-amber-700"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        )}
                      >
                        {u.can_view_compensation_hr && <CheckCircle className="w-3 h-3" />}
                        Can View/Edit Compensation
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-slate-500 mb-2 block">Departments</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => toggleDepartment(u.id, 'sales', u.departments)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-xs",
                          u.departments?.includes('sales')
                            ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        )}
                      >
                        {u.departments?.includes('sales') && <CheckCircle className="w-3 h-3" />}
                        Sales
                      </button>
                      <button
                        onClick={() => toggleDepartment(u.id, 'social', u.departments)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-xs",
                          u.departments?.includes('social')
                            ? "bg-violet-100 border-violet-200 text-violet-700"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        )}
                      >
                        {u.departments?.includes('social') && <CheckCircle className="w-3 h-3" />}
                        Social
                      </button>
                      <button
                        onClick={() => toggleDepartment(u.id, 'schedule', u.departments)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-xs",
                          u.departments?.includes('schedule')
                            ? "bg-purple-100 border-purple-200 text-purple-700"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        )}
                      >
                        {u.departments?.includes('schedule') && <CheckCircle className="w-3 h-3" />}
                        Schedule
                      </button>
                      <button
                        onClick={() => toggleDepartment(u.id, 'customer_service', u.departments)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-xs",
                          u.departments?.includes('customer_service')
                            ? "bg-cyan-100 border-cyan-200 text-cyan-700"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        )}
                      >
                        {u.departments?.includes('customer_service') && <CheckCircle className="w-3 h-3" />}
                        CS
                      </button>
                      <button
                        onClick={() => toggleDepartment(u.id, 'training', u.departments)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-xs",
                          u.departments?.includes('training')
                            ? "bg-indigo-100 border-indigo-200 text-indigo-700"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        )}
                      >
                        {u.departments?.includes('training') && <CheckCircle className="w-3 h-3" />}
                        Training
                      </button>
                      <button
                        onClick={() => toggleDepartment(u.id, 'equipment', u.departments)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-xs",
                          u.departments?.includes('equipment')
                            ? "bg-orange-100 border-orange-200 text-orange-700"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        )}
                      >
                        {u.departments?.includes('equipment') && <CheckCircle className="w-3 h-3" />}
                        Equipment
                      </button>
                      <button
                        onClick={() => toggleDepartment(u.id, 'editors', u.departments)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-xs",
                          u.departments?.includes('editors')
                            ? "bg-purple-100 border-purple-200 text-purple-700"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        )}
                      >
                        {u.departments?.includes('editors') && <CheckCircle className="w-3 h-3" />}
                        Editors
                      </button>
                      <button
                        onClick={() => toggleDepartment(u.id, 'hr_accounting', u.departments)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors text-xs",
                          u.departments?.includes('hr_accounting')
                            ? "bg-rose-100 border-rose-200 text-rose-700"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        )}
                      >
                        {u.departments?.includes('hr_accounting') && <CheckCircle className="w-3 h-3" />}
                        HR/Acct
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingUser(u);
                      }}
                      className="flex-1 text-xs h-9"
                    >
                      <Settings className="w-3.5 h-3.5 mr-1.5" />
                      Settings
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingUser({ id: u.id, name: u.full_name, isPending: false });
                      }}
                      className="flex-1 text-red-600 hover:text-red-700 text-xs h-9"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Delete
                    </Button>
                  </div>
                </div>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="sticky left-0 z-10 bg-slate-50 text-left p-4 text-sm font-medium text-slate-500">User</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Role</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Sales</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Social</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Tasks</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Schedule</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">CS</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Training</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Equipment</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Editors</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">HR/Acct</th>
                <th className="text-left p-4 text-sm font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : filteredActiveUsers.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-slate-400">
                    {searchQuery ? 'No team members found matching your search' : 'No active team members yet'}
                  </td>
                </tr>
              ) : (
                filteredActiveUsers.map((u, index) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-slate-50 hover:bg-slate-50"
                  >
                    <td className="sticky left-0 z-10 bg-white p-4 border-r border-slate-100">
                      <div className="flex items-center gap-3">
                        {u.profile_photo_url ? (
                          <img
                            src={u.profile_photo_url}
                            alt={u.full_name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-slate-100 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium">
                            {u.full_name?.charAt(0) || u.email?.charAt(0) || '?'}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-slate-900">{u.full_name || 'Unnamed'}</div>
                          <div className="text-sm text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Select
                        value={getUserRoleDisplay(u)}
                        onValueChange={(newRole) => handleRoleChange(u.id, newRole)}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="trainer">Trainer</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                        </td>
                        <td className="p-4">
                        <button
                        onClick={() => toggleDepartment(u.id, 'sales', u.departments)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
                          u.departments?.includes('sales')
                            ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        )}
                      >
                        {u.departments?.includes('sales') && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Sales
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleDepartment(u.id, 'social', u.departments)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
                          u.departments?.includes('social')
                            ? "bg-violet-100 border-violet-200 text-violet-700"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        )}
                      >
                        {u.departments?.includes('social') && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Social
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleDepartment(u.id, 'tasks', u.departments)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
                          u.departments?.includes('tasks')
                            ? "bg-blue-100 border-blue-200 text-blue-700"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        )}
                      >
                        {u.departments?.includes('tasks') && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Tasks
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleDepartment(u.id, 'schedule', u.departments)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
                          u.departments?.includes('schedule')
                            ? "bg-purple-100 border-purple-200 text-purple-700"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        )}
                      >
                        {u.departments?.includes('schedule') && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Schedule
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleDepartment(u.id, 'customer_service', u.departments)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
                          u.departments?.includes('customer_service')
                            ? "bg-cyan-100 border-cyan-200 text-cyan-700"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        )}
                      >
                        {u.departments?.includes('customer_service') && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        CS
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleDepartment(u.id, 'training', u.departments)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
                          u.departments?.includes('training')
                            ? "bg-indigo-100 border-indigo-200 text-indigo-700"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        )}
                      >
                        {u.departments?.includes('training') && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Training
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleDepartment(u.id, 'equipment', u.departments)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
                          u.departments?.includes('equipment')
                            ? "bg-orange-100 border-orange-200 text-orange-700"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        )}
                      >
                        {u.departments?.includes('equipment') && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Equipment
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleDepartment(u.id, 'editors', u.departments)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
                          u.departments?.includes('editors')
                            ? "bg-purple-100 border-purple-200 text-purple-700"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        )}
                      >
                        {u.departments?.includes('editors') && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Editors
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleDepartment(u.id, 'hr_accounting', u.departments)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors",
                          u.departments?.includes('hr_accounting')
                            ? "bg-rose-100 border-rose-200 text-rose-700"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        )}
                      >
                        {u.departments?.includes('hr_accounting') && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        HR/Acct
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingUser({ id: u.id, name: u.full_name, isPending: false })}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Settings</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-3">
                {editingUser.profile_photo_url ? (
                  <img
                    src={editingUser.profile_photo_url}
                    alt={editingUser.full_name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-100"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium text-lg">
                    {editingUser.full_name?.charAt(0) || '?'}
                  </div>
                )}
                <div>
                  <div className="font-medium text-slate-900">{editingUser.full_name}</div>
                  <div className="text-sm text-slate-500">{editingUser.email}</div>
                </div>
              </div>

              <div className="border-t border-b border-slate-100 py-4">
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Trainer Access
                </label>
                <button
                  onClick={() => {
                    const newValue = !editingUser.is_trainer;
                    updateUserMutation.mutate({
                      id: editingUser.id,
                      data: { is_trainer: newValue }
                    });
                    setEditingUser({ ...editingUser, is_trainer: newValue });
                  }}
                  className={cn(
                    "w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border transition-colors text-sm",
                    editingUser.is_trainer
                      ? "bg-indigo-100 border-indigo-200 text-indigo-700"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                  )}
                >
                  {editingUser.is_trainer && <CheckCircle className="w-4 h-4" />}
                  Give Trainer Access
                </button>
              </div>

              <p className="text-sm text-slate-500">
                User settings and goals can be managed from their respective app settings pages.
              </p>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setEditingUser(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              {deletingUser?.isPending ? 'Cancel Invitation' : 'Delete User'}
            </DialogTitle>
          </DialogHeader>
          {deletingUser && (
            <div className="space-y-4 mt-4">
              <p className="text-slate-700">
                Are you sure you want to {deletingUser.isPending ? 'cancel the invitation for' : 'delete'} <strong>{deletingUser.name}</strong>?
              </p>
              <p className="text-sm text-slate-500">
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setDeletingUser(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleDeleteUser}
                  disabled={deleteUserMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteUserMutation.isPending ? 'Deleting...' : deletingUser.isPending ? 'Cancel Invitation' : 'Delete User'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}