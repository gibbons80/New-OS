import React from 'react';
import { GraduationCap } from 'lucide-react';

export default function TrainerDashboard() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-200 p-12 md:p-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-6">
          <GraduationCap className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-indigo-900 mb-4">
          Trainer Dashboard
        </h1>
        <p className="text-lg text-indigo-700 mb-8">
          Coming soon. Advanced training analytics and photographer management tools will be available here.
        </p>
        <div className="inline-block px-6 py-3 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium">
          ✨ We're building something great
        </div>
      </div>
    </div>
  );
}