import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Info, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export default function SalesUserSettings({ user }) {
  const queryClient = useQueryClient();
  const [personalDefaults, setPersonalDefaults] = useState({
    default_lead_source: '',
    default_lead_interest_level: '',
    default_lead_location: '',
    default_lead_estimated_value: 2000,
    default_lead_business: 'windowstill'
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    enabled: !!user
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['sales-settings'],
    queryFn: () => base44.entities.AppSetting.list('sort_order')
  });

  const updatePersonalDefaultsMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      toast.success('Defaults saved! New leads will use these values.');
    }
  });

  const getSettingsByType = (typeId) => {
    return settings.filter(s => s.setting_type === typeId);
  };

  // Initialize defaults from current user
  React.useEffect(() => {
    if (currentUser) {
      setPersonalDefaults({
        default_lead_source: currentUser?.default_lead_source || '',
        default_lead_interest_level: currentUser?.default_lead_interest_level || '',
        default_lead_location: currentUser?.default_lead_location || '',
        default_lead_estimated_value: currentUser?.default_lead_estimated_value || 2000,
        default_lead_business: currentUser?.default_lead_business || 'windowstill'
      });
    }
  }, [currentUser]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Settings</h1>
        <p className="text-slate-500 mt-1">Configure your personal lead defaults</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-900">My Lead Defaults</h3>
          </div>
          <p className="text-sm text-slate-500">
            Set default values for quick lead creation
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-900">
                These defaults will pre-fill the "Add New Lead" form to help you create leads faster.
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Default Lead Source
            </label>
            <Select 
              value={personalDefaults.default_lead_source} 
              onValueChange={(v) => setPersonalDefaults({ ...personalDefaults, default_lead_source: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select default source..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {getSettingsByType('lead_source').filter(s => s.is_active).map(source => (
                  <SelectItem key={source.value} value={source.value}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Default Interest Level
            </label>
            <Select 
              value={personalDefaults.default_lead_interest_level} 
              onValueChange={(v) => setPersonalDefaults({ ...personalDefaults, default_lead_interest_level: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select default interest level..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {getSettingsByType('interest_level').filter(s => s.is_active).map(level => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Default Location
            </label>
            <Input
              value={personalDefaults.default_lead_location}
              onChange={(e) => setPersonalDefaults({ ...personalDefaults, default_lead_location: e.target.value })}
              placeholder="e.g., Los Angeles, CA"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Default Estimated Value
            </label>
            <Input
              type="number"
              value={personalDefaults.default_lead_estimated_value}
              onChange={(e) => setPersonalDefaults({ ...personalDefaults, default_lead_estimated_value: parseFloat(e.target.value) || 0 })}
              placeholder="2000"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Default Business
            </label>
            <Select 
              value={personalDefaults.default_lead_business} 
              onValueChange={(v) => setPersonalDefaults({ ...personalDefaults, default_lead_business: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="windowstill">WindowStill</SelectItem>
                <SelectItem value="lifestyle_production_group">Lifestyle Production Group</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              onClick={() => updatePersonalDefaultsMutation.mutate(personalDefaults)}
              disabled={updatePersonalDefaultsMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {updatePersonalDefaultsMutation.isPending ? (
                'Saving...'
              ) : updatePersonalDefaultsMutation.isSuccess ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Saved!
                </>
              ) : (
                'Save Defaults'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}