import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { List, Edit2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function ViewAllServicesDialog({ 
  isOpen, 
  onOpenChange, 
  services = [], 
  templateGroups = [] 
}) {
  const queryClient = useQueryClient();
  const [editingService, setEditingService] = useState(null);
  const [editName, setEditName] = useState('');

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, name }) => base44.entities.ServiceTemplate.update(id, { service_name: name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-templates'] });
      setEditingService(null);
      setEditName('');
    }
  });

  const sortedServices = [...services].sort((a, b) => 
    a.service_name.localeCompare(b.service_name)
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>All Services</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-2">
              {sortedServices.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <List className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No services found</p>
                </div>
              ) : (
                sortedServices.map((service) => {
                  const sourceGroup = templateGroups.find(g => g.id === service.template_group_id);
                  return (
                    <div
                      key={service.id}
                      className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{service.service_name}</div>
                        <div className="text-xs text-slate-600 mt-1">
                          ${service.pay_amount} • {service.pay_type?.replace('_', ' ')}
                          {sourceGroup && ` • From: ${sourceGroup.group_name}`}
                        </div>
                        {service.description && (
                          <div className="text-xs text-slate-500 mt-1 line-clamp-2">{service.description}</div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingService(service);
                          setEditName(service.service_name);
                        }}
                        className="ml-2 h-8 w-8 p-0 shrink-0"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t mt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingService} onOpenChange={(open) => !open && setEditingService(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Service Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Service name"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingService(null);
                  setEditName('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => updateServiceMutation.mutate({ id: editingService.id, name: editName })}
                disabled={!editName || editName === editingService.service_name || updateServiceMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}