import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { formatInEST } from '@/components/dateFormatter';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2,
  ChevronRight,
  FileText,
  X,
  Upload,
  History,
  Clock
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
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import KBContentRenderer from '@/components/KBContentRenderer';

export default function SocialKnowledgeBase({ user }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [newArticle, setNewArticle] = useState({
    title: '',
    content: '',
    category: 'general',
    departments: ['social']
  });
  const quillRef = React.useRef(null);
  const uploadingRef = React.useRef(false);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['kb-articles-social'],
    queryFn: async () => {
      const allArticles = await base44.entities.KnowledgeBase.list('-created_date');
      return allArticles.filter(a => a.departments?.includes('social'));
    }
  });

  const { data: articleHistory = [] } = useQuery({
    queryKey: ['article-history', selectedArticle?.id],
    queryFn: () => base44.entities.ArticleHistory.filter({ 
      article_id: selectedArticle.id 
    }, '-created_date'),
    enabled: !!selectedArticle
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['kb-categories'],
    queryFn: () => base44.entities.AppSetting.filter({ 
      setting_type: 'kb_category', 
      is_active: true 
    }, 'sort_order')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.KnowledgeBase.create({
      ...data,
      author_id: user?.id,
      author_name: user?.full_name
    }),
    onSuccess: async (newArticleData) => {
      await base44.entities.ArticleHistory.create({
        article_id: newArticleData.id,
        article_title: newArticleData.title,
        edited_by_id: user?.id,
        edited_by_name: user?.full_name,
        content_snapshot: newArticleData.content,
        change_type: 'created'
      });
      queryClient.invalidateQueries({ queryKey: ['kb-articles-social'] });
      setShowEditor(false);
      setNewArticle({ title: '', content: '', category: 'general', departments: ['social'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KnowledgeBase.update(id, data),
    onSuccess: async (updatedArticle) => {
      await base44.entities.ArticleHistory.create({
        article_id: updatedArticle.id,
        article_title: updatedArticle.title,
        edited_by_id: user?.id,
        edited_by_name: user?.full_name,
        content_snapshot: updatedArticle.content,
        change_type: 'updated'
      });
      queryClient.invalidateQueries({ queryKey: ['kb-articles-social'] });
      queryClient.invalidateQueries({ queryKey: ['article-history'] });
      if (selectedArticle?.id === updatedArticle.id) {
        setSelectedArticle(updatedArticle);
      }
      setShowEditor(false);
      setEditingArticle(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.KnowledgeBase.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-articles-social'] });
      setSelectedArticle(null);
    }
  });

  const filteredArticles = articles.filter(a => {
    const matchesSearch = !search || 
      a.title?.toLowerCase().includes(search.toLowerCase()) ||
      a.content?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || a.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

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
          input.setAttribute('accept', 'image/*');
          input.click();

          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;

            const quillInstance = quillRef.current?.getEditor();
            if (!quillInstance) return;

            const range = quillInstance.getSelection(true) || { index: quillInstance.getLength() };

            try {
              uploadingRef.current = true;
              const { file_url: tempUrl } = await base44.integrations.Core.UploadFile({ file });
              const { data: s3Data } = await base44.functions.invoke('uploadToS3', {
                source_url: tempUrl,
                folder: 'knowledge-base',
                file_name: file.name,
                content_type: file.type
              });
              const { data: config } = await base44.functions.invoke('getS3Config', {});
              const file_url = `https://${config.bucket}.s3.${config.region}.amazonaws.com/${s3Data.file_key}`;
              
              quillInstance.insertEmbed(range.index, 'image', file_url, 'user');
              quillInstance.setSelection(range.index + 1);
            } catch (error) {
              console.error('Failed to upload image:', error);
              alert('Failed to upload image: ' + error.message);
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

  const openEditor = (article = null) => {
    if (article) {
      setEditingArticle(article);
      setNewArticle({
        title: article.title,
        content: article.content,
        category: article.category,
        departments: article.departments || []
      });
    } else {
      setEditingArticle(null);
      setNewArticle({ 
        title: '', 
        content: '', 
        category: 'general', 
        departments: ['social'] 
      });
    }
    setShowEditor(true);
  };

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
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) return;

    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    for (const file of imageFiles) {
      try {
        const { file_url: tempUrl } = await base44.integrations.Core.UploadFile({ file });
        const { data: s3Data } = await base44.functions.invoke('uploadToS3', {
          source_url: tempUrl,
          folder: 'knowledge-base',
          file_name: file.name,
          content_type: file.type
        });
        const { data: config } = await base44.functions.invoke('getS3Config', {});
        const file_url = `https://${config.bucket}.s3.${config.region}.amazonaws.com/${s3Data.file_key}`;
        const range = editor.getSelection(true);
        editor.insertEmbed(range.index, 'image', file_url);
        editor.setSelection(range.index + 1);
      } catch (error) {
        console.error('Error uploading image:', error);
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
      <div className="mb-6 flex items-center justify-between gap-4">
         <div className="flex-1 flex items-center gap-3 max-w-4xl">
           <div className="flex-1 relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
             <Input
               placeholder="Search articles..."
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
         </div>
         <Button
          onClick={() => openEditor()}
          disabled={user?.departments?.includes('photographer')}
          title={user?.departments?.includes('photographer') ? 'Photographers cannot create articles' : ''}
          className={cn(
            "h-12",
            user?.departments?.includes('photographer') && "opacity-50 cursor-not-allowed",
            "bg-violet-600 hover:bg-violet-700"
          )}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Article
        </Button>
      </div>

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
                </div>
              </div>
            </motion.button>
          ))
        )}
      </div>

      <AnimatePresence>
        {selectedArticle && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedArticle(null)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
            />
            
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
                              <div 
                                className="prose prose-sm prose-slate max-w-none bg-slate-50 rounded-lg p-4 max-h-60 overflow-auto prose-headings:text-sm prose-p:text-sm prose-img:rounded-lg prose-img:max-h-40"
                                dangerouslySetInnerHTML={{ __html: entry.content_snapshot }}
                              />
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
                        <div className="ml-auto flex items-center gap-2 text-sm text-slate-500">
                          <span className="font-medium">{selectedArticle.author_name}</span>
                          <span>•</span>
                          <span>{formatInEST(selectedArticle.created_date, 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    </div>

                    <div 
                      className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-700 prose-p:leading-relaxed prose-a:text-violet-600 prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-img:shadow-md prose-img:border-0 prose-strong:text-slate-900 prose-code:text-violet-600 prose-code:bg-violet-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-900 prose-pre:shadow-lg prose-blockquote:border-l-4 prose-blockquote:border-violet-500 prose-blockquote:bg-violet-50 prose-blockquote:py-1"
                      dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
                    />
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
                Drag & drop images or click the image icon to upload photos • Click video icon for YouTube/Loom videos
              </p>
            </div>
            <div className="flex items-center justify-end pt-4">
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowEditor(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending || !newArticle.title || !newArticle.content}
                  className="bg-violet-600 hover:bg-violet-700"
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