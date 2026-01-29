import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, MessageSquare, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatInEST } from '@/components/dateFormatter';

export default function StaffEquipmentAssignmentPanel({ staff, onClose, user }) {
  const queryClient = useQueryClient();
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState([]);
  const [equipmentStatus, setEquipmentStatus] = useState(staff?.equipment_status || '');
  const [notes, setNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [showAvailableEquipment, setShowAvailableEquipment] = useState(false);

  useEffect(() => {
    setEquipmentStatus(staff?.equipment_status || '');
  }, [staff?.id]);

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment-in-stock'],
    queryFn: async () => {
      const allEquipment = await base44.entities.Equipment.list();
      return allEquipment.filter(e => e.in_stock && !e.in_service);
    }
  });

  const { data: assignedEquipment = [] } = useQuery({
    queryKey: ['staff-assigned-equipment', staff?.id],
    queryFn: async () => {
      const allEquipment = await base44.entities.Equipment.list();
      return allEquipment.filter(e => e.assigned_to_id === staff?.id);
    },
    enabled: !!staff?.id
  });

  const { data: staffNotes = [] } = useQuery({
    queryKey: ['staff-notes', staff?.id],
    queryFn: async () => {
      const allNotes = await base44.entities.StaffNote.filter({ staff_id: staff?.id });
      return allNotes.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!staff?.id
  });

  const updateStaffMutation = useMutation({
    mutationFn: async (data) => {
      // Update staff equipment status
      await base44.entities.Staff.update(staff.id, data.staffUpdates);
      
      // Update selected equipment items
      if (data.equipmentUpdates && data.equipmentUpdates.length > 0) {
        for (const update of data.equipmentUpdates) {
          await base44.entities.Equipment.update(update.id, update.data);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-in-stock'] });
      setSelectedEquipmentIds([]);
      onClose();
    }
  });

  const createNoteMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffNote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-notes', staff.id] });
      setNotes('');
      setShowNotesInput(false);
    }
  });

  const hasStatusChange = equipmentStatus !== (staff?.equipment_status || '');
  const hasEquipmentSelection = selectedEquipmentIds.length > 0;
  const hasChanges = hasStatusChange || hasEquipmentSelection;

  const handleSaveChanges = async () => {
    if (!hasChanges) return;

    const staffUpdates = {};
    if (hasStatusChange) {
      staffUpdates.equipment_status = equipmentStatus || null;
    }

    const equipmentUpdates = selectedEquipmentIds.map(equipmentId => ({
      id: equipmentId,
      data: {
        in_stock: false,
        assigned_to_id: staff.id,
        assigned_to_name: staff.preferred_name || staff.legal_full_name,
        checked_out_date: new Date().toISOString()
      }
    }));

    updateStaffMutation.mutate({
      staffUpdates,
      equipmentUpdates
    });
  };

  const handleAddNote = () => {
    if (!notes.trim()) return;
    createNoteMutation.mutate({
      staff_id: staff.id,
      staff_name: staff.preferred_name || staff.legal_full_name,
      note: notes,
      note_type: 'equipment',
      author_id: user?.id,
      author_name: user?.full_name
    });
  };

  const selectedEquipmentItems = equipment.filter(e => selectedEquipmentIds.includes(e.id));

  const handleEquipmentToggle = (equipmentId) => {
    setSelectedEquipmentIds(prev =>
      prev.includes(equipmentId)
        ? prev.filter(id => id !== equipmentId)
        : [...prev, equipmentId]
    );
  };

  return (
    <AnimatePresence>
      {staff && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
          />
          
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-screen w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-slate-900">
                Equipment Assignment - {staff.preferred_name || staff.legal_full_name}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Current Status */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-3">Equipment Status</h3>
                <Select value={equipmentStatus} onValueChange={setEquipmentStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="No equipment assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>No Equipment</SelectItem>
                    <SelectItem value="waiting_on_equipment">Waiting on Equipment</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="request_return">Request Return</SelectItem>
                    <SelectItem value="waiting_on_returning">Waiting on Returning</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Currently Assigned Equipment */}
              {assignedEquipment.length > 0 && (
                <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Currently Assigned Equipment</h3>
                  <div className="space-y-2">
                    {assignedEquipment.map(item => (
                      <div key={item.id} className="p-3 bg-white rounded-lg border border-amber-100">
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-600 mt-1">{item.model}</p>
                        {item.serial_number && (
                          <p className="text-[10px] text-slate-500 mt-0.5">SN: {item.serial_number}</p>
                        )}
                        {item.checked_out_date && (
                          <p className="text-[10px] text-slate-500 mt-0.5">Checked out: {new Date(item.checked_out_date).toLocaleDateString()}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Equipment - Collapsible */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setShowAvailableEquipment(!showAvailableEquipment)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <h3 className="font-semibold text-slate-900">
                    Available Equipment (In Stock) {equipment.length > 0 && <span className="text-sm font-normal text-slate-500 ml-2">({equipment.length})</span>}
                  </h3>
                  <ChevronRight className={cn(
                    "w-5 h-5 text-slate-600 transition-transform flex-shrink-0",
                    showAvailableEquipment && "rotate-90"
                  )} />
                </button>

                <AnimatePresence>
                  {showAvailableEquipment && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-slate-200 p-4"
                    >
                      {equipment.length === 0 ? (
                        <p className="text-sm text-slate-500">No equipment available in stock</p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {equipment.map(item => (
                            <label
                              key={item.id}
                              className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer",
                                selectedEquipmentIds.includes(item.id)
                                  ? "bg-blue-50 border-blue-500"
                                  : "bg-white border-slate-200 hover:border-slate-300"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={selectedEquipmentIds.includes(item.id)}
                                onChange={() => handleEquipmentToggle(item.id)}
                                className="w-4 h-4 mt-0.5 rounded accent-blue-600"
                              />
                              <div className="flex-1">
                                <p className="font-medium text-slate-900">{item.name}</p>
                                <p className="text-xs text-slate-600 mt-1">{item.model}</p>
                                {item.serial_number && (
                                  <p className="text-[10px] text-slate-500 mt-0.5">SN: {item.serial_number}</p>
                                )}
                              </div>
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded whitespace-nowrap">
                                {item.category}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Selected Equipment Details */}
              {selectedEquipmentItems.length > 0 && (
                <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Selected Equipment ({selectedEquipmentItems.length})</h3>
                  <div className="space-y-3">
                    {selectedEquipmentItems.map((item, idx) => (
                      <div key={item.id} className="pb-3 border-b border-blue-200 last:pb-0 last:border-0">
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <div className="mt-2 space-y-1 text-sm">
                          <div><span className="text-slate-600">Model:</span> {item.model}</div>
                          {item.serial_number && (
                            <div><span className="text-slate-600">SN:</span> {item.serial_number}</div>
                          )}
                          {item.notes && (
                            <div><span className="text-slate-600">Notes:</span> {item.notes}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Notes Section */}
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Notes (Synced to Training & HR)
                  </h3>
                  {!showNotesInput && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowNotesInput(true)}
                    >
                      Add Note
                    </Button>
                  )}
                </div>
                {showNotesInput && (
                  <div className="space-y-3 mb-4 pb-4 border-b border-slate-200">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add a note about this equipment assignment..."
                      rows={4}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowNotesInput(false);
                          setNotes('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAddNote}
                        disabled={!notes.trim() || createNoteMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Save Note
                      </Button>
                    </div>
                  </div>
                )}

                {/* Notes History */}
                {staffNotes.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes History</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {staffNotes.map(note => (
                        <div key={note.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm text-slate-900">{note.author_name}</p>
                              <p className="text-xs text-slate-500">
                                {formatInEST(note.created_date, 'MMM d, yyyy • h:mm a')}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  disabled={!hasChanges || updateStaffMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 gap-2"
                >
                  <Save className="w-4 h-4" />
                  {updateStaffMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}