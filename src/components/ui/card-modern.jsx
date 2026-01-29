import React from 'react';
import { cn } from '@/lib/utils';

export const ModernCard = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300",
      className
    )}
    {...props}
  >
    {children}
  </div>
));
ModernCard.displayName = "ModernCard";

export const ModernCardHeader = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-4 md:p-6 border-b border-slate-100", className)}
    {...props}
  >
    {children}
  </div>
));
ModernCardHeader.displayName = "ModernCardHeader";

export const ModernCardContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-4 md:p-6", className)}
    {...props}
  >
    {children}
  </div>
));
ModernCardContent.displayName = "ModernCardContent";

export const ModernCardTitle = React.forwardRef(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg md:text-xl font-semibold text-slate-900", className)}
    {...props}
  >
    {children}
  </h3>
));
ModernCardTitle.displayName = "ModernCardTitle";