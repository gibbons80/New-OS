import React from 'react';
import { Settings } from 'lucide-react';

export default function EditorsSettings({ user }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Editors Settings</h1>
        <p className="text-slate-500 mt-1">Configure editor preferences and workflows</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <div className="text-center py-12">
          <Settings className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400">Settings coming soon</p>
        </div>
      </div>
    </div>
  );
}