import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowRight, Check, X, Search, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function MergeLeads({ user }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [primaryLead, setPrimaryLead] = useState(null);
  const [duplicateLead, setDuplicateLead] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: leads = [] } = useQuery({
    queryKey: ['all-leads'],
    queryFn: () => base44.entities.Lead.filter({ department: 'sales' }, '-created_date', 1000),
    enabled: !!user
  });

  const mergeMutation = useMutation({
    mutationFn: async ({ primaryId, duplicateId }) => {
      // Fetch all related data for duplicate lead
      const [activities, bookings, notes, tasks] = await Promise.all([
        base44.entities.Activity.filter({ lead_id: duplicateId }),
        base44.entities.Booking.filter({ lead_id: duplicateId }),
        base44.entities.Note.filter({ related_to_id: duplicateId, related_to_type: 'lead' }),
        base44.entities.Task.filter({ related_to_id: duplicateId, related_to_type: 'lead' })
      ]);

      // Transfer all activities to primary lead
      for (const activity of activities) {
        await base44.entities.Activity.update(activity.id, {
          lead_id: primaryId,
          lead_name: primaryLead.name || primaryLead.phone
        });
      }

      // Transfer all bookings to primary lead
      for (const booking of bookings) {
        await base44.entities.Booking.update(booking.id, {
          lead_id: primaryId,
          lead_name: primaryLead.name || primaryLead.phone
        });
      }

      // Transfer all notes to primary lead
      for (const note of notes) {
        await base44.entities.Note.update(note.id, {
          related_to_id: primaryId,
          related_to_name: primaryLead.name || primaryLead.phone
        });
      }

      // Transfer all tasks to primary lead
      for (const task of tasks) {
        await base44.entities.Task.update(task.id, {
          related_to_id: primaryId,
          related_to_name: primaryLead.name || primaryLead.phone
        });
      }

      // Create merge audit note
      await base44.entities.Note.create({
        content: `Lead merged from duplicate: ${duplicateLead.name || duplicateLead.phone} (${duplicateLead.email || 'no email'}). All activities, bookings, and notes have been transferred.`,
        category: 'important',
        severity: 'info',
        related_to_type: 'lead',
        related_to_id: primaryId,
        author_id: user?.id,
        author_name: user?.full_name,
        department: 'sales'
      });

      // Delete duplicate lead
      await base44.entities.Lead.delete(duplicateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Leads merged successfully!');
      navigate(createPageUrl(`LeadDetail?id=${primaryLead.id}`));
    },
    onError: (error) => {
      toast.error('Failed to merge leads: ' + error.message);
    }
  });

  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      lead.name?.toLowerCase().includes(search) ||
      lead.email?.toLowerCase().includes(search) ||
      lead.phone?.toLowerCase().includes(search)
    );
  });

  const handleSelectPrimary = (lead) => {
    setPrimaryLead(lead);
    setDuplicateLead(null);
    setShowConfirm(false);
  };

  const handleSelectDuplicate = (lead) => {
    if (lead.id === primaryLead?.id) {
      toast.error('Cannot select the same lead twice');
      return;
    }
    setDuplicateLead(lead);
    setShowConfirm(false);
  };

  const handleMerge = () => {
    setShowConfirm(true);
  };

  const handleConfirmMerge = () => {
    mergeMutation.mutate({
      primaryId: primaryLead.id,
      duplicateId: duplicateLead.id
    });
  };

  const LeadCard = ({ lead, onSelect, isSelected, label, variant }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className={`p-4 cursor-pointer transition-all shadow-lg hover:shadow-xl ${
          isSelected 
            ? variant === 'primary' 
              ? 'border-2 border-emerald-500 bg-emerald-50' 
              : 'border-2 border-amber-500 bg-amber-50'
            : 'border border-slate-200 hover:border-slate-300'
        }`}
        onClick={() => onSelect(lead)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {isSelected && (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  variant === 'primary' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}>
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
              <h3 className="font-semibold text-slate-900">
                {lead.name || lead.phone || 'Unnamed Lead'}
              </h3>
            </div>
            <div className="space-y-1 text-sm text-slate-600">
              {lead.email && <p>📧 {lead.email}</p>}
              {lead.phone && <p>📱 {lead.phone}</p>}
              {lead.location && <p>📍 {lead.location}</p>}
              <p className="text-xs text-slate-500">
                Owner: {lead.owner_name || 'Unknown'} • Status: {lead.status}
              </p>
            </div>
          </div>
          {isSelected && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (variant === 'primary') setPrimaryLead(null);
                else setDuplicateLead(null);
                setShowConfirm(false);
              }}
              className="p-1 rounded hover:bg-slate-200"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          )}
        </div>
      </Card>
    </motion.div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Merge Leads</h1>
          <p className="text-slate-600 mt-2">
            Combine duplicate leads by transferring all activities, bookings, and notes
          </p>
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 shadow-sm"
        >
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">How to merge:</p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>Select the <strong>primary lead</strong> to keep (green)</li>
                <li>Select the <strong>duplicate lead</strong> to merge and delete (amber)</li>
                <li>Review and confirm - all data will be transferred to the primary lead</li>
              </ol>
            </div>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search leads by name, email, or phone..."
              className="pl-10"
            />
          </div>
        </motion.div>

        {/* Selection Summary */}
        {(primaryLead || duplicateLead) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 20 }}
            className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 mb-6 border border-slate-200 shadow-md"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="text-center">
                {primaryLead ? (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Primary Lead (Keep)</p>
                    <p className="font-medium text-emerald-700">
                      {primaryLead.name || primaryLead.phone}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Select primary lead</p>
                )}
              </div>
              <div className="flex justify-center">
                <ArrowRight className="w-6 h-6 text-slate-400" />
              </div>
              <div className="text-center">
                {duplicateLead ? (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Duplicate Lead (Delete)</p>
                    <p className="font-medium text-amber-700">
                      {duplicateLead.name || duplicateLead.phone}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Select duplicate lead</p>
                )}
              </div>
            </div>
            {primaryLead && duplicateLead && (
              <div className="flex justify-center mt-4">
                <Button
                  onClick={handleMerge}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Merge Leads
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* Lead List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredLeads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onSelect={primaryLead ? handleSelectDuplicate : handleSelectPrimary}
              isSelected={lead.id === primaryLead?.id || lead.id === duplicateLead?.id}
              variant={lead.id === primaryLead?.id ? 'primary' : 'duplicate'}
            />
          ))}
        </motion.div>

        {filteredLeads.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p>No leads found</p>
          </div>
        )}
      </motion.div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Confirm Merge</h2>
                <p className="text-sm text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-6 space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">Primary Lead (Keep):</p>
                <p className="text-base text-emerald-700 font-medium">
                  {primaryLead?.name || primaryLead?.phone}
                </p>
                <p className="text-xs text-slate-500">
                  {primaryLead?.email} • {primaryLead?.phone}
                </p>
              </div>

              <div className="flex justify-center py-2">
                <ArrowRight className="w-5 h-5 text-slate-400" />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">Duplicate Lead (Delete):</p>
                <p className="text-base text-amber-700 font-medium">
                  {duplicateLead?.name || duplicateLead?.phone}
                </p>
                <p className="text-xs text-slate-500">
                  {duplicateLead?.email} • {duplicateLead?.phone}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-blue-900">
                <strong>What will happen:</strong>
              </p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4 list-disc">
                <li>All activities will be transferred to primary lead</li>
                <li>All bookings will be transferred to primary lead</li>
                <li>All notes will be transferred to primary lead</li>
                <li>All tasks will be transferred to primary lead</li>
                <li>Duplicate lead will be permanently deleted</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmMerge}
                disabled={mergeMutation.isPending}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {mergeMutation.isPending ? 'Merging...' : 'Confirm Merge'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}