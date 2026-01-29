import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Plus,
  Search,
  Filter,
  Wrench,
  User,
  CheckCircle,
  AlertCircle,
  Edit2,
  X,
  MessageSquare } from
'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import EquipmentDetailPanel from '@/components/equipment/EquipmentDetailPanel';
import StaffEquipmentAssignmentPanel from '@/components/equipment/StaffEquipmentAssignmentPanel';
import { ChevronRight } from 'lucide-react';

export default function EquipmentDashboard({ user }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [selectedStaffForEquipment, setSelectedStaffForEquipment] = useState(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [showReturnsWarning, setShowReturnsWarning] = useState(false);
  const [showWaitingWarning, setShowWaitingWarning] = useState(false);
  const [newEquipment, setNewEquipment] = useState({
    name: '',
    model: '',
    serial_number: '',
    category: 'camera',
    in_stock: true,
    in_service: false,
    notes: ''
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list('-created_date')
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list()
  });

  const { data: categorySettings = [] } = useQuery({
    queryKey: ['equipment-categories'],
    queryFn: () => base44.entities.AppSetting.filter({
      setting_type: 'equipment_category',
      is_active: true
    }, 'sort_order')
  });

  const createEquipmentMutation = useMutation({
    mutationFn: (data) => base44.entities.Equipment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setShowAddDialog(false);
      setNewEquipment({
        name: '',
        model: '',
        serial_number: '',
        category: 'camera',
        in_stock: true,
        in_service: false,
        notes: ''
      });
    }
  });

  const updateEquipmentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Equipment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setEditingEquipment(null);
    }
  });

  const handleCheckOut = (equipmentItem) => {
    setEditingEquipment({
      ...equipmentItem,
      action: 'checkout'
    });
  };

  const handleCheckIn = (equipmentItem) => {
    updateEquipmentMutation.mutate({
      id: equipmentItem.id,
      data: {
        in_stock: true,
        assigned_to_id: null,
        assigned_to_name: null,
        checked_out_date: null
      }
    });
  };

  const handleToggleService = (equipmentItem) => {
    updateEquipmentMutation.mutate({
      id: equipmentItem.id,
      data: {
        in_service: !equipmentItem.in_service
      }
    });
  };

  const handleSubmitCheckout = () => {
    if (!editingEquipment.assigned_to_id) return;

    const selectedStaff = staff.find((s) => s.id === editingEquipment.assigned_to_id);
    updateEquipmentMutation.mutate({
      id: editingEquipment.id,
      data: {
        in_stock: false,
        assigned_to_id: selectedStaff.id,
        assigned_to_name: selectedStaff.preferred_name || selectedStaff.legal_full_name,
        checked_out_date: new Date().toISOString()
      }
    });
  };

  // Filter equipment
  const filteredEquipment = equipment.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.serial_number || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
    statusFilter === 'in_stock' && item.in_stock && !item.in_service ||
    statusFilter === 'checked_out' && !item.in_stock ||
    statusFilter === 'in_service' && item.in_service;

    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Stats
  const inStockCount = equipment.filter((e) => e.in_stock && !e.in_service).length;
  const checkedOutCount = equipment.filter((e) => !e.in_stock).length;
  const inServiceCount = equipment.filter((e) => e.in_service).length;

  const categories = categorySettings.map((cat) => ({ value: cat.value, label: cat.label }));


  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4">

        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            Equipment Tracker
          </h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">Manage and track all equipment inventory</p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto">

          <Plus className="w-4 h-4 mr-2" />
          Add Equipment
        </Button>
      </motion.div>

      {/* Waiting on Equipment Section - Collapsible */}
      {staff.filter((s) => s.equipment_status === 'waiting_on_equipment').length > 0 &&
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border border-orange-200 shadow-md overflow-hidden">

          <button
          onClick={() => setShowWaitingWarning(!showWaitingWarning)}
          className="w-full p-4 md:p-6 flex items-center justify-between hover:bg-orange-100/30 transition-colors">

            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <div className="text-left">
                <h2 className="text-lg font-semibold text-slate-900">Staff Waiting on Equipment</h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  {staff.filter((s) => s.equipment_status === 'waiting_on_equipment').length} staff member{staff.filter((s) => s.equipment_status === 'waiting_on_equipment').length !== 1 ? 's' : ''} need assignment
                </p>
              </div>
            </div>
            <ChevronRight className={cn(
            "w-5 h-5 text-orange-600 transition-transform flex-shrink-0",
            showWaitingWarning && "rotate-90"
          )} />
          </button>

          <AnimatePresence>
            {showWaitingWarning &&
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-orange-200 p-4 md:p-6">

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {staff.filter((s) => s.equipment_status === 'waiting_on_equipment').map((s) =>
              <button
                key={s.id}
                onClick={() => setSelectedStaffForEquipment(s)}
                className="bg-white rounded-lg p-4 border border-orange-100 shadow-sm hover:shadow-md transition-shadow text-left">

                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-700 font-semibold text-sm flex-shrink-0">
                          {s.profile_photo_url ?
                    <img src={s.profile_photo_url} alt={s.preferred_name} className="w-10 h-10 rounded-lg object-cover" /> :

                    (s.preferred_name || s.legal_full_name)?.charAt(0) || '?'
                    }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm">{s.preferred_name || s.legal_full_name}</p>
                          <p className="text-xs text-slate-500">{s.primary_role}</p>
                        </div>
                      </div>
                      {s.company_email &&
                <p className="text-xs text-orange-600 break-all">
                          {s.company_email}
                        </p>
                }
                    </button>
              )}
                </div>
              </motion.div>
          }
          </AnimatePresence>
        </motion.div>
      }

      {/* Staff Equipment Return Section - Collapsible */}
      {staff.filter((s) => s.equipment_status === 'request_return' || s.equipment_status === 'waiting_on_returning').length > 0 &&
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-200 shadow-md overflow-hidden">

          <button
          onClick={() => setShowReturnsWarning(!showReturnsWarning)}
          className="w-full p-4 md:p-6 flex items-center justify-between hover:bg-red-100/30 transition-colors">

            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="text-left">
                <h2 className="text-lg font-semibold text-slate-900">Equipment Returns</h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  {staff.filter((s) => s.equipment_status === 'request_return' || s.equipment_status === 'waiting_on_returning').length} staff member{staff.filter((s) => s.equipment_status === 'request_return' || s.equipment_status === 'waiting_on_returning').length !== 1 ? 's' : ''} awaiting return
                </p>
              </div>
            </div>
            <ChevronRight className={cn(
            "w-5 h-5 text-red-600 transition-transform flex-shrink-0",
            showReturnsWarning && "rotate-90"
          )} />
          </button>

          <AnimatePresence>
            {showReturnsWarning &&
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-red-200 p-4 md:p-6">

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {staff.filter((s) => s.equipment_status === 'request_return' || s.equipment_status === 'waiting_on_returning').map((s) =>
              <button
                key={s.id}
                onClick={() => setSelectedStaffForEquipment(s)}
                className="bg-white rounded-lg p-4 border border-red-100 shadow-sm hover:shadow-md transition-shadow text-left">

                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-700 font-semibold text-sm flex-shrink-0">
                          {s.profile_photo_url ?
                    <img src={s.profile_photo_url} alt={s.preferred_name} className="w-10 h-10 rounded-lg object-cover" /> :

                    (s.preferred_name || s.legal_full_name)?.charAt(0) || '?'
                    }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm">{s.preferred_name || s.legal_full_name}</p>
                          <p className="text-xs text-slate-500">{s.primary_role}</p>
                        </div>
                      </div>
                      {s.company_email &&
                <p className="text-xs text-red-600 break-all">
                          {s.company_email}
                        </p>
                }
                    </button>
              )}
                </div>
              </motion.div>
          }
          </AnimatePresence>
        </motion.div>
      }

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 md:p-6 text-white">

          <CheckCircle className="w-6 h-6 md:w-8 md:h-8 opacity-80 mb-1 md:mb-2" />
          <p className="text-2xl md:text-3xl font-bold">{inStockCount}</p>
          <p className="text-emerald-100 text-xs md:text-sm">In Stock</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 md:p-6 text-white">

          <User className="w-6 h-6 md:w-8 md:h-8 opacity-80 mb-1 md:mb-2" />
          <p className="text-2xl md:text-3xl font-bold">{checkedOutCount}</p>
          <p className="text-blue-100 text-xs md:text-sm">Checked Out</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 md:p-6 text-white">

          <Wrench className="w-6 h-6 md:w-8 md:h-8 opacity-80 mb-1 md:mb-2" />
          <p className="text-2xl md:text-3xl font-bold">{inServiceCount}</p>
          <p className="text-amber-100 text-xs md:text-sm">Need Repair</p>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 overflow-hidden shadow-lg">

        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="lg:hidden w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-600" />
            <span className="font-medium text-slate-900">Filters</span>
            {(statusFilter !== 'all' || categoryFilter !== 'all') &&
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">Active</span>
            }
          </div>
          <ChevronRight className={cn(
            "w-5 h-5 text-slate-400 transition-transform",
            filtersExpanded && "rotate-90"
          )} />
        </button>

        {/* Filters Content */}
        <div className={cn(
          "p-4 space-y-3 border-t border-slate-100 lg:border-0",
          "lg:flex lg:flex-row lg:gap-3 lg:space-y-0",
          !filtersExpanded && "hidden lg:flex"
        )}>
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search equipment..."
                className="pl-10" />

            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="in_stock">In Stock</SelectItem>
              <SelectItem value="checked_out">Checked Out</SelectItem>
              <SelectItem value="in_service">In Service</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full lg:w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) =>
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Mobile Equipment List */}
      <div className="lg:hidden space-y-3">
        {filteredEquipment.length === 0 ?
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-8 text-center shadow-lg">

            <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No equipment found</p>
          </motion.div> :

        filteredEquipment.map((item, idx) =>
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          onClick={() => setSelectedEquipment(item)}
          className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-4 shadow-lg cursor-pointer hover:shadow-xl transition-shadow">

              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{item.name}</h3>
                  <p className="text-xs text-slate-500 truncate">{item.model}</p>
                  {item.serial_number &&
              <p className="text-[10px] text-slate-400 mt-0.5">SN: {item.serial_number}</p>
              }
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.in_service ?
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium">
                      <Wrench className="w-3 h-3" />
                      Service
                    </span> :
              item.in_stock ?
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-medium">
                      <CheckCircle className="w-3 h-3" />
                      Stock
                    </span> :

              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium">
                      <User className="w-3 h-3" />
                      Out
                    </span>
              }
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-700 capitalize">
                    {categories.find((c) => c.value === item.category)?.label || item.category}
                  </span>
                  {item.assigned_to_name &&
              <span className="text-xs text-slate-500 truncate max-w-[120px]">
                      {item.assigned_to_name}
                    </span>
              }
                </div>
                <div className="flex gap-1">
                  {item.in_stock && !item.in_service &&
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCheckOut(item);
                }}
                className="text-[10px] h-7 px-2">

                      Check Out
                    </Button>
              }
                  {!item.in_stock &&
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCheckIn(item);
                }}
                className="text-[10px] h-7 px-2">

                      Check In
                    </Button>
              }
                </div>
              </div>
            </motion.div>
        )
        }
      </div>

      {/* Desktop Table View */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="hidden lg:block bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Equipment</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Model</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Category</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Assigned To</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {filteredEquipment.map((item, idx) =>
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedEquipment(item)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer">

                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-slate-900">{item.name}</div>
                        {item.serial_number &&
                      <div className="text-xs text-slate-500">SN: {item.serial_number}</div>
                      }
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.model}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                        {categories.find((c) => c.value === item.category)?.label || item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {item.in_service ?
                      <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                            <Wrench className="w-3 h-3" />
                            In Service
                          </span> :
                      item.in_stock ?
                      <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                            <CheckCircle className="w-3 h-3" />
                            In Stock
                          </span> :

                      <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                            <User className="w-3 h-3" />
                            Checked Out
                          </span>
                      }
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {item.assigned_to_name || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {item.in_stock && !item.in_service &&
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckOut(item);
                        }}
                        className="text-xs">

                            Check Out
                          </Button>
                      }
                        {!item.in_stock &&
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckIn(item);
                        }}
                        className="text-xs">

                            Check In
                          </Button>
                      }
                        <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleService(item);
                        }}
                        className={cn(
                          "text-xs",
                          item.in_service && "text-amber-600 hover:text-amber-700"
                        )}>

                          <Wrench className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
          {filteredEquipment.length === 0 &&
          <div className="text-center py-12">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No equipment found</p>
            </div>
          }
        </div>
      </motion.div>

      {/* Add Equipment Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Equipment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Equipment ID</label>
              <Input
                value={newEquipment.name}
                onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                placeholder="e.g., Camera A7III" />

            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Model</label>
              <Input
                value={newEquipment.model}
                onChange={(e) => setNewEquipment({ ...newEquipment, model: e.target.value })}
                placeholder="e.g., Sony Alpha a7 III" />

            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Serial Number</label>
              <Input
                value={newEquipment.serial_number}
                onChange={(e) => setNewEquipment({ ...newEquipment, serial_number: e.target.value })}
                placeholder="Optional" />

            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Category</label>
              <Select
                value={newEquipment.category}
                onValueChange={(v) => setNewEquipment({ ...newEquipment, category: v })}>

                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) =>
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Notes</label>
              <Input
                value={newEquipment.notes}
                onChange={(e) => setNewEquipment({ ...newEquipment, notes: e.target.value })}
                placeholder="Optional notes..." />

            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createEquipmentMutation.mutate(newEquipment)}
                disabled={!newEquipment.name || !newEquipment.model || createEquipmentMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700">

                Add Equipment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Check Out / Edit Dialog */}
      <Dialog open={!!editingEquipment} onOpenChange={() => setEditingEquipment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEquipment?.action === 'checkout' ? 'Check Out Equipment' : 'Edit Equipment'}
            </DialogTitle>
          </DialogHeader>
          {editingEquipment?.action === 'checkout' ?
          <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Assign To</label>
                <Select
                value={editingEquipment.assigned_to_id || ''}
                onValueChange={(v) => setEditingEquipment({ ...editingEquipment, assigned_to_id: v })}>

                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) =>
                  <SelectItem key={s.id} value={s.id}>{s.preferred_name || s.legal_full_name}</SelectItem>
                  )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingEquipment(null)}>
                  Cancel
                </Button>
                <Button
                onClick={handleSubmitCheckout}
                disabled={!editingEquipment.assigned_to_id || updateEquipmentMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700">

                  Check Out
                </Button>
              </div>
            </div> :

          <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Equipment Name</label>
                <Input
                value={editingEquipment?.name || ''}
                onChange={(e) => setEditingEquipment({ ...editingEquipment, name: e.target.value })} />

              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Model</label>
                <Input
                value={editingEquipment?.model || ''}
                onChange={(e) => setEditingEquipment({ ...editingEquipment, model: e.target.value })} />

              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Serial Number</label>
                <Input
                value={editingEquipment?.serial_number || ''}
                onChange={(e) => setEditingEquipment({ ...editingEquipment, serial_number: e.target.value })} />

              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Category</label>
                <Select
                value={editingEquipment?.category || 'camera'}
                onValueChange={(v) => setEditingEquipment({ ...editingEquipment, category: v })}>

                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) =>
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Notes</label>
                <Input
                value={editingEquipment?.notes || ''}
                onChange={(e) => setEditingEquipment({ ...editingEquipment, notes: e.target.value })} />

              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingEquipment(null)}>
                  Cancel
                </Button>
                <Button
                onClick={() => {
                  const { action, ...data } = editingEquipment;
                  updateEquipmentMutation.mutate({
                    id: editingEquipment.id,
                    data: {
                      name: data.name,
                      model: data.model,
                      serial_number: data.serial_number,
                      category: data.category,
                      notes: data.notes
                    }
                  });
                }}
                disabled={updateEquipmentMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700">

                  Save Changes
                </Button>
              </div>
            </div>
          }
        </DialogContent>
      </Dialog>

      {/* Equipment Detail Panel with Comments */}
      <EquipmentDetailPanel
        equipment={selectedEquipment}
        onClose={() => setSelectedEquipment(null)}
        user={user} />


      {/* Staff Equipment Assignment Panel */}
      <StaffEquipmentAssignmentPanel
        staff={selectedStaffForEquipment}
        onClose={() => setSelectedStaffForEquipment(null)}
        user={user} />

      </div>);

}