import React from 'react';
import { Receipt } from 'lucide-react';

export default function HRExpenseReport() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
          <Receipt className="w-8 h-8 text-rose-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Coming Soon</h2>
        <p className="text-slate-600">
          Expense reporting and tracking
        </p>
      </div>
    </div>
  );
}