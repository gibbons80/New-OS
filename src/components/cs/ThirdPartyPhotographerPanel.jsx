import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Mail,
  Phone,
  Globe,
  MapPin,
  X,
  Star,
  DollarSign,
  FileText,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ThirdPartyPhotographerPanel({ photographer, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState({});
  const [formData, setFormData] = useState({});

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.ThirdPartyPhotographer.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['third-party-photographers']);
      toast.success('Updated successfully');
      setEditMode({});
    },
    onError: () => toast.error('Update failed'),
  });

  const handleUpdate = (field, value) => {
    updateMutation.mutate({
      id: photographer.id,
      data: { [field]: value },
    });
  };



  const handleAddMatterportEmail = () => {
    const email = formData.matterport_email?.trim();
    if (!email) return;
    
    const emails = photographer.matterport_emails || [];
    if (emails.includes(email)) {
      toast.error('Email already exists');
      return;
    }
    
    emails.push(email);
    handleUpdate('matterport_emails', emails);
    setFormData({ ...formData, matterport_email: '' });
  };

  const handleRemoveMatterportEmail = (email) => {
    const emails = (photographer.matterport_emails || []).filter(e => e !== email);
    handleUpdate('matterport_emails', emails);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'great_service':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'not_the_best':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'do_not_use':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  if (!photographer) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="border-b border-slate-200 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl truncate">{photographer.company_name}</SheetTitle>
              {photographer.contact_person && (
                <p className="text-sm text-slate-600 mt-1">{photographer.contact_person}</p>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
            {/* Status */}
            <div>
              <Label className="text-sm font-semibold text-slate-900 mb-2 block">Status</Label>
              <Select
                value={photographer.status || 'great_service'}
                onValueChange={(value) => handleUpdate('status', value)}
              >
                <SelectTrigger className={getStatusColor(photographer.status || 'great_service')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="great_service">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Great Service
                    </div>
                  </SelectItem>
                  <SelectItem value="not_the_best">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-yellow-600" />
                      Not the best
                    </div>
                  </SelectItem>
                  <SelectItem value="do_not_use">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      DO not use
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rating */}
            <div>
              <Label className="text-sm font-semibold text-slate-900 mb-2 block">Rating</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleUpdate('rating', star)}
                    className="transition-colors"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= (photographer.rating || 0)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                {photographer.rating && (
                  <span className="text-sm text-slate-600 ml-2">
                    ({photographer.rating}/5)
                  </span>
                )}
              </div>
            </div>

            {/* Contact Person */}
            <div>
              <Label className="text-sm font-semibold text-slate-900 mb-2 block">Contact Person</Label>
              {editMode.contact_person ? (
                <div className="space-y-2">
                  <Input
                    value={formData.contact_person || photographer.contact_person || ''}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="Contact name"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditMode({ ...editMode, contact_person: false });
                        setFormData({ ...formData, contact_person: undefined });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-700"
                      onClick={() => {
                        handleUpdate('contact_person', formData.contact_person || '');
                        setEditMode({ ...editMode, contact_person: false });
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => {
                    setEditMode({ ...editMode, contact_person: true });
                    setFormData({ ...formData, contact_person: photographer.contact_person });
                  }}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <p className="text-sm text-slate-700">
                    {photographer.contact_person || 'Click to add contact person...'}
                  </p>
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <Label className="text-sm font-semibold text-slate-900 mb-2 block">Email</Label>
              {editMode.email ? (
                <div className="space-y-2">
                  <Input
                    type="email"
                    value={formData.email || photographer.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@example.com"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditMode({ ...editMode, email: false });
                        setFormData({ ...formData, email: undefined });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-700"
                      onClick={() => {
                        handleUpdate('email', formData.email || '');
                        setEditMode({ ...editMode, email: false });
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => {
                    setEditMode({ ...editMode, email: true });
                    setFormData({ ...formData, email: photographer.email });
                  }}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <p className="text-sm text-slate-700">
                    {photographer.email || 'Click to add email...'}
                  </p>
                </div>
              )}
            </div>

            {/* Phone */}
            <div>
              <Label className="text-sm font-semibold text-slate-900 mb-2 block">Phone</Label>
              {editMode.phone ? (
                <div className="space-y-2">
                  <Input
                    type="tel"
                    value={formData.phone || photographer.phone || ''}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/\D/g, '');
                      const formatted = cleaned.slice(0, 10);
                      const match = formatted.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
                      const formatted_phone = !match ? '' : [match[1], match[2], match[3]].filter(Boolean).join('-');
                      setFormData({ ...formData, phone: formatted_phone });
                    }}
                    placeholder="555-123-4567"
                    maxLength="12"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditMode({ ...editMode, phone: false });
                        setFormData({ ...formData, phone: undefined });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-700"
                      onClick={() => {
                        handleUpdate('phone', formData.phone || '');
                        setEditMode({ ...editMode, phone: false });
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => {
                    setEditMode({ ...editMode, phone: true });
                    setFormData({ ...formData, phone: photographer.phone });
                  }}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <p className="text-sm text-slate-700">
                    {photographer.phone || 'Click to add phone...'}
                  </p>
                </div>
              )}
            </div>

            {/* Website */}
            <div>
              <Label className="text-sm font-semibold text-slate-900 mb-2 block">Website</Label>
              {editMode.website ? (
                <div className="space-y-2">
                  <Input
                    value={formData.website || photographer.website || ''}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditMode({ ...editMode, website: false });
                        setFormData({ ...formData, website: undefined });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-700"
                      onClick={() => {
                        handleUpdate('website', formData.website || '');
                        setEditMode({ ...editMode, website: false });
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => {
                    setEditMode({ ...editMode, website: true });
                    setFormData({ ...formData, website: photographer.website });
                  }}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <p className="text-sm text-slate-700">
                    {photographer.website || 'Click to add website...'}
                  </p>
                </div>
              )}
            </div>

            {/* Full Address */}
            <div>
              <Label className="text-sm font-semibold text-slate-900 mb-2 block">Full Address</Label>
              {editMode.full_address ? (
                <div className="space-y-2">
                  <Input
                    value={formData.full_address || photographer.full_address || ''}
                    onChange={(e) => setFormData({ ...formData, full_address: e.target.value })}
                    placeholder="123 Main St, City, State"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditMode({ ...editMode, full_address: false });
                        setFormData({ ...formData, full_address: undefined });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-700"
                      onClick={() => {
                        handleUpdate('full_address', formData.full_address || '');
                        setEditMode({ ...editMode, full_address: false });
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => {
                    setEditMode({ ...editMode, full_address: true });
                    setFormData({ ...formData, full_address: photographer.full_address });
                  }}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <p className="text-sm text-slate-700">
                    {photographer.full_address || 'Click to add full address...'}
                  </p>
                </div>
              )}
            </div>

            {/* City */}
            <div>
              <Label className="text-sm font-semibold text-slate-900 mb-2 block">City (Fallback)</Label>
              {editMode.city ? (
                <div className="space-y-2">
                  <Input
                    value={formData.city || photographer.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City name"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditMode({ ...editMode, city: false });
                        setFormData({ ...formData, city: undefined });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-700"
                      onClick={() => {
                        handleUpdate('city', formData.city || '');
                        setEditMode({ ...editMode, city: false });
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => {
                    setEditMode({ ...editMode, city: true });
                    setFormData({ ...formData, city: photographer.city });
                  }}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <p className="text-sm text-slate-700">
                    {photographer.city || 'Click to add city...'}
                  </p>
                </div>
              )}
            </div>

            {/* Services Offered */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Services Offered</h3>
              <div className="flex flex-wrap gap-2">
                {photographer.services_offered?.length > 0 ? (
                  photographer.services_offered.map((service) => (
                    <Badge key={service} variant="secondary">
                      {service}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No services listed</p>
                )}
              </div>
            </div>

            {/* Pricing Details */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Service Pricing</h3>
              {editMode.pricing_details ? (
                <div className="space-y-2">
                  <Textarea
                    value={formData.pricing_details || photographer.pricing_details || ''}
                    onChange={(e) => setFormData({ ...formData, pricing_details: e.target.value })}
                    rows={4}
                    placeholder="Add pricing details..."
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditMode({ ...editMode, pricing_details: false });
                        setFormData({ ...formData, pricing_details: undefined });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-700"
                      onClick={() => {
                        handleUpdate('pricing_details', formData.pricing_details || '');
                        setEditMode({ ...editMode, pricing_details: false });
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => {
                    setEditMode({ ...editMode, pricing_details: true });
                    setFormData({ ...formData, pricing_details: photographer.pricing_details });
                  }}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {photographer.pricing_details || 'Click to add pricing details...'}
                  </p>
                </div>
              )}
            </div>

            {/* Matterport Emails */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Matterport Collaboration Emails
              </h3>
              <div className="space-y-2">
                {photographer.matterport_emails?.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <span className="text-sm text-slate-700">{email}</span>
                    <button
                      onClick={() => handleRemoveMatterportEmail(email)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={formData.matterport_email || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, matterport_email: e.target.value })
                    }
                    onKeyPress={(e) => e.key === 'Enter' && handleAddMatterportEmail()}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddMatterportEmail}
                    className="bg-cyan-600 hover:bg-cyan-700"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {/* Guide Sent */}
            <div>
              <Label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={photographer.guide_sent || false}
                  onChange={(e) => handleUpdate('guide_sent', e.target.checked)}
                  className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500"
                />
                <span className="text-sm font-medium text-slate-900">
                  3rd Party Guide Sent
                </span>
              </Label>
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">General Notes</h3>
              {editMode.notes ? (
                <div className="space-y-2">
                  <Textarea
                    value={formData.notes || photographer.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    placeholder="Add notes about this photographer..."
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditMode({ ...editMode, notes: false });
                        setFormData({ ...formData, notes: undefined });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-700"
                      onClick={() => {
                        handleUpdate('notes', formData.notes || '');
                        setEditMode({ ...editMode, notes: false });
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => {
                    setEditMode({ ...editMode, notes: true });
                    setFormData({ ...formData, notes: photographer.notes });
                  }}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {photographer.notes || 'Click to add notes...'}
                  </p>
                </div>
              )}
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}