import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { formatInEST } from '@/components/dateFormatter';
import ReactMarkdown from 'react-markdown';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Edit2, 
  Trash2,
  ChevronRight,
  FileText,
  X,
  Image as ImageIcon,
  Video,
  Upload,
  History,
  Clock
} from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import KBContentRenderer from '@/components/KBContentRenderer';

export default function KnowledgeBase({ user, currentApp }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const appColors = {
    sales: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    social: 'bg-violet-100 text-violet-700 border-violet-200',
    tasks: 'bg-blue-100 text-blue-700 border-blue-200',
    schedule: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    customer_service: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    training: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    equipment: 'bg-orange-100 text-orange-700 border-orange-200',
    editors: 'bg-purple-100 text-purple-700 border-purple-200',
    hr_accounting: 'bg-rose-100 text-rose-700 border-rose-200'
  };
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [newArticle, setNewArticle] = useState({
    title: '',
    content: '',
    category: 'general',
    departments: currentApp === 'admin' ? [] : [currentApp || 'social'],
    admin_only: false
  });
  const [showHistory, setShowHistory] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const quillRef = React.useRef(null);
  const uploadingRef = React.useRef(false);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['kb-articles', currentApp === 'admin' ? 'all' : currentApp],
    queryFn: async () => {
      const allArticles = await base44.entities.KnowledgeBase.list('-created_date');
      if (currentApp === 'admin') {
        return allArticles;
      }
      // Filter to show only articles for the current app
      return allArticles.filter(a => a.departments?.includes(currentApp));
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['kb-categories'],
    queryFn: () => base44.entities.AppSetting.filter({ 
      setting_type: 'kb_category', 
      is_active: true 
    }, 'sort_order')
  });

  const { data: articleHistory = [] } = useQuery({
    queryKey: ['article-history', selectedArticle?.id],
    queryFn: () => base44.entities.ArticleHistory.filter({ 
      article_id: selectedArticle.id 
    }, '-created_date'),
    enabled: !!selectedArticle
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.KnowledgeBase.create({
      ...data,
      author_id: user?.id,
      author_name: user?.full_name
    }),
    onSuccess: async (newArticle) => {
      // Create history entry
      await base44.entities.ArticleHistory.create({
        article_id: newArticle.id,
        article_title: newArticle.title,
        edited_by_id: user?.id,
        edited_by_name: user?.full_name,
        content_snapshot: newArticle.content,
        change_type: 'created'
      });
      await queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
      
      // Refetch and display the newly created article
      const articles = await base44.entities.KnowledgeBase.list('-updated_date');
      const refreshedArticle = articles.find(a => a.id === newArticle.id);
      
      if (refreshedArticle) {
        setSelectedArticle(refreshedArticle);
      }
      
      setShowEditor(false);
      setNewArticle({ 
        title: '', 
        content: '', 
        category: 'general', 
        departments: currentApp === 'admin' ? [] : [currentApp],
        admin_only: false
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KnowledgeBase.update(id, data),
    onSuccess: async (updatedArticle) => {
      // Create history entry
      await base44.entities.ArticleHistory.create({
        article_id: updatedArticle.id,
        article_title: updatedArticle.title,
        edited_by_id: user?.id,
        edited_by_name: user?.full_name,
        content_snapshot: updatedArticle.content,
        change_type: 'updated'
      });
      await queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
      await queryClient.invalidateQueries({ queryKey: ['article-history'] });
      
      // Refetch the updated article to ensure we have latest data with S3 URLs
      const articles = await base44.entities.KnowledgeBase.list('-updated_date');
      const refreshedArticle = articles.find(a => a.id === updatedArticle.id);
      
      if (refreshedArticle && selectedArticle?.id === updatedArticle.id) {
        setSelectedArticle(refreshedArticle);
      }
      setShowEditor(false);
      setEditingArticle(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (article) => base44.entities.KnowledgeBase.delete(article.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
      setSelectedArticle(null);
    }
  });

  const filteredArticles = articles.filter(a => {
    const matchesSearch = !search || 
      a.title?.toLowerCase().includes(search.toLowerCase()) ||
      a.content?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || a.category === categoryFilter;
    let matchesDepartment = true;
    if (currentApp === 'admin') {
      if (departmentFilter === 'admin_only') {
        matchesDepartment = a.admin_only === true;
      } else if (departmentFilter !== 'all') {
        matchesDepartment = a.departments?.includes(departmentFilter);
      }
    }
    return matchesSearch && matchesCategory && matchesDepartment;
  });

  const openEditor = (article = null) => {
    if (article) {
      setEditingArticle(article);
      setNewArticle({
        title: article.title,
        content: article.content,
        category: article.category,
        departments: article.departments || [],
        admin_only: article.admin_only || false
      });
    } else {
      setEditingArticle(null);
      setNewArticle({ 
        title: '', 
        content: '', 
        category: 'general', 
        departments: currentApp === 'admin' ? [] : [currentApp],
        admin_only: false
      });
    }
    setShowEditor(true);
  };

  // Rich text editor handlers - defined once
  const quillModules = React.useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: {
        image: function() {
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*,application/pdf');
          input.click();

          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;

            const quillInstance = quillRef.current?.getEditor();
            if (!quillInstance) return;

            const range = quillInstance.getSelection(true) || { index: quillInstance.getLength() };

            try {
              uploadingRef.current = true;
              
              const { file_url } = await base44.integrations.Core.UploadFile({ file });

              if (file.type === 'application/pdf') {
                const pdfHtml = `<div style="margin: 10px 0;"><a href="${file_url}" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 16px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; text-decoration: none; color: #334155; font-weight: 500;">📄 ${file.name}</a></div>`;
                quillInstance.clipboard.dangerouslyPasteHTML(range.index, pdfHtml);
              } else {
                const imgHtml = `<img src="${file_url}" alt="Knowledge Base Image" style="max-width: 100%; height: auto; display: block; margin: 10px 0;">`;
                quillInstance.clipboard.dangerouslyPasteHTML(range.index, imgHtml);
              }
              quillInstance.setSelection(range.index + 1);
            } catch (error) {
              console.error('Failed to upload file:', error);
              alert('Failed to upload file: ' + error.message);
            } finally {
              uploadingRef.current = false;
            }
          };
        },
        video: function() {
          const url = prompt('Enter video URL (YouTube or Loom):');
          if (!url) return;

          let embedUrl = url;
          
          if (url.includes('loom.com')) {
            const match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
            if (match) embedUrl = `https://www.loom.com/embed/${match[1]}`;
          } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
            if (match) embedUrl = `https://www.youtube.com/embed/${match[1]}`;
          }

          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection(true);
            const videoHtml = `<div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; margin: 1.5rem 0;"><iframe src="${embedUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 0.5rem;" allowfullscreen allow="autoplay; encrypted-media"></iframe></div>`;
            quill.clipboard.dangerouslyPasteHTML(range.index, videoHtml);
            quill.setSelection(range.index + 1);
          }
        }
      }
    }
  }), []);

  const handleSave = () => {
    if (editingArticle) {
      updateMutation.mutate({ id: editingArticle.id, data: newArticle });
    } else {
      createMutation.mutate(newArticle);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => file.type.startsWith('image/') || file.type === 'application/pdf');

    if (validFiles.length === 0) return;

    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    for (const file of validFiles) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        const range = editor.getSelection(true) || { index: editor.getLength() };
        if (file.type === 'application/pdf') {
          const pdfHtml = `<div style="margin: 10px 0;"><a href="${file_url}" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 16px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; text-decoration: none; color: #334155; font-weight: 500;">📄 ${file.name}</a></div>`;
          editor.clipboard.dangerouslyPasteHTML(range.index, pdfHtml);
        } else {
          const imgHtml = `<img src="${file_url}" alt="Knowledge Base Image" style="max-width: 100%; height: auto; display: block; margin: 10px 0;">`;
          editor.clipboard.dangerouslyPasteHTML(range.index, imgHtml);
        }
        editor.setSelection(range.index + 1);
      } catch (error) {
        console.error('Error uploading file:', error);
        alert('Failed to upload file: ' + error.message);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  return (
    <div className="relative">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-3 max-w-4xl">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder={currentApp === 'admin' ? "Search all knowledge bases..." : "Search articles..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12"
            />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44 h-12">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
            </Select>
            {currentApp === 'admin' && (
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-44 h-12">
                <SelectValue placeholder="All Apps" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Apps</SelectItem>
                <SelectItem value="admin_only">Admin Only</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="customer_service">Customer Service</SelectItem>
                <SelectItem value="training">Training</SelectItem>
                <SelectItem value="hr_accounting">HR/Accounting</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="editors">Editors</SelectItem>
                <SelectItem value="schedule">Schedule</SelectItem>
                <SelectItem value="tasks">Tasks</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <Button
          onClick={() => openEditor()}
          disabled={user?.departments?.includes('photographer')}
          title={user?.departments?.includes('photographer') ? 'Photographers cannot create articles' : ''}
          className={cn(
            "h-12",
            user?.departments?.includes('photographer') && "opacity-50 cursor-not-allowed",
            currentApp === 'sales' 
              ? "bg-emerald-600 hover:bg-emerald-700"
              : currentApp === 'tasks'
              ? "bg-blue-600 hover:bg-blue-700"
              : currentApp === 'equipment'
              ? "bg-orange-600 hover:bg-orange-700"
              : currentApp === 'admin'
              ? "bg-slate-600 hover:bg-slate-700"
              : "bg-violet-600 hover:bg-violet-700"
          )}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Article
        </Button>
      </div>

      {/* Articles List */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">Loading...</div>
        ) : filteredArticles.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No articles found</p>
          </div>
        ) : (
          filteredArticles.map(article => (
            <motion.button
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full text-left bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-slate-300 transition-all group"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <h3 className="font-semibold text-slate-900 text-xl group-hover:text-violet-600 transition-colors flex-1">
                  {article.title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap text-sm text-slate-600">
                  <span className="capitalize px-3 py-1.5 bg-slate-100 rounded-full font-medium">
                    {article.category}
                  </span>
                  {currentApp === 'admin' && article.departments?.length > 0 && (
                    <>
                      {article.departments.map(dept => (
                        <span key={dept} className={cn("capitalize px-3 py-1.5 rounded-full font-medium text-xs border", appColors[dept])}>
                          {dept.replace('_', ' ')}
                        </span>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </motion.button>
          ))
        )}
      </div>

      {/* Sliding Panel */}
      <AnimatePresence>
        {selectedArticle && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedArticle(null)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
            />
            
            {/* Sliding Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 h-screen w-full max-w-4xl bg-gradient-to-br from-slate-50 to-white shadow-2xl z-50 overflow-y-auto"
            >
              <div className="sticky top-0 bg-white/90 backdrop-blur-lg border-b border-slate-200/80 px-8 py-5 flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold text-slate-900">Knowledge Base</h2>
                  {selectedArticle.updated_date && selectedArticle.updated_date !== selectedArticle.created_date && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                      <Clock className="w-3 h-3" />
                      <span>Updated {formatInEST(selectedArticle.updated_date, 'MMM d, yyyy')}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHistory(!showHistory)}
                    className="hover:bg-slate-100"
                  >
                    {showHistory ? (
                      <>
                        <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
                        Back to Article
                      </>
                    ) : (
                      <>
                        <History className="w-4 h-4 mr-1" />
                        History ({articleHistory.length})
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditor(selectedArticle)}
                    className="hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
              </div>

              <div className="p-8 max-w-3xl mx-auto">
                {showHistory ? (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">Edit History</h2>
                      <p className="text-slate-600">View all changes made to this article</p>
                    </div>
                    <div className="space-y-4">
                      {articleHistory.map((entry, index) => (
                        <div key={entry.id} className="bg-white border border-slate-200 rounded-xl p-5">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center",
                                entry.change_type === 'created' ? 'bg-emerald-100' : 'bg-blue-100'
                              )}>
                                {entry.change_type === 'created' ? (
                                  <Plus className="w-5 h-5 text-emerald-600" />
                                ) : (
                                  <Edit2 className="w-5 h-5 text-blue-600" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {entry.change_type === 'created' ? 'Article Created' : 'Article Updated'}
                                </p>
                                <p className="text-sm text-slate-500">
                                  by {entry.edited_by_name} • {formatInEST(entry.created_date, 'MMM d, yyyy h:mm a')} EST
                                </p>
                              </div>
                            </div>
                            {index === 0 && (
                              <span className="px-2 py-1 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">
                                Latest
                              </span>
                            )}
                          </div>
                          {entry.content_snapshot && (
                           <div className="mt-4 pt-4 border-t border-slate-100">
                             <p className="text-xs font-medium text-slate-500 mb-2">Content at this version:</p>
                             <div className="prose prose-sm prose-slate max-w-none bg-slate-50 rounded-lg p-4 max-h-60 overflow-auto prose-headings:text-sm prose-p:text-sm prose-img:rounded-lg prose-img:max-h-40">
                               <KBContentRenderer content={entry.content_snapshot} />
                             </div>
                           </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-8">
                      <h1 className="text-4xl font-bold text-slate-900 mb-4 leading-tight">
                        {selectedArticle.title}
                      </h1>
                      <div className="flex items-center gap-2 flex-wrap pb-6 border-b border-slate-200">
                        <span className="capitalize px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-700">
                          {selectedArticle.category}
                        </span>
                        {currentApp === 'admin' && selectedArticle.departments?.length > 0 && (
                          selectedArticle.departments.map(dept => (
                            <span key={dept} className={cn("capitalize px-4 py-2 rounded-full font-medium text-sm border", appColors[dept])}>
                              {dept.replace('_', ' ')}
                            </span>
                          ))
                        )}
                        <div className="ml-auto flex items-center gap-2 text-sm text-slate-500">
                          <span className="font-medium">{selectedArticle.author_name}</span>
                          <span>•</span>
                          <span>{formatInEST(selectedArticle.created_date, 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    </div>

                    <KBContentRenderer content={selectedArticle.content} />
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? 'Edit Article' : 'New Article'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Title</label>
              <Input
                value={newArticle.title}
                onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                placeholder="Article title"
              />
            </div>
            {currentApp === 'admin' && (
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={newArticle.admin_only || false}
                      onChange={(e) => setNewArticle({ ...newArticle, admin_only: e.target.checked, departments: e.target.checked ? [] : newArticle.departments })}
                      className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Admin Only</span>
                  </label>
                  <p className="text-xs text-slate-500">
                    When enabled, this article is only visible in the Admin app
                  </p>
                </div>

                {!newArticle.admin_only && (
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Show in Apps</label>
                    <div className="space-y-2">
                      {[
                        { value: 'sales', label: 'Sales' },
                        { value: 'social', label: 'Social' },
                        { value: 'customer_service', label: 'Customer Service' },
                        { value: 'training', label: 'Training' },
                        { value: 'hr_accounting', label: 'HR/Accounting' },
                        { value: 'equipment', label: 'Equipment' },
                        { value: 'editors', label: 'Editors' },
                        { value: 'schedule', label: 'Schedule' },
                        { value: 'tasks', label: 'Tasks' }
                      ].map(dept => (
                        <label key={dept.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newArticle.departments?.includes(dept.value)}
                            onChange={(e) => {
                              const newDepts = e.target.checked
                                ? [...(newArticle.departments || []), dept.value]
                                : (newArticle.departments || []).filter(d => d !== dept.value);
                              setNewArticle({ ...newArticle, departments: newDepts });
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                          />
                          <span className="text-sm text-slate-700">{dept.label}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Select all apps where this article should be visible
                    </p>
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-700">Category</label>
              <Select 
                value={newArticle.category} 
                onValueChange={(v) => setNewArticle({ ...newArticle, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                  {categories.length === 0 && (
                    <div className="px-3 py-2 text-sm text-slate-500">
                      No categories defined. Go to Admin Settings to add them.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Content
              </label>
              <div
                className="relative"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
              >
                {isDragging && (
                  <div className="absolute inset-0 z-10 bg-violet-50/90 border-2 border-dashed border-violet-400 rounded-lg flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <Upload className="w-12 h-12 text-violet-600 mx-auto mb-2" />
                      <p className="text-violet-700 font-medium">Drop images here</p>
                    </div>
                  </div>
                )}
                <ReactQuill
                  ref={quillRef}
                  theme="snow"
                  value={newArticle.content || ''}
                  onChange={(content) => {
                    setNewArticle(prev => ({ ...prev, content }));
                  }}
                  modules={quillModules}
                  placeholder="Write your article content... Use the toolbar to add images and videos inline."
                  className="bg-white"
                  style={{ height: '400px', marginBottom: '50px' }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Drag & drop images/PDFs or click the image icon to upload files • Click video icon for YouTube/Loom videos
              </p>
            </div>
            <div className="flex items-center justify-between pt-4">
              {currentApp === 'admin' && editingArticle && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this article?')) {
                      deleteMutation.mutate(editingArticle);
                      setShowEditor(false);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              )}
              <div className="flex gap-3 ml-auto">
                <Button variant="outline" onClick={() => setShowEditor(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending || !newArticle.title || (currentApp === 'admin' && !newArticle.admin_only && (!newArticle.departments || newArticle.departments.length === 0))}
                  className={cn(
                    currentApp === 'sales' 
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : currentApp === 'tasks'
                      ? "bg-blue-600 hover:bg-blue-700"
                      : currentApp === 'equipment'
                      ? "bg-orange-600 hover:bg-orange-700"
                      : currentApp === 'admin'
                      ? "bg-slate-600 hover:bg-slate-700"
                      : "bg-violet-600 hover:bg-violet-700"
                  )}
                >
                  {editingArticle ? 'Save Changes' : 'Create Article'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}