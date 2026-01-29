import React from 'react';
import { Film } from 'lucide-react';

export default function EditorsDashboard({ user }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Editors Dashboard</h1>
        <p className="text-slate-500 mt-1">Photo & video editing workspace</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <div className="text-center py-12">
          <Film className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400">Coming soon</p>
        </div>
      </div>
    </div>
  );
}