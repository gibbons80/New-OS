import React from 'react';
import { Phone, Sparkles, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SalesTrainer() {
  return (
    <div className="min-h-screen flex items-start justify-center pt-12">
      <div className="text-center space-y-4 max-w-md">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-purple-400 blur-3xl opacity-20 animate-pulse" />
          <div className="relative flex justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <Phone className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-600 bg-clip-text text-transparent">
            AI Cold Calling Trainer
          </h1>
          <div className="flex items-center justify-center gap-2 text-emerald-600">
            <Sparkles className="w-4 h-4" />
            <p className="text-lg font-semibold">Master Your Cold Calling Skills</p>
          </div>
        </div>
        
        <p className="text-slate-600 text-base">
          Practice real-world cold calling scenarios with our AI-powered trainer. Get instant feedback, improve your pitch, and build confidence before making actual calls.
        </p>
        
        <div className="pt-2">
          <a 
            href="https://sales.windowstill.com" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Start Training Now
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}