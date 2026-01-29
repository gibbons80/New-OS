import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, differenceInDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import {
  Unlock,
  Clock,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function OpenLeads({ user }) {
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['open-leads'],
    queryFn: () => base44.entities.Lead.filter({ 
      is_open_for_reassignment: true,
      exclude_from_reassignment: false
    }, '-created_date', 500)
  });

  const grabLeadMutation = useMutation({
    mutationFn: async (lead) => {
      // Update lead
      await base44.entities.Lead.update(lead.id, {
        reassigned_owner_id: user?.id,
        reassigned_owner_name: user?.full_name,
        reassigned_grab_date: new Date().toISOString(),
        last_reassignment_contact_date: null
      });
      
      // Create audit log
      await base44.entities.AuditLog.create({
        action: 'Lead Reassigned',
        entity_type: 'Lead',
        entity_id: lead.id,
        entity_name: lead.name || lead.phone,
        user_id: user?.id,
        user_name: user?.full_name,
        details: `${user?.full_name} grabbed this lead from the open pool`,
        department: 'sales'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-leads'] });
    }
  });

  const releaseLeadMutation = useMutation({
    mutationFn: async (lead) => {
      // Update lead
      await base44.entities.Lead.update(lead.id, {
        reassigned_owner_id: null,
        reassigned_owner_name: null,
        reassigned_grab_date: null,
        last_reassignment_contact_date: null
      });
      
      // Create audit log
      await base44.entities.AuditLog.create({
        action: 'Lead Released',
        entity_type: 'Lead',
        entity_id: lead.id,
        entity_name: lead.name || lead.phone,
        user_id: user?.id,
        user_name: user?.full_name,
        details: `${user?.full_name} released this lead back to the open pool`,
        department: 'sales'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-leads'] });
    }
  });

  const availableLeads = leads.filter(l => !l.reassigned_owner_id);
  const myGrabbedLeads = leads.filter(l => l.reassigned_owner_id === user?.id);
  const othersGrabbedLeads = leads.filter(l => l.reassigned_owner_id && l.reassigned_owner_id !== user?.id);

  const getDaysRemaining = (grabDate) => {
    const grabbed = new Date(grabDate);
    const now = new Date();
    const daysPassed = differenceInDays(now, grabbed);
    return Math.max(0, 10 - daysPassed);
  };

  // Check if user can grab a new lead (hybrid approach)
  const canGrabNewLead = () => {
    if (myGrabbedLeads.length === 0) return { allowed: true };
    
    const currentGrabbedLead = myGrabbedLeads[0];
    const grabDate = new Date(currentGrabbedLead.reassigned_grab_date);
    const now = new Date();
    const minutesSinceGrab = Math.floor((now - grabDate) / (1000 * 60));
    
    // Check if 10 minutes have passed
    if (minutesSinceGrab >= 10) {
      return { allowed: true };
    }
    
    // Check if contact has been logged
    if (currentGrabbedLead.last_reassignment_contact_date) {
      const contactDate = new Date(currentGrabbedLead.last_reassignment_contact_date);
      if (contactDate > grabDate) {
        return { allowed: true };
      }
    }
    
    // Calculate remaining time
    const remainingMinutes = 10 - minutesSinceGrab;
    return { 
      allowed: false, 
      leadName: currentGrabbedLead.name || 'your current lead',
      remainingMinutes 
    };
  };

  const grabStatus = canGrabNewLead();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Open Leads</h1>
        <p className="text-slate-600 mt-2">
          Leads available for reassignment - First come, first served
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02, y: -4 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl md:rounded-2xl p-3 md:p-6 text-white shadow-lg hover:shadow-xl"
        >
          <Unlock className="w-5 h-5 md:w-8 md:h-8 opacity-80 mb-1 md:mb-2" />
          <p className="text-xl md:text-3xl font-bold">{availableLeads.length}</p>
          <p className="text-emerald-100 text-xs md:text-base mt-0.5 md:mt-1">Available</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          whileHover={{ scale: 1.02, y: -4 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl md:rounded-2xl p-3 md:p-6 text-white shadow-lg hover:shadow-xl"
        >
          <CheckCircle className="w-5 h-5 md:w-8 md:h-8 opacity-80 mb-1 md:mb-2" />
          <p className="text-xl md:text-3xl font-bold">{myGrabbedLeads.length}</p>
          <p className="text-blue-100 text-xs md:text-base mt-0.5 md:mt-1">My Leads</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02, y: -4 }}
          className="bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl md:rounded-2xl p-3 md:p-6 text-white shadow-lg hover:shadow-xl"
        >
          <Clock className="w-5 h-5 md:w-8 md:h-8 opacity-80 mb-1 md:mb-2" />
          <p className="text-xl md:text-3xl font-bold">{othersGrabbedLeads.length}</p>
          <p className="text-slate-100 text-xs md:text-base mt-0.5 md:mt-1">Others</p>
        </motion.div>
      </div>

      {/* My Grabbed Leads */}
      {myGrabbedLeads.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          <div className="p-4 md:p-6 border-b border-slate-100">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              My Grabbed Leads
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              You have 10 days to make contact or they'll be released back to the pool
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {myGrabbedLeads.map((lead) => {
              const daysRemaining = getDaysRemaining(lead.reassigned_grab_date);
              const isUrgent = daysRemaining <= 3;
              
              return (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 md:p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Link 
                        to={createPageUrl(`LeadDetail?id=${lead.id}`)}
                        className="font-semibold text-slate-900 hover:text-emerald-600 text-sm md:text-base"
                      >
                        {lead.name || 'Unnamed Lead'}
                      </Link>
                      <Badge className={cn(
                        "shrink-0",
                        isUrgent ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                      )}>
                        <Clock className="w-3 h-3 mr-1" />
                        {daysRemaining}d
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 md:gap-3 text-xs md:text-sm text-slate-600">
                      {lead.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span className="truncate">{lead.phone}</span>
                        </div>
                      )}
                      {lead.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span className="truncate max-w-[120px] md:max-w-none">{lead.email}</span>
                        </div>
                      )}
                      {lead.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {lead.location}
                        </div>
                      )}
                      {lead.estimated_value && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${lead.estimated_value}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <p className="text-xs text-slate-400">
                        Grabbed {formatInTimeZone(new Date(lead.reassigned_grab_date), 'Etc/GMT+5', 'MMM d, yyyy h:mm a')} EST
                      </p>
                      <div className="flex gap-2">
                        <Link to={createPageUrl(`LeadDetail?id=${lead.id}`)} className="flex-1 sm:flex-none">
                          <Button size="sm" variant="outline" className="w-full sm:w-auto">
                            View
                          </Button>
                        </Link>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => releaseLeadMutation.mutate(lead)}
                          className="flex-1 sm:flex-none"
                        >
                          Release
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Available Leads */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: myGrabbedLeads.length > 0 ? 0.2 : 0.15 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
      >
        <div className="p-4 md:p-6 border-b border-slate-100">
          <h2 className="text-base md:text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Unlock className="w-5 h-5 text-emerald-600" />
            Available Leads
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Click "Grab Lead" to start working on any of these leads
          </p>
          {!grabStatus.allowed && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1 text-xs md:text-sm text-amber-700">
                <p className="font-medium">Cannot grab new lead</p>
                <p className="text-xs mt-1">
                  You currently have {grabStatus.leadName} assigned. Please log a contact activity for this lead or wait {grabStatus.remainingMinutes} minute{grabStatus.remainingMinutes !== 1 ? 's' : ''} before grabbing a new one.
                </p>
              </div>
            </div>
          )}
        </div>
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            Loading...
          </div>
        ) : availableLeads.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Unlock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No leads available at the moment</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {availableLeads.map((lead) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 md:p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-900 text-sm md:text-base">
                      {lead.name || 'Unnamed Lead'}
                    </span>
                    <Button 
                      size="sm"
                      onClick={() => grabLeadMutation.mutate(lead)}
                      disabled={grabLeadMutation.isPending || !grabStatus.allowed}
                      className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
                      title={!grabStatus.allowed ? `Wait ${grabStatus.remainingMinutes} min or log contact for current lead` : ''}
                    >
                      Grab
                    </Button>
                  </div>
                  <Badge className="bg-slate-100 text-slate-600 text-xs">
                    Previously: {lead.last_permanent_owner_name || lead.owner_name || 'Unknown'}
                  </Badge>
                  <div className="flex flex-wrap gap-2 md:gap-3 text-xs md:text-sm text-slate-600">
                    {lead.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {lead.location}
                      </div>
                    )}
                    {lead.estimated_value && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        ${lead.estimated_value}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Others Grabbed Leads */}
      {othersGrabbedLeads.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          <div className="p-4 md:p-6 border-b border-slate-100">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-600" />
              Currently Being Worked
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              These leads are being contacted by other team members
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {othersGrabbedLeads.map((lead) => {
              const daysRemaining = getDaysRemaining(lead.reassigned_grab_date);
              
              return (
                <div key={lead.id} className="p-3 md:p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-slate-900 text-sm md:text-base">
                        {lead.name || 'Unnamed Lead'}
                      </span>
                      <Badge className="bg-blue-100 text-blue-700 shrink-0">
                        <Clock className="w-3 h-3 mr-1" />
                        {daysRemaining}d
                      </Badge>
                    </div>
                    <Badge className="bg-slate-100 text-slate-600 text-xs">
                      {lead.reassigned_owner_name}
                    </Badge>
                    <div className="flex flex-wrap gap-2 md:gap-3 text-xs md:text-sm text-slate-600">
                      {lead.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {lead.location}
                        </div>
                      )}
                      {lead.estimated_value && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${lead.estimated_value}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}