import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Instagram, Youtube, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const StatCard = ({ brand, latestStat, previousStat, index }) => {
  const isInstagram = brand.platform_type === 'instagram' || brand.platform_type === 'both';
  const isYouTube = brand.platform_type === 'youtube' || brand.platform_type === 'both';

  const currentFollowers = latestStat?.total_followers || 0;
  const previousFollowers = previousStat?.total_followers || 0;
  const followersChange = currentFollowers - previousFollowers;

  const currentSubscribers = latestStat?.total_subscribers || 0;
  const previousSubscribers = previousStat?.total_subscribers || 0;
  const subscribersChange = currentSubscribers - previousSubscribers;

  const currentViews = latestStat?.views_last_30_days || 0;
  const previousViews = previousStat?.views_last_30_days || 0;
  const viewsChange = currentViews - previousViews;

  const renderDelta = (value) => {
    if (!value || value === 0) return <span className="text-slate-400">—</span>;
    const isPositive = value > 0;
    return (
      <div className={cn("flex items-center gap-1 text-xs", isPositive ? "text-emerald-300" : "text-red-300")}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span className="font-medium">{isPositive ? '+' : ''}{value.toLocaleString()}</span>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl p-6 text-white"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">{brand.label}</h3>
        {isInstagram && <Instagram className="w-6 h-6 opacity-80" />}
        {isYouTube && <Youtube className="w-6 h-6 opacity-80" />}
      </div>

      {isInstagram && latestStat && (
        <div className="mb-2">
          <p className="text-xs text-violet-100">Instagram Followers</p>
          <p className="text-2xl font-bold">{currentFollowers.toLocaleString()}</p>
          {renderDelta(followersChange)}
        </div>
      )}

      {isYouTube && latestStat && (
        <div className="mb-2">
          <p className="text-xs text-violet-100">YouTube Subscribers</p>
          <p className="text-2xl font-bold">{currentSubscribers.toLocaleString()}</p>
          {renderDelta(subscribersChange)}
        </div>
      )}

      {latestStat && (
        <div>
          <p className="text-xs text-violet-100">Views (30d)</p>
          <p className="text-2xl font-bold">{currentViews.toLocaleString()}</p>
          {renderDelta(viewsChange)}
        </div>
      )}
    </motion.div>
  );
};

export default function SocialStatsOverview() {
  const { data: brands = [] } = useQuery({
    queryKey: ['social-brands-overview'],
    queryFn: () => base44.entities.AppSetting.filter({
      setting_type: 'brand',
      is_active: true
    }, 'sort_order')
  });

  const { data: allDailyStats = [] } = useQuery({
    queryKey: ['all-daily-stats-overview'],
    queryFn: () => base44.entities.DailyStat.list('-date', 5000)
  });

  const brandStatsData = brands.map(brand => {
    const brandDailyStats = allDailyStats.filter(stat => stat.brand_id === brand.id);
    const latestStat = brandDailyStats[0];
    const previousStat = brandDailyStats[1];
    return { brand, latestStat, previousStat };
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {brandStatsData.map((data, index) => (
        <StatCard 
          key={data.brand.id} 
          brand={data.brand} 
          latestStat={data.latestStat} 
          previousStat={data.previousStat} 
          index={index}
        />
      ))}
      {brands.length === 0 && (
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          No social media brands configured.
        </div>
      )}
    </div>
  );
}