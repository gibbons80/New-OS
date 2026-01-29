import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function Photographers() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: photographers = [], isLoading: isLoadingPhotographers } = useQuery({
    queryKey: ['photographers-staff'],
    queryFn: async () => {
      const staff = await base44.entities.Staff.filter({
        department: 'Photographer',
        employment_status: { $ne: 'terminated' }
      });
      return staff.sort((a, b) => (a.legal_full_name || '').localeCompare(b.legal_full_name || ''));
    }
  });

  const { data: serviceGroups = [], isLoading: isLoadingServiceGroups } = useQuery({
    queryKey: ['cs-service-groups'],
    queryFn: async () => {
      return base44.entities.CSServiceGroup.list();
    }
  });

  const serviceMap = useMemo(() => {
    const map = new Map();
    serviceGroups.forEach(group => {
      group.services?.forEach(service => {
        map.set(service, group.group_name);
      });
    });
    return map;
  }, [serviceGroups]);

  const getServiceGroupNames = (signedOffServices) => {
    const groups = new Set();
    signedOffServices?.forEach(service => {
      const groupName = serviceMap.get(service);
      if (groupName) {
        groups.add(groupName);
      }
    });
    return Array.from(groups);
  };

  const filteredPhotographers = useMemo(() => {
    return photographers.filter(p => 
      (p.legal_full_name && p.legal_full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.preferred_name && p.preferred_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.address && p.address.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [photographers, searchQuery]);

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      training: 'bg-blue-100 text-blue-800 border-blue-300',
      on_leave: 'bg-amber-100 text-amber-800 border-amber-300',
      inactive: 'bg-slate-100 text-slate-800 border-slate-300',
      need_to_be_removed: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status] || colors.inactive;
  };

  if (isLoadingPhotographers || isLoadingServiceGroups) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Photographers</h1>
        <p className="text-slate-600 mt-1">Browse all staff photographers</p>
      </div>

      {/* Search */}
      <div>
        <Input
          placeholder="Search by name or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPhotographers.map((photographer, idx) => (
          <motion.div 
            key={photographer.id} 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: idx * 0.05 }} 
            className="h-full"
          >
            <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">
                      {photographer.preferred_name || photographer.legal_full_name}
                    </CardTitle>
                    {photographer.preferred_name && (
                      <p className="text-sm text-slate-600 truncate">{photographer.legal_full_name}</p>
                    )}
                  </div>
                  {photographer.photographer_status && (
                    <Badge className={cn('text-xs capitalize', getStatusColor(photographer.photographer_status))}>
                      {photographer.photographer_status.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 flex-1">
                {photographer.address && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="line-clamp-1">{photographer.address}</span>
                  </div>
                )}
                {photographer.company_email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 truncate">
                    <Mail className="w-4 h-4 shrink-0" />
                    <a href={`mailto:${photographer.company_email}`} className="truncate hover:text-cyan-600">
                      {photographer.company_email}
                    </a>
                  </div>
                )}
                {photographer.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4 shrink-0" />
                    <a href={`tel:${photographer.phone}`} className="hover:text-cyan-600">
                      {photographer.phone}
                    </a>
                  </div>
                )}
                {photographer.signed_off_services && getServiceGroupNames(photographer.signed_off_services).length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {getServiceGroupNames(photographer.signed_off_services).map((groupName) => (
                      <Badge key={groupName} variant="secondary" className="text-xs">
                        {groupName}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredPhotographers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">{searchQuery ? 'No photographers found' : 'No photographers available'}</p>
        </div>
      )}
    </div>
  );
}