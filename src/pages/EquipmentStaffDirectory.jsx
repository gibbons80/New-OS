import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, Users, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import StaffEquipmentAssignmentPanel from '@/components/equipment/StaffEquipmentAssignmentPanel';

export default function EquipmentStaffDirectory({ user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState(null);

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list()
  });

  const filteredStaff = staff.filter(s => {
    const searchLower = searchTerm.toLowerCase();
    return (s.preferred_name || s.legal_full_name).toLowerCase().includes(searchLower) ||
           (s.primary_role || '').toLowerCase().includes(searchLower) ||
           (s.company_email || '').toLowerCase().includes(searchLower);
  });

  const equipmentStatusConfig = {
    'waiting_on_equipment': { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Waiting' },
    'shipped': { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Shipped' },
    'active': { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Active' },
    'request_return': { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Return Req.' },
    'waiting_on_returning': { icon: Clock, color: 'text-slate-600', bg: 'bg-slate-50', label: 'Returning' },
    'inactive': { icon: AlertCircle, color: 'text-slate-600', bg: 'bg-slate-50', label: 'Inactive' }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
            Staff Directory
          </h1>
          <p className="text-slate-500 mt-1 text-sm md:text-base">View all staff and their equipment status</p>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, role, or email..."
          className="pl-10"
        />
      </motion.div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredStaff.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="col-span-full bg-white rounded-xl border border-slate-200 p-8 text-center"
            >
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No staff members found</p>
            </motion.div>
          ) : (
            filteredStaff.map((staffMember, idx) => {
              const statusConfig = equipmentStatusConfig[staffMember.equipment_status] || 
                                  { icon: AlertCircle, color: 'text-slate-600', bg: 'bg-slate-50', label: 'No Data' };
              const StatusIcon = statusConfig.icon;

              return (
                <motion.button
                  key={staffMember.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => setSelectedStaff(staffMember)}
                  className="text-left bg-white rounded-xl border border-slate-200 hover:border-orange-300 hover:shadow-lg transition-all overflow-hidden"
                >
                  <div className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center text-orange-700 font-semibold text-sm shrink-0">
                        {staffMember.profile_photo_url ? (
                          <img src={staffMember.profile_photo_url} alt={staffMember.preferred_name} className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          (staffMember.preferred_name || staffMember.legal_full_name)?.charAt(0) || '?'
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">
                          {staffMember.preferred_name || staffMember.legal_full_name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{staffMember.primary_role}</p>
                      </div>
                    </div>

                    {/* Equipment Status */}
                    {staffMember.equipment_status && (
                      <div className={cn("p-2.5 rounded-lg flex items-center gap-2", statusConfig.bg)}>
                        <StatusIcon className={cn("w-4 h-4", statusConfig.color)} />
                        <span className={cn("text-xs font-semibold", statusConfig.color)}>
                          {statusConfig.label}
                        </span>
                      </div>
                    )}

                    {/* Email */}
                    {staffMember.company_email && (
                      <p className="text-xs text-slate-500 truncate">
                        {staffMember.company_email}
                      </p>
                    )}

                    {/* Click to View */}
                    <p className="text-xs text-orange-600 font-medium pt-1">Click to view & manage</p>
                  </div>
                </motion.button>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Staff Equipment Assignment Panel */}
      <StaffEquipmentAssignmentPanel
        staff={selectedStaff}
        onClose={() => setSelectedStaff(null)}
        user={user}
      />
    </div>
  );
}