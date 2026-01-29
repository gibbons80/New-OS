import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { 
  Plus, 
  Search, 
  Users,
  ChevronRight,
  Calendar,
  MapPin
} from 'lucide-react';
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
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import StaffDetailPanel from '@/components/hr/StaffDetailPanel';
import { Filter } from 'lucide-react';

export default function HRStaff({ user }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [workerTypeFilter, setWorkerTypeFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [businessFilter, setBusinessFilter] = useState('all');
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [newStaff, setNewStaff] = useState({
    legal_full_name: '',
    preferred_name: '',
    worker_type: 'w2_employee',
    employment_status: 'draft',
    primary_role: '',
    department: '',
    business: '',
    company_email: '',
    personal_email: '',
    phone: '',
    address: '',
    timezone: '',
    start_date: ''
  });

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list('-created_date')
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['hr-departments'],
    queryFn: async () => {
      const settings = await base44.entities.AppSetting.filter({ setting_type: 'hr_department' }, 'sort_order');
      return settings;
    }
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['hr-businesses'],
    queryFn: async () => {
      const settings = await base44.entities.AppSetting.filter({ setting_type: 'hr_business' }, 'sort_order');
      return settings;
    }
  });

  const createStaffMutation = useMutation({
    mutationFn: (data) => base44.entities.Staff.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setShowAddDialog(false);
      setNewStaff({
        legal_full_name: '',
        preferred_name: '',
        worker_type: 'w2_employee',
        employment_status: 'draft',
        primary_role: '',
        department: '',
        business: '',
        company_email: '',
        personal_email: '',
        phone: '',
        address: '',
        timezone: '',
        start_date: ''
      });
    }
  });

  const filteredStaff = useMemo(() => staff
    .filter(s => {
      const matchesSearch = !search || 
        s.legal_full_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.preferred_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.company_email?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || s.employment_status === statusFilter;
      const matchesType = workerTypeFilter === 'all' || s.worker_type === workerTypeFilter;
      const matchesDepartment = departmentFilter === 'all' || s.department === departmentFilter;
      const matchesBusiness = businessFilter === 'all' || s.business === businessFilter;
      return matchesSearch && matchesStatus && matchesType && matchesDepartment && matchesBusiness;
    })
    .sort((a, b) => {
      const nameA = (a.preferred_name || a.legal_full_name || '').toLowerCase();
      const nameB = (b.preferred_name || b.legal_full_name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    }), [staff, search, statusFilter, workerTypeFilter, departmentFilter, businessFilter]);



  const statusColors = {
    draft: 'bg-slate-100 text-slate-700',
    onboarding: 'bg-amber-100 text-amber-700',
    active: 'bg-emerald-100 text-emerald-700',
    paused: 'bg-blue-100 text-blue-700',
    terminated: 'bg-red-100 text-red-700'
  };

  const workerTypeLabels = {
    w2_employee: 'W2 Employee',
    '1099_contractor': '1099 Contractor',
    virtual_assistant: 'Virtual Assistant',
    '1099_photographer': '1099 Photographer'
  };

  return (
    <div className="relative pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900">Staff Management</h1>
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="lg:hidden bg-rose-600 hover:bg-rose-700 h-10"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 overflow-hidden shadow-lg">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="lg:hidden w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-600" />
              <span className="font-medium text-slate-900">Filters</span>
              {(statusFilter !== 'all' || workerTypeFilter !== 'all' || departmentFilter !== 'all' || businessFilter !== 'all') && (
                <span className="bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full">Active</span>
              )}
            </div>
            <ChevronRight className={cn(
              "w-5 h-5 text-slate-400 transition-transform",
              filtersExpanded && "rotate-90"
            )} />
          </button>

          {/* Filters Content */}
          <div className={cn(
            "p-4 space-y-3 border-t border-slate-100 lg:border-0",
            "lg:flex lg:items-center lg:gap-4 lg:space-y-0",
            !filtersExpanded && "hidden lg:flex"
          )}>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
              <Input
                placeholder="Search staff by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 md:h-12"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-44 h-10 md:h-12">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={workerTypeFilter} onValueChange={setWorkerTypeFilter}>
              <SelectTrigger className="w-full lg:w-52 h-10 md:h-12">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Worker Types</SelectItem>
                <SelectItem value="w2_employee">W2 Employee</SelectItem>
                <SelectItem value="1099_contractor">1099 Contractor</SelectItem>
                <SelectItem value="virtual_assistant">Virtual Assistant</SelectItem>
                <SelectItem value="1099_photographer">1099 Photographer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full lg:w-44 h-10 md:h-12">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.label}>{dept.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={businessFilter} onValueChange={setBusinessFilter}>
              <SelectTrigger className="w-full lg:w-44 h-10 md:h-12">
                <SelectValue placeholder="All Businesses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Businesses</SelectItem>
                {businesses.map(biz => (
                  <SelectItem key={biz.id} value={biz.label}>{biz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={() => setShowAddDialog(true)}
              className="hidden lg:flex h-12 bg-rose-600 hover:bg-rose-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Staff List */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
        {isLoading ? (
          <div className="p-8 md:p-12 text-center text-slate-400 text-sm md:text-base">Loading...</div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-8 md:p-12 text-center text-slate-400">
            <Users className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm md:text-base">No staff members found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            <AnimatePresence>
              {filteredStaff.map((member, index) => (
                <motion.button
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => setSelectedStaffId(member.id)}
                  className="w-full text-left p-4 md:p-6 hover:bg-rose-50/50 transition-all duration-300 group"
                >
                <div className="flex items-center gap-3 md:gap-4">
                  {/* Profile Photo */}
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center text-rose-700 font-bold text-lg md:text-xl shrink-0 shadow-md group-hover:shadow-lg transition-shadow duration-300"
                  >
                    {member.profile_photo_url ? (
                      <img 
                        src={member.profile_photo_url} 
                        alt={member.preferred_name || member.legal_full_name}
                        className="w-12 h-12 md:w-16 md:h-16 rounded-xl object-cover"
                      />
                    ) : (
                      (member.preferred_name || member.legal_full_name)?.charAt(0) || '?'
                    )}
                  </motion.div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 md:mb-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 text-sm md:text-lg group-hover:text-rose-600 transition-colors truncate">
                        {member.preferred_name || member.legal_full_name}
                      </h3>
                      <span className={cn(
                        "px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-medium",
                        statusColors[member.employment_status]
                      )}>
                        {member.employment_status?.replace('_', ' ')}
                      </span>
                      {member.employment_status === 'onboarding' && (
                        <span className="px-2 py-0.5 md:px-3 md:py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] md:text-xs font-medium">
                          {member.onboarding_completion_percent || 0}%
                        </span>
                      )}
                    </div>
                    <div className="hidden md:flex items-center gap-4 text-sm text-slate-500">
                      <span className="font-medium">{workerTypeLabels[member.worker_type]}</span>
                      <span>•</span>
                      <span>{member.primary_role}</span>
                      {member.department && (
                        <>
                          <span>•</span>
                          <span>{member.department}</span>
                        </>
                      )}
                      {member.location && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {member.location}
                          </span>
                        </>
                      )}
                    </div>
                    {/* Mobile simplified info */}
                    <div className="md:hidden space-y-0.5">
                      <p className="text-xs text-slate-600">{member.primary_role}</p>
                      <p className="text-[10px] text-slate-500">{workerTypeLabels[member.worker_type]}</p>
                    </div>
                    {member.start_date && (
                      <div className="flex items-center gap-1.5 md:gap-2 mt-1.5 md:mt-2 text-[10px] md:text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        Started {format(toZonedTime(parseISO(member.start_date + 'Z'), 'America/New_York'), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>

                  <motion.div
                    animate={{ x: 0 }}
                    whileHover={{ x: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-slate-400 group-hover:text-rose-600 transition-colors shrink-0" />
                  </motion.div>
                </div>
              </motion.button>
            ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Staff Detail Panel */}
      {selectedStaffId && (
        <StaffDetailPanel
          staffId={selectedStaffId}
          onClose={() => setSelectedStaffId(null)}
          user={user}
        />
      )}

      {/* Add Staff Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Legal Full Name *</label>
                <Input
                  value={newStaff.legal_full_name}
                  onChange={(e) => setNewStaff({ ...newStaff, legal_full_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Preferred Name</label>
                <Input
                  value={newStaff.preferred_name}
                  onChange={(e) => setNewStaff({ ...newStaff, preferred_name: e.target.value })}
                  placeholder="Johnny"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Worker Type *</label>
                <Select 
                  value={newStaff.worker_type} 
                  onValueChange={(v) => setNewStaff({ ...newStaff, worker_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="w2_employee">W2 Employee</SelectItem>
                    <SelectItem value="1099_contractor">1099 Contractor</SelectItem>
                    <SelectItem value="virtual_assistant">Virtual Assistant</SelectItem>
                    <SelectItem value="1099_photographer">1099 Photographer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Employment Status *</label>
                <Select 
                  value={newStaff.employment_status} 
                  onValueChange={(v) => setNewStaff({ ...newStaff, employment_status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Primary Role</label>
                <Input
                  value={newStaff.primary_role}
                  onChange={(e) => setNewStaff({ ...newStaff, primary_role: e.target.value })}
                  placeholder="Sales Representative"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Business</label>
                <Select 
                  value={newStaff.business} 
                  onValueChange={(v) => setNewStaff({ ...newStaff, business: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select business" />
                  </SelectTrigger>
                  <SelectContent>
                    {businesses.map(biz => (
                      <SelectItem key={biz.id} value={biz.label}>
                        {biz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Department</label>
              <Select 
                value={newStaff.department} 
                onValueChange={(v) => setNewStaff({ ...newStaff, department: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.label}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Company Email</label>
                <Input
                  type="email"
                  value={newStaff.company_email}
                  onChange={(e) => setNewStaff({ ...newStaff, company_email: e.target.value })}
                  placeholder="john@company.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Personal Email</label>
                <Input
                  type="email"
                  value={newStaff.personal_email}
                  onChange={(e) => setNewStaff({ ...newStaff, personal_email: e.target.value })}
                  placeholder="john@gmail.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Phone</label>
                <Input
                  type="tel"
                  value={newStaff.phone}
                  onChange={(e) => {
                    const input = e.target.value.replace(/\D/g, '');
                    let formatted = '';
                    if (input.length > 0) {
                      formatted = '(' + input.substring(0, 3);
                      if (input.length > 3) {
                        formatted += ') ' + input.substring(3, 6);
                      }
                      if (input.length > 6) {
                        formatted += '-' + input.substring(6, 10);
                      }
                    }
                    setNewStaff({ ...newStaff, phone: formatted });
                  }}
                  placeholder="(555) 123-4567"
                  maxLength="14"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Address</label>
                <Input
                  value={newStaff.address}
                  onChange={(e) => setNewStaff({ ...newStaff, address: e.target.value })}
                  placeholder="123 Main St, City, State"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Time Zone</label>
                <Select 
                  value={newStaff.timezone} 
                  onValueChange={(v) => setNewStaff({ ...newStaff, timezone: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="America/Anchorage">Alaska Time (AKT)</SelectItem>
                    <SelectItem value="Pacific/Honolulu">Hawaii Time (HT)</SelectItem>
                    <SelectItem value="America/Phoenix">Arizona Time (MST)</SelectItem>
                    <SelectItem value="America/Toronto">Toronto (ET)</SelectItem>
                    <SelectItem value="America/Vancouver">Vancouver (PT)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT)</SelectItem>
                    <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                    <SelectItem value="Europe/Berlin">Berlin (CET)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                    <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                    <SelectItem value="Asia/Hong_Kong">Hong Kong (HKT)</SelectItem>
                    <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
                    <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                    <SelectItem value="Australia/Sydney">Sydney (AEDT)</SelectItem>
                    <SelectItem value="Pacific/Auckland">Auckland (NZDT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Start Date</label>
              <Input
                type="date"
                value={newStaff.start_date}
                onChange={(e) => setNewStaff({ ...newStaff, start_date: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createStaffMutation.mutate(newStaff)}
                disabled={!newStaff.legal_full_name || !newStaff.worker_type || createStaffMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700"
              >
                Create Staff Member
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}