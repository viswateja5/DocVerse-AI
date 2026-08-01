import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { Search, Home, Activity, Database, Settings, ShieldAlert, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === 'n' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(false);
        navigate('/datasets');
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [navigate]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-2xl relative z-50 mx-4"
          >
            <Command 
              className="bg-card/90 backdrop-blur-3xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              shouldFilter={true}
            >
              <div className="flex items-center px-4 border-b border-border/50">
                <Search className="w-5 h-5 text-muted-foreground" />
                <Command.Input 
                  autoFocus
                  placeholder="Search commands, navigate, or perform actions..." 
                  className="flex-1 px-4 py-4 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                />
                <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted rounded-md text-muted-foreground transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <Command.List className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-muted">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">No results found.</Command.Empty>

                <Command.Group heading="Navigation" className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                  <Command.Item onSelect={() => runCommand(() => navigate('/'))} className="flex items-center gap-3 px-3 py-2 mt-1 rounded-xl cursor-pointer aria-selected:bg-primary/10 aria-selected:text-primary transition-colors text-sm font-medium text-foreground">
                    <Home className="w-4 h-4" /> Home Dashboard
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => navigate('/forecast'))} className="flex items-center gap-3 px-3 py-2 mt-1 rounded-xl cursor-pointer aria-selected:bg-primary/10 aria-selected:text-primary transition-colors text-sm font-medium text-foreground">
                    <Activity className="w-4 h-4" /> New AI Forecast
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => navigate('/datasets'))} className="flex items-center gap-3 px-3 py-2 mt-1 rounded-xl cursor-pointer aria-selected:bg-primary/10 aria-selected:text-primary transition-colors text-sm font-medium text-foreground">
                    <Database className="w-4 h-4" /> Global Datasets
                  </Command.Item>
                  <Command.Item onSelect={() => runCommand(() => navigate('/settings'))} className="flex items-center gap-3 px-3 py-2 mt-1 rounded-xl cursor-pointer aria-selected:bg-primary/10 aria-selected:text-primary transition-colors text-sm font-medium text-foreground">
                    <Settings className="w-4 h-4" /> Settings
                  </Command.Item>
                </Command.Group>

                {user?.role === 'admin' && (
                  <Command.Group heading="Admin Tools" className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2 border-t border-border/50 pt-3">
                    <Command.Item onSelect={() => runCommand(() => navigate('/admin'))} className="flex items-center gap-3 px-3 py-2 mt-1 rounded-xl cursor-pointer aria-selected:bg-primary/10 aria-selected:text-primary transition-colors text-sm font-medium text-foreground">
                      <ShieldAlert className="w-4 h-4" /> Enterprise Admin Console
                    </Command.Item>
                  </Command.Group>
                )}
              </Command.List>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
