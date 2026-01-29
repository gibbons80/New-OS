import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AddressAutocomplete from '@/components/cs/AddressAutocomplete';
import { DialogFooter } from '@/components/ui/dialog';

export default function StaffDetailsForm({ candidate, onSave, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    legal_full_name: candidate.legal_full_name || '',
    preferred_name: candidate.preferred_name || '',
    worker_type: '1099_photographer',
    employment_status: 'onboarding',
    primary_role: '',
    department: 'Photographer',
    business: 'WindowStill',
    address: candidate.address || '',
    timezone: candidate.timezone || 'America/New_York',
    start_date: '',
    company_email: '',
    personal_email: candidate.email || '',
    phone: candidate.phone || '',
  });

  useEffect(() => {
    if (candidate) {
      setFormData(prev => ({
        ...prev,
        legal_full_name: candidate.legal_full_name || '',
        preferred_name: candidate.preferred_name || '',
        address: candidate.address || '',
        timezone: candidate.timezone || 'America/New_York',
        personal_email: candidate.email || '',
        phone: candidate.phone || '',
      }));
    }
  }, [candidate]);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Legal Full Name *</label>
          <Input
            value={formData.legal_full_name}
            onChange={(e) => updateField('legal_full_name', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Preferred Name</label>
          <Input
            value={formData.preferred_name}
            onChange={(e) => updateField('preferred_name', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Company Email</label>
          <Input
            type="email"
            value={formData.company_email}
            onChange={(e) => updateField('company_email', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Personal Email</label>
          <Input
            type="email"
            value={formData.personal_email}
            onChange={(e) => updateField('personal_email', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Phone</label>
          <Input
            value={formData.phone}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              const formatted = value.length <= 10 
                ? value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3').replace(/\)\s$/, ')').replace(/-$/, '')
                : value.slice(0, 10).replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
              updateField('phone', formatted);
            }}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Worker Type *</label>
          <Select value={formData.worker_type} onValueChange={(value) => updateField('worker_type', value)}>
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Employment Status *</label>
          <Select value={formData.employment_status} onValueChange={(value) => updateField('employment_status', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="onboarding">Onboarding</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Primary Role</label>
          <Input
            value={formData.primary_role}
            onChange={(e) => updateField('primary_role', e.target.value)}
            placeholder="e.g., Senior Photographer"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Department *</label>
          <Select value={formData.department} onValueChange={(value) => updateField('department', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Photographer">Photographer</SelectItem>
              <SelectItem value="HR_Accounting">HR/Accounting</SelectItem>
              <SelectItem value="Sales">Sales</SelectItem>
              <SelectItem value="Social">Social</SelectItem>
              <SelectItem value="Editors">Editors</SelectItem>
              <SelectItem value="Equipment">Equipment</SelectItem>
              <SelectItem value="Customer Service">Customer Service</SelectItem>
              <SelectItem value="Training">Training</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Virtual Assistant">Virtual Assistant</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Business *</label>
          <Select value={formData.business} onValueChange={(value) => updateField('business', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WindowStill">WindowStill</SelectItem>
              <SelectItem value="Lifestyle Production Group">Lifestyle Production Group</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Address</label>
        <AddressAutocomplete
          value={formData.address}
          onChange={(value) => updateField('address', value)}
          placeholder="Enter physical address"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Timezone</label>
          <Select value={formData.timezone} onValueChange={(value) => updateField('timezone', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="America/New_York">Eastern (EST/EDT)</SelectItem>
              <SelectItem value="America/Chicago">Central (CST/CDT)</SelectItem>
              <SelectItem value="America/Denver">Mountain (MST/MDT)</SelectItem>
              <SelectItem value="America/Los_Angeles">Pacific (PST/PDT)</SelectItem>
              <SelectItem value="America/Anchorage">Alaska (AKST/AKDT)</SelectItem>
              <SelectItem value="Pacific/Honolulu">Hawaii (HST)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Start Date</label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => updateField('start_date', e.target.value)}
          />
        </div>
      </div>

      <DialogFooter className="mt-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
          {isLoading ? 'Hiring...' : 'Confirm Hire'}
        </Button>
      </DialogFooter>
    </form>
  );
}