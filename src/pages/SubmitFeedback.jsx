import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, X, MessageSquare, CheckCircle, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SubmitFeedback({ user, currentApp }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Feature Request',
    app_id: 'sales',
    department: '',
    page_link: ''
  });
  const [screenshots, setScreenshots] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Determine which apps user has access to
  const userApps = [];
  if (user?.role === 'admin') {
    userApps.push({ id: 'admin', label: 'Admin' });
  }
  if (user?.departments?.includes('sales') || user?.role === 'admin') {
    userApps.push({ id: 'sales', label: 'Sales' });
  }
  if (user?.departments?.includes('social') || user?.role === 'admin') {
    userApps.push({ id: 'social', label: 'Social' });
  }
  if (user?.departments?.includes('tasks') || user?.role === 'admin') {
    userApps.push({ id: 'tasks', label: 'Tasks' });
  }
  if (user?.departments?.includes('customer_service') || user?.role === 'admin') {
    userApps.push({ id: 'customer_service', label: 'Customer Service' });
  }
  if (user?.departments?.includes('training') || user?.role === 'admin') {
    userApps.push({ id: 'training', label: 'Training' });
  }
  if (user?.departments?.includes('equipment') || user?.role === 'admin') {
    userApps.push({ id: 'equipment', label: 'Equipment' });
  }
  if (user?.departments?.includes('hr_accounting') || user?.role === 'admin') {
    userApps.push({ id: 'hr_accounting', label: 'HR/Accounting' });
  }

  // Fetch departments from HR settings
  const { data: departments = [] } = useQuery({
    queryKey: ['hr-departments'],
    queryFn: async () => {
      const settings = await base44.entities.AppSetting.filter({ setting_type: 'hr_department' }, 'sort_order');
      return settings;
    }
  });

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Feedback.create({
        ...data,
        screenshot_urls: screenshots,
        submitted_by_id: user?.id,
        submitted_by_name: user?.full_name,
        status: 'New'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      setSubmitted(true);
      toast.success('Feedback submitted successfully!');
      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({
          title: '',
          description: '',
          category: 'Feature Request',
          app_id: userApps[0]?.id || 'sales',
          department: '',
          page_link: ''
        });
        setScreenshots([]);
        setSubmitted(false);
      }, 2000);
    },
    onError: () => {
      toast.error('Failed to submit feedback');
    }
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      setScreenshots([...screenshots, ...urls]);
      toast.success(`${files.length} screenshot(s) uploaded`);
    } catch (error) {
      toast.error('Failed to upload screenshots');
    } finally {
      setUploading(false);
    }
  };

  const removeScreenshot = (index) => {
    setScreenshots(screenshots.filter((_, i) => i !== index));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (droppedFiles.length > 0) {
      handleFileUpload({ target: { files: droppedFiles } });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }
    submitMutation.mutate(formData);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h2>
          <p className="text-slate-600">
            Your feedback has been submitted successfully. We appreciate your input!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Submit Feedback</h1>
            <p className="text-slate-500 mt-1">
              Help us improve by reporting bugs or suggesting new features
            </p>
          </div>
          <Link to={createPageUrl('PlatformFeedback')}>
            <Button variant="outline" className="gap-2">
              <List className="w-4 h-4" />
              View All Feedback
            </Button>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-8">
        <div className="space-y-6">
          {/* Category */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Category *
            </label>
            <Select
              value={formData.category}
              onValueChange={(v) => setFormData({ ...formData, category: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bug Report">🐛 Bug Report</SelectItem>
                <SelectItem value="Feature Request">✨ Feature Request</SelectItem>
                <SelectItem value="UI/UX Improvement">🎨 UI/UX Improvement</SelectItem>
                <SelectItem value="Other">💬 Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* App Selection */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Which App? *
            </label>
            <Select
              value={formData.app_id}
              onValueChange={(v) => setFormData({ ...formData, app_id: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {userApps.map(app => (
                  <SelectItem key={app.id} value={app.id}>
                    {app.label}
                  </SelectItem>
                ))}
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Department Selection */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Department (Optional)
            </label>
            <Select
              value={formData.department}
              onValueChange={(v) => setFormData({ ...formData, department: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department..." />
              </SelectTrigger>
              <SelectContent>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.value}>
                    {dept.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Title *
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief summary of your feedback..."
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Description *
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide detailed information about the issue or suggestion..."
              rows={6}
              className="resize-none"
              required
            />
          </div>

          {/* Page Link */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Page/Screen Name (Optional)
            </label>
            <Input
              value={formData.page_link}
              onChange={(e) => setFormData({ ...formData, page_link: e.target.value })}
              placeholder="e.g., Sales Dashboard, Lead Detail Page"
            />
          </div>

          {/* Screenshots */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Screenshots (Optional)
            </label>
            <div className="space-y-3">
              <label
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                  uploading ? "border-slate-200 bg-slate-50" : "border-slate-300 hover:border-slate-400 hover:bg-slate-50",
                  isDraggingOver && "border-emerald-500 bg-emerald-50"
                )}
              >
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-sm text-slate-600">
                  {uploading ? 'Uploading...' : 'Drag & drop or click to upload screenshots'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>

              {screenshots.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {screenshots.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeScreenshot(index)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="submit"
              disabled={submitMutation.isPending}
              className={cn(
                "px-8",
                currentApp === 'sales' && "bg-emerald-600 hover:bg-emerald-700",
                currentApp === 'social' && "bg-violet-600 hover:bg-violet-700",
                currentApp === 'tasks' && "bg-blue-600 hover:bg-blue-700",
                currentApp === 'schedule' && "bg-purple-600 hover:bg-purple-700",
                currentApp === 'customer_service' && "bg-cyan-600 hover:bg-cyan-700",
                currentApp === 'training' && "bg-indigo-600 hover:bg-indigo-700",
                currentApp === 'equipment' && "bg-orange-600 hover:bg-orange-700",
                currentApp === 'editors' && "bg-fuchsia-600 hover:bg-fuchsia-700",
                currentApp === 'hr_accounting' && "bg-rose-600 hover:bg-rose-700",
                currentApp === 'admin' && "bg-slate-600 hover:bg-slate-700",
                (!currentApp || currentApp === 'home') && "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}