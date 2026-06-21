import React from 'react';
import { motion } from 'framer-motion';

export default function Card({ 
  children, 
  onClick, 
  hover = true, 
  className = '' 
}) {
  const isClickable = typeof onClick === 'function';

  return (
    <motion.div
      onClick={onClick}
      whileHover={hover && isClickable ? { scale: 1.01, translateY: -2 } : {}}
      whileTap={hover && isClickable ? { scale: 0.99 } : {}}
      className={`bg-white/80 dark:bg-[#1E293B]/70 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl shadow-md dark:shadow-xl ${
        isClickable ? 'cursor-pointer' : ''
      } transition-colors duration-300 ${
        className.includes('p-') ? '' : 'p-6'
      } ${className}`}
    >
      {children}
    </motion.div>
  );
}
