import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Plus, Edit2, Trash2, Briefcase, ChevronDown, ChevronRight, Shield, List, X, Save, FileText, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle } from
'@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ViewAllServicesDialog from '@/components/hr/ViewAllServicesDialog';

export default function HRAccountingSettings({ user }) {
  const queryClient = useQueryClient();
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showAddDepartment, setShowAddDepartment] = useState(false);
  const [newDepartment, setNewDepartment] = useState('');
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [newBusiness, setNewBusiness] = useState('');
  const [showAccessTemplateDialog, setShowAccessTemplateDialog] = useState(false);
  const [editingAccessTemplate, setEditingAccessTemplate] = useState(null);
  const [accessTemplateForm, setAccessTemplateForm] = useState({
    name: '',
    description: '',
    granted_apps: []
  });
  const [showAddOnboardingTemplate, setShowAddOnboardingTemplate] = useState(false);
  const [currentOnboardingTemplate, setCurrentOnboardingTemplate] = useState(null);
  const [newOnboardingTemplateName, setNewOnboardingTemplateName] = useState('');
  const [newOnboardingTemplateDescription, setNewOnboardingTemplateDescription] = useState('');
  const [newOnboardingItems, setNewOnboardingItems] = useState([]);
  const [showAddDocumentType, setShowAddDocumentType] = useState(false);
  const [newDocumentType, setNewDocumentType] = useState('');

  const [groupForm, setGroupForm] = useState({
    group_name: '',
    description: ''
  });

  const [serviceForm, setServiceForm] = useState({
    service_name: '',
    pay_type: 'per_service',
    pay_amount: 0,
    description: ''
  });

  const [showSelectExistingService, setShowSelectExistingService] = useState(false);
  const [showViewAllServices, setShowViewAllServices] = useState(false);

  // Auto-infer service type from service name
  const inferServiceType = (serviceName) => {
    const name = serviceName.toLowerCase();
    if (name.includes('photo') || name.includes('image')) return 'photo';
    if (name.includes('video')) return 'video';
    if (name.includes('drone') || name.includes('aerial')) return 'drone';
    if (name.includes('3d') || name.includes('tour') || name.includes('matterport')) return '3d_tour';
    return 'other';
  };

  // Fetch template groups
  const { data: templateGroups = [] } = useQuery({
    queryKey: ['service-template-groups'],
    queryFn: () => base44.entities.ServiceTemplateGroup.list('sort_order')
  });

  // Fetch services
  const { data: serviceTemplates = [] } = useQuery({
    queryKey: ['service-templates'],
    queryFn: () => base44.entities.ServiceTemplate.list('sort_order')
  });

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['hr-departments'],
    queryFn: async () => {
      const settings = await base44.entities.AppSetting.filter({ setting_type: 'hr_department' }, 'sort_order');
      return settings;
    }
  });

  // Fetch businesses
  const { data: businesses = [] } = useQuery({
    queryKey: ['hr-businesses'],
    queryFn: async () => {
      const settings = await base44.entities.AppSetting.filter({ setting_type: 'hr_business' }, 'sort_order');
      return settings;
    }
  });

  // Fetch access templates
  const { data: accessTemplates = [] } = useQuery({
    queryKey: ['access-templates'],
    queryFn: () => base44.entities.AccessTemplate.list('name')
  });

  // Fetch onboarding templates
  const { data: onboardingTemplates = [] } = useQuery({
    queryKey: ['onboardingChecklistTemplates'],
    queryFn: () => base44.entities.OnboardingChecklistTemplate.list()
  });

  // Fetch document types
  const { data: documentTypes = [] } = useQuery({
    queryKey: ['hr-document-types'],
    queryFn: async () => {
      const settings = await base44.entities.AppSetting.filter({ setting_type: 'hr_document_type' }, 'sort_order');
      return settings;
    }
  });

  // Group services by template group
  const servicesByGroup = serviceTemplates.reduce((acc, service) => {
    if (!acc[service.template_group_id]) {
      acc[service.template_group_id] = [];
    }
    acc[service.template_group_id].push(service);
    return acc;
  }, {});

  // Get all unique services from all templates
  const allAvailableServices = Array.from(
    new Map(
      serviceTemplates.map(s => [s.service_name, s])
    ).values()
  );

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceTemplateGroup.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-template-groups'] });
      setShowAddGroup(false);
      setEditingGroup(null);
      setGroupForm({ template_name: '', description: '' });
    }
  });

  // Update group mutation
  const updateGroupMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ServiceTemplateGroup.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-template-groups'] });
      setShowAddGroup(false);
      setEditingGroup(null);
      setGroupForm({ group_name: '', description: '' });
    }
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (id) => {
      // Delete all services in this group first
      const services = servicesByGroup[id] || [];
      await Promise.all(services.map((s) => base44.entities.ServiceTemplate.delete(s.id)));
      // Then delete the group
      await base44.entities.ServiceTemplateGroup.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-template-groups'] });
      queryClient.invalidateQueries({ queryKey: ['service-templates'] });
    }
  });

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-templates'] });
      setShowAddService(false);
      setEditingService(null);
      setServiceForm({
        service_name: '',
        pay_type: 'per_service',
        pay_amount: 0,
        description: ''
      });
    }
  });

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data, oldServiceName, nameChanged }) => {
      await base44.entities.ServiceTemplate.update(id, data);

      // If service name changed, update all staff authorizations
      if (nameChanged && oldServiceName) {
        try {
          await base44.functions.invoke('updateStaffServiceNames', {
            old_service_name: oldServiceName,
            new_service_name: data.service_name
          });
          toast.success('Service updated and staff compensation records synchronized');
        } catch (error) {
          toast.error('Service updated but failed to sync staff records: ' + error.message);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-templates'] });
      setShowAddService(false);
      setEditingService(null);
      setServiceForm({
        service_name: '',
        pay_type: 'per_service',
        pay_amount: 0,
        description: ''
      });
    }
  });

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: (id) => base44.entities.ServiceTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-templates'] });
    }
  });

  // Department mutations
  const createDepartmentMutation = useMutation({
    mutationFn: (name) => base44.entities.AppSetting.create({
      setting_type: 'hr_department',
      value: name.toLowerCase().replace(/\s+/g, '_'),
      label: name,
      is_active: true,
      sort_order: departments.length
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-departments'] });
      setShowAddDepartment(false);
      setNewDepartment('');
    }
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: (id) => base44.entities.AppSetting.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-departments'] });
    }
  });

  // Business mutations
  const createBusinessMutation = useMutation({
    mutationFn: (name) => base44.entities.AppSetting.create({
      setting_type: 'hr_business',
      value: name.toLowerCase().replace(/\s+/g, '_'),
      label: name,
      is_active: true,
      sort_order: businesses.length
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-businesses'] });
      setShowAddBusiness(false);
      setNewBusiness('');
    }
  });

  const deleteBusinessMutation = useMutation({
    mutationFn: (id) => base44.entities.AppSetting.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-businesses'] });
    }
  });

  // Access template mutations
  const createAccessTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.AccessTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-templates'] });
      setShowAccessTemplateDialog(false);
      setEditingAccessTemplate(null);
      setAccessTemplateForm({ name: '', description: '', granted_apps: [] });
      toast.success('Template created successfully');
    }
  });

  const updateAccessTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AccessTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-templates'] });
      setShowAccessTemplateDialog(false);
      setEditingAccessTemplate(null);
      setAccessTemplateForm({ name: '', description: '', granted_apps: [] });
      toast.success('Template updated successfully');
    }
  });

  const deleteAccessTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.AccessTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-templates'] });
      toast.success('Template deleted successfully');
    }
  });

  // Onboarding template mutations
  const createOnboardingTemplateMutation = useMutation({
    mutationFn: (newTemplate) => base44.entities.OnboardingChecklistTemplate.create(newTemplate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboardingChecklistTemplates'] });
      setShowAddOnboardingTemplate(false);
      resetOnboardingForm();
      toast.success('Template created successfully');
    }
  });

  const updateOnboardingTemplateMutation = useMutation({
    mutationFn: (updatedTemplate) => base44.entities.OnboardingChecklistTemplate.update(updatedTemplate.id, updatedTemplate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboardingChecklistTemplates'] });
      setShowAddOnboardingTemplate(false);
      resetOnboardingForm();
      toast.success('Template updated successfully');
    }
  });

  const deleteOnboardingTemplateMutation = useMutation({
    mutationFn: (templateId) => base44.entities.OnboardingChecklistTemplate.delete(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboardingChecklistTemplates'] });
      toast.success('Template deleted successfully');
    }
  });

  // Document type mutations
  const createDocumentTypeMutation = useMutation({
    mutationFn: (name) => base44.entities.AppSetting.create({
      setting_type: 'hr_document_type',
      value: name.toLowerCase().replace(/\s+/g, '_'),
      label: name,
      is_active: true,
      sort_order: documentTypes.length
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-document-types'] });
      setShowAddDocumentType(false);
      setNewDocumentType('');
      toast.success('Document type added successfully');
    }
  });

  const deleteDocumentTypeMutation = useMutation({
    mutationFn: (id) => base44.entities.AppSetting.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-document-types'] });
      toast.success('Document type deleted successfully');
    }
  });

  const handleGroupSubmit = () => {
    if (editingGroup) {
      updateGroupMutation.mutate({
        id: editingGroup.id,
        data: groupForm
      });
    } else {
      createGroupMutation.mutate({
        ...groupForm,
        is_active: true,
        sort_order: templateGroups.length
      });
    }
  };

  const handleServiceSubmit = async () => {
    const serviceType = inferServiceType(serviceForm.service_name);
    const data = {
      ...serviceForm,
      service_type: serviceType,
      template_group_id: selectedGroupId
    };

    if (editingService) {
      const oldServiceName = editingService.service_name;
      const newServiceName = serviceForm.service_name;
      const nameChanged = oldServiceName !== newServiceName;

      updateServiceMutation.mutate({
        id: editingService.id,
        data,
        oldServiceName,
        nameChanged
      });
    } else {
      const groupServices = servicesByGroup[selectedGroupId] || [];
      createServiceMutation.mutate({
        ...data,
        is_active: true,
        sort_order: groupServices.length
      });
    }
  };

  const handleSelectExistingService = (existingService) => {
    setServiceForm({
      service_name: existingService.service_name,
      pay_type: existingService.pay_type,
      pay_amount: existingService.pay_amount,
      description: existingService.description || ''
    });
    setShowSelectExistingService(false);
    toast.success('Service details copied');
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Handle service reordering
  const reorderServicesMutation = useMutation({
    mutationFn: async ({ services }) => {
      // Update sort_order for each service
      await Promise.all(
        services.map((service, index) =>
        base44.entities.ServiceTemplate.update(service.id, { sort_order: index })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-templates'] });
      toast.success('Service order updated');
    }
  });

  const handleDragEnd = (result, groupId) => {
    if (!result.destination) return;

    const services = servicesByGroup[groupId] || [];
    const reordered = Array.from(services);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    // Optimistically update the UI
    queryClient.setQueryData(['service-templates'], (old = []) => {
      return old.map((service) => {
        const newIndex = reordered.findIndex((s) => s.id === service.id);
        if (newIndex !== -1) {
          return { ...service, sort_order: newIndex };
        }
        return service;
      });
    });

    // Save to backend
    reorderServicesMutation.mutate({ services: reordered });
  };

  // Find group name helper
  const getGroupName = (groupId) => {
    const group = templateGroups.find(g => g.id === groupId);
    return group?.group_name || '';
  };

  const handleAccessTemplateSubmit = () => {
    if (!accessTemplateForm.name) {
      toast.error('Please enter a template name');
      return;
    }
    if (accessTemplateForm.granted_apps.length === 0) {
      toast.error('Please select at least one app');
      return;
    }

    if (editingAccessTemplate) {
      updateAccessTemplateMutation.mutate({ id: editingAccessTemplate.id, data: accessTemplateForm });
    } else {
      createAccessTemplateMutation.mutate(accessTemplateForm);
    }
  };

  const toggleApp = (appId) => {
    setAccessTemplateForm((prev) => ({
      ...prev,
      granted_apps: prev.granted_apps.includes(appId) ?
      prev.granted_apps.filter((id) => id !== appId) :
      [...prev.granted_apps, appId]
    }));
  };

  const resetOnboardingForm = () => {
    setCurrentOnboardingTemplate(null);
    setNewOnboardingTemplateName('');
    setNewOnboardingTemplateDescription('');
    setNewOnboardingItems([]);
  };

  const handleOpenOnboardingModal = (template = null) => {
    if (template) {
      setCurrentOnboardingTemplate(template);
      setNewOnboardingTemplateName(template.name);
      setNewOnboardingTemplateDescription(template.description || '');
      setNewOnboardingItems(template.items || []);
    } else {
      resetOnboardingForm();
    }
    setShowAddOnboardingTemplate(true);
  };

  const handleAddOnboardingItem = () => {
    setNewOnboardingItems([...newOnboardingItems, { label: '', is_required: false }]);
  };

  const handleOnboardingItemChange = (index, field, value) => {
    const updatedItems = [...newOnboardingItems];
    updatedItems[index][field] = value;
    setNewOnboardingItems(updatedItems);
  };

  const handleRemoveOnboardingItem = (index) => {
    setNewOnboardingItems(newOnboardingItems.filter((_, i) => i !== index));
  };

  const handleSubmitOnboardingTemplate = () => {
    const templateData = {
      name: newOnboardingTemplateName,
      description: newOnboardingTemplateDescription,
      items: newOnboardingItems.filter((item) => item.label.trim() !== '')
    };

    if (currentOnboardingTemplate) {
      updateOnboardingTemplateMutation.mutate({ id: currentOnboardingTemplate.id, ...templateData });
    } else {
      createOnboardingTemplateMutation.mutate(templateData);
    }
  };

  const apps = [
  { id: 'sales', label: 'Sales', color: 'bg-emerald-100 border-emerald-200 text-emerald-700' },
  { id: 'social', label: 'Social', color: 'bg-violet-100 border-violet-200 text-violet-700' },
  { id: 'tasks', label: 'Tasks', color: 'bg-blue-100 border-blue-200 text-blue-700' },
  { id: 'schedule', label: 'Schedule', color: 'bg-purple-100 border-purple-200 text-purple-700' },
  { id: 'customer_service', label: 'Customer Service', color: 'bg-cyan-100 border-cyan-200 text-cyan-700' },
  { id: 'training', label: 'Training', color: 'bg-indigo-100 border-indigo-200 text-indigo-700' },
  { id: 'equipment', label: 'Equipment', color: 'bg-orange-100 border-orange-200 text-orange-700' },
  { id: 'editors', label: 'Editors', color: 'bg-purple-100 border-purple-200 text-purple-700' }];


  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 md:w-6 md:h-6 text-rose-600" />
          HR/Accounting Settings
        </h1>
        <p className="text-slate-500 mt-1 text-sm md:text-base">Configure HR/Accounting app settings</p>
      </div>

      {/* Businesses Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 md:w-5 md:h-5 text-rose-600" />
              Businesses
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Manage businesses for staff assignment
            </p>
          </div>
          <Button
            onClick={() => setShowAddBusiness(true)}
            className="bg-rose-600 hover:bg-rose-700 w-full sm:w-auto">

            <Plus className="w-4 h-4 mr-2" />
            Add Business
          </Button>
        </div>

        {businesses.length === 0 ?
        <div className="text-center py-8 md:py-12 text-slate-500">
            <Briefcase className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm md:text-base">No businesses configured yet</p>
          </div> :

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {businesses.map((biz) =>
          <div
            key={biz.id}
            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">

                <span className="font-medium text-slate-900 text-sm">{biz.label}</span>
                <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm(`Delete "${biz.label}" business?`)) {
                  deleteBusinessMutation.mutate(biz.id);
                }
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0">

                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
          )}
          </div>
        }
      </div>

      {/* Document Types Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 md:w-5 md:h-5 text-rose-600" />
              Document Types
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Manage document types for staff documents
            </p>
          </div>
          <Button
            onClick={() => setShowAddDocumentType(true)}
            className="bg-rose-600 hover:bg-rose-700 w-full sm:w-auto">

            <Plus className="w-4 h-4 mr-2" />
            Add Type
          </Button>
        </div>

        {documentTypes.length === 0 ?
        <div className="text-center py-8 md:py-12 text-slate-500">
            <FileText className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm md:text-base">No document types configured yet</p>
          </div> :

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {documentTypes.map((docType) =>
          <div
            key={docType.id}
            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">

                <span className="font-medium text-slate-900 text-sm">{docType.label}</span>
                <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm(`Delete "${docType.label}" document type?`)) {
                  deleteDocumentTypeMutation.mutate(docType.id);
                }
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0">

                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
          )}
          </div>
        }
      </div>

      {/* Departments Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 md:w-5 md:h-5 text-rose-600" />
              Departments
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Manage departments for staff assignment
            </p>
          </div>
          <Button
            onClick={() => setShowAddDepartment(true)}
            className="bg-rose-600 hover:bg-rose-700 w-full sm:w-auto">

            <Plus className="w-4 h-4 mr-2" />
            Add Department
          </Button>
        </div>

        {departments.length === 0 ?
        <div className="text-center py-8 md:py-12 text-slate-500">
            <Briefcase className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm md:text-base">No departments configured yet</p>
          </div> :

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {departments.map((dept) =>
          <div
            key={dept.id}
            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">

                <span className="font-medium text-slate-900 text-sm">{dept.label}</span>
                <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm(`Delete "${dept.label}" department?`)) {
                  deleteDepartmentMutation.mutate(dept.id);
                }
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0">

                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
          )}
          </div>
        }
      </div>

      {/* Access Templates Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 md:w-5 md:h-5 text-rose-600" />
              Access Templates
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Manage app access templates for quick user setup
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingAccessTemplate(null);
              setAccessTemplateForm({ name: '', description: '', granted_apps: [] });
              setShowAccessTemplateDialog(true);
            }}
            className="bg-rose-600 hover:bg-rose-700 w-full sm:w-auto">

            <Plus className="w-4 h-4 mr-2" />
            Add Template
          </Button>
        </div>

        {accessTemplates.length === 0 ?
        <div className="text-center py-8 md:py-12 text-slate-500">
            <Shield className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm md:text-base">No access templates yet</p>
          </div> :

        <div className="space-y-3">
            {accessTemplates.map((template) =>
          <div
            key={template.id}
            className="bg-slate-50 rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">

                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-1 truncate">{template.name}</h3>
                    {template.description &&
                <p className="text-xs md:text-sm text-slate-600 line-clamp-2">{template.description}</p>
                }
                  </div>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingAccessTemplate(template);
                    setAccessTemplateForm({
                      name: template.name,
                      description: template.description || '',
                      granted_apps: template.granted_apps || []
                    });
                    setShowAccessTemplateDialog(true);
                  }}
                  className="h-8 w-8 p-0">

                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm('Delete this template?')) {
                      deleteAccessTemplateMutation.mutate(template.id);
                    }
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0">

                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {template.granted_apps?.map((appId) => {
                const app = apps.find((a) => a.id === appId);
                return app ?
                <span key={appId} className={cn("px-2 py-1 rounded-lg text-xs font-medium", app.color)}>
                        {app.label}
                      </span> :
                null;
              })}
                </div>
              </div>
          )}
          </div>
        }
      </div>

      {/* Onboarding Checklist Templates Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 flex items-center gap-2">Checklist Templates


            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Create templates for staff onboarding checklists
            </p>
          </div>
          <Button
            onClick={() => handleOpenOnboardingModal()}
            className="bg-rose-600 hover:bg-rose-700 w-full sm:w-auto">

            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </div>

        {onboardingTemplates.length === 0 ?
        <div className="text-center py-8 md:py-12 text-slate-500">
            <List className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm md:text-base">No templates created yet</p>
          </div> :

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {onboardingTemplates.map((template) =>
          <div key={template.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <h3 className="text-sm md:text-base font-semibold text-slate-900 line-clamp-1">{template.name}</h3>
                {template.description &&
            <p className="text-xs md:text-sm text-slate-600 line-clamp-2">{template.description}</p>
            }
                <ul className="text-xs md:text-sm text-slate-700 space-y-1">
                  {template.items.slice(0, 3).map((item, idx) =>
              <li key={idx} className="flex items-start gap-1">
                      {item.is_required && <span className="text-red-500 mt-0.5">*</span>}
                      <span className="truncate">• {item.label}</span>
                    </li>
              )}
                  {template.items.length > 3 &&
              <li className="text-slate-500">+{template.items.length - 3} more</li>
              }
                </ul>
                <div className="flex gap-2 pt-3 border-t border-slate-200">
                  <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenOnboardingModal(template)}
                className="flex-1 h-8">

                    <Edit2 className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (confirm('Delete this template?')) {
                    deleteOnboardingTemplateMutation.mutate(template.id);
                  }
                }}
                className="flex-1 h-8">

                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </Button>
                </div>
              </div>
          )}
          </div>
        }
      </div>

      {/* Service Templates Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 md:w-5 md:h-5 text-rose-600" />
              Service Templates
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Create templates with multiple services for 1099 photographers
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto flex-col sm:flex-row">
            <Button
              onClick={() => setShowViewAllServices(true)}
              variant="outline"
              className="w-full sm:w-auto">
              <List className="w-4 h-4 mr-2" />
              View All Services
            </Button>
            <Button
              onClick={() => {
                setEditingGroup(null);
                setGroupForm({ group_name: '', description: '' });
                setShowAddGroup(true);
              }}
              className="bg-rose-600 hover:bg-rose-700 w-full sm:w-auto">

              <Plus className="w-4 h-4 mr-2" />
              Add Template
            </Button>
          </div>
        </div>

        {templateGroups.length === 0 ?
        <div className="text-center py-8 md:py-12 text-slate-500">
            <Briefcase className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm md:text-base">No templates configured yet</p>
          </div> :

        <div className="space-y-3">
            {templateGroups.map((group) => {
            const services = servicesByGroup[group.id] || [];
            const isExpanded = expandedGroups[group.id];

            return (
              <div key={group.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  {/* Template Header */}
                  <div className="flex items-center justify-between p-3 md:p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                    <button
                    onClick={() => toggleGroup(group.id)}
                    className="flex items-center gap-2 md:gap-3 flex-1 text-left min-w-0">

                      {isExpanded ?
                    <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-slate-400 shrink-0" /> :

                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-slate-400 shrink-0" />
                    }
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                          <span className="font-medium text-slate-900 text-sm md:text-base truncate">
                            {group.group_name}
                          </span>
                          <span className="text-[10px] md:text-xs text-slate-500 whitespace-nowrap">
                            {services.length} service{services.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {group.description &&
                      <div className="text-xs md:text-sm text-slate-600 mt-1 line-clamp-1">
                            {group.description}
                          </div>
                      }
                      </div>
                    </button>
                    <div className="flex gap-0.5 md:gap-1 ml-2 shrink-0">
                      <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGroupId(group.id);
                        setEditingService(null);
                        setServiceForm({
                          service_name: '',
                          pay_type: 'per_service',
                          pay_amount: 0,
                          description: ''
                        });
                        setShowAddService(true);
                      }}
                      className="h-8 w-8 p-0">

                        <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </Button>
                      <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingGroup(group);
                        setGroupForm({
                          group_name: group.group_name,
                          description: group.description || ''
                        });
                        setShowAddGroup(true);
                      }}
                      className="h-8 w-8 p-0">

                        <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </Button>
                      <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${group.group_name}" and all its services?`)) {
                           deleteGroupMutation.mutate(group.id);
                         }
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0">

                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Services List */}
                  {isExpanded &&
                <div className="p-3 md:p-4 bg-white">
                      {services.length === 0 ?
                  <div className="text-center py-6 md:py-8 text-slate-500 text-xs md:text-sm">
                          No services added yet
                        </div> :

                  <DragDropContext onDragEnd={(result) => handleDragEnd(result, group.id)}>
                          <Droppable droppableId={`services-${group.id}`}>
                            {(provided, snapshot) =>
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2">

                                {services.map((service, index) =>
                        <Draggable key={service.id} draggableId={service.id} index={index}>
                                    {(provided, snapshot) =>
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "flex items-center gap-2 p-2.5 md:p-3 bg-slate-50 rounded-lg transition-colors",
                              snapshot.isDragging ? "shadow-lg bg-white" : "hover:bg-slate-100"
                            )}>

                                        <div
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing shrink-0">

                                          <GripVertical className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <div className="flex-1 min-w-0 pr-2">
                                          <div className="font-medium text-slate-900 text-sm md:text-base truncate">
                                            {service.service_name}
                                          </div>
                                          <div className="text-xs md:text-sm text-slate-600 truncate">
                                            ${service.pay_amount} • {service.pay_type?.replace('_', ' ')}
                                            {service.description && ` • ${service.description}`}
                                          </div>
                                        </div>
                                        <div className="flex gap-0.5 md:gap-1 shrink-0">
                                          <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedGroupId(group.id);
                                  setEditingService(service);
                                  setServiceForm({
                                    service_name: service.service_name,
                                    pay_type: service.pay_type,
                                    pay_amount: service.pay_amount,
                                    description: service.description || ''
                                  });
                                  setShowAddService(true);
                                }}
                                className="h-8 w-8 p-0">

                                            <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                          </Button>
                                          <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm('Delete this service?')) {
                                    deleteServiceMutation.mutate(service.id);
                                  }
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0">

                                            <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                          </Button>
                                        </div>
                                      </div>
                          }
                                  </Draggable>
                        )}
                                {provided.placeholder}
                              </div>
                      }
                          </Droppable>
                        </DragDropContext>
                  }
                    </div>
                }
                </div>);

          })}
          </div>
        }
      </div>

      {/* Add/Edit Template Group Dialog */}
      <Dialog open={showAddGroup} onOpenChange={setShowAddGroup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? 'Edit' : 'Add'} Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Template Name</label>
              <Input
                value={groupForm.group_name}
                onChange={(e) => setGroupForm({ ...groupForm, group_name: e.target.value })}
                placeholder="e.g., Standard Package, Premium Package" />

            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Description</label>
              <Textarea
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                placeholder="Optional description..."
                rows={3} />

            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddGroup(false);
                  setEditingGroup(null);
                }}>

                Cancel
              </Button>
              <Button
                onClick={handleGroupSubmit}
                disabled={!groupForm.group_name || createGroupMutation.isPending || updateGroupMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700">

                {editingGroup ? 'Update' : 'Create'} Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Service Dialog */}
      <Dialog open={showAddService} onOpenChange={setShowAddService}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Edit' : 'Add'} Service
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {!editingService && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700 mb-2">
                  Want to use an existing service? Click below to copy details from any service.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSelectExistingService(true)}
                  className="w-full"
                >
                  <List className="w-4 h-4 mr-2" />
                  Select from Existing Services
                </Button>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-slate-700">Service Name</label>
              <Input
                value={serviceForm.service_name}
                onChange={(e) => setServiceForm({ ...serviceForm, service_name: e.target.value })}
                placeholder="e.g., Photo Shoot, Drone Service, 3D Tour" />

            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Pay Type</label>
              <Select
                value={serviceForm.pay_type}
                onValueChange={(v) => setServiceForm({ ...serviceForm, pay_type: v })}>

                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_service">Per Service</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="flat_rate">Flat Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Pay Amount ($)</label>
              <Input
                type="number"
                step="0.01"
                value={serviceForm.pay_amount}
                onChange={(e) => setServiceForm({ ...serviceForm, pay_amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00" />

            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Description</label>
              <Textarea
                value={serviceForm.description}
                onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                placeholder="Optional description..."
                rows={3} />

            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddService(false);
                  setEditingService(null);
                }}>

                Cancel
              </Button>
              <Button
                onClick={handleServiceSubmit}
                disabled={!serviceForm.service_name || !serviceForm.pay_amount || createServiceMutation.isPending || updateServiceMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700">

                {editingService ? 'Update' : 'Add'} Service
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Business Dialog */}
      <Dialog open={showAddBusiness} onOpenChange={setShowAddBusiness}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Business</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Business Name</label>
              <Input
                value={newBusiness}
                onChange={(e) => setNewBusiness(e.target.value)}
                placeholder="e.g., WindowStill, Lifestyle Production Group" />

            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddBusiness(false);
                  setNewBusiness('');
                }}>

                Cancel
              </Button>
              <Button
                onClick={() => createBusinessMutation.mutate(newBusiness)}
                disabled={!newBusiness || createBusinessMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700">

                Add Business
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Access Template Dialog */}
      <Dialog open={showAccessTemplateDialog} onOpenChange={setShowAccessTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAccessTemplate ? 'Edit' : 'Create'} Access Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Template Name</label>
              <Input
                value={accessTemplateForm.name}
                onChange={(e) => setAccessTemplateForm({ ...accessTemplateForm, name: e.target.value })}
                placeholder="e.g., Sales Team, Social Manager" />

            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Description (Optional)</label>
              <Textarea
                value={accessTemplateForm.description}
                onChange={(e) => setAccessTemplateForm({ ...accessTemplateForm, description: e.target.value })}
                placeholder="Describe what this template is for..."
                rows={3} />

            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-3">App Access</label>
              <div className="grid grid-cols-2 gap-2">
                {apps.map((app) =>
                <button
                  key={app.id}
                  onClick={() => toggleApp(app.id)}
                  className={cn(
                    "flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm",
                    accessTemplateForm.granted_apps.includes(app.id) ?
                    app.color :
                    "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                  )}>

                    {app.label}
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAccessTemplateDialog(false);
                  setEditingAccessTemplate(null);
                  setAccessTemplateForm({ name: '', description: '', granted_apps: [] });
                }}>

                Cancel
              </Button>
              <Button
                onClick={handleAccessTemplateSubmit}
                disabled={createAccessTemplateMutation.isPending || updateAccessTemplateMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700">

                {editingAccessTemplate ? 'Update' : 'Create'} Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Onboarding Template Dialog */}
      <Dialog open={showAddOnboardingTemplate} onOpenChange={setShowAddOnboardingTemplate}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentOnboardingTemplate ? 'Edit' : 'Create'} Onboarding Template</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="onboardingName" className="text-sm font-medium">Name</label>
              <Input
                id="onboardingName"
                value={newOnboardingTemplateName}
                onChange={(e) => setNewOnboardingTemplateName(e.target.value)}
                placeholder="Template name" />

            </div>
            <div className="space-y-2">
              <label htmlFor="onboardingDesc" className="text-sm font-medium">Description (optional)</label>
              <Input
                id="onboardingDesc"
                value={newOnboardingTemplateDescription}
                onChange={(e) => setNewOnboardingTemplateDescription(e.target.value)}
                placeholder="What is this template for?" />

            </div>

            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm">Checklist Items</h3>
              {newOnboardingItems.map((item, index) =>
              <div key={index} className="flex items-center gap-2 pb-3 border-b">
                  <Input
                  value={item.label}
                  onChange={(e) => handleOnboardingItemChange(index, 'label', e.target.value)}
                  placeholder="Item description"
                  className="flex-1" />

                  <label className="flex items-center gap-2 whitespace-nowrap text-xs">
                    <input
                    type="checkbox"
                    checked={item.is_required}
                    onChange={(e) => handleOnboardingItemChange(index, 'is_required', e.target.checked)}
                    className="w-4 h-4" />

                    Required
                  </label>
                  <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleRemoveOnboardingItem(index)}
                  className="h-8 w-8">

                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <Button
                variant="secondary"
                onClick={handleAddOnboardingItem}
                className="w-full mt-2">

                <Plus className="w-4 h-4 mr-2" /> Add Item
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowAddOnboardingTemplate(false)}>

              Cancel
            </Button>
            <Button
              onClick={handleSubmitOnboardingTemplate}
              disabled={!newOnboardingTemplateName.trim() || newOnboardingItems.length === 0}
              className="bg-rose-600 hover:bg-rose-700">

              <Save className="w-4 h-4 mr-2" /> {currentOnboardingTemplate ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Document Type Dialog */}
      <Dialog open={showAddDocumentType} onOpenChange={setShowAddDocumentType}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Document Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Document Type Name</label>
              <Input
                value={newDocumentType}
                onChange={(e) => setNewDocumentType(e.target.value)}
                placeholder="e.g., Background Check, Certification" />

            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddDocumentType(false);
                  setNewDocumentType('');
                }}>

                Cancel
              </Button>
              <Button
                onClick={() => createDocumentTypeMutation.mutate(newDocumentType)}
                disabled={!newDocumentType || createDocumentTypeMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700">

                Add Document Type
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View All Services Dialog */}
      <ViewAllServicesDialog
        isOpen={showViewAllServices}
        onOpenChange={setShowViewAllServices}
        services={serviceTemplates}
        templateGroups={templateGroups}
      />

      {/* Select Existing Service Dialog */}
      <Dialog open={showSelectExistingService} onOpenChange={setShowSelectExistingService}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Existing Service</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <p className="text-sm text-slate-600 mb-4">
              Select a service to copy its details. You can modify them after selecting.
            </p>
            <div className="space-y-2">
              {allAvailableServices.map((service) => {
                const sourceGroup = templateGroups.find(g => g.id === service.template_group_id);
                return (
                  <button
                    key={service.id}
                    onClick={() => handleSelectExistingService(service)}
                    className="w-full text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                  >
                    <div className="font-medium text-slate-900">{service.service_name}</div>
                    <div className="text-xs text-slate-600 mt-1">
                      ${service.pay_amount} • {service.pay_type?.replace('_', ' ')}
                      {sourceGroup && ` • From: ${sourceGroup.template_name}`}
                    </div>
                    {service.description && (
                      <div className="text-xs text-slate-500 mt-1 line-clamp-1">{service.description}</div>
                    )}
                  </button>
                );
              })}
              {allAvailableServices.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <List className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No existing services found</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t mt-4">
            <Button
              variant="outline"
              onClick={() => setShowSelectExistingService(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Department Dialog */}
      <Dialog open={showAddDepartment} onOpenChange={setShowAddDepartment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Department Name</label>
              <Input
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                placeholder="e.g., Sales, Marketing, Operations" />

            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddDepartment(false);
                  setNewDepartment('');
                }}>

                Cancel
              </Button>
              <Button
                onClick={() => createDepartmentMutation.mutate(newDepartment)}
                disabled={!newDepartment || createDepartmentMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700">

                Add Department
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>);

}