import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, ChevronDown, ChevronUp, UserCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function DaVinciCodes({ user }) {
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState({ in_use: true, available: true });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    slot1_user_id: '',
    slot2_user_id: '',
  });

  // Admin check
  if (user?.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">Only administrators can access DaVinci Codes.</p>
        </div>
      </div>
    );
  }

  // Fetch codes
  const { data: codes = [], isLoading } = useQuery({
    queryKey: ['davinci-codes'],
    queryFn: () => base44.entities.DaVinciCode.list('status'),
  });

  // Fetch all staff users
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list('full_name'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DaVinciCode.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['davinci-codes']);
      toast.success('DaVinci code added');
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to add code'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DaVinciCode.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['davinci-codes']);
      toast.success('Code updated');
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to update code'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DaVinciCode.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['davinci-codes']);
      toast.success('Code deleted');
    },
    onError: () => toast.error('Failed to delete code'),
  });

  const resetForm = () => {
    setFormData({ code: '', slot1_user_id: '', slot2_user_id: '' });
    setEditingCode(null);
  };

  const handleOpenDialog = (code = null) => {
    if (code) {
      setEditingCode(code);
      setFormData({
        code: code.code,
        slot1_user_id: code.slot1_user_id || '',
        slot2_user_id: code.slot2_user_id || '',
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.code.trim()) {
      toast.error('Code is required');
      return;
    }

    const slot1User = allUsers.find(u => u.id === formData.slot1_user_id);
    const slot2User = allUsers.find(u => u.id === formData.slot2_user_id);

    const hasSlot1 = formData.slot1_user_id && slot1User;
    const hasSlot2 = formData.slot2_user_id && slot2User;
    const status = (hasSlot1 || hasSlot2) ? 'in_use' : 'available';

    const data = {
      code: formData.code.trim(),
      status,
      slot1_user_id: hasSlot1 ? formData.slot1_user_id : null,
      slot1_user_name: hasSlot1 ? slot1User.full_name : null,
      slot2_user_id: hasSlot2 ? formData.slot2_user_id : null,
      slot2_user_name: hasSlot2 ? slot2User.full_name : null,
    };

    if (editingCode) {
      updateMutation.mutate({ id: editingCode.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const inUseCodes = codes.filter(c => c.status === 'in_use');
  const availableCodes = codes.filter(c => c.status === 'available');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">DaVinci Codes</h1>
          <p className="text-slate-500 mt-1">Manage DaVinci access codes and assignments</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Code
        </Button>
      </div>

      {/* In Use Section */}
      <div className="bg-white rounded-xl border border-slate-200 mb-4">
        <button
          onClick={() => toggleSection('in_use')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-emerald-500 rounded-full" />
            <h2 className="text-lg font-semibold text-slate-900">In Use</h2>
            <span className="text-sm text-slate-500">({inUseCodes.length})</span>
          </div>
          {expandedSections.in_use ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {expandedSections.in_use && (
          <div className="border-t border-slate-200">
            {inUseCodes.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No codes in use</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Item</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-slate-700">Slot 1</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-slate-700">Slot 2</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {inUseCodes.map((code) => (
                      <tr key={code.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-mono text-slate-900">{code.code}</td>
                        <td className="px-4 py-3 text-center">
                          {code.slot1_user_name ? (
                            <div className="flex items-center justify-center gap-2">
                              <UserCircle2 className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-700">{code.slot1_user_name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {code.slot2_user_name ? (
                            <div className="flex items-center justify-center gap-2">
                              <UserCircle2 className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-700">{code.slot2_user_name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(code)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Available Section */}
      <div className="bg-white rounded-xl border border-slate-200">
        <button
          onClick={() => toggleSection('available')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-rose-500 rounded-full" />
            <h2 className="text-lg font-semibold text-slate-900">Available</h2>
            <span className="text-sm text-slate-500">({availableCodes.length})</span>
          </div>
          {expandedSections.available ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {expandedSections.available && (
          <div className="border-t border-slate-200">
            {availableCodes.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No available codes</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Item</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-slate-700">Slot 1</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-slate-700">Slot 2</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {availableCodes.map((code) => (
                      <tr key={code.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-mono text-slate-900">{code.code}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm text-slate-400">—</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm text-slate-400">—</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(code)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCode ? 'Edit Code' : 'Add New Code'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                DaVinci Code *
              </label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Enter code..."
                className="font-mono"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Slot 1 - Assign User
              </label>
              <Select
                value={formData.slot1_user_id}
                onValueChange={(v) => setFormData({ ...formData, slot1_user_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {allUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Slot 2 - Assign User
              </label>
              <Select
                value={formData.slot2_user_id}
                onValueChange={(v) => setFormData({ ...formData, slot2_user_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {allUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            {editingCode && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm('Delete this code?')) {
                    deleteMutation.mutate(editingCode.id);
                    setDialogOpen(false);
                    resetForm();
                  }
                }}
              >
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {editingCode ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}