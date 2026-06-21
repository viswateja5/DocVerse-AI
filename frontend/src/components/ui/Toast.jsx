import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      
      {/* Toast Overlay Container */}
      <div className="fixed bottom-5 right-5 z-55 flex flex-col space-y-3.5 max-w-sm pointer-events-none select-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            const icons = {
              success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
              error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
              info: <Info className="w-5 h-5 text-sky-400 shrink-0" />
            };

            const bgColors = {
              success: 'bg-emerald-50/95 dark:bg-emerald-950/90 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300',
              error: 'bg-rose-50/95 dark:bg-rose-950/90 border border-rose-500/20 text-rose-800 dark:text-rose-300',
              info: 'bg-sky-50/95 dark:bg-sky-950/90 border border-sky-500/20 text-sky-800 dark:text-sky-300'
            };

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.9 }}
                transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                className={`p-4 rounded-2xl shadow-lg flex items-start space-x-3 pointer-events-auto backdrop-blur-md ${bgColors[toast.type]}`}
              >
                {icons[toast.type]}
                <div className="flex-1 text-xs font-bold leading-tight">{toast.message}</div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-slate-400 hover:text-slate-650 dark:hover:text-white p-0.5 rounded transition-all focus:outline-none"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
