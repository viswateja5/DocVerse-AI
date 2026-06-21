import React from 'react';
import { motion } from 'framer-motion';

export default function Button({ 
  children, 
  onClick, 
  type = 'button', 
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg'
  disabled = false,
  className = '',
  icon = null
}) {
  const baseStyles = 'inline-flex items-center justify-center rounded-xl font-bold tracking-wide transition-all focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed select-none shadow-sm';
  
  const variants = {
    primary: 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5053df] hover:to-[#7c4bf3] text-white hover:shadow-lg shadow-[#6366F1]/10',
    secondary: 'bg-slate-200 hover:bg-slate-350 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-gray-200 border border-slate-300 dark:border-white/5',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white hover:shadow-lg shadow-rose-600/10',
    ghost: 'bg-transparent hover:bg-slate-200 dark:hover:bg-white/5 text-slate-650 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3.5 text-base gap-2.5'
  };

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </motion.button>
  );
}
