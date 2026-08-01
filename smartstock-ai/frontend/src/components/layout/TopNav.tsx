import React from 'react';
import { Search, Bell, User } from 'lucide-react';
import { motion } from 'framer-motion';

export function TopNav() {
  return (
    <div className="w-full h-16 border-b border-border/50 bg-background/50 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between px-8">
      <div className="flex-1 max-w-md">
        <button 
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
          }}
          className="w-full flex items-center justify-between px-4 py-2 bg-muted/50 hover:bg-muted border border-border/50 rounded-xl text-muted-foreground text-sm transition-colors"
        >
          <span className="flex items-center gap-2"><Search className="w-4 h-4" /> Search globally...</span>
          <kbd className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] font-medium opacity-50"><span className="text-xs">⌘</span>K</kbd>
        </button>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
        </button>
        <button className="p-1.5 bg-muted border border-border rounded-full hover:bg-muted/80 transition-colors">
          <User className="w-4 h-4 text-foreground" />
        </button>
      </div>
    </div>
  );
}
