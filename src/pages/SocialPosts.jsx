import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Plus,
  Search,
  Filter,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import PostCard from '@/components/social/PostCard';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const brandLabels = {
  brad_personal: 'Brad\'s Instagram',
  brads_youtube: 'Brad\'s YouTube',
  lifestyle_production_group: 'Lifestyle Production',
  windowstill: 'WindowStill',
};

const statusLabels = {
  needs_assigned: 'Needs Assigned',
  editing: 'Editing',
  waiting_on_cta: 'Waiting on CTA',
  waiting_on_caption: 'Waiting on Caption',
  ready_to_post: 'Ready to Post',
  posted: 'Posted',
};

export default function SocialPosts({ user }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    brand: 'windowstill',
    scheduled_date: '',
    content_status: 'needs_assigned',
    ai_platform: '',
    original_video_link: '',
    department: 'social'
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['social-posts'],
    queryFn: () => base44.entities.SocialPost.filter({ department: 'social' }, '-created_date', 500)
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const socialUsers = users.filter(u => 
    u.departments?.includes('social') || u.role === 'admin'
  );

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SocialPost.create({
      ...data,
      creator_id: user?.id,
      creator_name: user?.full_name
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      setShowNewPost(false);
      setNewPost({
        title: '',
        brand: 'windowstill',
        scheduled_date: '',
        content_status: 'needs_assigned',
        ai_platform: '',
        original_video_link: '',
        department: 'social'
      });
    }
  });

  const filteredPosts = posts.filter(post => {
    const matchesSearch = !search || 
      post.title?.toLowerCase().includes(search.toLowerCase());
    const matchesBrand = brandFilter === 'all' || post.brand === brandFilter;
    const matchesStatus = statusFilter === 'all' || post.content_status === statusFilter;
    
    return matchesSearch && matchesBrand && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">All Posts</h1>
          <p className="text-slate-600 mt-2">{posts.length} total posts</p>
        </div>
        <Button
          onClick={() => setShowNewPost(true)}
          className="bg-violet-600 hover:bg-violet-700 shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Post
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-slate-200 shadow-lg hover:shadow-xl transition-shadow duration-300"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            <SelectItem value="brad_personal">Brad's Instagram</SelectItem>
            <SelectItem value="brads_youtube">Brad's YouTube</SelectItem>
            <SelectItem value="lifestyle_production_group">Lifestyle Production</SelectItem>
            <SelectItem value="windowstill">WindowStill</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="needs_assigned">Needs Assigned</SelectItem>
            <SelectItem value="editing">Editing</SelectItem>
            <SelectItem value="waiting_on_cta">Waiting on CTA</SelectItem>
            <SelectItem value="waiting_on_caption">Waiting on Caption</SelectItem>
            <SelectItem value="ready_to_post">Ready to Post</SelectItem>
            <SelectItem value="posted">Posted</SelectItem>
          </SelectContent>
        </Select>

      </motion.div>

      {/* Posts Grid/List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-violet-600 rounded-full animate-spin" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p>No posts found</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: index * 0.02 }}
              >
                <PostCard post={post} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* New Post Dialog */}
      <Dialog open={showNewPost} onOpenChange={setShowNewPost}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Title *</label>
              <Input
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                placeholder="Post title"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Brand *</label>
              <Select 
                value={newPost.brand} 
                onValueChange={(v) => setNewPost({ ...newPost, brand: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brad_personal">Brad's Instagram</SelectItem>
                  <SelectItem value="brads_youtube">Brad's YouTube</SelectItem>
                  <SelectItem value="lifestyle_production_group">Lifestyle Production</SelectItem>
                  <SelectItem value="windowstill">WindowStill</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Scheduled Date</label>
              <Input
                type="date"
                value={newPost.scheduled_date}
                onChange={(e) => setNewPost({ ...newPost, scheduled_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Content Status</label>
              <Select 
                value={newPost.content_status} 
                onValueChange={(v) => setNewPost({ ...newPost, content_status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="needs_assigned">Needs Assigned</SelectItem>
                  <SelectItem value="editing">Editing</SelectItem>
                  <SelectItem value="waiting_on_cta">Waiting on CTA</SelectItem>
                  <SelectItem value="waiting_on_caption">Waiting on Caption</SelectItem>
                  <SelectItem value="ready_to_post">Ready to Post</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">AI Platform</label>
              <Input
                value={newPost.ai_platform}
                onChange={(e) => setNewPost({ ...newPost, ai_platform: e.target.value })}
                placeholder="e.g., Midjourney, Runway"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Original Video Link</label>
              <Input
                value={newPost.original_video_link}
                onChange={(e) => setNewPost({ ...newPost, original_video_link: e.target.value })}
                placeholder="URL to original video"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowNewPost(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createMutation.mutate(newPost)}
                disabled={createMutation.isPending || !newPost.title}
                className="bg-violet-600 hover:bg-violet-700"
              >
                Create Post
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}