import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Mail,
  Phone,
  Globe,
  MapPin,
  X,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { formatInEST } from '@/components/dateFormatter';
import AddressAutocomplete from '@/components/cs/AddressAutocomplete';

export default function ThirdPartyPhotographerDetail({ user }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const [isEditingPricing, setIsEditingPricing] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const photographerId = urlParams.get('id');

  const { data: photographer, isLoading } = useQuery({
    queryKey: ['third-party-photographer', photographerId],
    queryFn: async () => {
      const photographers = await base44.entities.ThirdPartyPhotographer.list();
      return photographers.find(p => p.id === photographerId);
    },
    enabled: !!photographerId,
  });

  const { data: serviceGroups = [] } = useQuery({
    queryKey: ['cs-service-groups'],
    queryFn: () => base44.entities.CSServiceGroup.list(),
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['photographer-notes', photographerId],
    queryFn: async () => {
      const allNotes = await base44.entities.Note.filter({
        related_to_type: 'third_party_photographer',
        related_to_id: photographerId
      }, '-created_date');
      return allNotes;
    },
    enabled: !!photographerId,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.ThirdPartyPhotographer.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['third-party-photographer', photographerId]);
      queryClient.invalidateQueries(['third-party-photographers']);
      queryClient.invalidateQueries(['third-party-photographers-map']);
      toast.success('Updated successfully');
    },
    onError: () => toast.error('Update failed'),
  });

  const createNoteMutation = useMutation({
    mutationFn: async (noteData) => {
      return base44.entities.Note.create({
        ...noteData,
        related_to_type: 'third_party_photographer',
        related_to_id: photographerId,
        author_id: user.id,
        author_name: user.full_name,
        department: 'customer_service'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['photographer-notes', photographerId]);
      toast.success('Note added');
      setFormData({ ...formData, new_note: '' });
    },
    onError: () => toast.error('Failed to add note'),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId) => {
      return base44.entities.Note.delete(noteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['photographer-notes', photographerId]);
      toast.success('Note deleted');
    },
    onError: () => toast.error('Failed to delete note'),
  });

  const handleUpdate = (field, value) => {
    updateMutation.mutate({
      id: photographerId,
      data: { [field]: value },
    });
  };

  const handleSaveAllChanges = async () => {
    const updates = {};
    if (formData.contact_person !== undefined) updates.contact_person = formData.contact_person || '';
    if (formData.email !== undefined) updates.email = formData.email || '';
    if (formData.phone !== undefined) updates.phone = formData.phone || '';
    if (formData.website !== undefined) updates.website = formData.website || '';
    if (formData.full_address !== undefined) updates.full_address = formData.full_address || '';
    if (formData.matterport_emails !== undefined) updates.matterport_emails = formData.matterport_emails;

    // If address changed, geocode it to get new coordinates
    if (formData.full_address !== undefined && formData.full_address !== photographer.full_address) {
      try {
        const response = await base44.functions.invoke('getGoogleMapsKey');
        const apiKey = response.data.apiKey;
        
        const geocodeResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formData.full_address)}&key=${apiKey}`
        );
        const data = await geocodeResponse.json();
        
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const location = data.results[0].geometry.location;
          updates.latitude = location.lat;
          updates.longitude = location.lng;
        }
      } catch (error) {
        console.error('Error geocoding address:', error);
      }
    }

    if (Object.keys(updates).length > 0) {
      updateMutation.mutate({
        id: photographerId,
        data: updates,
      });
      setIsEditDialogOpen(false);
    }
  };

  const handleOpenEditDialog = () => {
    setFormData({
      contact_person: photographer.contact_person || '',
      email: photographer.email || '',
      phone: photographer.phone || '',
      website: photographer.website || '',
      full_address: photographer.full_address || '',
      matterport_email: '',
    });
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setFormData({});
    setIsEditDialogOpen(false);
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

  const handleOpenServiceDialog = () => {
    setSelectedServices(photographer.services_offered || []);
    setIsServiceDialogOpen(true);
  };

  const handleToggleService = (groupName) => {
    setSelectedServices(prev => 
      prev.includes(groupName) 
        ? prev.filter(s => s !== groupName)
        : [...prev, groupName]
    );
  };

  const handleSaveServices = () => {
    handleUpdate('services_offered', selectedServices);
    setIsServiceDialogOpen(false);
  };

  const handleRemoveService = (service) => {
    const updatedServices = (photographer.services_offered || []).filter(s => s !== service);
    handleUpdate('services_offered', updatedServices);
  };

  const handleAddNote = () => {
    if (!formData.new_note?.trim()) return;
    createNoteMutation.mutate({
      content: formData.new_note.trim(),
      category: 'general'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'great_service':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'not_the_best':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'do_not_use':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'have_not_used':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!photographer) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Photographer not found</p>
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl('ThirdPartyPhotographers'))}
          className="mt-4"
        >
          Back to List
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 pb-6 border-b border-slate-200">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('ThirdPartyPhotographers'))}
          className="hover:bg-slate-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">{photographer.company_name}</h1>
          {photographer.contact_person && (
            <p className="text-slate-500">{photographer.contact_person}</p>
          )}
        </div>
        <Button
          onClick={handleOpenEditDialog}
          className="bg-cyan-600 hover:bg-cyan-700"
        >
          Edit Details
        </Button>
      </div>

      {/* Main Content - Condensed Grid Layout */}
      <div className="grid grid-cols-3 gap-4">
        {/* Status & Rating */}
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={photographer.status || 'have_not_used'}
              onValueChange={(value) => handleUpdate('status', value)}
            >
              <SelectTrigger className={cn("text-xs", getStatusColor(photographer.status || 'have_not_used'))}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="great_service">Great Service</SelectItem>
                <SelectItem value="not_the_best">Not the best</SelectItem>
                <SelectItem value="do_not_use">DO NOT USE</SelectItem>
                <SelectItem value="have_not_used">Have not used</SelectItem>
              </SelectContent>
            </Select>



            <Label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={photographer.guide_sent || false}
                onChange={(e) => handleUpdate('guide_sent', e.target.checked)}
                className="w-3 h-3 text-cyan-600 rounded"
              />
              <span className="text-xs font-medium text-slate-900">Guide Sent</span>
            </Label>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase">Person</Label>
              <p className="text-sm text-slate-900">{photographer.contact_person || '—'}</p>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase">Email</Label>
              <p className="text-xs text-slate-900 truncate">{photographer.email || '—'}</p>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase">Phone</Label>
              <p className="text-sm text-slate-900">{photographer.phone || '—'}</p>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase">Website</Label>
              <p className="text-xs">
                {photographer.website ? (
                  <a href={photographer.website} target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline truncate block">
                    {photographer.website}
                  </a>
                ) : '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Location & Matterport */}
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase">Address</Label>
              <p className="text-xs text-slate-900 line-clamp-2">{photographer.full_address || '—'}</p>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase">Matterport</Label>
              {photographer.matterport_emails?.length > 0 ? (
                <div className="space-y-1 mt-1">
                  {photographer.matterport_emails.map((email) => (
                    <div key={email} className="flex items-center justify-between gap-2 bg-slate-50 p-1 rounded">
                      <p className="text-xs text-slate-900 truncate flex-1">
                        {email}
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(email);
                          toast.success('Email copied');
                        }}
                        className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                        title="Copy email"
                      >
                        <span className="text-xs font-medium">📋</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No emails</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services & Pricing */}
      <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-900">Services & Pricing</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenServiceDialog}
              className="text-xs h-8"
            >
              Edit Services
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase block mb-2">Services Offered</Label>
            <div className="flex flex-wrap gap-2">
              {photographer.services_offered?.length > 0 ? (
                photographer.services_offered.map((service) => (
                  <div key={service} className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded text-xs font-medium">
                    {service}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveService(service);
                      }}
                      className="text-emerald-600 hover:text-emerald-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No services listed</p>
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase block mb-2">Pricing</Label>
            {isEditingPricing ? (
              <div className="space-y-2">
                <Textarea
                  value={formData.pricing_details !== undefined ? formData.pricing_details : photographer.pricing_details || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, pricing_details: e.target.value });
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 300) + 'px';
                  }}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 300) + 'px';
                  }}
                  placeholder="Add pricing details..."
                  className="text-sm resize-none min-h-[60px]"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditingPricing(false);
                      setFormData({ ...formData, pricing_details: photographer.pricing_details || '' });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      handleUpdate('pricing_details', formData.pricing_details || '');
                      setIsEditingPricing(false);
                    }}
                    className="bg-cyan-600 hover:bg-cyan-700"
                  >
                    Save Pricing
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded border border-slate-200 min-h-[3rem] whitespace-pre-wrap">
                  {photographer.pricing_details || 'No pricing details added'}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingPricing(true);
                    setFormData({ ...formData, pricing_details: photographer.pricing_details || '' });
                  }}
                >
                  Edit Pricing
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Full Width Cards */}
      <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-slate-900">Notes & Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New Note */}
          <div className="space-y-3">
            <Textarea
              value={formData.new_note || ''}
              onChange={(e) => setFormData({ ...formData, new_note: e.target.value })}
              rows={3}
              placeholder="Add a note..."
              className="resize-none border-slate-300 focus:border-cyan-500 focus:ring-cyan-500"
            />
            <Button
              onClick={handleAddNote}
              disabled={!formData.new_note?.trim()}
              className="bg-cyan-600 hover:bg-cyan-700 shadow-sm"
            >
              Add Note
            </Button>
          </div>

          {/* Notes List */}
          <div className="space-y-4">
            {notes.length > 0 ? (
              notes.map((note, index) => (
                <div
                  key={note.id}
                  className="relative pl-6 pb-4 border-l-2 border-slate-200 last:pb-0"
                >
                  <div className="absolute left-0 top-1.5 w-2 h-2 -translate-x-[5px] rounded-full bg-cyan-500 ring-4 ring-white" />
                  <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-sm text-slate-700 leading-relaxed flex-1">
                        {note.content}
                      </p>
                      <button
                        onClick={() => deleteNoteMutation.mutate(note.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors ml-3"
                        title="Delete note"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-900">{note.author_name}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">{formatInEST(note.created_date)}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">No notes yet</p>
                <p className="text-xs text-slate-400 mt-1">Add your first note above</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Details Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Details</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-6 px-3">
            {/* Contact Information Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Contact Information</h3>
              
              {/* Contact Person */}
              <div>
                <Label className="text-sm font-medium text-slate-900 mb-2 block">Contact Person</Label>
                <Input
                  value={formData.contact_person || ''}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="Contact name"
                />
              </div>

              {/* Email */}
              <div>
                <Label className="text-sm font-medium text-slate-900 mb-2 block">Email</Label>
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@example.com"
                />
              </div>

              {/* Phone */}
              <div>
                <Label className="text-sm font-medium text-slate-900 mb-2 block">Phone</Label>
                <Input
                  type="tel"
                  value={formData.phone || ''}
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
              </div>

              {/* Website */}
              <div>
                <Label className="text-sm font-medium text-slate-900 mb-2 block">Website</Label>
                <Input
                  value={formData.website || ''}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            {/* Location Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-slate-900">Location</h3>
              <div>
                <Label className="text-sm font-medium text-slate-900 mb-2 block">Address</Label>
                <AddressAutocomplete
                  value={formData.full_address || ''}
                  onChange={(value) => setFormData({ ...formData, full_address: value })}
                  placeholder="123 Main St, City, State"
                />
              </div>
            </div>

            {/* Matterport Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-slate-900">Matterport</h3>
              <div>
                <Label className="text-sm font-medium text-slate-900 mb-2 block">Collaboration Emails</Label>
                <div className="space-y-2 mb-3">
                  {formData.matterport_emails?.map((email) => (
                    <div
                      key={email}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <span className="text-sm text-slate-700">{email}</span>
                      <button
                        onClick={() => {
                          const updated = (formData.matterport_emails || []).filter(e => e !== email);
                          setFormData({ ...formData, matterport_emails: updated });
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={formData.matterport_email || ''}
                    onChange={(e) => setFormData({ ...formData, matterport_email: e.target.value })}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const email = formData.matterport_email?.trim();
                      if (!email) return;
                      const emails = formData.matterport_emails || [];
                      if (!emails.includes(email)) {
                        setFormData({
                          ...formData,
                          matterport_emails: [...emails, email],
                          matterport_email: ''
                        });
                      }
                    }}
                    className="bg-cyan-600 hover:bg-cyan-700"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t mt-4">
            <Button 
              variant="outline" 
              onClick={handleCloseEditDialog}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-cyan-600 hover:bg-cyan-700" 
              onClick={handleSaveAllChanges}
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Service Selection Dialog */}
      <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl">Manage Service Sign-Offs</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-slate-600">Service Groups</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {serviceGroups.map((group) => (
                <label
                  key={group.id}
                  className={cn(
                    "flex items-center gap-3 cursor-pointer p-4 rounded-lg border-2 transition-all",
                    selectedServices.includes(group.group_name)
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                    selectedServices.includes(group.group_name)
                      ? "bg-white border-white"
                      : "bg-white border-slate-300"
                  )}>
                    {selectedServices.includes(group.group_name) && (
                      <svg className="w-3 h-3 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-medium flex-1">{group.group_name}</span>
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(group.group_name)}
                    onChange={() => handleToggleService(group.group_name)}
                    className="sr-only"
                  />
                </label>
              ))}
            </div>
            {serviceGroups.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">
                No service groups found. Create service groups in CS Settings first.
              </p>
            )}
          </div>
          <div className="flex gap-3 pt-4 border-t mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsServiceDialogOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-indigo-600 hover:bg-indigo-700" 
              onClick={handleSaveServices}
            >
              Add {selectedServices.length} Service{selectedServices.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}