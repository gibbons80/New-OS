import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays, parseISO } from 'date-fns';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus,
  Edit2,
  Calendar,
  Users,
  Eye,
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function SocialStats({ user }) {
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const [selectedBrand, setSelectedBrand] = useState('');
  const [dateRange, setDateRange] = useState({ start: thirtyDaysAgo, end: today });
  const [showEntryDialog, setShowEntryDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState({
    date: today,
    total_followers: '',
    views_last_30_days: '',
    total_subscribers: '',
    watch_hours_last_30_days: ''
  });

  // Fetch brands
  const { data: brands = [] } = useQuery({
    queryKey: ['brands-for-stats'],
    queryFn: async () => {
      const settings = await base44.entities.AppSetting.filter({ 
        setting_type: 'brand',
        is_active: true 
      }, 'sort_order');
      return settings;
    }
  });

  // Get selected brand platform type
  const selectedBrandData = useMemo(() => {
    return brands.find(b => b.id === selectedBrand);
  }, [selectedBrand, brands]);

  const platformsToShow = useMemo(() => {
    if (!selectedBrandData?.platform_type) return [];
    if (selectedBrandData.platform_type === 'both') return ['instagram', 'youtube'];
    return [selectedBrandData.platform_type];
  }, [selectedBrandData]);

  // Fetch daily stats
  const { data: dailyStats = [] } = useQuery({
    queryKey: ['daily-stats', selectedBrand, dateRange],
    queryFn: async () => {
      const filters = {
        date: {
          $gte: dateRange.start,
          $lte: dateRange.end
        }
      };
      if (selectedBrand) filters.brand_id = selectedBrand;

      return await base44.entities.DailyStat.filter(filters, '-date');
    },
    enabled: !!selectedBrand
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async (data) => {
      // Calculate deltas
      const previousDay = format(subDays(parseISO(data.date), 1), 'yyyy-MM-dd');
      const prevStats = await base44.entities.DailyStat.filter({
        brand_id: data.brand_id,
        platform: data.platform,
        date: previousDay
      });

      const prevStat = prevStats.find(s => s.platform === data.platform);
      
      const statData = {
        ...data,
        followers_change_day_over_day: prevStat ? 
          (data.total_followers || 0) - (prevStat.total_followers || 0) : 0,
        subscribers_change_day_over_day: prevStat ? 
          (data.total_subscribers || 0) - (prevStat.total_subscribers || 0) : 0,
        views_change_day_over_day: prevStat ? 
          (data.views_last_30_days || 0) - (prevStat.views_last_30_days || 0) : 0,
        watch_hours_change_day_over_day: prevStat ? 
          (data.watch_hours_last_30_days || 0) - (prevStat.watch_hours_last_30_days || 0) : 0,
      };

      let result;
      if (editingEntry) {
        result = await base44.entities.DailyStat.update(editingEntry.id, statData);
      } else {
        result = await base44.entities.DailyStat.create(statData);
      }

      // Recalculate next day's deltas if this entry was updated
      const nextDay = format(subDays(parseISO(data.date), -1), 'yyyy-MM-dd');
      const nextDayStats = await base44.entities.DailyStat.filter({
        brand_id: data.brand_id,
        platform: data.platform,
        date: nextDay
      });

      if (nextDayStats.length > 0) {
        const nextStat = nextDayStats[0];
        await base44.entities.DailyStat.update(nextStat.id, {
          followers_change_day_over_day: (nextStat.total_followers || 0) - (data.total_followers || 0),
          subscribers_change_day_over_day: (nextStat.total_subscribers || 0) - (data.total_subscribers || 0),
          views_change_day_over_day: (nextStat.views_last_30_days || 0) - (data.views_last_30_days || 0),
          watch_hours_change_day_over_day: (nextStat.watch_hours_last_30_days || 0) - (data.watch_hours_last_30_days || 0)
        });
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-stats'] });
      setShowEntryDialog(false);
      setEditingEntry(null);
      setFormData({
        date: today,
        total_followers: '',
        views_last_30_days: '',
        total_subscribers: '',
        watch_hours_last_30_days: ''
      });
    }
  });

  // Separate stats by platform
  const instagramStats = useMemo(() => 
    dailyStats.filter(s => s.platform === 'instagram'),
    [dailyStats]
  );
  const youtubeStats = useMemo(() => 
    dailyStats.filter(s => s.platform === 'youtube'),
    [dailyStats]
  );

  const latestInstagram = instagramStats[0];
  const latestYoutube = youtubeStats[0];

  // Chart data
  const instagramChartData = useMemo(() => {
    return [...instagramStats].reverse().map(stat => ({
      date: format(parseISO(stat.date), 'MMM d'),
      followers: stat.total_followers,
      views: stat.views_last_30_days
    }));
  }, [instagramStats]);

  const youtubeChartData = useMemo(() => {
    return [...youtubeStats].reverse().map(stat => ({
      date: format(parseISO(stat.date), 'MMM d'),
      subscribers: stat.total_subscribers,
      views: stat.views_last_30_days,
      watchHours: stat.watch_hours_last_30_days
    }));
  }, [youtubeStats]);

  const openDialog = (entry = null, platform = null) => {
    if (entry) {
      setEditingEntry(entry);
      setFormData({
        date: entry.date,
        platform: entry.platform,
        total_followers: entry.total_followers ? entry.total_followers.toLocaleString() : '',
        views_last_30_days: entry.views_last_30_days ? entry.views_last_30_days.toLocaleString() : '',
        total_subscribers: entry.total_subscribers ? entry.total_subscribers.toLocaleString() : '',
        watch_hours_last_30_days: entry.watch_hours_last_30_days ? entry.watch_hours_last_30_days.toLocaleString() : ''
      });
    } else {
      setEditingEntry(null);
      setFormData({
        date: today,
        platform: platform || platformsToShow[0],
        total_followers: '',
        views_last_30_days: '',
        total_subscribers: '',
        watch_hours_last_30_days: ''
      });
    }
    setShowEntryDialog(true);
  };

  const parseYouTubeNumber = (value) => {
    if (!value) return 0;
    const str = value.toString().trim().toUpperCase();
    
    // Handle K notation (e.g., "243.5K")
    if (str.endsWith('K')) {
      const num = parseFloat(str.replace(/[K,]/g, ''));
      return num * 1000;
    }
    
    // Handle regular numbers with commas
    return parseFloat(str.replace(/,/g, '')) || 0;
  };

  const handleSave = async () => {
    const brand = brands.find(b => b.id === selectedBrand);
    
    const data = {
      date: formData.date,
      brand_id: selectedBrand,
      brand_name: brand?.label,
      platform: formData.platform,
      department: 'social'
    };

    if (formData.platform === 'instagram') {
      data.total_followers = parseYouTubeNumber(formData.total_followers);
      data.views_last_30_days = parseYouTubeNumber(formData.views_last_30_days);
    } else if (formData.platform === 'youtube') {
      data.total_subscribers = parseYouTubeNumber(formData.total_subscribers);
      data.views_last_30_days = parseYouTubeNumber(formData.views_last_30_days);
      data.watch_hours_last_30_days = parseYouTubeNumber(formData.watch_hours_last_30_days);
    }

    createOrUpdateMutation.mutate(data);
  };

  const renderDelta = (value) => {
    if (!value || value === 0) return <span className="text-slate-400">—</span>;
    const isPositive = value > 0;
    return (
      <div className={cn("flex items-center gap-1", isPositive ? "text-emerald-600" : "text-red-600")}>
        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <span className="font-medium">{isPositive ? '+' : ''}{value.toLocaleString()}</span>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Social Media Stats</h1>
        <p className="text-slate-500 mt-1 text-sm md:text-base">Track daily performance across your brands</p>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 shadow-lg"
      >
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
            <SelectTrigger className="w-full lg:w-64">
              <SelectValue placeholder="Select Brand" />
            </SelectTrigger>
            <SelectContent>
              {brands.map(brand => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.label}
                  {brand.platform_type && (
                    <span className="ml-2 text-xs text-slate-500">
                      ({brand.platform_type === 'both' ? 'IG & YT' : brand.platform_type === 'instagram' ? 'Instagram' : 'YouTube'})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 flex-1">
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="flex-1 min-w-0 text-sm"
            />
            <span className="text-slate-400 text-sm">to</span>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="flex-1 min-w-0 text-sm"
            />
          </div>

          {platformsToShow.length === 1 ? (
            <Button
              onClick={() => openDialog(null, platformsToShow[0])}
              disabled={!selectedBrand}
              className="w-full lg:w-auto bg-violet-600 hover:bg-violet-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Add Entry</span>
              <span className="sm:hidden">Add</span>
            </Button>
          ) : platformsToShow.length === 2 ? (
            <div className="flex gap-2">
              <Button
                onClick={() => openDialog(null, 'instagram')}
                disabled={!selectedBrand}
                className="flex-1 lg:flex-none bg-violet-600 hover:bg-violet-700 text-xs md:text-sm"
              >
                <Plus className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                <span className="hidden md:inline">Add Instagram</span>
                <span className="md:hidden">IG</span>
              </Button>
              <Button
                onClick={() => openDialog(null, 'youtube')}
                disabled={!selectedBrand}
                className="flex-1 lg:flex-none bg-red-600 hover:bg-red-700 text-xs md:text-sm"
              >
                <Plus className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                <span className="hidden md:inline">Add YouTube</span>
                <span className="md:hidden">YT</span>
              </Button>
            </div>
          ) : null}
        </div>
      </motion.div>

      {!selectedBrand ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Select a brand to view stats</p>
        </div>
      ) : (
        <>
          {/* KPI Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {platformsToShow.includes('instagram') && latestInstagram && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-3 md:p-4 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-slate-500 mb-2">
                    <Users className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">Instagram Followers</span>
                    <span className="sm:hidden">IG Followers</span>
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-slate-900 mb-1">
                    {latestInstagram.total_followers?.toLocaleString() || 0}
                  </div>
                  {renderDelta(latestInstagram.followers_change_day_over_day)}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-3 md:p-4 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-slate-500 mb-2">
                    <Eye className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">IG Views (30d)</span>
                    <span className="sm:hidden">Views</span>
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-slate-900 mb-1">
                    {latestInstagram.views_last_30_days?.toLocaleString() || 0}
                  </div>
                  {renderDelta(latestInstagram.views_change_day_over_day)}
                </motion.div>
              </>
            )}

            {platformsToShow.includes('youtube') && latestYoutube && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-3 md:p-4 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-slate-500 mb-2">
                    <Users className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">YouTube Subscribers</span>
                    <span className="sm:hidden">YT Subs</span>
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-slate-900 mb-1">
                    {latestYoutube.total_subscribers?.toLocaleString() || 0}
                  </div>
                  {renderDelta(latestYoutube.subscribers_change_day_over_day)}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-3 md:p-4 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-slate-500 mb-2">
                    <Eye className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">YT Views (30d)</span>
                    <span className="sm:hidden">Views</span>
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-slate-900 mb-1">
                    {latestYoutube.views_last_30_days?.toLocaleString() || 0}
                  </div>
                  {renderDelta(latestYoutube.views_change_day_over_day)}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-3 md:p-4 shadow-lg hover:shadow-xl transition-shadow col-span-2 lg:col-span-1"
                >
                  <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-slate-500 mb-2">
                    <Clock className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">YT Watch Hours (30d)</span>
                    <span className="sm:hidden">Watch Hrs</span>
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-slate-900 mb-1">
                    {latestYoutube.watch_hours_last_30_days?.toLocaleString() || 0}
                  </div>
                  {renderDelta(latestYoutube.watch_hours_change_day_over_day)}
                </motion.div>
              </>
            )}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {platformsToShow.includes('instagram') && instagramChartData.length > 0 && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-4 md:p-6 shadow-lg"
                >
                  <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-4">Instagram Followers</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={instagramChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="followers" 
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                        dot={{ fill: '#8b5cf6', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-4 md:p-6 shadow-lg"
                >
                  <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-4">Instagram Views (30d)</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={instagramChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="views" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ fill: '#10b981', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>
              </>
            )}

            {platformsToShow.includes('youtube') && youtubeChartData.length > 0 && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                  className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-4 md:p-6 shadow-lg"
                >
                  <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-4">YouTube Subscribers</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={youtubeChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="subscribers" 
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                        dot={{ fill: '#8b5cf6', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-4 md:p-6 shadow-lg"
                >
                  <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-4">YouTube Views (30d)</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={youtubeChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="views" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ fill: '#10b981', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                  className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-4 md:p-6 shadow-lg lg:col-span-2"
                >
                  <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-4">YouTube Watch Hours (30d)</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={youtubeChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="watchHours" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        dot={{ fill: '#f59e0b', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>
              </>
            )}
          </div>

          {/* Daily Entry Tables */}
          {platformsToShow.includes('instagram') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 overflow-hidden shadow-lg"
            >
              <div className="p-3 md:p-4 border-b border-slate-100 bg-violet-50">
                <h3 className="text-sm md:text-base font-semibold text-slate-900">Instagram Entries</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Date</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Followers</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Change</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Views (30d)</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {instagramStats.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-400">
                          No Instagram entries yet
                        </td>
                      </tr>
                    ) : (
                      instagramStats.map(stat => (
                        <tr key={stat.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-medium text-slate-900">
                            {format(parseISO(stat.date), 'MMM d, yyyy')}
                          </td>
                          <td className="p-4 text-slate-700">{stat.total_followers?.toLocaleString() || 0}</td>
                          <td className="p-4">{renderDelta(stat.followers_change_day_over_day)}</td>
                          <td className="p-4 text-slate-700">{stat.views_last_30_days?.toLocaleString() || 0}</td>
                          <td className="p-4">
                            <button
                              onClick={() => openDialog(stat)}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {platformsToShow.includes('youtube') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
              className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 overflow-hidden shadow-lg"
            >
              <div className="p-3 md:p-4 border-b border-slate-100 bg-red-50">
                <h3 className="text-sm md:text-base font-semibold text-slate-900">YouTube Entries</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Date</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Subscribers</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Change</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Views (30d)</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500">Watch Hours (30d)</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-500"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {youtubeStats.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400">
                          No YouTube entries yet
                        </td>
                      </tr>
                    ) : (
                      youtubeStats.map(stat => (
                        <tr key={stat.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-medium text-slate-900">
                            {format(parseISO(stat.date), 'MMM d, yyyy')}
                          </td>
                          <td className="p-4 text-slate-700">{stat.total_subscribers?.toLocaleString() || 0}</td>
                          <td className="p-4">{renderDelta(stat.subscribers_change_day_over_day)}</td>
                          <td className="p-4 text-slate-700">{stat.views_last_30_days?.toLocaleString() || 0}</td>
                          <td className="p-4 text-slate-700">{stat.watch_hours_last_30_days?.toLocaleString() || 0}</td>
                          <td className="p-4">
                            <button
                              onClick={() => openDialog(stat)}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showEntryDialog} onOpenChange={setShowEntryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit' : 'Add'} Daily Stats</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Date</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            {formData.platform === 'instagram' && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Total Followers</label>
                  <Input
                    type="text"
                    value={formData.total_followers}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, '');
                      if (value === '' || /^\d+$/.test(value)) {
                        setFormData({ ...formData, total_followers: value ? parseInt(value).toLocaleString() : '' });
                      }
                    }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Views (Last 30 Days)</label>
                  <Input
                    type="text"
                    value={formData.views_last_30_days}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, '');
                      if (value === '' || /^\d+$/.test(value)) {
                        setFormData({ ...formData, views_last_30_days: value ? parseInt(value).toLocaleString() : '' });
                      }
                    }}
                    placeholder="0"
                  />
                </div>
              </>
            )}

            {formData.platform === 'youtube' && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Total Subscribers</label>
                  <Input
                    type="text"
                    value={formData.total_subscribers}
                    onChange={(e) => setFormData({ ...formData, total_subscribers: e.target.value })}
                    placeholder="1.2K or 1200"
                  />
                  <p className="text-xs text-slate-500 mt-1">Enter as shown (e.g., 1.2K)</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Views (Last 30 Days)</label>
                  <Input
                    type="text"
                    value={formData.views_last_30_days}
                    onChange={(e) => setFormData({ ...formData, views_last_30_days: e.target.value })}
                    placeholder="243.5K or 243500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Enter as shown (e.g., 243.5K)</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Watch Hours (Last 30 Days)</label>
                  <Input
                    type="text"
                    value={formData.watch_hours_last_30_days}
                    onChange={(e) => setFormData({ ...formData, watch_hours_last_30_days: e.target.value })}
                    placeholder="122.8K or 122800"
                  />
                  <p className="text-xs text-slate-500 mt-1">Enter as shown (e.g., 122.8K)</p>
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowEntryDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={createOrUpdateMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {editingEntry ? 'Save Changes' : 'Add Entry'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}