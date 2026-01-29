import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, MapPin, Mail, Phone, Globe, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AddressAutocomplete from '@/components/cs/AddressAutocomplete';

export default function ThirdPartyPhotographers() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [newServiceInput, setNewServiceInput] = useState('');
  
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    website: '',
    full_address: '',
    city: '',
    notes: '',
    is_active: true
  });

  const queryClient = useQueryClient();

  const { data: photographers = [], isLoading } = useQuery({
    queryKey: ['third-party-photographers'],
    queryFn: () => base44.entities.ThirdPartyPhotographer.list(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.ThirdPartyPhotographer.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['third-party-photographers'] });
      resetForm();
      setIsAddingNew(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.ThirdPartyPhotographer.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['third-party-photographers'] });
      setIsEditingServices(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.ThirdPartyPhotographer.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['third-party-photographers'] });
    },
  });

  const resetForm = () => {
    setFormData({
      company_name: '',
      contact_person: '',
      email: '',
      phone: '',
      website: '',
      full_address: '',
      latitude: null,
      longitude: null,
      notes: '',
      is_active: true
    });
  };

  const handleAddPhotographer = async () => {
    if (!formData.company_name.trim()) {
      alert('Company name is required');
      return;
    }
    
    const photoData = {
      ...formData,
      services_offered: [],
      latitude: formData.latitude || null,
      longitude: formData.longitude || null
    };
    
    delete photoData.city;
    await createMutation.mutateAsync(photoData);
  };



  const handleDeletePhotographer = async (id) => {
    if (window.confirm('Are you sure you want to delete this third-party photographer?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const filteredPhotographers = useMemo(() => {
    return photographers.filter(p => 
      p.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.full_address?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [photographers, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Third-Party Photographers</h1>
          <p className="text-slate-600 mt-1">Manage external photographers and companies</p>
        </div>
        <Dialog open={isAddingNew} onOpenChange={setIsAddingNew}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-600 hover:bg-cyan-700 gap-2">
              <Plus className="w-4 h-4" />
              Add Photographer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Third-Party Photographer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  placeholder="Company or individual name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                <Input
                  value={formData.contact_person}
                  onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                  placeholder="Contact name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="contact@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '');
                    const formatted = cleaned.slice(0, 10);
                    const match = formatted.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
                    const formatted_phone = !match ? '' : [match[1], match[2], match[3]].filter(Boolean).join('-');
                    setFormData({...formData, phone: formatted_phone});
                  }}
                  placeholder="555-123-4567"
                  maxLength="12"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Address</label>
                <AddressAutocomplete
                  value={formData.full_address}
                  onChange={async (value) => {
                    setFormData({...formData, full_address: value});

                    try {
                      const response = await base44.functions.invoke('getGoogleMapsKey');
                      const apiKey = response.data.apiKey;

                      const geocodeResponse = await fetch(
                        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(value)}&key=${apiKey}`
                      );
                      const data = await geocodeResponse.json();

                      if (data.status === 'OK' && data.results && data.results.length > 0) {
                        const location = data.results[0].geometry.location;
                        setFormData(prev => ({
                          ...prev,
                          full_address: value,
                          latitude: location.lat,
                          longitude: location.lng
                        }));
                      }
                    } catch (error) {
                      console.error('Error geocoding address:', error);
                      setFormData(prev => ({...prev, full_address: value}));
                    }
                  }}
                  placeholder="123 Main St, City, State"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Internal notes"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  rows="3"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddingNew(false)}>Cancel</Button>
                <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={handleAddPhotographer}>
                  Add Photographer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div>
        <Input
          placeholder="Search by company, contact, or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPhotographers.map((photographer, idx) => (
          <motion.div key={photographer.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="h-full">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow h-full flex flex-col"
              onClick={() => navigate(createPageUrl('ThirdPartyPhotographerDetail') + '?id=' + photographer.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{photographer.company_name}</CardTitle>
                    {photographer.contact_person && (
                      <p className="text-sm text-slate-600 truncate">{photographer.contact_person}</p>
                    )}
                  </div>
  <div className="flex flex-col gap-1">
                    <Badge 
                      className={
                        photographer.status === 'great_service' 
                          ? 'bg-green-100 text-green-800 border-green-300' 
                          : photographer.status === 'not_the_best'
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                          : photographer.status === 'do_not_use'
                          ? 'bg-red-100 text-red-800 border-red-300'
                          : photographer.status === 'have_not_used'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : 'bg-slate-100 text-slate-800 border-slate-300'
                      }
                    >
                      {photographer.status === 'great_service' 
                        ? 'Great Service' 
                        : photographer.status === 'not_the_best'
                        ? 'Not the best'
                        : photographer.status === 'do_not_use'
                        ? 'DO not use'
                        : photographer.status === 'have_not_used'
                        ? 'Have not used'
                        : 'No Status'}
                    </Badge>

                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 flex-1">
                {photographer.full_address && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="line-clamp-1">{photographer.full_address}</span>
                  </div>
                )}
                {photographer.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 truncate">
                    <Mail className="w-4 h-4 shrink-0" />
                    <a href={`mailto:${photographer.email}`} className="truncate hover:text-cyan-600">
                      {photographer.email}
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
                {photographer.services_offered && photographer.services_offered.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {photographer.services_offered.map((service) => (
                      <Badge key={service} variant="secondary" className="text-xs">
                        {service}
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
          <p className="text-slate-500">No third-party photographers found</p>
        </div>
      )}
    </div>
  );
}