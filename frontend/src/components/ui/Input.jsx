import React from 'react';

export default function Input({
  value,
  onChange,
  type = 'text',
  placeholder = '',
  label = '',
  disabled = false,
  error = '',
  className = '',
  id = '',
  rows = 1
}) {
  const baseInputStyles = `w-full py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-sm text-slate-800 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-600 outline-none focus:border-indigo-500/50 dark:focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all duration-300 shadow-inner disabled:opacity-50 disabled:cursor-not-allowed`;

  return (
    <div className={`w-full flex flex-col space-y-2 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest pl-1 select-none">
          {label}
        </label>
      )}
      
      {type === 'textarea' ? (
        <textarea
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={`${baseInputStyles} resize-none`}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={baseInputStyles}
        />
      )}
      
      {error && (
        <span className="text-[10px] text-rose-500 font-bold pl-1 select-none">
          {error}
        </span>
      )}
    </div>
  );
}
