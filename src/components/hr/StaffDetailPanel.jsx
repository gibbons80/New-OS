import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toZonedTime } from 'date-fns-tz';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  User, 
  DollarSign, 
  FileText, 
  MessageSquare,
  Calendar,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  Clock,
  TrendingUp,
  Upload,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Camera,
  Instagram,
  Linkedin,
  Facebook,
  ChevronDown,
  ChevronUp,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatInEST } from '@/components/dateFormatter';

function DocumentPreview({ fileUrl }) {
  const [signedUrl, setSignedUrl] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [fileType, setFileType] = React.useState(null);

  React.useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!fileUrl) return;
      
      // Determine file type from URL
      const extension = fileUrl.split('.').pop().toLowerCase().split('?')[0];
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension);
      setFileType(isImage ? 'image' : 'pdf');
      
      // Check if it's an S3 URL
      if (fileUrl.includes('.s3.') && fileUrl.includes('.amazonaws.com/')) {
        try {
          const fileKey = fileUrl.split('.amazonaws.com/')[1];
          const { data } = await base44.functions.invoke('getSignedUrl', { file_key: fileKey });
          setSignedUrl(data.signed_url);
        } catch (error) {
          console.error('Failed to get signed URL:', error);
          setSignedUrl(fileUrl);
        }
      } else {
        setSignedUrl(fileUrl);
      }
      setLoading(false);
    };

    fetchSignedUrl();
  }, [fileUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (fileType === 'image') {
    return (
      <img
        src={signedUrl}
        alt="Document"
        className="w-full h-auto max-h-[70vh] object-contain border border-slate-200 rounded-lg"
      />
    );
  }

  return (
    <iframe
      src={signedUrl}
      className="w-full h-[70vh] border border-slate-200 rounded-lg"
      title="Document Preview"
    />
  );
}
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import AddressAutocomplete from '@/components/cs/AddressAutocomplete';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function StaffDetailPanel({ staffId, onClose, user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState({
    note: '',
    note_type: 'general',
    file_urls: []
  });
  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [newDocument, setNewDocument] = useState({
    document_type: 'misc',
    files: [],
    effective_date: '',
    expiration_date: '',
    notes: ''
  });
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [showDocPanel, setShowDocPanel] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isEditingCompensation, setIsEditingCompensation] = useState(false);
  const [compensationForm, setCompensationForm] = useState({});
  const [inviting, setInviting] = useState(false);
  const [isEditingSocial, setIsEditingSocial] = useState(false);
  const [socialForm, setSocialForm] = useState({});
  const [isEditingEmergency, setIsEditingEmergency] = useState(false);
  const [emergencyForm, setEmergencyForm] = useState({});
  const [showHistory, setShowHistory] = useState(false);
  const [showAddAddon, setShowAddAddon] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [showServiceTemplates, setShowServiceTemplates] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [showEditService, setShowEditService] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    pay_amount: 0,
    pay_type: 'per_service'
  });
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const [showAddSingleService, setShowAddSingleService] = useState(false);
  const [selectedSingleService, setSelectedSingleService] = useState(null);
  const [showAddPayNote, setShowAddPayNote] = useState(false);
  const [payNote, setPayNote] = useState('');
  const [editingPayNote, setEditingPayNote] = useState(null);
  const [showOnboardingTemplates, setShowOnboardingTemplates] = useState(false);
  const [selectedOnboardingTemplates, setSelectedOnboardingTemplates] = useState([]);
  const [showAddCustomChecklist, setShowAddCustomChecklist] = useState(false);
  const [customChecklistLabel, setCustomChecklistLabel] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [previewImages, setPreviewImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [newAddon, setNewAddon] = useState({
    addon_type: 'commission',
    description: '',
    brand: '',
    percentage: 0,
    fixed_amount: 0,
    frequency: 'per_sale',
    effective_date: new Date().toISOString().split('T')[0]
  });

  const queryClient = useQueryClient();

  const { data: staffMember, isLoading: isLoadingStaff } = useQuery({
    queryKey: ['staff', staffId],
    queryFn: async () => {
      const results = await base44.entities.Staff.filter({ id: staffId });
      return results[0];
    },
    enabled: !!staffId,
    refetchInterval: 1000 // Auto-refetch every 1 second to catch sync updates
  });

  const { data: compensationHistory = [] } = useQuery({
    queryKey: ['compensation-history', staffId],
    queryFn: () => base44.entities.StaffCompensationHistory.filter({ staff_id: staffId }, '-effective_date'),
    enabled: !!staffId
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['staff-documents', staffId],
    queryFn: () => base44.entities.StaffDocument.filter({ staff_id: staffId }, '-uploaded_date'),
    enabled: !!staffId
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['staff-notes', staffId],
    queryFn: () => base44.entities.StaffNote.filter({ staff_id: staffId }, '-created_date'),
    enabled: !!staffId
  });

  const { data: trainerNotes = [] } = useQuery({
    queryKey: ['trainer-notes', staffId],
    queryFn: () => base44.entities.StaffNote.filter({ 
      staff_id: staffId, 
      note_type: 'training' 
    }, '-created_date'),
    enabled: !!staffId
  });

  const { data: updateHistory = [] } = useQuery({
    queryKey: ['staff-update-history', staffId],
    queryFn: () => base44.entities.StaffUpdateHistory.filter({ staff_id: staffId }, '-created_date'),
    enabled: !!staffId && showHistory
  });

  const { data: compensationAddons = [] } = useQuery({
    queryKey: ['compensation-addons', staffId],
    queryFn: () => base44.entities.StaffCompensationAddon.filter({ staff_id: staffId }, '-created_date'),
    enabled: !!staffId
  });

  const { data: serviceAuthorizations = [] } = useQuery({
    queryKey: ['service-auth', staffId],
    queryFn: () => base44.entities.StaffServiceAuthorization.filter({ staff_id: staffId }),
    enabled: !!staffId
  });

  // Get signed off service groups directly from staff member (populated by training app)
  const signedOffGroupNames = staffMember?.signed_off_services || [];

  const { data: templateGroups = [] } = useQuery({
    queryKey: ['service-template-groups'],
    queryFn: () => base44.entities.ServiceTemplateGroup.list('sort_order'),
    enabled: !!staffId
  });

  const { data: serviceTemplates = [] } = useQuery({
    queryKey: ['service-templates'],
    queryFn: () => base44.entities.ServiceTemplate.list('sort_order'),
    enabled: !!staffId
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['hr-departments'],
    queryFn: async () => {
      const settings = await base44.entities.AppSetting.filter({ setting_type: 'hr_department' }, 'sort_order');
      return settings;
    }
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['hr-businesses'],
    queryFn: async () => {
      const settings = await base44.entities.AppSetting.filter({ setting_type: 'hr_business' }, 'sort_order');
      return settings;
    }
  });

  const { data: linkedUser } = useQuery({
    queryKey: ['linked-user', staffMember?.user_id],
    queryFn: async () => {
      if (!staffMember?.user_id) return null;
      const users = await base44.entities.User.filter({ id: staffMember.user_id });
      return users[0] || null;
    },
    enabled: !!staffMember?.user_id,
    refetchInterval: 5000 // Refetch every 5 seconds to detect when user logs in
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['access-templates'],
    queryFn: () => base44.entities.AccessTemplate.list('name'),
  });

  const { data: onboardingTemplates = [] } = useQuery({
    queryKey: ['onboarding-templates'],
    queryFn: () => base44.entities.OnboardingChecklistTemplate.list(),
    enabled: !!staffId
  });

  const { data: staffChecklists = [] } = useQuery({
    queryKey: ['staff-checklists', staffId],
    queryFn: () => base44.entities.StaffOnboardingChecklist.filter({ staff_id: staffId }, '-created_date'),
    enabled: !!staffId
  });

  const { data: documentTypes = [] } = useQuery({
    queryKey: ['hr-document-types'],
    queryFn: async () => {
      const settings = await base44.entities.AppSetting.filter({ setting_type: 'hr_document_type' }, 'sort_order');
      return settings;
    }
  });

  // Sync hide_service_pay toggle when staffMember changes
  React.useEffect(() => {
    if (staffMember) {
      // Component logic for hide_service_pay will use staffMember?.hide_service_pay directly
    }
  }, [staffMember?.hide_service_pay]);

  const handleFileUpload = async (files, setFilesState) => {
    setUploading(true);
    const uploadedUrls = [];
    
    for (const file of files) {
      try {
        const result = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(result.file_url);
      } catch (error) {
        console.error('Failed to upload:', error);
      }
    }
    
    setFilesState(prev => [...prev, ...uploadedUrls]);
    setUploading(false);
  };

  const createNoteMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffNote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-notes', staffId] });
      setShowAddNote(false);
      setNewNote({ note: '', note_type: 'general', file_urls: [] });
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id) => base44.entities.StaffNote.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-notes', staffId] });
    }
  });

  const updateStaffMutation = useMutation({
    mutationFn: ({ id, data, logCompensation, syncToUser, skipHistory }) => {
      return base44.entities.Staff.update(id, data).then(() => ({ logCompensation, syncToUser, data, skipHistory }));
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['staff', staffId] });
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      
      // Log field changes to history (skip compensation fields)
      if (!result?.skipHistory && result?.data) {
        const excludeFields = ['current_salary', 'current_hourly_rate', 'pay_type'];
        const fieldChanges = [];
        
        for (const [key, newValue] of Object.entries(result.data)) {
          if (!excludeFields.includes(key)) {
            const oldValue = staffMember?.[key];
            if (oldValue !== newValue) {
              fieldChanges.push({
                staff_id: staffId,
                staff_name: staffMember?.preferred_name || staffMember?.legal_full_name,
                field_name: key,
                old_value: String(oldValue || ''),
                new_value: String(newValue || ''),
                changed_by_id: user?.id,
                changed_by_name: user?.full_name
              });
            }
          }
        }
        
        if (fieldChanges.length > 0) {
          await base44.entities.StaffUpdateHistory.bulkCreate(fieldChanges);
          queryClient.invalidateQueries({ queryKey: ['staff-update-history', staffId] });
        }
      }
      
      // Sync to User entity if needed
      if (result?.syncToUser && staffMember?.user_id) {
        const userData = {};
        if (result.data.preferred_name) userData.full_name = result.data.preferred_name;
        if (result.data.profile_photo_url !== undefined) userData.profile_photo_url = result.data.profile_photo_url;
        if (result.data.personal_email !== undefined) userData.personal_email = result.data.personal_email;
        if (result.data.phone !== undefined) userData.phone = result.data.phone;
        if (result.data.address !== undefined) userData.address = result.data.address;
        if (result.data.bio !== undefined) userData.bio = result.data.bio;
        if (result.data.linkedin_link !== undefined) userData.linkedin_link = result.data.linkedin_link;
        if (result.data.facebook_link !== undefined) userData.facebook_link = result.data.facebook_link;
        if (result.data.instagram_link !== undefined) userData.instagram_link = result.data.instagram_link;
        if (result.data.tiktok_link !== undefined) userData.tiktok_link = result.data.tiktok_link;
        if (result.data.emergency_contact_name !== undefined) userData.emergency_contact_name = result.data.emergency_contact_name;
        if (result.data.emergency_contact_phone !== undefined) userData.emergency_contact_phone = result.data.emergency_contact_phone;
        if (result.data.emergency_contact_relationship !== undefined) userData.emergency_contact_relationship = result.data.emergency_contact_relationship;
        if (result.data.emergency_contact_email !== undefined) userData.emergency_contact_email = result.data.emergency_contact_email;

        if (Object.keys(userData).length > 0) {
          await base44.entities.User.update(staffMember.user_id, userData);
          queryClient.invalidateQueries({ queryKey: ['linked-user', staffMember.user_id] });
          queryClient.invalidateQueries({ queryKey: ['users'] });
        }
      }
      
      // Log compensation change if requested
      if (result?.logCompensation) {
        const { oldValue, newValue, changeType } = result.logCompensation;
        if (oldValue !== newValue) {
          await base44.entities.StaffCompensationHistory.create({
            staff_id: staffId,
            staff_name: staffMember.preferred_name || staffMember.legal_full_name,
            old_value: oldValue || 0,
            new_value: newValue,
            change_type: changeType,
            reason: 'correction',
            effective_date: new Date().toISOString().split('T')[0],
            approved_by_id: user?.id,
            approved_by_name: user?.full_name
          });
          queryClient.invalidateQueries({ queryKey: ['compensation-history', staffId] });
        }
      }
      
      setIsEditing(false);
      setEditForm({});
      setIsEditingCompensation(false);
      setIsEditingSocial(false);
      setIsEditingEmergency(false);
    }
  });

  const updateUserDepartmentsMutation = useMutation({
    mutationFn: ({ userId, departments }) => base44.entities.User.update(userId, { departments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-user', staffMember?.user_id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      console.error('Failed to update departments:', error);
      // Refetch to restore correct state if mutation fails
      queryClient.invalidateQueries({ queryKey: ['linked-user', staffMember?.user_id] });
    }
  });

  const toggleUserActiveMutation = useMutation({
    mutationFn: ({ userId, isActive }) => base44.entities.User.update(userId, { is_active: isActive }),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['linked-user', staffMember?.user_id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      // If we revoked access, check if it's the current user and force logout
      if (variables.isActive === false) {
        const currentUser = await base44.auth.me();
        if (currentUser && currentUser.id === variables.userId) {
          // Force logout and reload
          alert('Your platform access has been revoked. You will be logged out now.');
          window.location.reload();
        } else {
          alert('Platform access revoked successfully. User will be logged out on their next page load.');
        }
      }
    }
  });

  const inviteStaffMutation = useMutation({
    mutationFn: async ({ email, staffId }) => {
      // Send invitation
      await base44.users.inviteUser(email, 'user');
      
      // Fetch the newly created user
      const users = await base44.entities.User.filter({ email });
      const newUser = users[0];
      
      if (newUser) {
        // Link user to staff
        await base44.entities.Staff.update(staffId, { user_id: newUser.id });
        return newUser;
      }
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', staffId] });
      queryClient.invalidateQueries({ queryKey: ['linked-user'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setInviting(false);
    }
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async (data) => {
      // Check if a document with this type already exists
      const existingDoc = documents.find(d => d.document_type === data.document_type);
      
      const uploadedUrls = [];
      
      // Upload all files
      for (const file of data.files) {
        // Upload to temp location first
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        // Move to S3
        const { data: s3Result } = await base44.functions.invoke('uploadToS3', {
          source_url: file_url,
          folder: 'staff-documents',
          file_name: file.name,
          content_type: file.type
        });

        // Get S3 config to construct URL
        const { data: s3Config } = await base44.functions.invoke('getS3Config');
        const s3Url = `https://${s3Config.bucket_name}.s3.${s3Config.region}.amazonaws.com/${s3Result.file_key}`;
        uploadedUrls.push(s3Url);
      }

      if (existingDoc) {
        // Update existing document by adding new URLs
        const updatedUrls = [...(existingDoc.file_urls || []), ...uploadedUrls];
        return base44.entities.StaffDocument.update(existingDoc.id, {
          file_urls: updatedUrls,
          uploaded_date: new Date().toISOString().split('T')[0],
          status: 'uploaded',
          uploaded_by_id: user?.id,
          uploaded_by_name: user?.full_name
        });
      } else {
        // Create new document
        return base44.entities.StaffDocument.create({
          staff_id: staffId,
          staff_name: staffMember?.preferred_name || staffMember?.legal_full_name,
          document_type: data.document_type,
          file_urls: uploadedUrls,
          uploaded_date: new Date().toISOString().split('T')[0],
          effective_date: data.effective_date || null,
          expiration_date: data.expiration_date || null,
          status: 'uploaded',
          uploaded_by_id: user?.id,
          uploaded_by_name: user?.full_name,
          notes: data.notes || null
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-documents', staffId] });
      setShowUploadDoc(false);
      setNewDocument({
        document_type: 'misc',
        files: [],
        effective_date: '',
        expiration_date: '',
        notes: ''
      });
      setUploading(false);
    },
    onError: (error) => {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error.message || 'Unknown error'}`);
      setUploading(false);
    }
  });

  const createAddonMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffCompensationAddon.create(data),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['compensation-addons', staffId] });
      
      // Log the addition
      const amount = variables.percentage || variables.fixed_amount;
      await base44.entities.StaffCompensationHistory.create({
        staff_id: staffId,
        staff_name: staffMember?.preferred_name || staffMember?.legal_full_name,
        old_value: 0,
        new_value: amount,
        change_type: variables.percentage ? 'salary' : 'hourly_rate',
        reason: 'other',
        reason_notes: `Added ${variables.addon_type}: ${variables.description}`,
        effective_date: variables.effective_date || new Date().toISOString().split('T')[0],
        approved_by_id: user?.id,
        approved_by_name: user?.full_name
      });
      queryClient.invalidateQueries({ queryKey: ['compensation-history', staffId] });
      
      setShowAddAddon(false);
      setNewAddon({
        addon_type: 'commission',
        description: '',
        brand: '',
        percentage: 0,
        fixed_amount: 0,
        frequency: 'per_sale',
        effective_date: new Date().toISOString().split('T')[0]
      });
    }
  });

  const applyServiceTemplatesMutation = useMutation({
  mutationFn: async (groupIds) => {
    // Get all services from selected template groups
    const servicesToApply = serviceTemplates
      .filter(s => groupIds.includes(s.template_group_id))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)); // Sort by sort_order

    const promises = servicesToApply.map((template, index) => {
      // Use internal_tracking if hide_service_pay is enabled
      const payType = staffMember?.hide_service_pay ? 'internal_tracking' : template.pay_type;
      const payAmount = staffMember?.hide_service_pay ? 0 : template.pay_amount;

      return base44.entities.StaffServiceAuthorization.create({
        staff_id: staffId,
        staff_name: staffMember?.preferred_name || staffMember?.legal_full_name,
        service_name: template.service_name,
        service_type: template.service_type,
        pay_type: payType,
        pay_amount: payAmount,
        notes: template.description || '',
        is_active: true,
        effective_date: new Date().toISOString().split('T')[0],
        sort_order: index // Preserve the template's sort order
      });
    });
    await Promise.all(promises);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['service-auth', staffId] });
    setShowServiceTemplates(false);
    setSelectedTemplates([]);
  }
  });

  const updateAddonMutation = useMutation({
    mutationFn: ({ id, data, oldAddon }) => base44.entities.StaffCompensationAddon.update(id, data).then(() => ({ data, oldAddon })),
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['compensation-addons', staffId] });
      
      // Log the change
      const oldAmount = result.oldAddon.percentage || result.oldAddon.fixed_amount;
      const newAmount = result.data.percentage || result.data.fixed_amount;
      
      if (oldAmount !== newAmount) {
        await base44.entities.StaffCompensationHistory.create({
          staff_id: staffId,
          staff_name: staffMember?.preferred_name || staffMember?.legal_full_name,
          old_value: oldAmount,
          new_value: newAmount,
          change_type: result.data.percentage ? 'salary' : 'hourly_rate',
          reason: 'other',
          reason_notes: `Updated ${result.data.addon_type}: ${result.data.description}`,
          effective_date: result.data.effective_date || new Date().toISOString().split('T')[0],
          approved_by_id: user?.id,
          approved_by_name: user?.full_name
        });
        queryClient.invalidateQueries({ queryKey: ['compensation-history', staffId] });
      }
      
      setShowAddAddon(false);
      setEditingAddon(null);
      setNewAddon({
        addon_type: 'commission',
        description: '',
        brand: '',
        percentage: 0,
        fixed_amount: 0,
        frequency: 'per_sale',
        effective_date: new Date().toISOString().split('T')[0]
      });
    }
  });

  const deleteAddonMutation = useMutation({
    mutationFn: ({ addonId, addon }) => base44.entities.StaffCompensationAddon.delete(addonId).then(() => addon),
    onSuccess: async (addon) => {
      queryClient.invalidateQueries({ queryKey: ['compensation-addons', staffId] });
      
      // Log the deletion
      const amount = addon.percentage || addon.fixed_amount;
      await base44.entities.StaffCompensationHistory.create({
        staff_id: staffId,
        staff_name: staffMember?.preferred_name || staffMember?.legal_full_name,
        old_value: amount,
        new_value: 0,
        change_type: addon.percentage ? 'salary' : 'hourly_rate',
        reason: 'other',
        reason_notes: `Deleted ${addon.addon_type}: ${addon.description}`,
        effective_date: new Date().toISOString().split('T')[0],
        approved_by_id: user?.id,
        approved_by_name: user?.full_name
      });
      queryClient.invalidateQueries({ queryKey: ['compensation-history', staffId] });
    }
  });

  const deleteServiceAuthMutation = useMutation({
    mutationFn: (id) => base44.entities.StaffServiceAuthorization.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-auth', staffId] });
    },
    onError: (error) => {
      console.error('Failed to delete service authorization:', error);
      queryClient.invalidateQueries({ queryKey: ['service-auth', staffId] });
    }
  });

  const bulkDeleteServicesMutation = useMutation({
    mutationFn: async (serviceIds) => {
      await Promise.all(serviceIds.map(id => base44.entities.StaffServiceAuthorization.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-auth', staffId] });
      setSelectedServices([]);
      setBulkDeleteMode(false);
    }
  });

  const addSingleServiceMutation = useMutation({
  mutationFn: async (template) => {
    // Find the current max sort_order
    const maxSort = serviceAuthorizations.length > 0 
      ? Math.max(...serviceAuthorizations.map(s => s.sort_order || 0))
      : -1;

    // Use internal_tracking if hide_service_pay is enabled
    const payType = staffMember?.hide_service_pay ? 'internal_tracking' : template.pay_type;
    const payAmount = staffMember?.hide_service_pay ? 0 : template.pay_amount;

    return base44.entities.StaffServiceAuthorization.create({
      staff_id: staffId,
      staff_name: staffMember?.preferred_name || staffMember?.legal_full_name,
      service_name: template.service_name,
      service_type: template.service_type,
      pay_type: payType,
      pay_amount: payAmount,
      notes: template.description || '',
      is_active: true,
      effective_date: new Date().toISOString().split('T')[0],
      sort_order: maxSort + 1
    });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['service-auth', staffId] });
    setShowAddSingleService(false);
    setSelectedSingleService(null);
  }
  });

  const updatePayNoteMutation = useMutation({
    mutationFn: ({ id, note }) => base44.entities.StaffCompensationHistory.update(id, { reason_notes: note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensation-history', staffId] });
      setShowAddPayNote(false);
      setEditingPayNote(null);
      setPayNote('');
    }
  });

  const deletePayNoteMutation = useMutation({
    mutationFn: (id) => base44.entities.StaffCompensationHistory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensation-history', staffId] });
    }
  });

  const applyOnboardingTemplateMutation = useMutation({
    mutationFn: async (templateIds) => {
      const itemsToCreate = [];
      for (const templateId of templateIds) {
        const template = onboardingTemplates.find(t => t.id === templateId);
        if (template && template.items) {
          template.items.forEach(item => {
            itemsToCreate.push({
              staff_id: staffId,
              template_id: templateId,
              item_label: item.label,
              is_required: item.is_required,
              is_completed: false
            });
          });
        }
      }
      if (itemsToCreate.length > 0) {
        await base44.entities.StaffOnboardingChecklist.bulkCreate(itemsToCreate);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-checklists', staffId] });
    }
  });

  const toggleChecklistItemMutation = useMutation({
    mutationFn: ({ checklistId, isCompleted }) => 
      base44.entities.StaffOnboardingChecklist.update(checklistId, {
        is_completed: isCompleted,
        completed_date: isCompleted ? new Date().toISOString() : null,
        completed_by_id: isCompleted ? user?.id : null,
        completed_by_name: isCompleted ? user?.full_name : null
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-checklists', staffId] });
    }
  });

  const deleteChecklistItemMutation = useMutation({
    mutationFn: (checklistId) => base44.entities.StaffOnboardingChecklist.delete(checklistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-checklists', staffId] });
    }
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (doc) => {
      // Delete all files from S3 if they exist
      if (doc.file_urls && Array.isArray(doc.file_urls)) {
        for (const fileUrl of doc.file_urls) {
          if (fileUrl && fileUrl.includes('.s3.') && fileUrl.includes('.amazonaws.com/')) {
            try {
              const fileKey = fileUrl.split('.amazonaws.com/')[1];
              await base44.functions.invoke('deleteFromS3', { file_key: fileKey });
            } catch (error) {
              console.error('Failed to delete file from S3:', error);
            }
          }
        }
      }
      // Delete document record
      return base44.entities.StaffDocument.delete(doc.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-documents', staffId] });
    }
  });

  const addCustomChecklistItemMutation = useMutation({
    mutationFn: (itemLabel) => base44.entities.StaffOnboardingChecklist.create({
      staff_id: staffId,
      item_label: itemLabel,
      is_required: false,
      is_completed: false
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-checklists', staffId] });
    }
  });

  const deleteStaffMutation = useMutation({
    mutationFn: (id) => base44.entities.Staff.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      onClose();
    }
  });

  const updateServiceAuthMutation = useMutation({
    mutationFn: ({ id, data, oldService }) => base44.entities.StaffServiceAuthorization.update(id, data).then(() => ({ data, oldService })),
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['service-auth', staffId] });
      
      // Log the change if pay amount changed
      if (result.oldService.pay_amount !== result.data.pay_amount) {
        await base44.entities.StaffCompensationHistory.create({
          staff_id: staffId,
          staff_name: staffMember?.preferred_name || staffMember?.legal_full_name,
          old_value: result.oldService.pay_amount,
          new_value: result.data.pay_amount,
          change_type: 'hourly_rate',
          reason: 'other',
          reason_notes: `Updated service: ${result.oldService.service_name} (${result.data.pay_type?.replace('_', ' ')})`,
          effective_date: new Date().toISOString().split('T')[0],
          approved_by_id: user?.id,
          approved_by_name: user?.full_name
        });
        queryClient.invalidateQueries({ queryKey: ['compensation-history', staffId] });
      }
      
      setShowEditService(false);
      setEditingService(null);
      setServiceForm({ pay_amount: 0, pay_type: 'per_service' });
    }
  });

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      setNewDocument({ ...newDocument, files: selectedFiles });
    }
  };

  const handleUploadDocument = async () => {
    if (!newDocument.files || newDocument.files.length === 0) return;
    setUploading(true);
    uploadDocumentMutation.mutate(newDocument);
  };

  const handleEditToggle = () => {
    if (!staffMember) return;

    if (!isEditing) {
      setEditForm({
        legal_full_name: staffMember.legal_full_name || '',
        preferred_name: staffMember.preferred_name || '',
        primary_role: staffMember.primary_role || '',
        worker_type: staffMember.worker_type || '',
        employment_status: staffMember.employment_status || 'draft',
        company_email: staffMember.company_email || '',
        personal_email: staffMember.personal_email || '',
        phone: staffMember.phone || '',
        address: staffMember.address || '',
        timezone: staffMember.timezone || '',
        department: staffMember.department || '',
        business: staffMember.business || '',
        start_date: staffMember.start_date || '',
        profile_photo_url: staffMember.profile_photo_url || ''
        });
    }
    setIsEditing(!isEditing);
  };

  const handleSaveEdit = () => {
    if (!staffMember) return;
    updateStaffMutation.mutate({ id: staffId, data: editForm, syncToUser: true });
  };

  const handleSaveSocial = () => {
    if (!staffMember) return;
    updateStaffMutation.mutate({ id: staffId, data: socialForm, syncToUser: true });
  };

  const handleSaveEmergency = () => {
    if (!staffMember) return;
    updateStaffMutation.mutate({ id: staffId, data: emergencyForm, syncToUser: true });
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateStaffMutation.mutate({ 
        id: staffId, 
        data: { profile_photo_url: file_url },
        syncToUser: true 
      });
    } catch (error) {
      console.error('Failed to upload photo:', error);
    }
  };

  const handleSendInvite = async () => {
    if (!staffMember) return;
    const email = staffMember.company_email || staffMember.personal_email;
    if (!email) {
      alert('Please add an email address first');
      return;
    }
    
    setInviting(true);
    inviteStaffMutation.mutate({ email, staffId });
  };

  const toggleDepartment = (department) => {
      if (!linkedUser) return;
      const currentDepts = linkedUser.departments || [];
      const newDepts = currentDepts.includes(department)
        ? currentDepts.filter(d => d !== department)
        : [...currentDepts, department];

      updateUserDepartmentsMutation.mutate({ userId: linkedUser.id, departments: newDepts });
    };

  // Optimistic update for UI responsiveness
  const optimisticToggleDepartment = (department) => {
    if (!linkedUser) return;
    const currentDepts = linkedUser.departments || [];
    const isSelected = currentDepts.includes(department);
    return isSelected
      ? currentDepts.filter(d => d !== department)
      : [...currentDepts, department];
  };

    const handleApplyTemplate = (templateId) => {
      if (!linkedUser) return;
      
      if (templateId === 'none') {
        updateUserDepartmentsMutation.mutate({
          userId: linkedUser.id,
          departments: []
        });
      } else {
        const selectedTemplate = templates.find(t => t.id === templateId);
        if (selectedTemplate) {
          updateUserDepartmentsMutation.mutate({
            userId: linkedUser.id,
            departments: selectedTemplate.granted_apps
          });
        }
      }
    };

  const handleEditCompensationToggle = () => {
    if (!staffMember) return;
    if (!isEditingCompensation) {
      setCompensationForm({
        pay_type: staffMember.pay_type || 'salary',
        current_salary: staffMember.current_salary || 0,
        current_hourly_rate: staffMember.current_hourly_rate || 0
      });
    }
    setIsEditingCompensation(!isEditingCompensation);
  };

  const handleSaveCompensation = () => {
    if (!staffMember) return;
    // Determine old and new values
    const oldValue = staffMember.pay_type === 'salary' 
      ? staffMember.current_salary 
      : staffMember.current_hourly_rate;
    const newValue = compensationForm.pay_type === 'salary' 
      ? compensationForm.current_salary 
      : compensationForm.current_hourly_rate;
    
    // Update staff record with compensation history logging
    updateStaffMutation.mutate({ 
      id: staffId, 
      data: compensationForm,
      logCompensation: {
        oldValue,
        newValue,
        changeType: compensationForm.pay_type === 'salary' ? 'salary' : 'hourly_rate'
      }
    });
  };

  if (!staffMember || isLoadingStaff) {
    return null;
  };

  const statusColors = {
    draft: 'bg-slate-100 text-slate-700',
    onboarding: 'bg-amber-100 text-amber-700',
    active: 'bg-emerald-100 text-emerald-700',
    paused: 'bg-blue-100 text-blue-700',
    terminated: 'bg-red-100 text-red-700'
  };

  const workerTypeLabels = {
    w2_employee: 'W2 Employee',
    '1099_contractor': '1099 Contractor',
    virtual_assistant: 'Virtual Assistant',
    '1099_photographer': '1099 Photographer'
    };

    const tabs = [
      { id: 'overview', label: 'Overview', icon: User },
      { id: 'platform', label: 'Access', icon: User },
      { id: 'profile', label: 'Profile', icon: User },
      { id: 'onboarding', label: 'Checklist', icon: BookOpen },
      ...(user?.can_view_compensation_hr ? [{ id: 'compensation', label: 'Compensation', icon: DollarSign }] : []),
      { id: 'documents', label: 'Documents', icon: FileText },
    ];

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
      />
      
      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed top-0 right-0 h-screen w-full max-w-4xl bg-slate-50 shadow-2xl z-50 overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 z-10">
          <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
            <h2 className="text-base md:text-lg font-semibold text-slate-900">Staff Details</h2>
            <div className="flex items-center gap-1 md:gap-2">
              {isEditing ? (
                <>
                  {user?.role === 'admin' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm(`⚠️ WARNING: Delete ${staffMember.preferred_name || staffMember.legal_full_name}?\n\nThis will permanently delete:\n• Staff record\n• All compensation history\n• All documents\n• All notes\n\nThis action CANNOT be undone.`)) {
                          deleteStaffMutation.mutate(staffId);
                        }
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs md:text-sm h-8 md:h-9"
                    >
                      <Trash2 className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      <span className="hidden md:inline">Delete</span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="text-xs md:text-sm h-8 md:h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={updateStaffMutation.isPending}
                    className="bg-rose-600 hover:bg-rose-700 text-xs md:text-sm h-8 md:h-9"
                  >
                    Save
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEditToggle}
                  className="text-xs md:text-sm h-8 md:h-9"
                >
                  <Edit2 className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  Edit
                </Button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 md:p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4 md:w-5 md:h-5 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Profile Snapshot */}
          <div className="px-4 md:px-6 py-4 md:py-6 border-b border-slate-200">
            <div className="flex items-start gap-3 md:gap-6">
              {/* Photo */}
              <div className="w-16 h-16 md:w-24 md:h-24 rounded-xl md:rounded-2xl bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center text-rose-700 font-bold text-xl md:text-3xl shrink-0">
                {staffMember.profile_photo_url ? (
                  <img 
                    src={staffMember.profile_photo_url} 
                    alt={staffMember.preferred_name || staffMember.legal_full_name}
                    className="w-16 h-16 md:w-24 md:h-24 rounded-xl md:rounded-2xl object-cover"
                  />
                ) : (
                  (staffMember.preferred_name || staffMember.legal_full_name)?.charAt(0) || '?'
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Legal Full Name</label>
                        <Input
                          value={editForm.legal_full_name}
                          onChange={(e) => setEditForm({ ...editForm, legal_full_name: e.target.value })}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Preferred Name</label>
                        <Input
                          value={editForm.preferred_name}
                          onChange={(e) => setEditForm({ ...editForm, preferred_name: e.target.value })}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Primary Role</label>
                        <Input
                          value={editForm.primary_role}
                          onChange={(e) => setEditForm({ ...editForm, primary_role: e.target.value })}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Employment Status</label>
                        <Select 
                          value={editForm.employment_status} 
                          onValueChange={(v) => setEditForm({ ...editForm, employment_status: v })}
                        >
                          <SelectTrigger className="h-9">
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
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Worker Type</label>
                        <Select 
                          value={editForm.worker_type} 
                          onValueChange={(v) => setEditForm({ ...editForm, worker_type: v })}
                        >
                          <SelectTrigger className="h-9">
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
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Company Email</label>
                        <Input
                          type="email"
                          value={editForm.company_email}
                          onChange={(e) => setEditForm({ ...editForm, company_email: e.target.value })}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Personal Email</label>
                        <Input
                          type="email"
                          value={editForm.personal_email}
                          onChange={(e) => setEditForm({ ...editForm, personal_email: e.target.value })}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Phone</label>
                        <Input
                          type="tel"
                          value={editForm.phone}
                          onChange={(e) => {
                            const input = e.target.value.replace(/\D/g, '');
                            let formatted = '';
                            if (input.length > 0) {
                              formatted = '(' + input.substring(0, 3);
                              if (input.length > 3) {
                                formatted += ') ' + input.substring(3, 6);
                              }
                              if (input.length > 6) {
                                formatted += '-' + input.substring(6, 10);
                              }
                            }
                            setEditForm({ ...editForm, phone: formatted });
                          }}
                          placeholder="(555) 123-4567"
                          maxLength="14"
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Address</label>
                        <Input
                          value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Time Zone</label>
                        <Input
                          value={editForm.timezone}
                          onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Business</label>
                        <Select 
                          value={editForm.business} 
                          onValueChange={(v) => setEditForm({ ...editForm, business: v })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select business" />
                          </SelectTrigger>
                          <SelectContent>
                            {businesses.map(biz => (
                              <SelectItem key={biz.id} value={biz.label}>
                                {biz.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Department</label>
                        <Select 
                          value={editForm.department} 
                          onValueChange={(v) => setEditForm({ ...editForm, department: v })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map(dept => (
                              <SelectItem key={dept.id} value={dept.label}>
                                {dept.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Start Date</label>
                        <Input
                          type="date"
                          value={editForm.start_date}
                          onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                          className="h-9"
                        />
                      </div>
                      </div>
                      </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h1 className="text-lg md:text-2xl font-bold text-slate-900 truncate">
                        {staffMember.preferred_name || staffMember.legal_full_name}
                      </h1>
                      <span className={cn(
                        "px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-medium",
                        statusColors[staffMember.employment_status]
                      )}>
                        {staffMember.employment_status?.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-slate-600 mb-3">
                      {staffMember.primary_role && (
                        <div className="font-medium text-sm md:text-base">{staffMember.primary_role}</div>
                      )}
                      <div className="text-xs md:text-sm">{workerTypeLabels[staffMember.worker_type]}</div>
                    </div>

                    <div className="space-y-2 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 text-xs md:text-sm">
                      {staffMember.start_date && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-3 h-3 md:w-4 md:h-4 text-slate-400 shrink-0" />
                          Started {format(toZonedTime(parseISO(staffMember.start_date + 'Z'), 'America/New_York'), 'MMM d, yyyy')}
                        </div>
                      )}
                      {staffMember.company_email && (
                        <div className="flex items-center gap-2 text-slate-600 truncate">
                          <Mail className="w-3 h-3 md:w-4 md:h-4 text-slate-400 shrink-0" />
                          <span className="truncate">{staffMember.company_email}</span>
                        </div>
                      )}
                      {staffMember.personal_email && (
                        <div className="flex items-center gap-2 text-slate-600 truncate">
                          <Mail className="w-3 h-3 md:w-4 md:h-4 text-slate-400 shrink-0" />
                          <span className="truncate">{staffMember.personal_email}</span>
                        </div>
                      )}
                      {staffMember.phone && (
                        <a href={`tel:${staffMember.phone.replace(/\D/g, '')}`} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 hover:underline transition-colors">
                          <Phone className="w-3 h-3 md:w-4 md:h-4 text-slate-400 shrink-0" />
                          {staffMember.phone}
                        </a>
                      )}
                      {staffMember.address && (
                        <div className="flex items-center gap-2 text-slate-600 truncate">
                          <MapPin className="w-3 h-3 md:w-4 md:h-4 text-slate-400 shrink-0" />
                          <span className="truncate">{staffMember.address}</span>
                        </div>
                      )}
                      {staffMember.start_date && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-3 h-3 md:w-4 md:h-4 text-slate-400 shrink-0" />
                          Started {format(toZonedTime(parseISO(staffMember.start_date + 'Z'), 'America/New_York'), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 md:px-6 flex gap-0.5 md:gap-1 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium transition-colors relative whitespace-nowrap",
                    activeTab === tab.id
                      ? "text-rose-600"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6">
          {activeTab === 'platform' && (
            <div className="space-y-6">
              {/* Platform Invitation */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6">
                <h3 className="font-semibold text-slate-900 mb-3 md:mb-4 text-sm md:text-base">Platform Access</h3>
                {!staffMember.user_id ? (
                                  <div className="space-y-4">
                                    <p className="text-xs md:text-sm text-slate-600">
                                      Invite this staff member to the platform and pre-assign their app access.
                                    </p>

                                    {/* Pre-assign App Access */}
                                    <div>
                                      <label className="text-sm font-medium text-slate-700 mb-3 block">Apps to Grant Access To</label>
                                      <div className="grid grid-cols-2 gap-2">
                                        {[
                                          { key: 'sales', label: 'Sales', bgActive: 'bg-emerald-100', borderActive: 'border-emerald-200', textActive: 'text-emerald-700' },
                                          { key: 'social', label: 'Social', bgActive: 'bg-violet-100', borderActive: 'border-violet-200', textActive: 'text-violet-700' },
                                          { key: 'tasks', label: 'Tasks', bgActive: 'bg-blue-100', borderActive: 'border-blue-200', textActive: 'text-blue-700' },
                                          { key: 'schedule', label: 'Schedule', bgActive: 'bg-purple-100', borderActive: 'border-purple-200', textActive: 'text-purple-700' },
                                          { key: 'customer_service', label: 'Customer Service', bgActive: 'bg-cyan-100', borderActive: 'border-cyan-200', textActive: 'text-cyan-700' },
                                          { key: 'training', label: 'Training', bgActive: 'bg-indigo-100', borderActive: 'border-indigo-200', textActive: 'text-indigo-700' },
                                          { key: 'equipment', label: 'Equipment', bgActive: 'bg-orange-100', borderActive: 'border-orange-200', textActive: 'text-orange-700' },
                                          { key: 'editors', label: 'Editors', bgActive: 'bg-purple-100', borderActive: 'border-purple-200', textActive: 'text-purple-700' }
                                        ].map(app => {
                                          const tempDepts = editForm.temp_departments !== undefined ? editForm.temp_departments : [];
                                          const isSelected = tempDepts.includes(app.key);
                                          return (
                                          <button
                                            key={app.key}
                                            onClick={() => {
                                              const updated = isSelected
                                                ? tempDepts.filter(d => d !== app.key)
                                                : [...tempDepts, app.key];
                                              setEditForm({ ...editForm, temp_departments: updated });
                                            }}
                                            className={cn(
                                              "flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm",
                                              isSelected
                                                ? cn(app.bgActive, app.borderActive, app.textActive)
                                                : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                                            )}
                                            >
                                            {isSelected && <CheckCircle className="w-4 h-4" />}
                                            {app.label}
                                          </button>
                                        );
                                      })}
                                      </div>
                                    </div>

                                    <Button
                                      onClick={async () => {
                                        const email = staffMember.company_email || staffMember.personal_email;
                                        if (!email) {
                                          alert('Please add an email address first');
                                          return;
                                        }
                                        setInviting(true);
                                        try {
                                          const result = await base44.functions.invoke('inviteStaffToUser', {
                                            staff_id: staffId,
                                            company_email: email,
                                            departments: editForm.temp_departments || []
                                          });
                                          if (result.data?.success) {
                                            queryClient.invalidateQueries({ queryKey: ['staff', staffId] });
                                            queryClient.invalidateQueries({ queryKey: ['linked-user'] });
                                            setEditForm({});
                                          }
                                        } catch (error) {
                                          console.error('Error inviting staff:', error);
                                        } finally {
                                          setInviting(false);
                                        }
                                      }}
                                      disabled={inviting || !staffMember.company_email && !staffMember.personal_email}
                                      className="bg-rose-600 hover:bg-rose-700 w-full"
                                    >
                                      <Mail className="w-4 h-4 mr-2" />
                                      {inviting ? 'Sending Invite...' : 'Send Platform Invite'}
                                    </Button>
                                    {!staffMember.company_email && !staffMember.personal_email && (
                                      <p className="text-xs text-red-600">Please add an email address first</p>
                                    )}
                                  </div>
                                ) : (
                  <div className="space-y-4">
                    {/* Account Status Banner */}
                    {linkedUser?.is_active === false ? (
                      <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-900">Platform Access Revoked</p>
                          <p className="text-xs text-red-700">{linkedUser?.email || staffMember.company_email || staffMember.personal_email}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (confirm('Reactivate platform access for this user?\n\nThey will be able to log in immediately.')) {
                              if (!linkedUser?.id) {
                                alert('Error: User ID not found. Please refresh and try again.');
                                return;
                              }
                              toggleUserActiveMutation.mutate({ userId: linkedUser.id, isActive: true });
                            }
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 h-8 shrink-0"
                        >
                          Reactivate
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-emerald-900">Platform Access Granted</p>
                          <p className="text-xs text-emerald-700">{linkedUser?.email || staffMember.company_email || staffMember.personal_email}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm('⚠️ REVOKE PLATFORM ACCESS?\n\nThis will immediately:\n• Log the user out\n• Prevent them from logging in\n• Keep all their data intact\n\nYou can reactivate access later if needed.\n\nContinue?')) {
                              if (!linkedUser?.id) {
                                alert('Error: User ID not found. Please refresh and try again.');
                                return;
                              }
                              toggleUserActiveMutation.mutate({ userId: linkedUser.id, isActive: false });
                            }
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 h-8 shrink-0"
                        >
                          Revoke Access
                        </Button>
                      </div>
                    )}

                    {/* App Access Control */}
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-3 block">App Access</label>
                      <p className="text-xs text-slate-500 mb-3">Select which apps this user can access (Admin role and HR/Accounting access can only be changed in Team Management)</p>

                        {templates.length > 0 && (
                          <div className="mb-4">
                            <label className="text-sm font-medium text-slate-700 block mb-2">Apply Access Template</label>
                            <Select onValueChange={handleApplyTemplate}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a template..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {templates.map(template => (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => toggleDepartment('sales')}
                          className={cn(
                            "flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm",
                            linkedUser?.departments?.includes('sales')
                              ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                              : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                          )}
                        >
                          {linkedUser?.departments?.includes('sales') && <CheckCircle className="w-4 h-4" />}
                          Sales
                        </button>
                        <button
                          onClick={() => toggleDepartment('social')}
                          className={cn(
                            "flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm",
                            linkedUser?.departments?.includes('social')
                              ? "bg-violet-100 border-violet-200 text-violet-700"
                              : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                          )}
                        >
                          {linkedUser?.departments?.includes('social') && <CheckCircle className="w-4 h-4" />}
                          Social
                        </button>
                        <button
                          onClick={() => toggleDepartment('tasks')}
                          className={cn(
                            "flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm",
                            linkedUser?.departments?.includes('tasks')
                              ? "bg-blue-100 border-blue-200 text-blue-700"
                              : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                          )}
                        >
                          {linkedUser?.departments?.includes('tasks') && <CheckCircle className="w-4 h-4" />}
                          Tasks
                        </button>
                        <button
                          onClick={() => toggleDepartment('schedule')}
                          className={cn(
                            "flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm",
                            linkedUser?.departments?.includes('schedule')
                              ? "bg-purple-100 border-purple-200 text-purple-700"
                              : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                          )}
                        >
                          {linkedUser?.departments?.includes('schedule') && <CheckCircle className="w-4 h-4" />}
                          Schedule
                        </button>
                        <button
                          onClick={() => toggleDepartment('customer_service')}
                          className={cn(
                            "flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm",
                            linkedUser?.departments?.includes('customer_service')
                              ? "bg-cyan-100 border-cyan-200 text-cyan-700"
                              : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                          )}
                        >
                          {linkedUser?.departments?.includes('customer_service') && <CheckCircle className="w-4 h-4" />}
                          Customer Service
                        </button>
                        <button
                          onClick={() => toggleDepartment('training')}
                          className={cn(
                            "flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm",
                            linkedUser?.departments?.includes('training')
                              ? "bg-indigo-100 border-indigo-200 text-indigo-700"
                              : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                          )}
                        >
                          {linkedUser?.departments?.includes('training') && <CheckCircle className="w-4 h-4" />}
                          Training
                        </button>
                        <button
                          onClick={() => toggleDepartment('equipment')}
                          className={cn(
                            "flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm",
                            linkedUser?.departments?.includes('equipment')
                              ? "bg-orange-100 border-orange-200 text-orange-700"
                              : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                          )}
                        >
                          {linkedUser?.departments?.includes('equipment') && <CheckCircle className="w-4 h-4" />}
                          Equipment
                        </button>
                        <button
                          onClick={() => toggleDepartment('editors')}
                          className={cn(
                            "flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm",
                            linkedUser?.departments?.includes('editors')
                              ? "bg-purple-100 border-purple-200 text-purple-700"
                              : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                          )}
                        >
                          {linkedUser?.departments?.includes('editors') && <CheckCircle className="w-4 h-4" />}
                          Editors
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Profile Photo */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6">
                <h3 className="font-semibold text-slate-900 mb-3 md:mb-4 text-sm md:text-base">Profile Photo</h3>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {staffMember.profile_photo_url ? (
                      <img
                        src={staffMember.profile_photo_url}
                        alt={staffMember.preferred_name || staffMember.legal_full_name}
                        className="w-20 h-20 rounded-full object-cover border-4 border-rose-100"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center text-rose-700 font-bold text-2xl">
                        {(staffMember.preferred_name || staffMember.legal_full_name)?.charAt(0) || '?'}
                      </div>
                    )}
                    <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center justify-center cursor-pointer shadow-lg transition-all">
                      <Camera className="w-4 h-4 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-sm text-slate-600">Click the camera icon to upload a new photo</p>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <h3 className="font-semibold text-slate-900 text-sm md:text-base">Contact Information</h3>
                  {!isEditing ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditForm({
                          phone: staffMember.phone || '',
                          address: staffMember.address || '',
                          timezone: staffMember.timezone || ''
                        });
                        setIsEditing(true);
                      }}
                      className="h-8 md:h-9 text-xs md:text-sm"
                    >
                      <Edit2 className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                      <span className="hidden md:inline">Edit</span>
                    </Button>
                  ) : (
                    <div className="flex gap-1 md:gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        className="h-8 md:h-9 text-xs md:text-sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          updateStaffMutation.mutate({ 
                            id: staffId, 
                            data: { 
                              phone: editForm.phone, 
                              address: editForm.address,
                              timezone: editForm.timezone
                            },
                            syncToUser: true
                          });
                        }}
                        disabled={updateStaffMutation.isPending}
                        className="bg-rose-600 hover:bg-rose-700 h-8 md:h-9 text-xs md:text-sm"
                      >
                        Save
                      </Button>
                    </div>
                  )}
                </div>
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs md:text-sm font-medium text-slate-700">Phone</label>
                      <Input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => {
                          const input = e.target.value.replace(/\D/g, '');
                          let formatted = '';
                          if (input.length > 0) {
                            formatted = '(' + input.substring(0, 3);
                            if (input.length > 3) {
                              formatted += ') ' + input.substring(3, 6);
                            }
                            if (input.length > 6) {
                              formatted += '-' + input.substring(6, 10);
                            }
                          }
                          setEditForm({ ...editForm, phone: formatted });
                        }}
                        placeholder="(555) 123-4567"
                        maxLength="14"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs md:text-sm font-medium text-slate-700">Address</label>
                      <AddressAutocomplete
                        value={editForm.address}
                        onChange={(value) => setEditForm({ ...editForm, address: value })}
                        placeholder="123 Main St, City, State 12345"
                      />
                    </div>
                    <div>
                      <label className="text-xs md:text-sm font-medium text-slate-700">Time Zone</label>
                      <Select 
                        value={editForm.timezone} 
                        onValueChange={(v) => setEditForm({ ...editForm, timezone: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                          <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                          <SelectItem value="America/Anchorage">Alaska Time (AKT)</SelectItem>
                          <SelectItem value="Pacific/Honolulu">Hawaii Time (HT)</SelectItem>
                          <SelectItem value="America/Phoenix">Arizona Time (MST)</SelectItem>
                          <SelectItem value="America/Toronto">Toronto (ET)</SelectItem>
                          <SelectItem value="America/Vancouver">Vancouver (PT)</SelectItem>
                          <SelectItem value="Europe/London">London (GMT)</SelectItem>
                          <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                          <SelectItem value="Europe/Berlin">Berlin (CET)</SelectItem>
                          <SelectItem value="Europe/Moscow">Moscow (MSK)</SelectItem>
                          <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                          <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                          <SelectItem value="Asia/Bangkok">Bangkok (ICT)</SelectItem>
                          <SelectItem value="Asia/Hong_Kong">Hong Kong (HKT)</SelectItem>
                          <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                          <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                          <SelectItem value="Australia/Sydney">Sydney (AEDT)</SelectItem>
                          <SelectItem value="Pacific/Auckland">Auckland (NZDT)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {staffMember.phone && (
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">Phone:</span> {staffMember.phone}
                      </div>
                    )}
                    {staffMember.address && (
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">Address:</span> {staffMember.address}
                      </div>
                    )}
                    {staffMember.timezone && (
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">Time Zone:</span> {staffMember.timezone}
                      </div>
                    )}
                    {!staffMember.phone && !staffMember.address && !staffMember.timezone && (
                      <p className="text-xs md:text-sm text-slate-500">No contact information added</p>
                    )}
                  </div>
                )}
              </div>

              {/* Bio */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <h3 className="font-semibold text-slate-900 text-sm md:text-base">Bio</h3>
                  {!isEditing ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditForm({ bio: staffMember.bio || '' });
                        setIsEditing(true);
                      }}
                      className="h-8 md:h-9 text-xs md:text-sm"
                    >
                      <Edit2 className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                      <span className="hidden md:inline">Edit</span>
                    </Button>
                  ) : (
                    <div className="flex gap-1 md:gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        className="h-8 md:h-9 text-xs md:text-sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          updateStaffMutation.mutate({ 
                            id: staffId, 
                            data: { bio: editForm.bio },
                            syncToUser: true
                          });
                        }}
                        disabled={updateStaffMutation.isPending}
                        className="bg-rose-600 hover:bg-rose-700 h-8 md:h-9 text-xs md:text-sm"
                      >
                        Save
                      </Button>
                    </div>
                  )}
                </div>
                {isEditing ? (
                  <Textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={4}
                  />
                ) : (
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">
                    {staffMember.bio || <span className="text-slate-400">No bio added</span>}
                  </p>
                )}
              </div>

              {/* Social Links */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <h3 className="font-semibold text-slate-900 text-sm md:text-base">Social Links</h3>
                  {!isEditingSocial ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSocialForm({
                          linkedin_link: staffMember.linkedin_link || '',
                          facebook_link: staffMember.facebook_link || '',
                          instagram_link: staffMember.instagram_link || '',
                          tiktok_link: staffMember.tiktok_link || '',
                          twitter_url: staffMember.twitter_url || ''
                        });
                        setIsEditingSocial(true);
                      }}
                      className="h-8 md:h-9 text-xs md:text-sm"
                    >
                      <Edit2 className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                      <span className="hidden md:inline">Edit</span>
                    </Button>
                  ) : (
                    <div className="flex gap-1 md:gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditingSocial(false)}
                        className="h-8 md:h-9 text-xs md:text-sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveSocial}
                        disabled={updateStaffMutation.isPending}
                        className="bg-rose-600 hover:bg-rose-700 h-8 md:h-9 text-xs md:text-sm"
                      >
                        Save
                      </Button>
                    </div>
                  )}
                </div>
                {isEditingSocial ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs md:text-sm font-medium text-slate-700 flex items-center gap-2">
                        <Linkedin className="w-4 h-4 text-blue-600" />
                        LinkedIn
                      </label>
                      <Input
                        value={socialForm.linkedin_link}
                        onChange={(e) => setSocialForm({ ...socialForm, linkedin_link: e.target.value })}
                        placeholder="https://linkedin.com/in/username"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs md:text-sm font-medium text-slate-700 flex items-center gap-2">
                        <Facebook className="w-4 h-4 text-blue-700" />
                        Facebook
                      </label>
                      <Input
                        value={socialForm.facebook_link}
                        onChange={(e) => setSocialForm({ ...socialForm, facebook_link: e.target.value })}
                        placeholder="https://facebook.com/username"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs md:text-sm font-medium text-slate-700 flex items-center gap-2">
                        <Instagram className="w-4 h-4 text-pink-600" />
                        Instagram
                      </label>
                      <Input
                        value={socialForm.instagram_link}
                        onChange={(e) => setSocialForm({ ...socialForm, instagram_link: e.target.value })}
                        placeholder="https://instagram.com/username"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs md:text-sm font-medium text-slate-700">TikTok</label>
                      <Input
                        value={socialForm.tiktok_link}
                        onChange={(e) => setSocialForm({ ...socialForm, tiktok_link: e.target.value })}
                        placeholder="https://tiktok.com/@username"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs md:text-sm font-medium text-slate-700">Twitter</label>
                      <Input
                        value={socialForm.twitter_url}
                        onChange={(e) => setSocialForm({ ...socialForm, twitter_url: e.target.value })}
                        placeholder="https://twitter.com/username"
                        className="mt-1"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {staffMember.linkedin_link && (
                      <div className="text-sm text-slate-600 flex items-center gap-2">
                        <Linkedin className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">LinkedIn:</span> <a href={staffMember.linkedin_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{staffMember.linkedin_link}</a>
                      </div>
                    )}
                    {staffMember.facebook_link && (
                      <div className="text-sm text-slate-600 flex items-center gap-2">
                        <Facebook className="w-4 h-4 text-blue-700" />
                        <span className="font-medium">Facebook:</span> <a href={staffMember.facebook_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{staffMember.facebook_link}</a>
                      </div>
                    )}
                    {staffMember.instagram_link && (
                      <div className="text-sm text-slate-600 flex items-center gap-2">
                        <Instagram className="w-4 h-4 text-pink-600" />
                        <span className="font-medium">Instagram:</span> <a href={staffMember.instagram_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{staffMember.instagram_link}</a>
                      </div>
                    )}
                    {staffMember.tiktok_link && (
                      <div className="text-sm text-slate-600 flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                        </svg>
                        <span className="font-medium">TikTok:</span> <a href={staffMember.tiktok_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{staffMember.tiktok_link}</a>
                      </div>
                    )}
                    {staffMember.twitter_url && (
                      <div className="text-sm text-slate-600 flex items-center gap-2">
                        <span className="font-medium">Twitter:</span> <a href={staffMember.twitter_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{staffMember.twitter_url}</a>
                      </div>
                    )}
                    {!staffMember.linkedin_link && !staffMember.facebook_link && !staffMember.instagram_link && !staffMember.twitter_url && !staffMember.tiktok_link && (
                      <p className="text-xs md:text-sm text-slate-500">No social links added</p>
                    )}
                  </div>
                )}
              </div>

              {/* Emergency Contact */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <h3 className="font-semibold text-slate-900 text-sm md:text-base">Emergency Contact</h3>
                  {!isEditingEmergency ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEmergencyForm({
                          emergency_contact_name: staffMember.emergency_contact_name || '',
                          emergency_contact_relationship: staffMember.emergency_contact_relationship || '',
                          emergency_contact_phone: staffMember.emergency_contact_phone || '',
                          emergency_contact_email: staffMember.emergency_contact_email || ''
                        });
                        setIsEditingEmergency(true);
                      }}
                      className="h-8 md:h-9 text-xs md:text-sm"
                    >
                      <Edit2 className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                      <span className="hidden md:inline">Edit</span>
                    </Button>
                  ) : (
                    <div className="flex gap-1 md:gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditingEmergency(false)}
                        className="h-8 md:h-9 text-xs md:text-sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveEmergency}
                        disabled={updateStaffMutation.isPending}
                        className="bg-rose-600 hover:bg-rose-700 h-8 md:h-9 text-xs md:text-sm"
                      >
                        Save
                      </Button>
                    </div>
                  )}
                </div>
                {isEditingEmergency ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs md:text-sm font-medium text-slate-700">Name</label>
                      <Input
                        value={emergencyForm.emergency_contact_name}
                        onChange={(e) => setEmergencyForm({ ...emergencyForm, emergency_contact_name: e.target.value })}
                        placeholder="Jane Doe"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs md:text-sm font-medium text-slate-700">Relationship</label>
                      <Input
                        value={emergencyForm.emergency_contact_relationship}
                        onChange={(e) => setEmergencyForm({ ...emergencyForm, emergency_contact_relationship: e.target.value })}
                        placeholder="Spouse, Parent, etc."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs md:text-sm font-medium text-slate-700">Phone</label>
                      <Input
                        type="tel"
                        value={emergencyForm.emergency_contact_phone}
                        onChange={(e) => {
                          const input = e.target.value.replace(/\D/g, '');
                          let formatted = '';
                          if (input.length > 0) {
                            formatted = '(' + input.substring(0, 3);
                            if (input.length > 3) {
                              formatted += ') ' + input.substring(3, 6);
                            }
                            if (input.length > 6) {
                              formatted += '-' + input.substring(6, 10);
                            }
                          }
                          setEmergencyForm({ ...emergencyForm, emergency_contact_phone: formatted });
                        }}
                        placeholder="(555) 123-4567"
                        maxLength="14"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs md:text-sm font-medium text-slate-700">Email</label>
                      <Input
                        type="email"
                        value={emergencyForm.emergency_contact_email}
                        onChange={(e) => setEmergencyForm({ ...emergencyForm, emergency_contact_email: e.target.value })}
                        placeholder="jane@example.com"
                        className="mt-1"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {staffMember.emergency_contact_name && (
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">Name:</span> {staffMember.emergency_contact_name}
                        {staffMember.emergency_contact_relationship && ` (${staffMember.emergency_contact_relationship})`}
                      </div>
                    )}
                    {staffMember.emergency_contact_phone && (
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">Phone:</span> {staffMember.emergency_contact_phone}
                      </div>
                    )}
                    {staffMember.emergency_contact_email && (
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">Email:</span> {staffMember.emergency_contact_email}
                      </div>
                    )}
                    {!staffMember.emergency_contact_name && !staffMember.emergency_contact_phone && (
                      <p className="text-xs md:text-sm text-slate-500">No emergency contact added</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Checklist Status */}
              {staffMember.employment_status === 'onboarding' && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6">
                  <h3 className="font-semibold text-slate-900 mb-3 md:mb-4 text-sm md:text-base">Checklist Progress</h3>
                  <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-rose-500 to-rose-600 transition-all duration-500"
                        style={{ width: `${staffMember.onboarding_completion_percent || 0}%` }}
                      />
                    </div>
                    <span className="text-xs md:text-sm font-medium text-slate-900 shrink-0">
                      {staffMember.onboarding_completion_percent || 0}%
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-slate-600">
                    Complete checklist requirements to activate this staff member
                  </p>
                </div>
              )}

              {/* Internal Notes */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <h3 className="font-semibold text-slate-900 text-sm md:text-base">Internal Notes</h3>
                  <Button 
                    size="sm" 
                    onClick={() => setShowAddNote(true)}
                    className="bg-rose-600 hover:bg-rose-700 h-8 md:h-9 text-xs md:text-sm"
                  >
                    <Plus className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                    <span className="hidden md:inline">Add Note</span>
                  </Button>
                </div>
                <p className="text-xs md:text-sm text-slate-500 mb-3 md:mb-4">
                  Internal notes are only visible to HR/Admin/Owner
                </p>
                {notes.length === 0 ? (
                  <p className="text-xs md:text-sm text-slate-500">No notes recorded</p>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {notes.map(note => (
                      <div key={note.id} className="p-3 md:p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-start md:items-center gap-2 md:gap-3 mb-2 flex-wrap justify-between">
                          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                            <span className="font-medium text-slate-900 text-xs md:text-sm">{note.author_name}</span>
                            <span className="text-[10px] md:text-sm text-slate-500">
                              {format(toZonedTime(parseISO(note.created_date + 'Z'), 'America/New_York'), 'MMM d, yyyy h:mm a')}
                            </span>
                            {note.note_type !== 'general' && (
                              <span className="px-2 py-0.5 md:py-1 bg-slate-200 text-slate-700 text-[10px] md:text-xs rounded capitalize">
                                {note.note_type?.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm('Delete this note?')) {
                                deleteNoteMutation.mutate(note.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <p className="text-xs md:text-sm text-slate-700 whitespace-pre-wrap">{note.note}</p>
                        {note.file_urls && note.file_urls.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {note.file_urls.map((url, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setPreviewImages(note.file_urls);
                                  setCurrentImageIndex(idx);
                                  setPreviewImage(url);
                                }}
                                className="block w-20 h-20 rounded-lg overflow-hidden border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                              >
                                <img src={url} alt={`Attachment ${idx + 1}`} className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Update History */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full flex items-center justify-between mb-3 md:mb-4 hover:opacity-70 transition-opacity"
                >
                  <h3 className="font-semibold text-slate-900 text-sm md:text-base">Update History</h3>
                  <div className="flex items-center gap-2">
                    {showHistory && updateHistory.length > 0 && (
                      <span className="text-xs text-slate-500">{updateHistory.length} changes</span>
                    )}
                    {showHistory ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>
                {showHistory && (
                  updateHistory.length === 0 ? (
                    <p className="text-xs md:text-sm text-slate-500">No update history recorded</p>
                  ) : (
                    <div className="space-y-2 md:space-y-3">
                      {updateHistory.map(change => (
                        <div key={change.id} className="p-3 md:p-4 bg-slate-50 rounded-lg">
                          <div className="flex items-start md:items-center gap-2 md:gap-3 mb-1 flex-wrap">
                            <span className="font-medium text-slate-900 text-xs md:text-sm capitalize">
                              {change.field_name.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] md:text-sm text-slate-500">
                              {format(toZonedTime(parseISO(change.created_date + 'Z'), 'America/New_York'), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          <div className="text-xs md:text-sm text-slate-600">
                            <span className="line-through text-slate-400">{change.old_value || '(empty)'}</span>
                            {' → '}
                            <span className="text-slate-700">{change.new_value || '(empty)'}</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Changed by {change.changed_by_name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
              </div>
              )}

          {activeTab === 'onboarding' && (
            <div className="space-y-6">
              {/* Checklist */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <h3 className="font-semibold text-slate-900 text-sm md:text-base">Checklist</h3>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowOnboardingTemplates(true)}
                      disabled={onboardingTemplates.length === 0}
                      className="h-8 md:h-9 text-xs md:text-sm"
                    >
                      <Plus className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                      <span className="hidden md:inline">Add Template</span>
                      <span className="md:hidden">Add</span>
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => setShowAddCustomChecklist(true)}
                      className="bg-rose-600 hover:bg-rose-700 h-8 md:h-9 text-xs md:text-sm"
                    >
                      <Plus className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                      <span className="hidden md:inline">Custom Item</span>
                      <span className="md:hidden">Item</span>
                    </Button>
                  </div>
                </div>
                {staffChecklists.length === 0 ? (
                  <p className="text-xs md:text-sm text-slate-500">No checklist items added yet</p>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {staffChecklists.map(item => (
                      <div key={item.id} className="flex items-center gap-3 p-3 md:p-4 bg-slate-50 rounded-lg">
                        <button
                          onClick={() => toggleChecklistItemMutation.mutate({
                            checklistId: item.id,
                            isCompleted: !item.is_completed
                          })}
                          className="shrink-0 transition-colors"
                        >
                          {item.is_completed ? (
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium transition-colors",
                            item.is_completed ? "line-through text-slate-400" : "text-slate-900"
                          )}>
                            {item.item_label}
                          </p>
                          {item.completed_by_name && (
                            <p className="text-xs text-slate-500">
                              ✓ Completed by {item.completed_by_name} on {format(toZonedTime(parseISO(item.completed_date + 'Z'), 'America/New_York'), 'MMM d, yyyy h:mm a')}
                            </p>
                          )}
                        </div>
                        {item.is_required && (
                          <span className="px-2 py-0.5 text-xs font-medium text-red-700 bg-red-100 rounded shrink-0">
                            Required
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm('Delete this checklist item?')) {
                              deleteChecklistItemMutation.mutate(item.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Training Status */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6">
                <h3 className="font-semibold text-slate-900 mb-3 md:mb-4 text-sm md:text-base">Training & Service Sign-Offs</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs md:text-sm text-slate-500 mb-2">Training Status</div>
                    <div className={cn(
                      "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium",
                      staffMember.training_status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      staffMember.training_status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    )}>
                      {staffMember.training_status === 'completed' ? <CheckCircle className="w-4 h-4" /> :
                       staffMember.training_status === 'in_progress' ? <BookOpen className="w-4 h-4" /> :
                       <Clock className="w-4 h-4" />}
                      {(staffMember.training_status || 'not_started').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs md:text-sm text-slate-500 mb-2">Signed Off Services</div>
                    {(() => {
                      // Filter services that meet ALL criteria:
                      // 1. Service is in staff's authorized services (compensation tab)
                      // 2. Service is in the signed_off_services list (from training app)
                      const signedOffServices = serviceAuthorizations.filter(service => 
                        signedOffGroupNames.includes(service.service_name)
                      );

                      if (signedOffServices.length === 0) {
                        return <p className="text-sm text-slate-500">No services signed off yet</p>;
                      }

                      return (
                        <div className="flex flex-wrap gap-2">
                          {signedOffServices.map((service) => (
                            <div key={service.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm">
                              <CheckCircle className="w-3.5 h-3.5" />
                              {service.service_name}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>


                </div>
              </div>
            </div>
          )}

          {activeTab === 'compensation' && (
            <div className="space-y-4 md:space-y-6">
              {/* Hide Service Pay Toggle */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 text-sm md:text-base mb-1">Hide Service Pay (For Salary Staff)</h3>
                    <p className="text-xs md:text-sm text-slate-600">When enabled, all service pay rates will display as "N/A" for tracking purposes only</p>
                  </div>
                  <button
                    onClick={async () => {
                      const newValue = !staffMember?.hide_service_pay;

                      if (newValue) {
                        // Toggle ON: Save original pay data and update all services to internal_tracking
                        const originalPayMap = {};
                        const updates = serviceAuthorizations.map(auth => {
                          originalPayMap[auth.id] = {
                            pay_type: auth.pay_type,
                            pay_amount: auth.pay_amount
                          };
                          return base44.entities.StaffServiceAuthorization.update(auth.id, {
                            pay_type: 'internal_tracking',
                            pay_amount: 0
                          });
                        });

                        await Promise.all(updates);
                        queryClient.invalidateQueries({ queryKey: ['service-auth', staffId] });
                        updateStaffMutation.mutate({ 
                          id: staffId, 
                          data: { 
                            hide_service_pay: newValue,
                            original_service_pay: originalPayMap
                          },
                          skipHistory: true
                        });
                      } else {
                        // Toggle OFF: Restore original pay data
                        const originalPayMap = staffMember?.original_service_pay || {};
                        const updates = serviceAuthorizations.map(auth => {
                          const original = originalPayMap[auth.id];
                          if (original) {
                            return base44.entities.StaffServiceAuthorization.update(auth.id, {
                              pay_type: original.pay_type,
                              pay_amount: original.pay_amount
                            });
                          }
                          return Promise.resolve();
                        });

                        await Promise.all(updates);
                        queryClient.invalidateQueries({ queryKey: ['service-auth', staffId] });
                        updateStaffMutation.mutate({ 
                          id: staffId, 
                          data: { 
                            hide_service_pay: newValue,
                            original_service_pay: null
                          },
                          skipHistory: true
                        });
                      }
                    }}
                    className={cn(
                      "relative inline-flex h-8 w-14 items-center rounded-full transition-colors shrink-0",
                      staffMember?.hide_service_pay ? "bg-rose-600" : "bg-slate-300"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-6 w-6 transform rounded-full bg-white transition-transform",
                        staffMember?.hide_service_pay ? "translate-x-7" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>
              </div>
              {/* Current Compensation */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <h3 className="font-semibold text-slate-900 text-sm md:text-base">Current Compensation</h3>
                  {!isEditingCompensation ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEditCompensationToggle}
                      className="h-8 md:h-9 text-xs md:text-sm"
                    >
                      <Edit2 className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                      <span className="hidden md:inline">Edit</span>
                    </Button>
                  ) : (
                    <div className="flex gap-1 md:gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditingCompensation(false)}
                        className="h-8 md:h-9 text-xs md:text-sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveCompensation}
                        disabled={updateStaffMutation.isPending}
                        className="bg-rose-600 hover:bg-rose-700 h-8 md:h-9 text-xs md:text-sm"
                      >
                        Save
                      </Button>
                    </div>
                  )}
                </div>
                {staffMember.pay_type === 'service_based' && !isEditingCompensation ? (
                  <div className="text-sm text-slate-600">
                    Service-based pay. See Services tab for details.
                  </div>
                ) : isEditingCompensation ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Pay Type</label>
                      <Select 
                        value={compensationForm.pay_type} 
                        onValueChange={(v) => setCompensationForm({ ...compensationForm, pay_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="salary">Salary</SelectItem>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="service_based">Service Based</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {compensationForm.pay_type === 'salary' && (
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">Annual Salary</label>
                        <Input
                          type="number"
                          value={compensationForm.current_salary}
                          onChange={(e) => setCompensationForm({ ...compensationForm, current_salary: parseFloat(e.target.value) || 0 })}
                          placeholder="50000"
                        />
                      </div>
                    )}
                    {compensationForm.pay_type === 'hourly' && (
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">Hourly Rate</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={compensationForm.current_hourly_rate}
                          onChange={(e) => setCompensationForm({ ...compensationForm, current_hourly_rate: parseFloat(e.target.value) || 0 })}
                          placeholder="25.00"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 md:space-y-4">
                    <div className="flex items-center gap-4 md:gap-6 flex-wrap">
                      <div>
                        <div className="text-xs md:text-sm text-slate-500 mb-1">Pay Type</div>
                        <div className="font-medium text-slate-900 capitalize text-sm md:text-base">{staffMember.pay_type}</div>
                      </div>
                      <div>
                        <div className="text-xs md:text-sm text-slate-500 mb-1">Amount</div>
                        <div className="text-xl md:text-2xl font-bold text-slate-900">
                          ${staffMember.pay_type === 'salary' 
                            ? (staffMember.current_salary || 0).toLocaleString()
                            : (staffMember.current_hourly_rate || 0).toFixed(2)
                          }
                          <span className="text-xs md:text-sm font-normal text-slate-500 ml-1">
                            {staffMember.pay_type === 'salary' ? '/year' : '/hour'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Service Authorizations */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6">
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <h3 className="font-semibold text-slate-900 text-sm md:text-base">Service Pay Rates</h3>
                    <div className="flex gap-2">
                      {serviceAuthorizations.length > 0 && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setBulkDeleteMode(!bulkDeleteMode);
                            setSelectedServices([]);
                          }}
                          className="h-8 md:h-9 text-xs md:text-sm"
                        >
                          {bulkDeleteMode ? 'Cancel' : 'Bulk Delete'}
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        onClick={() => setShowAddSingleService(true)}
                        variant="outline"
                        disabled={serviceTemplates.length === 0}
                        className="h-8 md:h-9 text-xs md:text-sm"
                      >
                        <Plus className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                        <span className="hidden md:inline">Add Single Service</span>
                        <span className="md:hidden">Single</span>
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => setShowServiceTemplates(true)}
                        variant="outline"
                        disabled={templateGroups.length === 0}
                        className="h-8 md:h-9 text-xs md:text-sm"
                      >
                        <Plus className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                        <span className="hidden md:inline">Add Template Group</span>
                        <span className="md:hidden">Group</span>
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs md:text-sm text-slate-500 mb-3 md:mb-4">
                    Service-specific pay rates
                  </p>
                  {bulkDeleteMode && selectedServices.length > 0 && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                      <span className="text-sm text-red-700">
                        {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
                      </span>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete ${selectedServices.length} selected service${selectedServices.length !== 1 ? 's' : ''}?`)) {
                            bulkDeleteServicesMutation.mutate(selectedServices);
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 h-8"
                      >
                        Delete Selected
                      </Button>
                    </div>
                  )}
                  {serviceAuthorizations.length === 0 ? (
                    <p className="text-xs md:text-sm text-slate-500">No services configured</p>
                  ) : (
                    <div className="space-y-2 md:space-y-3">
                      {serviceAuthorizations
                        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                        .map(auth => (
                        <div key={auth.id} className="flex items-start gap-2 p-3 md:p-4 bg-slate-50 rounded-lg">
                          {bulkDeleteMode ? (
                            <button
                              onClick={() => {
                                setSelectedServices(prev => 
                                  prev.includes(auth.id) 
                                    ? prev.filter(id => id !== auth.id)
                                    : [...prev, auth.id]
                                );
                              }}
                              className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center shrink-0 border-2 transition-all"
                              style={{
                                borderColor: selectedServices.includes(auth.id) ? '#dc2626' : '#cbd5e1',
                                backgroundColor: selectedServices.includes(auth.id) ? '#fee2e2' : 'transparent'
                              }}
                            >
                              {selectedServices.includes(auth.id) && (
                                <CheckCircle className="w-5 h-5 text-red-600" />
                              )}
                            </button>
                          ) : (
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                              <Briefcase className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 md:gap-3 mb-1 flex-wrap">
                              <span className="font-medium text-slate-900 text-xs md:text-sm truncate">{auth.service_name}</span>
                              {auth.is_active && (
                                <span className="px-1.5 py-0.5 md:px-2 md:py-1 bg-emerald-100 text-emerald-700 text-[10px] md:text-xs rounded shrink-0">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="text-xs md:text-sm text-slate-600">
                              {auth.pay_type === 'internal_tracking' ? 'N/A' : `$${auth.pay_amount}`} • {auth.pay_type?.replace('_', ' ')}
                              <span className="hidden md:inline">
                                {auth.effective_date && ` • Since ${format(toZonedTime(parseISO(auth.effective_date + 'Z'), 'America/New_York'), 'MMM d, yyyy')}`}
                              </span>
                            </div>
                          </div>
                          {!bulkDeleteMode && (
                            <div className="flex gap-0.5 md:gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Edit clicked', auth);
                                  setEditingService(auth);
                                  setServiceForm({
                                    pay_amount: auth.pay_amount,
                                    pay_type: auth.pay_type
                                  });
                                  setShowEditService(true);
                                }}
                                className="text-slate-600 hover:text-slate-700 hover:bg-slate-50 h-8 w-8 p-0"
                              >
                                <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm('Delete this service authorization?')) {
                                    deleteServiceAuthMutation.mutate(auth.id);
                                  }
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                              >
                                <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        ))}
                        </div>
                        )}
                        </div>

                        {/* Compensation Add-ons (Commissions, Bonuses, etc) */}
                        <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <h3 className="font-semibold text-slate-900 text-sm md:text-base">Commission & Add-ons</h3>
                  <Button 
                    size="sm" 
                    onClick={() => setShowAddAddon(true)}
                    className="bg-rose-600 hover:bg-rose-700 h-8 md:h-9 text-xs md:text-sm"
                  >
                    <Plus className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                    <span className="hidden md:inline">Add Custom</span>
                    <span className="md:hidden">Add</span>
                  </Button>
                </div>
                <p className="text-xs md:text-sm text-slate-500 mb-3 md:mb-4">
                  Brand-specific commissions, bonuses, and other compensation add-ons
                </p>
                {compensationAddons.length === 0 ? (
                  <p className="text-xs md:text-sm text-slate-500">No add-ons configured</p>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {compensationAddons.map(addon => (
                      <div key={addon.id} className="flex items-start gap-2 md:gap-4 p-3 md:p-4 bg-slate-50 rounded-lg">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                          <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 md:gap-3 mb-1 flex-wrap">
                            <span className="font-medium text-slate-900 text-xs md:text-sm truncate">{addon.description}</span>
                            {addon.brand && (
                              <span className="px-1.5 py-0.5 md:px-2 md:py-1 bg-blue-100 text-blue-700 text-[10px] md:text-xs rounded shrink-0">
                                {addon.brand}
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 md:px-2 md:py-1 bg-slate-200 text-slate-700 text-[10px] md:text-xs rounded capitalize shrink-0">
                              {addon.addon_type}
                            </span>
                            {!addon.is_active && (
                              <span className="px-1.5 py-0.5 md:px-2 md:py-1 bg-red-100 text-red-700 text-[10px] md:text-xs rounded shrink-0">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="text-xs md:text-sm text-slate-600">
                            {addon.percentage ? `${addon.percentage}% per sale` : `$${addon.fixed_amount?.toLocaleString()} ${addon.frequency?.replace('_', ' ')}`}
                            <span className="hidden md:inline">
                              {addon.effective_date && ` • Effective ${format(toZonedTime(parseISO(addon.effective_date + 'Z'), 'America/New_York'), 'MMM d, yyyy')}`}
                            </span>
                          </div>
                          </div>
                          <div className="flex gap-0.5 md:gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingAddon(addon);
                              setNewAddon({
                                addon_type: addon.addon_type,
                                description: addon.description,
                                brand: addon.brand || '',
                                percentage: addon.percentage || 0,
                                fixed_amount: addon.fixed_amount || 0,
                                frequency: addon.frequency,
                                effective_date: addon.effective_date || new Date().toISOString().split('T')[0]
                              });
                              setShowAddAddon(true);
                            }}
                            className="text-slate-600 hover:text-slate-700 hover:bg-slate-50 h-8 w-8 p-0"
                          >
                            <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteAddonMutation.mutate({ addonId: addon.id, addon })}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          >
                            <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          </Button>
                          </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* History */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <h3 className="font-semibold text-slate-900 text-sm md:text-base">Pay History</h3>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowAddPayNote(true)}
                    className="h-8 md:h-9 text-xs md:text-sm"
                  >
                    <Plus className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                    <span className="hidden md:inline">Add Note</span>
                    <span className="md:hidden">Add</span>
                  </Button>
                </div>
                {compensationHistory.length === 0 ? (
                  <p className="text-xs md:text-sm text-slate-500">No pay history recorded</p>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {compensationHistory.map(change => {
                      const isNote = change.old_value === 0 && change.new_value === 0;
                      return (
                        <div key={change.id} className="flex items-start gap-2 md:gap-4 p-3 md:p-4 bg-slate-50 rounded-lg">
                          <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 md:gap-3 mb-1 flex-wrap">
                              <span className="font-medium text-slate-900 text-xs md:text-sm">
                                {isNote ? (
                                  'Note'
                                ) : change.reason_notes?.includes('commission') || change.reason_notes?.toLowerCase().includes('%') ? (
                                  `${change.old_value || 0}% → ${change.new_value}%`
                                ) : (
                                  `$${change.old_value?.toLocaleString() || 0} → $${change.new_value?.toLocaleString()}`
                                )}
                              </span>
                            </div>
                            <div className="text-xs md:text-sm text-slate-600">
                              Effective {format(toZonedTime(parseISO(change.effective_date + 'Z'), 'America/New_York'), 'MMM d, yyyy')}
                              {change.approved_by_name && (
                                <span className="hidden md:inline"> • Edited by {change.approved_by_name}</span>
                              )}
                            </div>
                            {change.reason_notes && (
                              <div className="text-xs md:text-sm text-slate-500 mt-1 line-clamp-2">{change.reason_notes}</div>
                            )}
                          </div>
                          {isNote && (
                            <div className="flex gap-0.5 md:gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingPayNote(change);
                                  setPayNote(change.reason_notes || '');
                                  setShowAddPayNote(true);
                                }}
                                className="text-slate-600 hover:text-slate-700 hover:bg-slate-50 h-8 w-8 p-0"
                              >
                                <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm('Delete this note?')) {
                                    deletePayNoteMutation.mutate(change.id);
                                  }
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                              >
                                <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <h3 className="font-semibold text-slate-900 text-sm md:text-base">Documents</h3>
                <Button 
                  size="sm" 
                  onClick={() => setShowUploadDoc(true)}
                  className="bg-rose-600 hover:bg-rose-700 h-8 md:h-9 text-xs md:text-sm"
                >
                  <Upload className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                  <span className="hidden md:inline">Upload</span>
                </Button>
              </div>
              {documents.length === 0 ? (
                <p className="text-xs md:text-sm text-slate-500">No documents uploaded</p>
              ) : (
                <div className="space-y-2 md:space-y-3">
                  {documents.map(doc => {
                    const fileCount = doc.file_urls?.length || 0;
                    const hasFiles = fileCount > 0;
                    
                    return (
                      <div key={doc.id} className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (hasFiles) {
                              setPreviewDoc(doc);
                              setShowDocPanel(true);
                            } else {
                              alert('No files uploaded for this document');
                            }
                          }}
                          className={cn(
                            "flex items-center gap-2 md:gap-4 p-3 md:p-4 bg-slate-50 rounded-lg flex-1 text-left transition-all border-2",
                            hasFiles 
                              ? "hover:bg-blue-50 hover:border-blue-300 border-transparent cursor-pointer hover:shadow-md" 
                              : "cursor-not-allowed opacity-40 border-transparent"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center shrink-0",
                            doc.status === 'approved' ? 'bg-emerald-100' :
                            doc.status === 'expired' ? 'bg-red-100' :
                            doc.status === 'uploaded' ? 'bg-blue-100' : 'bg-slate-100'
                          )}>
                            {doc.status === 'approved' ? (
                              <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
                            ) : doc.status === 'expired' || doc.status === 'missing' ? (
                              <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
                            ) : (
                              <FileText className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 capitalize text-xs md:text-sm truncate flex items-center gap-2">
                              {doc.document_type?.replace('_', ' ')}
                              {doc.is_required && <span className="text-red-500 ml-1">*</span>}
                              {hasFiles && (
                                <>
                                  <span className="text-[10px] text-blue-600 font-normal">Click to view</span>
                                  {fileCount > 1 && (
                                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded">
                                      {fileCount} files
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                            <div className="text-[10px] md:text-sm text-slate-600">
                              {doc.uploaded_date 
                                ? `Uploaded ${format(toZonedTime(parseISO(doc.uploaded_date + 'Z'), 'America/New_York'), 'MMM d, yyyy')}`
                                : 'Not uploaded'
                              }
                            </div>
                          </div>
                          {doc.status !== 'uploaded' && (
                            <span className={cn(
                              "px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-medium capitalize shrink-0",
                              doc.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                              doc.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                            )}>
                              {doc.status}
                            </span>
                          )}
                        </button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            const fileText = fileCount > 1 ? `all ${fileCount} files` : 'this file';
                            if (confirm(`Delete ${doc.document_type?.replace('_', ' ')} (${fileText})?`)) {
                              deleteDocumentMutation.mutate(doc);
                            }
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}


        </div>

        {/* Document Detail Panel */}
        <AnimatePresence>
          {showDocPanel && previewDoc && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowDocPanel(false);
                  setPreviewDoc(null);
                }}
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50"
              />
              
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed top-0 right-0 h-screen w-full max-w-4xl bg-white shadow-2xl z-50 overflow-y-auto"
              >
                <div className="sticky top-0 bg-white border-b border-slate-200 z-10 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900 capitalize">
                    {previewDoc.document_type?.replace('_', ' ')}
                  </h2>
                  <button
                    onClick={() => {
                      setShowDocPanel(false);
                      setPreviewDoc(null);
                    }}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Document Details */}
                  <div className="bg-slate-50 rounded-xl p-6 space-y-4">
                    <h3 className="font-semibold text-slate-900">Document Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {previewDoc.status !== 'uploaded' && (
                        <div>
                          <div className="text-slate-500 mb-1">Status</div>
                          <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium capitalize inline-block",
                            previewDoc.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            previewDoc.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                          )}>
                            {previewDoc.status}
                          </span>
                        </div>
                      )}
                      {previewDoc.uploaded_date && (
                        <div>
                          <div className="text-slate-500 mb-1">Uploaded Date</div>
                          <div className="text-slate-900">
                            {format(toZonedTime(parseISO(previewDoc.uploaded_date + 'Z'), 'America/New_York'), 'MMM d, yyyy')}
                          </div>
                        </div>
                      )}
                      {previewDoc.effective_date && (
                        <div>
                          <div className="text-slate-500 mb-1">Effective Date</div>
                          <div className="text-slate-900">
                            {format(toZonedTime(parseISO(previewDoc.effective_date + 'Z'), 'America/New_York'), 'MMM d, yyyy')}
                          </div>
                        </div>
                      )}
                      {previewDoc.expiration_date && (
                        <div>
                          <div className="text-slate-500 mb-1">Expiration Date</div>
                          <div className="text-slate-900">
                            {format(toZonedTime(parseISO(previewDoc.expiration_date + 'Z'), 'America/New_York'), 'MMM d, yyyy')}
                          </div>
                        </div>
                      )}
                      {previewDoc.uploaded_by_name && (
                        <div>
                          <div className="text-slate-500 mb-1">Uploaded By</div>
                          <div className="text-slate-900">{previewDoc.uploaded_by_name}</div>
                        </div>
                      )}
                    </div>
                    {previewDoc.notes && (
                      <div>
                        <div className="text-slate-500 mb-1 text-sm">Notes</div>
                        <div className="text-slate-900 text-sm bg-white p-3 rounded-lg">
                          {previewDoc.notes}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Document Previews */}
                  <div className="bg-slate-50 rounded-xl p-6">
                    <h3 className="font-semibold text-slate-900 mb-4">
                      Document Preview{previewDoc.file_urls?.length > 1 ? 's' : ''}
                    </h3>
                    {previewDoc.file_urls && previewDoc.file_urls.length > 0 ? (
                      <div className="space-y-6">
                        {previewDoc.file_urls.map((fileUrl, index) => (
                          <div key={index} className="border-b border-slate-200 last:border-0 pb-6 last:pb-0">
                            {previewDoc.file_urls.length > 1 && (
                              <div className="text-sm font-medium text-slate-600 mb-3">
                                File {index + 1} of {previewDoc.file_urls.length}
                              </div>
                            )}
                            <DocumentPreview fileUrl={fileUrl} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No documents uploaded</p>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Upload Document Dialog */}
        <Dialog open={showUploadDoc} onOpenChange={setShowUploadDoc}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Document Type</label>
                <Select 
                  value={newDocument.document_type} 
                  onValueChange={(v) => setNewDocument({ ...newDocument, document_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map(docType => (
                      <SelectItem key={docType.id} value={docType.value}>
                        {docType.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">File(s)</label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 mt-1"
                />
                {newDocument.files && newDocument.files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {newDocument.files.map((file, idx) => (
                      <p key={idx} className="text-sm text-slate-600">
                        {idx + 1}. {file.name}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Effective Date</label>
                  <input
                    type="date"
                    value={newDocument.effective_date}
                    onChange={(e) => setNewDocument({ ...newDocument, effective_date: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Expiration Date</label>
                  <input
                    type="date"
                    value={newDocument.expiration_date}
                    onChange={(e) => setNewDocument({ ...newDocument, expiration_date: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <Textarea
                  value={newDocument.notes}
                  onChange={(e) => setNewDocument({ ...newDocument, notes: e.target.value })}
                  placeholder="Optional notes..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowUploadDoc(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUploadDocument}
                  disabled={!newDocument.files || newDocument.files.length === 0 || uploading || uploadDocumentMutation.isPending}
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  {uploading ? 'Uploading...' : `Upload ${newDocument.files?.length > 1 ? `${newDocument.files.length} Documents` : 'Document'}`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Compensation Addon Dialog */}
        <Dialog open={showAddAddon} onOpenChange={() => {
          setShowAddAddon(false);
          setEditingAddon(null);
          setNewAddon({
            addon_type: 'commission',
            description: '',
            brand: '',
            percentage: 0,
            fixed_amount: 0,
            frequency: 'per_sale',
            effective_date: new Date().toISOString().split('T')[0]
          });
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAddon ? 'Edit' : 'Add'} Compensation Add-on</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Type</label>
                <Select 
                  value={newAddon.addon_type} 
                  onValueChange={(v) => setNewAddon({ ...newAddon, addon_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commission">Commission</SelectItem>
                    <SelectItem value="bonus">Bonus</SelectItem>
                    <SelectItem value="stipend">Stipend</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Description</label>
                <Input
                  value={newAddon.description}
                  onChange={(e) => setNewAddon({ ...newAddon, description: e.target.value })}
                  placeholder="e.g., Brand X Commission, Monthly Car Allowance"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Percentage</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={newAddon.percentage}
                      onChange={(e) => setNewAddon({ ...newAddon, percentage: parseFloat(e.target.value) || 0 })}
                      placeholder="5.0"
                    />
                    <span className="text-slate-600">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">OR Fixed Amount</label>
                  <Input
                    type="number"
                    value={newAddon.fixed_amount}
                    onChange={(e) => setNewAddon({ ...newAddon, fixed_amount: parseFloat(e.target.value) || 0 })}
                    placeholder="500"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Frequency</label>
                <Select 
                  value={newAddon.frequency} 
                  onValueChange={(v) => setNewAddon({ ...newAddon, frequency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_sale">Per Sale</SelectItem>
                    <SelectItem value="every_2_weeks">Every 2 Weeks</SelectItem>
                    <SelectItem value="twice_a_month">Twice a Month</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                    <SelectItem value="one_time">One Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Effective Date</label>
                <Input
                  type="date"
                  value={newAddon.effective_date}
                  onChange={(e) => setNewAddon({ ...newAddon, effective_date: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => {
                  setShowAddAddon(false);
                  setEditingAddon(null);
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (editingAddon) {
                      updateAddonMutation.mutate({
                        id: editingAddon.id,
                        data: newAddon,
                        oldAddon: editingAddon
                      });
                    } else {
                      createAddonMutation.mutate({
                        staff_id: staffId,
                        staff_name: staffMember?.preferred_name || staffMember?.legal_full_name,
                        ...newAddon,
                        is_active: true
                      });
                    }
                  }}
                  disabled={!newAddon.description || createAddonMutation.isPending || updateAddonMutation.isPending}
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  {editingAddon ? 'Update' : 'Add'} Add-on
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Apply Service Templates Dialog */}
        <Dialog open={showServiceTemplates} onOpenChange={setShowServiceTemplates}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Services from Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <p className="text-sm text-slate-600">
                Select service template groups to add to this staff member's authorized services.
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {templateGroups.filter(g => g.is_active).map(group => {
                  const groupServices = serviceTemplates.filter(s => s.template_group_id === group.id);
                  const isSelected = selectedTemplates.includes(group.id);

                  return (
                    <button
                      key={group.id}
                      onClick={() => {
                        setSelectedTemplates(prev => 
                          isSelected 
                            ? prev.filter(id => id !== group.id)
                            : [...prev, group.id]
                        );
                      }}
                      className={cn(
                        "w-full text-left p-4 rounded-lg border-2 transition-all",
                        isSelected
                          ? "bg-rose-50 border-rose-500"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-medium text-slate-900">
                              {group.group_name}
                            </span>
                            <span className="px-2 py-1 bg-slate-200 text-slate-700 text-xs rounded">
                              {groupServices.length} service{groupServices.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {group.description && (
                            <div className="text-sm text-slate-600 mb-2">
                              {group.description}
                            </div>
                          )}
                          <div className="text-xs text-slate-500 space-y-1 mt-2">
                            {groupServices.map(s => (
                              <div key={s.id}>• {s.service_name} - ${s.pay_amount}</div>
                            ))}
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowServiceTemplates(false);
                    setSelectedTemplates([]);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    applyServiceTemplatesMutation.mutate(selectedTemplates);
                  }}
                  disabled={selectedTemplates.length === 0 || applyServiceTemplatesMutation.isPending}
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  Add {selectedTemplates.length} Template{selectedTemplates.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Service Authorization Dialog */}
        <Dialog open={showEditService} onOpenChange={setShowEditService}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Service Pay Rate</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Service Name</label>
                <Input
                  value={editingService?.service_name || ''}
                  disabled
                  className="bg-slate-50"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Pay Type</label>
                <Select
                  value={serviceForm.pay_type}
                  onValueChange={(v) => setServiceForm({ ...serviceForm, pay_type: v })}
                >
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
                {editingService?.pay_type === 'internal_tracking' ? (
                  <Input
                    type="text"
                    value="N/A - Internal Tracking Only"
                    disabled
                    className="bg-slate-50"
                  />
                ) : (
                  <Input
                    type="number"
                    step="0.01"
                    value={serviceForm.pay_amount}
                    onChange={(e) => setServiceForm({ ...serviceForm, pay_amount: parseFloat(e.target.value) || 0 })}
                  />
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditService(false);
                    setEditingService(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    updateServiceAuthMutation.mutate({
                      id: editingService.id,
                      data: serviceForm,
                      oldService: editingService
                    });
                  }}
                  disabled={!serviceForm.pay_amount || updateServiceAuthMutation.isPending}
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  Update Service
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Pay Note Dialog */}
        <Dialog open={showAddPayNote} onOpenChange={() => {
          setShowAddPayNote(false);
          setEditingPayNote(null);
          setPayNote('');
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPayNote ? 'Edit' : 'Add'} Pay History Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Note</label>
                <Textarea
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Enter compensation note (e.g., bonus details, commission structure change, etc.)..."
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => {
                  setShowAddPayNote(false);
                  setEditingPayNote(null);
                  setPayNote('');
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={async () => {
                    if (!payNote) return;
                    if (editingPayNote) {
                      updatePayNoteMutation.mutate({
                        id: editingPayNote.id,
                        note: payNote
                      });
                    } else {
                      await base44.entities.StaffCompensationHistory.create({
                        staff_id: staffId,
                        staff_name: staffMember?.preferred_name || staffMember?.legal_full_name,
                        old_value: 0,
                        new_value: 0,
                        change_type: 'other',
                        reason: 'other',
                        reason_notes: payNote,
                        effective_date: new Date().toISOString().split('T')[0],
                        approved_by_id: user?.id,
                        approved_by_name: user?.full_name
                      });
                      queryClient.invalidateQueries({ queryKey: ['compensation-history', staffId] });
                      setShowAddPayNote(false);
                      setPayNote('');
                    }
                  }}
                  disabled={!payNote || updatePayNoteMutation.isPending}
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  {editingPayNote ? 'Update' : 'Add'} Note
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Apply Checklist Templates Dialog */}
        <Dialog open={showOnboardingTemplates} onOpenChange={setShowOnboardingTemplates}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Checklist Items</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <p className="text-sm text-slate-600">
                Select templates to add checklist items to this staff member.
              </p>
               <div className="space-y-2 max-h-96 overflow-y-auto">
                 {onboardingTemplates.map(template => {
                   const isSelected = selectedOnboardingTemplates.includes(template.id);
                   return (
                     <button
                       key={template.id}
                       onClick={() => {
                         setSelectedOnboardingTemplates(prev =>
                           isSelected
                             ? prev.filter(id => id !== template.id)
                             : [...prev, template.id]
                         );
                       }}
                       className={cn(
                         "w-full text-left p-4 rounded-lg border-2 transition-all",
                         isSelected
                           ? "bg-rose-50 border-rose-500"
                           : "bg-white border-slate-200 hover:border-slate-300"
                       )}
                     >
                       <div className="flex items-start justify-between gap-3">
                         <div className="flex-1">
                           <div className="font-medium text-slate-900 mb-1">{template.name}</div>
                           {template.description && (
                             <p className="text-sm text-slate-600 mb-2">{template.description}</p>
                           )}
                           <div className="text-xs text-slate-500 space-y-1">
                             {template.items.map((item, idx) => (
                               <div key={idx} className="flex items-center gap-1">
                                 {item.is_required && <span className="text-red-500">*</span>}
                                 • {item.label}
                               </div>
                             ))}
                           </div>
                         </div>
                         {isSelected && (
                           <CheckCircle className="w-5 h-5 text-rose-600 shrink-0 mt-1" />
                         )}
                       </div>
                     </button>
                   );
                 })}
               </div>
               <div className="flex justify-end gap-3 pt-4 border-t">
                 <Button 
                   variant="outline" 
                   onClick={() => {
                     setShowOnboardingTemplates(false);
                     setSelectedOnboardingTemplates([]);
                   }}
                 >
                   Cancel
                 </Button>
                 <Button 
                   onClick={() => {
                     applyOnboardingTemplateMutation.mutate(selectedOnboardingTemplates);
                     setShowOnboardingTemplates(false);
                     setSelectedOnboardingTemplates([]);
                   }}
                   disabled={selectedOnboardingTemplates.length === 0 || applyOnboardingTemplateMutation.isPending}
                   className="bg-rose-600 hover:bg-rose-700"
                 >
                   Add {selectedOnboardingTemplates.length} Template{selectedOnboardingTemplates.length !== 1 ? 's' : ''}
                 </Button>
               </div>
             </div>
           </DialogContent>
         </Dialog>

         {/* Add Custom Checklist Item Dialog */}
         <Dialog open={showAddCustomChecklist} onOpenChange={setShowAddCustomChecklist}>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>Add Custom Checklist Item</DialogTitle>
             </DialogHeader>
             <div className="space-y-4 mt-4">
               <div>
                 <label className="text-sm font-medium text-slate-700">Item Description</label>
                 <Input
                   value={customChecklistLabel}
                   onChange={(e) => setCustomChecklistLabel(e.target.value)}
                   placeholder="Enter checklist item..."
                   className="mt-1"
                 />
               </div>
               <div className="flex justify-end gap-3">
                 <Button variant="outline" onClick={() => {
                   setShowAddCustomChecklist(false);
                   setCustomChecklistLabel('');
                 }}>
                   Cancel
                 </Button>
                 <Button 
                   onClick={() => {
                     if (customChecklistLabel.trim()) {
                       addCustomChecklistItemMutation.mutate(customChecklistLabel);
                       setShowAddCustomChecklist(false);
                       setCustomChecklistLabel('');
                     }
                   }}
                   disabled={!customChecklistLabel.trim() || addCustomChecklistItemMutation.isPending}
                   className="bg-rose-600 hover:bg-rose-700"
                 >
                   Add Item
                 </Button>
               </div>
             </div>
           </DialogContent>
           </Dialog>

           {/* Add Single Service Dialog */}
           <Dialog open={showAddSingleService} onOpenChange={setShowAddSingleService}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Single Service</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <p className="text-sm text-slate-600">
                  Select a service from any template to add to this staff member.
                </p>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {templateGroups.filter(g => g.is_active).map(group => {
                    const groupServices = serviceTemplates
                      .filter(s => s.template_group_id === group.id)
                      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

                    if (groupServices.length === 0) return null;

                    return (
                      <div key={group.id} className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                          <div className="font-medium text-slate-900 text-sm">{group.group_name}</div>
                        </div>
                        <div className="p-2 space-y-1">
                          {groupServices.map(service => {
                            const isSelected = selectedSingleService?.id === service.id;
                            return (
                              <button
                                key={service.id}
                                onClick={() => setSelectedSingleService(service)}
                                className={cn(
                                  "w-full text-left p-3 rounded-lg transition-all border",
                                  isSelected
                                    ? "bg-rose-50 border-rose-500"
                                    : "bg-white border-transparent hover:bg-slate-50"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium text-slate-900 text-sm mb-1">
                                      {service.service_name}
                                    </div>
                                    <div className="text-xs text-slate-600">
                                      ${service.pay_amount} • {service.pay_type?.replace('_', ' ')}
                                      {service.description && ` • ${service.description}`}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <CheckCircle className="w-5 h-5 text-rose-600 shrink-0" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowAddSingleService(false);
                      setSelectedSingleService(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      if (selectedSingleService) {
                        addSingleServiceMutation.mutate(selectedSingleService);
                      }
                    }}
                    disabled={!selectedSingleService || addSingleServiceMutation.isPending}
                    className="bg-rose-600 hover:bg-rose-700"
                  >
                    Add Service
                  </Button>
                </div>
              </div>
            </DialogContent>
           </Dialog>

           {/* Image Preview Dialog */}
         <Dialog open={!!previewImage} onOpenChange={() => {
           setPreviewImage(null);
           setPreviewImages([]);
           setCurrentImageIndex(0);
         }}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                Image Preview {previewImages.length > 1 && `(${currentImageIndex + 1} of ${previewImages.length})`}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4 relative">
              <img src={previewImages[currentImageIndex] || previewImage} alt="Preview" className="w-full h-auto max-h-[70vh] object-contain rounded-lg" />
              {previewImages.length > 1 && (
                <>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setCurrentImageIndex((prev) => (prev - 1 + previewImages.length) % previewImages.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg"
                  >
                    <ChevronDown className="w-5 h-5 rotate-90" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setCurrentImageIndex((prev) => (prev + 1) % previewImages.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg"
                  >
                    <ChevronDown className="w-5 h-5 -rotate-90" />
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

           {/* Add Note Dialog */}
         <Dialog open={showAddNote} onOpenChange={(open) => {
           setShowAddNote(open);
           if (!open) setNewNote({ note: '', note_type: 'general', file_urls: [] });
         }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Internal Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Note Type</label>
                <Select 
                  value={newNote.note_type} 
                  onValueChange={(v) => setNewNote({ ...newNote, note_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="pay_change">Pay Change</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="exception">Exception</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Note</label>
                <Textarea
                  value={newNote.note}
                  onChange={(e) => setNewNote({ ...newNote, note: e.target.value })}
                  placeholder="Enter note content..."
                  rows={6}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Attach Photos</label>
                <div
                  onDrop={(e) => {
                    e.preventDefault();
                    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                    if (files.length > 0) handleFileUpload(files, (updater) => {
                      const newUrls = typeof updater === 'function' ? updater(newNote.file_urls || []) : updater;
                      setNewNote({ ...newNote, file_urls: newUrls });
                    });
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors"
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files);
                      if (files.length > 0) handleFileUpload(files, (updater) => {
                        const newUrls = typeof updater === 'function' ? updater(newNote.file_urls || []) : updater;
                        setNewNote({ ...newNote, file_urls: newUrls });
                      });
                    }}
                    className="hidden"
                    id="note-file-upload"
                  />
                  <label htmlFor="note-file-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">Drop images here or click to upload</p>
                  </label>
                </div>
                {Array.isArray(newNote.file_urls) && newNote.file_urls.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {newNote.file_urls.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img src={url} alt={`Upload ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                        <button
                          onClick={() => setNewNote({ ...newNote, file_urls: newNote.file_urls.filter((_, i) => i !== idx) })}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowAddNote(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => createNoteMutation.mutate({
                    staff_id: staffId,
                    staff_name: staffMember?.preferred_name || staffMember?.legal_full_name,
                    note: newNote.note,
                    note_type: newNote.note_type,
                    file_urls: newNote.file_urls,
                    author_id: user?.id,
                    author_name: user?.full_name
                  })}
                  disabled={!newNote.note || createNoteMutation.isPending || uploading}
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  {uploading ? 'Uploading...' : 'Add Note'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AnimatePresence>
  );
}