import React from 'react';
import { Inbox } from 'lucide-react';

export default function CustomerServiceDashboard({ user }) {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Inbox className="w-6 h-6 text-cyan-600" />
          Customer Service Inbox
        </h1>
        <p className="text-slate-500 mt-1">Manage customer conversations and support requests</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <Inbox className="w-16 h-16 mx-auto mb-4 text-slate-300" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Inbox Coming Soon</h3>
        <p className="text-slate-500">Customer service inbox will be available here</p>
      </div>
    </div>
  );
}