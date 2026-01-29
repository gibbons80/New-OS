import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color = 'emerald',
  subtitle 
}) {
  const colorClasses = {
    emerald: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
    blue: 'bg-gradient-to-br from-blue-400 to-blue-600',
    amber: 'bg-gradient-to-br from-amber-400 to-amber-600',
    violet: 'bg-gradient-to-br from-violet-400 to-violet-600',
    rose: 'bg-gradient-to-br from-rose-400 to-rose-600',
    cyan: 'bg-gradient-to-br from-cyan-400 to-cyan-600',
    purple: 'bg-gradient-to-br from-purple-400 to-purple-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative overflow-hidden rounded-2xl text-white shadow-lg hover:shadow-2xl transition-all duration-300 group",
        "p-2 md:p-6",
        colorClasses[color]
      )}
    >
      {/* Mobile: Icon + value only, very compact */}
      <div className="md:hidden flex flex-col items-center justify-center gap-1">
        <Icon className="w-5 h-5" />
        <p className="text-lg font-bold">{value}</p>
      </div>

      {/* Desktop: Original layout with icon */}
      <div className="hidden md:block relative z-10">
        <p className="text-white/80 text-sm font-medium">{title}</p>
        <p className="text-4xl font-bold mt-2">{value}</p>
        {subtitle && (
          <p className="text-white/70 text-sm mt-1">{subtitle}</p>
        )}
      </div>
      <div className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-20 h-20" />
      </div>
    </motion.div>
  );
}