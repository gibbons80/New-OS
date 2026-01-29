import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Camera, Instagram, Linkedin, Facebook, Lock, ChevronRight, Grid3x3, Home, TrendingUp, Video, CheckCircle, Calendar, MessageCircle, GraduationCap, Wrench, Film, Briefcase, Shield } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import AddressAutocomplete from '@/components/cs/AddressAutocomplete';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function UserSettings({ user, currentApp = 'home' }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');

  // App-specific color themes
  const appThemes = {
    sales: {
      gradient: 'from-emerald-500 to-emerald-600',
      hover: 'hover:from-emerald-600 hover:to-emerald-700',
      border: 'border-emerald-100',
      bg: 'bg-emerald-600 hover:bg-emerald-700',
      icon: 'bg-emerald-600 hover:bg-emerald-700'
    },
    social: {
      gradient: 'from-violet-500 to-violet-600',
      hover: 'hover:from-violet-600 hover:to-violet-700',
      border: 'border-violet-100',
      bg: 'bg-violet-600 hover:bg-violet-700',
      icon: 'bg-violet-600 hover:bg-violet-700'
    },
    tasks: {
      gradient: 'from-blue-500 to-blue-600',
      hover: 'hover:from-blue-600 hover:to-blue-700',
      border: 'border-blue-100',
      bg: 'bg-blue-600 hover:bg-blue-700',
      icon: 'bg-blue-600 hover:bg-blue-700'
    },
    schedule: {
      gradient: 'from-violet-500 to-violet-600',
      hover: 'hover:from-violet-600 hover:to-violet-700',
      border: 'border-violet-100',
      bg: 'bg-violet-600 hover:bg-violet-700',
      icon: 'bg-violet-600 hover:bg-violet-700'
    },
    customer_service: {
      gradient: 'from-cyan-500 to-cyan-600',
      hover: 'hover:from-cyan-600 hover:to-cyan-700',
      border: 'border-cyan-100',
      bg: 'bg-cyan-600 hover:bg-cyan-700',
      icon: 'bg-cyan-600 hover:bg-cyan-700'
    },
    training: {
      gradient: 'from-indigo-500 to-indigo-600',
      hover: 'hover:from-indigo-600 hover:to-indigo-700',
      border: 'border-indigo-100',
      bg: 'bg-indigo-600 hover:bg-indigo-700',
      icon: 'bg-indigo-600 hover:bg-indigo-700'
    },
    equipment: {
      gradient: 'from-orange-500 to-orange-600',
      hover: 'hover:from-orange-600 hover:to-orange-700',
      border: 'border-orange-100',
      bg: 'bg-orange-600 hover:bg-orange-700',
      icon: 'bg-orange-600 hover:bg-orange-700'
    },
    editors: {
      gradient: 'from-purple-500 to-purple-600',
      hover: 'hover:from-purple-600 hover:to-purple-700',
      border: 'border-purple-100',
      bg: 'bg-purple-600 hover:bg-purple-700',
      icon: 'bg-purple-600 hover:bg-purple-700'
    },
    hr_accounting: {
      gradient: 'from-rose-500 to-rose-600',
      hover: 'hover:from-rose-600 hover:to-rose-700',
      border: 'border-rose-100',
      bg: 'bg-rose-600 hover:bg-rose-700',
      icon: 'bg-rose-600 hover:bg-rose-700'
    },
    admin: {
      gradient: 'from-slate-500 to-slate-600',
      hover: 'hover:from-slate-600 hover:to-slate-700',
      border: 'border-slate-100',
      bg: 'bg-slate-600 hover:bg-slate-700',
      icon: 'bg-slate-600 hover:bg-slate-700'
    },
    home: {
      gradient: 'from-emerald-500 to-emerald-600',
      hover: 'hover:from-emerald-600 hover:to-emerald-700',
      border: 'border-emerald-100',
      bg: 'bg-emerald-600 hover:bg-emerald-700',
      icon: 'bg-emerald-600 hover:bg-emerald-700'
    }
  };

  const theme = appThemes[currentApp] || appThemes.home;
  const [userData, setUserData] = useState({
    profile_photo_url: user?.profile_photo_url || '',
    phone: user?.phone || '',
    personal_email: user?.personal_email || '',
    address: user?.address || '',
    bio: user?.bio || '',
    emergency_contact_name: user?.emergency_contact_name || '',
    emergency_contact_phone: user?.emergency_contact_phone || '',
    emergency_contact_relationship: user?.emergency_contact_relationship || '',
    instagram_link: user?.instagram_link || '',
    linkedin_link: user?.linkedin_link || '',
    facebook_link: user?.facebook_link || '',
    tiktok_link: user?.tiktok_link || ''
  });
  const [uploading, setUploading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe(data);
      // Sync user changes to linked staff record, passing the fresh data
      await base44.functions.invoke('syncUserToStaff', { userData: data });
    },
    onSuccess: async () => {
      // Refetch current user to ensure latest data is displayed
      const freshUser = await base44.auth.me();
      queryClient.setQueryData(['current-user'], freshUser);
      queryClient.invalidateQueries({ queryKey: ['staff'] }); // Refetch all staff records
      toast.success('Profile updated successfully');
    },
    onError: () => {
      toast.error('Failed to update profile');
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }) => {
      // Note: This is a placeholder - adjust based on your actual base44 API
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      if (!response.ok) throw new Error('Failed to change password');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to change password');
    }
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const updatedData = { ...userData, profile_photo_url: file_url };
      setUserData(updatedData);
      // Sync photo update immediately to staff
      await base44.auth.updateMe({ profile_photo_url: file_url });
      await base44.functions.invoke('syncUserToStaff', { userData: { profile_photo_url: file_url } });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Photo uploaded and synced');
    } catch (error) {
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    updateMutation.mutate(userData);
  };

  const handlePasswordChange = () => {
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.new_password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordData.current_password,
      newPassword: passwordData.new_password
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(appOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setAppOrder(items);
    updateMutation.mutate({ app_order: items });
  };

  const tabs = [
    { id: 'profile', label: 'Profile Settings', icon: User },
    { id: 'password', label: 'Change Password', icon: Lock },
    { id: 'apps', label: 'App Switcher', icon: Grid3x3 }
  ];

  const allApps = [
    { id: 'home', label: 'Home', icon: Home, color: 'from-slate-400 to-slate-600' },
    { id: 'sales', label: 'Sales', icon: TrendingUp, color: 'from-emerald-400 to-emerald-600' },
    { id: 'social', label: 'Social Media', icon: Video, color: 'from-violet-400 to-violet-600' },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle, color: 'from-blue-400 to-blue-600' },
    { id: 'schedule', label: 'Schedule', icon: Calendar, color: 'from-purple-400 to-purple-600' },
    { id: 'customer_service', label: 'Customer Service', icon: MessageCircle, color: 'from-cyan-400 to-cyan-600' },
    { id: 'training', label: 'Training', icon: GraduationCap, color: 'from-indigo-400 to-indigo-600' },
    { id: 'equipment', label: 'Equipment', icon: Wrench, color: 'from-orange-400 to-orange-600' },
    { id: 'editors', label: 'Editors', icon: Film, color: 'from-purple-400 to-purple-600' },
    { id: 'hr_accounting', label: 'HR/Accounting', icon: Briefcase, color: 'from-rose-400 to-rose-600' },
    { id: 'admin', label: 'Admin', icon: Shield, color: 'from-slate-400 to-slate-600' }
  ];

  const userDepartments = user?.departments || [];
  const isAdmin = user?.role === 'admin';
  const accessibleApps = allApps.filter(app => {
    if (app.id === 'home') return true;
    if (app.id === 'admin') return isAdmin;
    return isAdmin || userDepartments.includes(app.id);
  });

  const [appOrder, setAppOrder] = React.useState(() => {
    const saved = user?.app_order;
    const accessibleIds = accessibleApps.map(app => app.id);
    
    if (saved && Array.isArray(saved)) {
      // Start with saved order, filtered to only accessible apps
      const validSaved = saved.filter(id => accessibleIds.includes(id));
      // Add any new accessible apps that aren't in saved order
      const newApps = accessibleIds.filter(id => !validSaved.includes(id));
      return [...validSaved, ...newApps];
    }
    return accessibleIds;
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1 text-sm md:text-base">Manage your account and preferences</p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full lg:w-64 shrink-0"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-3 shadow-lg">
            <nav className="space-y-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                      activeTab === tab.id
                        ? `bg-gradient-to-r ${theme.gradient} text-white shadow-lg`
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {activeTab === tab.id && (
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </motion.div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
        {activeTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-6 md:p-8 shadow-lg"
          >
            {/* Profile Photo */}
            <div className="mb-6 md:mb-8">
              <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-4">Profile Photo</h3>
              <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
                <div className="relative">
                  {userData.profile_photo_url ? (
                    <img
                      src={userData.profile_photo_url}
                      alt="Profile"
                      className={cn("w-20 h-20 md:w-28 md:h-28 rounded-full object-cover shadow-lg border-4", theme.border)}
                    />
                  ) : (
                    <div className={cn("w-20 h-20 md:w-28 md:h-28 rounded-full bg-gradient-to-br flex items-center justify-center shadow-lg border-4", theme.gradient, theme.border)}>
                      <span className="text-2xl md:text-4xl font-bold text-white">
                        {user?.full_name?.charAt(0) || 'U'}
                      </span>
                    </div>
                  )}
                  <label className={cn(
                    "absolute -bottom-2 -right-2 w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-all hover:scale-105",
                    theme.icon,
                    uploading && "opacity-50 cursor-not-allowed"
                  )}>
                    <Camera className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-sm md:text-base text-slate-600 mb-1">
                    {uploading ? 'Uploading...' : 'Click the camera icon to upload a new photo'}
                  </p>
                  <p className="text-xs md:text-sm text-slate-400">JPG, PNG or GIF (max 5MB)</p>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="mb-6 md:mb-8 pb-6 md:pb-8 border-b border-slate-100">
              <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-4">Account Information</h3>
              <div className="grid gap-4">
                <div>
                  <label className="text-xs md:text-sm font-medium text-slate-600 block mb-2">Full Name</label>
                  <Input value={user?.full_name || ''} disabled className="bg-slate-50 border-slate-200 h-10 md:h-11" />
                </div>
                <div>
                  <label className="text-xs md:text-sm font-medium text-slate-600 block mb-2">Email</label>
                  <Input value={user?.email || ''} disabled className="bg-slate-50 border-slate-200 h-10 md:h-11" />
                </div>
              </div>
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs md:text-sm text-blue-700">
                  Contact your administrator to change your name or email
                </p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="mb-6 md:mb-8 pb-6 md:pb-8 border-b border-slate-100">
              <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-4">Contact Information</h3>
              <div className="grid gap-4">
                <div>
                  <label className="text-xs md:text-sm font-medium text-slate-600 block mb-2">Personal Email</label>
                  <Input
                    value={userData.personal_email}
                    onChange={(e) => setUserData({ ...userData, personal_email: e.target.value })}
                    placeholder="personal@example.com"
                    type="email"
                    className="h-10 md:h-11"
                  />
                </div>
                <div>
                  <label className="text-xs md:text-sm font-medium text-slate-600 block mb-2">Phone Number</label>
                  <Input
                    type="tel"
                    value={userData.phone}
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
                      setUserData({ ...userData, phone: formatted });
                    }}
                    placeholder="(555) 123-4567"
                    maxLength="14"
                    className="h-10 md:h-11"
                  />
                </div>
                <div>
                   <label className="text-xs md:text-sm font-medium text-slate-600 block mb-2">Address</label>
                   <AddressAutocomplete
                     value={userData.address}
                     onChange={(value) => setUserData({ ...userData, address: value })}
                     placeholder="123 Main St, City, State 12345"
                   />
                 </div>
              </div>
            </div>

            {/* Bio */}
            <div className="mb-6 md:mb-8 pb-6 md:pb-8 border-b border-slate-100">
              <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-4">Bio</h3>
              <Textarea
                value={userData.bio}
                onChange={(e) => setUserData({ ...userData, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Emergency Contact */}
            <div className="mb-6 md:mb-8 pb-6 md:pb-8 border-b border-slate-100">
              <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-4">Emergency Contact</h3>
              <div className="grid gap-4">
                <div>
                  <label className="text-xs md:text-sm font-medium text-slate-600 block mb-2">Full Name</label>
                  <Input
                    value={userData.emergency_contact_name}
                    onChange={(e) => setUserData({ ...userData, emergency_contact_name: e.target.value })}
                    placeholder="John Doe"
                    className="h-10 md:h-11"
                  />
                </div>
                <div>
                  <label className="text-xs md:text-sm font-medium text-slate-600 block mb-2">Phone Number</label>
                  <Input
                    type="tel"
                    value={userData.emergency_contact_phone}
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
                      setUserData({ ...userData, emergency_contact_phone: formatted });
                    }}
                    placeholder="(555) 987-6543"
                    maxLength="14"
                    className="h-10 md:h-11"
                  />
                </div>
                <div>
                  <label className="text-xs md:text-sm font-medium text-slate-600 block mb-2">Relationship</label>
                  <Input
                    value={userData.emergency_contact_relationship}
                    onChange={(e) => setUserData({ ...userData, emergency_contact_relationship: e.target.value })}
                    placeholder="Spouse, Parent, Sibling, etc."
                    className="h-10 md:h-11"
                  />
                </div>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="space-y-4 mb-6 md:mb-8">
              <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-4">Social Media Links</h3>
              
              <div>
                <label className="text-xs md:text-sm font-medium text-slate-600 flex items-center gap-2 mb-2">
                  <Instagram className="w-4 h-4 text-pink-600" />
                  Instagram
                </label>
                <Input
                  value={userData.instagram_link}
                  onChange={(e) => setUserData({ ...userData, instagram_link: e.target.value })}
                  placeholder="https://instagram.com/username"
                  className="h-10 md:h-11"
                />
              </div>

              <div>
                <label className="text-xs md:text-sm font-medium text-slate-600 flex items-center gap-2 mb-2">
                  <Linkedin className="w-4 h-4 text-blue-600" />
                  LinkedIn
                </label>
                <Input
                  value={userData.linkedin_link}
                  onChange={(e) => setUserData({ ...userData, linkedin_link: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                  className="h-10 md:h-11"
                />
              </div>

              <div>
                <label className="text-xs md:text-sm font-medium text-slate-600 flex items-center gap-2 mb-2">
                  <Facebook className="w-4 h-4 text-blue-700" />
                  Facebook
                </label>
                <Input
                  value={userData.facebook_link}
                  onChange={(e) => setUserData({ ...userData, facebook_link: e.target.value })}
                  placeholder="https://facebook.com/username"
                  className="h-10 md:h-11"
                />
              </div>

              <div>
                <label className="text-xs md:text-sm font-medium text-slate-600 flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                  </svg>
                  TikTok
                </label>
                <Input
                  value={userData.tiktok_link}
                  onChange={(e) => setUserData({ ...userData, tiktok_link: e.target.value })}
                  placeholder="https://tiktok.com/@username"
                  className="h-10 md:h-11"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className={cn("bg-gradient-to-r px-8 h-10 md:h-11 shadow-lg hover:shadow-xl transition-all", theme.gradient, theme.hover)}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </motion.div>
        )}

        {activeTab === 'password' && (
          <motion.div
            key="password"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-6 md:p-8 shadow-lg"
          >
            <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-6">Change Password</h3>
            <div className="grid gap-4 max-w-xl">
              <div>
                <label className="text-xs md:text-sm font-medium text-slate-600 block mb-2">Current Password</label>
                <Input
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  placeholder="Enter current password"
                  className="h-10 md:h-11"
                />
              </div>
              <div>
                <label className="text-xs md:text-sm font-medium text-slate-600 block mb-2">New Password</label>
                <Input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  placeholder="Enter new password (min 8 characters)"
                  className="h-10 md:h-11"
                />
              </div>
              <div>
                <label className="text-xs md:text-sm font-medium text-slate-600 block mb-2">Confirm New Password</label>
                <Input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  placeholder="Confirm new password"
                  className="h-10 md:h-11"
                />
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg max-w-xl">
              <p className="text-xs md:text-sm text-amber-700">
                Your password must be at least 8 characters long and contain a mix of letters and numbers.
              </p>
            </div>

            <div className="flex justify-end mt-6 pt-6 border-t border-slate-100">
              <Button
                onClick={handlePasswordChange}
                disabled={changePasswordMutation.isPending}
                className={cn("bg-gradient-to-r px-8 h-10 md:h-11 shadow-lg hover:shadow-xl transition-all", theme.gradient, theme.hover)}
              >
                {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </motion.div>
        )}

        {activeTab === 'apps' && (
          <motion.div
            key="apps"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-6 md:p-8 shadow-lg"
          >
            <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-2">App Switcher Order</h3>
            <p className="text-xs md:text-sm text-slate-500 mb-6">
              Drag and drop to reorder your apps. This order will be reflected in the app switcher.
            </p>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="apps-order">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2 max-w-xl"
                  >
                    {appOrder.map((appId, index) => {
                      const app = allApps.find(a => a.id === appId);
                      if (!app) return null;

                      return (
                        <Draggable key={appId} draggableId={appId} index={index}>
                          {(provided, snapshot) => {
                            const Icon = app.icon;
                            return (
                              <div
                               ref={provided.innerRef}
                               {...provided.draggableProps}
                               {...provided.dragHandleProps}
                               style={{
                                 ...provided.draggableProps.style,
                                 left: 'auto !important',
                                 top: 'auto !important'
                               }}
                               className={cn(
                                 "flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl transition-all cursor-grab active:cursor-grabbing",
                                 snapshot.isDragging && "shadow-2xl ring-2 ring-blue-400"
                               )}
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <div className={cn(
                                    "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md",
                                    app.color
                                  )}>
                                    <Icon className="w-5 h-5 text-white" />
                                  </div>
                                  <span className="font-medium text-slate-900">{app.label}</span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                                </div>
                              </div>
                            );
                          }}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg max-w-xl">
              <p className="text-xs md:text-sm text-blue-700">
                Changes are saved automatically. Your app order will be updated in the app switcher immediately.
              </p>
            </div>
          </motion.div>
        )}
          </AnimatePresence>
        </div>
        </div>
        </div>
        );
        }