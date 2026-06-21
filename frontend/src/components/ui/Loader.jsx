import React from 'react';

export function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  };

  return (
    <div
      className={`animate-spin rounded-full border-t-transparent border-indigo-500 dark:border-indigo-400 ${sizes[size]} ${className}`}
    />
  );
}

export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-xl bg-slate-200 dark:bg-white/5 ${className}`} />
  );
}

export function TypingIndicator({ className = '' }) {
  return (
    <div className={`flex items-center space-x-1.5 p-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl rounded-bl-none ${className}`}>
      <span className="w-1.5 h-1.5 bg-[#6366F1] rounded-full typing-dot"></span>
      <span className="w-1.5 h-1.5 bg-[#6366F1] rounded-full typing-dot"></span>
      <span className="w-1.5 h-1.5 bg-[#6366F1] rounded-full typing-dot"></span>
    </div>
  );
}
