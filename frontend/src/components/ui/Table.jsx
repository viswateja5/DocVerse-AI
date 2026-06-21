import React from 'react';

export default function Table({
  headers = [],
  rows = [], // array of arrays or objects
  renderRow = null, // optional row renderer
  className = '',
  maxHeight = 'max-h-[450px]'
}) {
  return (
    <div className={`overflow-x-auto overflow-y-auto border border-slate-200 dark:border-white/5 rounded-2xl scrollbar-thin ${maxHeight} ${className}`}>
      <table className="min-w-full divide-y divide-slate-200 dark:divide-white/10 bg-white/40 dark:bg-black/10 backdrop-blur-md">
        <thead className="sticky top-0 z-10">
          <tr>
            {headers.map((header, idx) => (
              <th
                key={idx}
                className="px-6 py-3.5 text-left text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider select-none bg-slate-100 dark:bg-[#161720] border-b border-slate-200 dark:border-white/10"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs text-slate-700 dark:text-gray-300 font-medium">
          {rows.map((row, rIdx) => {
            if (typeof renderRow === 'function') {
              return renderRow(row, rIdx);
            }
            
            // Fallback default row renderer (assumes row is array of cells)
            return (
              <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                {Array.isArray(row) ? (
                  row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-6 py-4 whitespace-nowrap">
                      {cell}
                    </td>
                  ))
                ) : (
                  <td className="px-6 py-4 whitespace-nowrap" colSpan={headers.length}>
                    Invalid row structure
                  </td>
                )}
              </tr>
            );
          })}
          
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-6 py-10 text-center text-slate-400 dark:text-gray-500 italic">
                No record matches found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
