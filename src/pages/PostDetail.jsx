import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { formatInEST } from '../components/dateFormatter';
import {
  ArrowLeft,
  Calendar,
  User,
  Video,
  Link as LinkIcon,
  Upload,
  CheckCircle,
  Plus,
  Trash2,
  FileText,
  Image,
  Film,
  Download,
  X,
  Sparkles,
  AlertCircle,
  Edit3,
  Clock,
  MessageSquare,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Component to handle signed URL generation and media display
function MediaPreview({ asset, onClose }) {
  const [signedUrl, setSignedUrl] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const fetchSignedUrl = async () => {
      try {
        const response = await base44.functions.invoke('getSignedUrl', { file_key: asset.file_url });
        setSignedUrl(response.data.signed_url);
      } catch (error) {
        console.error('Failed to get signed URL:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [asset.file_url]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-600 border-t-violet-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-slate-400">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">Failed to load preview</p>
          {error && <p className="text-sm">{error}</p>}
        </div>
      </div>
    );
  }

  const isImage = asset.asset_type === 'thumbnail' || asset.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isVideo = asset.asset_type === 'raw_clip' || asset.asset_type === 'final_export' || asset.name?.match(/\.(mp4|mov|avi|webm)$/i);
  const isPDF = asset.asset_type === 'pdf' || asset.name?.match(/\.pdf$/i);

  if (isImage) {
    return (
      <div className="flex items-center justify-center w-full h-full p-8">
        <img 
          src={signedUrl} 
          alt={asset.name} 
          className="max-w-full max-h-full object-contain"
        />
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="flex items-center justify-center w-full h-full p-8">
        <video 
          src={signedUrl} 
          controls 
          className="max-w-full max-h-full"
          style={{ width: 'auto', height: 'auto' }}
        />
      </div>
    );
  }

  if (isPDF) {
    return (
      <div className="flex items-center justify-center w-full h-full p-8">
        <iframe 
          src={`${signedUrl}#view=FitH`}
          className="w-full h-full border-0 rounded-lg"
          style={{ maxWidth: '100%', maxHeight: '100%' }}
          title={asset.name}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center text-slate-400">
        <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-lg mb-2">Preview not available</p>
        <p className="text-sm">{asset.name}</p>
      </div>
    </div>
  );
}

// Component to handle download with signed URL
function DownloadButton({ asset }) {
  const [downloading, setDownloading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('getSignedUrl', { 
        file_key: asset.file_url,
        force_download: true 
      });

      if (!response?.data?.signed_url) {
        throw new Error('No signed URL returned from server');
      }

      const downloadUrl = response.data.signed_url;

      // Create invisible iframe to trigger download without navigation
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      iframe.src = downloadUrl;

      // Remove iframe after a short delay
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 2000);
    } catch (error) {
      console.error('Download failed:', error);
      const errorMessage = error?.response?.data?.error || error?.message || error?.toString() || 'Unknown error';
      setError(errorMessage);
      alert(`Download failed: ${errorMessage}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex justify-end gap-2 mt-4">
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white rounded-lg transition-colors"
      >
        <Download className="w-4 h-4" />
        {downloading ? 'Preparing...' : 'Download'}
      </button>
    </div>
  );
}

const defaultStatusIcons = {
  needs_assigned: AlertCircle,
  editing: Edit3,
  waiting_on_cta: Clock,
  waiting_on_caption: MessageSquare,
  ready_to_post: Send,
  posted: CheckCircle
};

const assetTypeIcons = {
  raw_clip: Film,
  project_file: FileText,
  final_export: Video,
  thumbnail: Image,
  caption_doc: FileText,
  pdf: FileText,
  other: FileText,
};

export default function PostDetail({ user }) {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');


  const [showAssetDialog, setShowAssetDialog] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '',
    asset_type: 'raw_clip',
    file_url: '',
    department: 'social'
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadLoaded, setUploadLoaded] = useState(0);
  const [newNote, setNewNote] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewAsset, setPreviewAsset] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [assetToDelete, setAssetToDelete] = useState(null);

  const { data: post, isLoading: loadingPost, error: postError } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      if (!postId) throw new Error('No post ID provided');
      const posts = await base44.entities.SocialPost.filter({ id: postId });
      if (!posts || posts.length === 0) throw new Error('Post not found');
      return posts[0];
    },
    enabled: !!postId && !!user,
    retry: false
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets', postId],
    queryFn: () => base44.entities.Asset.filter({ social_post_id: postId }),
    enabled: !!postId && !!user && !!post
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['post-notes', postId],
    queryFn: () => base44.entities.Note.filter({ 
      related_to_type: 'social_post', 
      related_to_id: postId 
    }, '-created_date'),
    enabled: !!postId && !!user && !!post
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user
  });

  const socialUsers = users.filter(u => 
    u.departments?.includes('social') || u.role === 'admin'
  );

  const { data: appSettings = [] } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => base44.entities.AppSetting.filter({ is_active: true }, 'sort_order'),
    enabled: !!user
  });

  const brands = appSettings.filter(s => s.setting_type === 'brand');
  const aiPlatforms = appSettings.filter(s => s.setting_type === 'ai_platform');
  const contentStatuses = appSettings.filter(s => s.setting_type === 'content_status');

  const brandLabels = brands.reduce((acc, b) => ({ ...acc, [b.value]: b.label }), {});
  const statusConfig = contentStatuses.reduce((acc, s) => {
    // Get icon component from lucide-react based on stored icon name
    const iconMap = {
      AlertCircle, Edit3, Clock, MessageSquare, Send, CheckCircle
    };
    const IconComponent = s.icon ? iconMap[s.icon] : defaultStatusIcons[s.value];
    
    return {
      ...acc,
      [s.value]: {
        label: s.label,
        color: `${s.color} text-${s.color.replace('bg-', '').replace('-100', '-700')} border-${s.color.replace('bg-', '').replace('-100', '-200')}`,
        icon: IconComponent || AlertCircle
      }
    };
  }, {});

  const updatePostMutation = useMutation({
    mutationFn: (data) => base44.entities.SocialPost.update(postId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      setEditingTitle(false);
    }
  });

  const createAssetMutation = useMutation({
    mutationFn: (data) => base44.entities.Asset.create({
      ...data,
      social_post_id: postId,
      uploaded_by_id: user?.id,
      uploaded_by_name: user?.full_name
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', postId] });
      setShowAssetDialog(false);
      setNewAsset({ name: '', asset_type: 'raw_clip', file_url: '', department: 'social' });
    }
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async ({ id, file_url }) => {
      // Delete from S3 first
      if (file_url) {
        await base44.functions.invoke('deleteFromS3', { file_key: file_url });
      }
      // Then delete from database
      await base44.entities.Asset.delete(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets', postId] })
  });

  const createNoteMutation = useMutation({
    mutationFn: (content) => base44.entities.Note.create({
      content,
      related_to_type: 'social_post',
      related_to_id: postId,
      author_id: user?.id,
      author_name: user?.full_name,
      department: 'social'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-notes', postId] });
      setNewNote('');
    }
  });

  const handleFileUpload = async (file) => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadTotal(file.size);
    setUploadLoaded(0);
    
    try {
      // First upload to Base44's built-in storage
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setUploadProgress(50);
      
      // Then copy to S3 by invoking backend function
      const s3Response = await base44.functions.invoke('uploadToS3', {
        source_url: file_url,
        folder: 'socialmedia',
        file_name: file.name,
        content_type: file.type
      });
      
      const fileKey = s3Response.data.file_key;
      
      setUploadProgress(100);
      
      // Auto-detect asset type based on file type
      let assetType = 'other';
      if (file.type.startsWith('video/')) assetType = 'raw_clip';
      else if (file.type.startsWith('image/')) assetType = 'thumbnail';
      else if (file.type === 'application/pdf') assetType = 'pdf';
      
      // Create asset with S3 key
      await createAssetMutation.mutateAsync({
        name: file.name,
        asset_type: assetType,
        file_url: fileKey,
        social_post_id: postId,
        uploaded_by_id: user?.id,
        uploaded_by_name: user?.full_name,
        department: 'social'
      });
    } catch (error) {
      console.error('Upload failed:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      alert(`Upload failed: ${errorMessage}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadLoaded(0);
      setUploadTotal(0);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };



  if (!user || loadingPost) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (postError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-medium mb-2">Error loading post</p>
        <p className="text-slate-500 text-sm mb-4">{postError?.message}</p>
        <Link to={createPageUrl('SocialDashboard')} className="text-violet-600 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-2">Post not found</p>
        <p className="text-slate-400 text-sm mb-4">This post may not exist or you don't have access to it</p>
        <Link to={createPageUrl('SocialDashboard')} className="text-violet-600 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const status = statusConfig[post.content_status] || statusConfig.needs_assigned;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back Button */}
      <Link 
        to={createPageUrl('SocialDashboard')}
        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Post Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-start justify-between">
            <div className="flex-1">
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-2xl font-bold h-12"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updatePostMutation.mutate({ title: editedTitle });
                      } else if (e.key === 'Escape') {
                        setEditingTitle(false);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => updatePostMutation.mutate({ title: editedTitle })}
                    disabled={!editedTitle.trim()}
                    className="bg-violet-600 hover:bg-violet-700"
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingTitle(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-900">{post.title}</h1>
                  <button
                    onClick={() => {
                      setEditedTitle(post.title);
                      setEditingTitle(true);
                    }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              )}
              <p className="text-slate-500 mt-1">{brandLabels[post.brand]}</p>
            </div>
          <Select 
            value={post.content_status} 
            onValueChange={(v) => updatePostMutation.mutate({ content_status: v })}
          >
            <SelectTrigger className={cn("h-9 w-52 border", status?.color || 'bg-slate-100')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {contentStatuses.map(s => (
                <SelectItem key={s.value} value={s.value}>
                  <div className="flex items-center gap-2">
                    {React.createElement(statusConfig[s.value]?.icon || AlertCircle, { className: "w-4 h-4" })}
                    <span>{s.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Post Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-slate-100">
          <div>
            <div className="text-sm text-slate-500 flex items-center gap-1 mb-2">
              <Calendar className="w-4 h-4" />
              Scheduled
            </div>
            <Input
              type="date"
              value={post.scheduled_date || ''}
              onChange={(e) => updatePostMutation.mutate({ scheduled_date: e.target.value })}
              className="h-9"
            />
          </div>
          <div>
            <div className="text-sm text-slate-500 mb-2">
              Assigned To
            </div>
            <Select 
              value={post.assigned_to_id || ''} 
              onValueChange={(v) => {
                const selectedUser = socialUsers.find(u => u.id === v);
                updatePostMutation.mutate({ 
                  assigned_to_id: v,
                  assigned_to_name: selectedUser?.full_name
                });
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {socialUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-sm text-slate-500 flex items-center gap-1 mb-2">
              <Sparkles className="w-4 h-4" />
              AI Platform
            </div>
            <Select
              value={post.ai_platform || ''}
              onValueChange={(v) => updatePostMutation.mutate({ ai_platform: v })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select platform..." />
              </SelectTrigger>
              <SelectContent>
                {aiPlatforms.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-sm text-slate-500 flex items-center gap-1 mb-2">
              <CheckCircle className="w-4 h-4" />
              Posted
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Checkbox
                checked={post.posted || false}
                onCheckedChange={(checked) => updatePostMutation.mutate({ 
                  posted: checked,
                  posted_at: checked ? new Date().toISOString() : null,
                  content_status: checked ? 'posted' : 'ready_to_post'
                })}
                id="posted-checkbox"
              />
              <label htmlFor="posted-checkbox" className="text-sm text-slate-600 cursor-pointer">
                {post.posted && post.posted_at
                  ? format(new Date(post.posted_at), 'MMM d, yyyy')
                  : 'Mark as posted'
                }
              </label>
            </div>
          </div>
        </div>

        {/* Original Video Link */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <label className="text-sm text-slate-500 flex items-center gap-1 mb-2">
            <LinkIcon className="w-4 h-4" />
            Original Video Link
          </label>
          <div className="flex gap-2">
            <Input
              type="url"
              value={post.original_video_link || ''}
              onChange={(e) => updatePostMutation.mutate({ original_video_link: e.target.value })}
              placeholder="https://instagram.com/..."
              className="h-9"
            />
            {post.original_video_link && (
              <a 
                href={post.original_video_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-3 h-9 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center text-violet-600"
              >
                <LinkIcon className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Files & Media</h2>
          </div>
          <div className="p-4 space-y-3">
            {/* Drag and Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer",
                dragActive ? "border-violet-500 bg-violet-50" : "border-slate-200 hover:border-slate-300",
                uploading && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => !uploading && document.getElementById('asset-file-input').click()}
            >
              <input
                id="asset-file-input"
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file);
                    e.target.value = '';
                  }
                }}
                disabled={uploading}
              />
              {uploading ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-slate-200 border-t-violet-600 rounded-full animate-spin" />
                    <p className="text-sm text-slate-600 font-medium">
                      Uploading... {Math.round(uploadProgress)}%
                    </p>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-violet-600 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 text-center">
                    {(uploadLoaded / 1024 / 1024).toFixed(2)} MB / {(uploadTotal / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <p className="text-sm text-slate-600">
                    Drag and drop files here, or click to browse
                  </p>
                </div>
              )}
            </div>

            {/* Assets List */}
            {assets.length > 0 && (
              <div className="space-y-2">
                {assets.map(asset => {
                  const Icon = assetTypeIcons[asset.asset_type] || FileText;
                  const isImage = asset.asset_type === 'thumbnail' || asset.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                  const isVideo = asset.asset_type === 'raw_clip' || asset.asset_type === 'final_export' || asset.name?.match(/\.(mp4|mov|avi|webm)$/i);
                  const isPDF = asset.asset_type === 'pdf' || asset.name?.match(/\.pdf$/i);
                  const isPreviewable = isImage || isVideo || isPDF;

                  return (
                    <div 
                      key={asset.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer"
                      onClick={() => asset.file_url && isPreviewable && setPreviewAsset(asset)}
                    >
                      <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 truncate">{asset.name}</div>
                        <div className="text-sm text-slate-500 capitalize">
                          {asset.asset_type?.replace(/_/g, ' ')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {asset.file_url && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const response = await base44.functions.invoke('getSignedUrl', { 
                                  file_key: asset.file_url,
                                  force_download: true 
                                });

                                if (!response?.data?.signed_url) {
                                  throw new Error('No signed URL returned');
                                }

                                const downloadUrl = response.data.signed_url;

                                // Create invisible iframe to trigger download
                                const iframe = document.createElement('iframe');
                                iframe.style.display = 'none';
                                document.body.appendChild(iframe);
                                iframe.src = downloadUrl;

                                setTimeout(() => {
                                  document.body.removeChild(iframe);
                                }, 2000);
                              } catch (error) {
                                const errorMessage = error?.response?.data?.error || error?.message || 'Unknown error';
                                alert('Download failed: ' + errorMessage);
                              }
                            }}
                            className="p-2 rounded-lg hover:bg-violet-100 text-violet-600 hover:text-violet-700 transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssetToDelete(asset);
                          }}
                          className="p-2 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Comments/Notes */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Comments</h2>
          </div>
          <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
            {notes.map(note => (
              <div key={note.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-sm font-medium shrink-0">
                  {note.author_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{note.author_name}</span>
                    <span className="text-xs text-slate-400">
                      {formatInEST(note.created_date)}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1 text-sm">{note.content}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-100">
            <div className="flex gap-2">
              <Input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a comment..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newNote.trim()) {
                    createNoteMutation.mutate(newNote);
                  }
                }}
              />
              <Button
                onClick={() => newNote.trim() && createNoteMutation.mutate(newNote)}
                disabled={!newNote.trim()}
                className="bg-violet-600 hover:bg-violet-700"
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Media Preview Dialog - Full Screen */}
      {previewAsset && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex flex-col"
          onClick={() => setPreviewAsset(null)}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
            <div className="text-white">
              <h3 className="font-semibold text-lg">{previewAsset.name}</h3>
              <p className="text-sm text-slate-300 capitalize">{previewAsset.asset_type?.replace(/_/g, ' ')}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const response = await base44.functions.invoke('getSignedUrl', { 
                      file_key: previewAsset.file_url,
                      force_download: true 
                    });

                    if (!response?.data?.signed_url) {
                      throw new Error('No signed URL returned');
                    }

                    const iframe = document.createElement('iframe');
                    iframe.style.display = 'none';
                    document.body.appendChild(iframe);
                    iframe.src = response.data.signed_url;

                    setTimeout(() => {
                      document.body.removeChild(iframe);
                    }, 2000);
                  } catch (error) {
                    alert('Download failed: ' + (error?.message || 'Unknown error'));
                  }
                }}
                className="p-3 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPreviewAsset(null)}
                className="p-3 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Preview Content */}
          <div 
            className="flex-1 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <MediaPreview asset={previewAsset} onClose={() => setPreviewAsset(null)} />
          </div>
        </div>
      )}

      {/* Delete Asset Confirmation Dialog */}
      <Dialog open={!!assetToDelete} onOpenChange={() => setAssetToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-slate-600">
              Are you sure you want to delete <span className="font-semibold">{assetToDelete?.name}</span>? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setAssetToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  deleteAssetMutation.mutate({ id: assetToDelete.id, file_url: assetToDelete.file_url });
                  setAssetToDelete(null);
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}