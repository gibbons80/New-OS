import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function Home() {
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          const user = await base44.auth.me();
          // Redirect based on user's departments
          if (user.departments?.includes('sales') || user.role === 'admin') {
            window.location.href = createPageUrl('SalesDashboard');
          } else if (user.departments?.includes('social')) {
            window.location.href = createPageUrl('SocialDashboard');
          } else {
            window.location.href = createPageUrl('SalesDashboard');
          }
        } else {
          // Redirect to login
          base44.auth.redirectToLogin(createPageUrl('SalesDashboard'));
        }
      } catch (error) {
        base44.auth.redirectToLogin(createPageUrl('SalesDashboard'));
      }
    };
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
          className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500 rounded-full blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.3, repeat: Infinity, repeatType: "reverse" }}
          className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500 rounded-full blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center relative z-10"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-16 h-16 border-4 border-slate-700 border-t-white rounded-full animate-spin mx-auto"
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-white/60 mt-6"
        >
          Loading WindowStill OS...
        </motion.p>
      </motion.div>
    </div>
  );
}