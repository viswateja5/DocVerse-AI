import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MessageSquare, 
  FileText, 
  Database, 
  Zap, 
  Clock, 
  ArrowLeft, 
  RefreshCw,
  TrendingUp,
  Activity,
  Server
} from 'lucide-react';
import { fetchAdminStats } from '../api';

export default function Dashboard({ onBackToChat }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminStats();
      setStats(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard analytics statistics. Verify authorization or server connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const cacheHitRatio = stats 
    ? (stats.cache_hits / (stats.query_count || 1)) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0b0f] via-[#12131a] to-[#181922] text-gray-200 p-6 md:p-10 font-sans select-none overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-fade-in">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 border-b border-white/5 pb-6 bg-black/10 p-5 rounded-2xl">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 font-extrabold text-[10px] uppercase tracking-widest mb-1.5 font-mono">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Admin Monitoring Console</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">System Performance & Stats</h1>
          </div>
          
          <div className="flex items-center space-x-3 select-none">
            <button
              onClick={loadStats}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 hover:text-white hover:scale-105 active:scale-95 transition-all duration-150 focus:outline-none flex items-center justify-center disabled:opacity-40"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onBackToChat}
              className="flex items-center space-x-2 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 hover:scale-105 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-[0_4px_12px_rgba(16,185,129,0.15)] focus:outline-none"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span>Back to Chat</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-rose-950/20 border border-rose-800/30 p-4 rounded-xl text-xs text-rose-400 font-bold text-center animate-fade-in shadow-sm">
            ⚠️ {error}
          </div>
        )}

        {loading && !stats ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-3">
            <RefreshCw className="w-10 h-10 animate-spin text-emerald-500" />
            <p className="text-sm font-bold animate-pulse text-emerald-400/80">Fetching performance metrics...</p>
          </div>
        ) : (
          stats && (
            <div className="space-y-8 animate-fade-in">
              
              {/* Analytics Core Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* User registration count */}
                <div className="bg-[#13141c]/90 border border-white/5 hover:border-white/10 hover:scale-[1.02] hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-300 p-6 rounded-2xl flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-950/30 border border-blue-900/20 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total User Accounts</p>
                    <h2 className="text-3xl font-extrabold text-white mt-1 tracking-tight">{stats.total_users}</h2>
                  </div>
                </div>

                {/* Chat session count */}
                <div className="bg-[#13141c]/90 border border-white/5 hover:border-white/10 hover:scale-[1.02] hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-300 p-6 rounded-2xl flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-950/30 border border-purple-900/20 flex items-center justify-center text-purple-400 shrink-0 shadow-inner">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Chat Sessions</p>
                    <h2 className="text-3xl font-extrabold text-white mt-1 tracking-tight">{stats.total_chats}</h2>
                  </div>
                </div>

                {/* Uploaded documents count */}
                <div className="bg-[#13141c]/90 border border-white/5 hover:border-white/10 hover:scale-[1.02] hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-300 p-6 rounded-2xl flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-950/30 border border-emerald-800/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Uploaded Documents</p>
                    <h2 className="text-3xl font-extrabold text-white mt-1 tracking-tight">{stats.uploaded_documents}</h2>
                  </div>
                </div>

                {/* Total chunk count */}
                <div className="bg-[#13141c]/90 border border-white/5 hover:border-white/10 hover:scale-[1.02] hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-300 p-6 rounded-2xl flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-950/30 border border-amber-900/20 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Vector DB Chunks</p>
                    <h2 className="text-3xl font-extrabold text-white mt-1 tracking-tight">{stats.number_of_chunks}</h2>
                  </div>
                </div>

                {/* Query execution count */}
                <div className="bg-[#13141c]/90 border border-white/5 hover:border-white/10 hover:scale-[1.02] hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-300 p-6 rounded-2xl flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-pink-950/30 border border-pink-900/20 flex items-center justify-center text-pink-400 shrink-0 shadow-inner">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">RAG Query Executions</p>
                    <h2 className="text-3xl font-extrabold text-white mt-1 tracking-tight">{stats.query_count}</h2>
                  </div>
                </div>

                {/* Average response latency */}
                <div className="bg-[#13141c]/90 border border-white/5 hover:border-white/10 hover:scale-[1.02] hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-300 p-6 rounded-2xl flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-950/30 border border-rose-900/20 flex items-center justify-center text-rose-400 shrink-0 shadow-inner">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Average Latency</p>
                    <h2 className="text-3xl font-extrabold text-white mt-1 tracking-tight">
                      {stats.average_response_time > 0 ? `${stats.average_response_time.toFixed(3)}s` : "0.00s"}
                    </h2>
                  </div>
                </div>

              </div>

              {/* Cache Efficiency Segment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Cache Hits Card info */}
                <div className="bg-[#13141c]/90 border border-white/5 hover:border-white/10 transition-all duration-300 p-6 rounded-2xl flex flex-col justify-between shadow-xl">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-lg font-bold text-white">Cache Performance</h3>
                      <p className="text-xs text-gray-500">Query caching hit distributions (Redis vs LLM)</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-orange-950/30 border border-orange-900/20 flex items-center justify-center text-orange-400 shrink-0 shadow-inner">
                      <Zap className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-xs text-gray-400">Total Cache Hits:</span>
                      <span className="text-xl font-bold text-emerald-400">{stats.cache_hits}</span>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1.5 font-mono">
                        <span>Cache Hit Ratio</span>
                        <span className="font-bold text-emerald-400">{cacheHitRatio.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-black/40 border border-white/5 rounded-full h-3 overflow-hidden shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
                          style={{ width: `${Math.min(cacheHitRatio, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Diagnostics Stats */}
                <div className="bg-[#13141c]/90 border border-white/5 hover:border-white/10 transition-all duration-300 p-6 rounded-2xl flex flex-col justify-between shadow-xl">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-lg font-bold text-white">RAG Index Health</h3>
                      <p className="text-xs text-gray-500">Vector store density diagnostics</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-950/30 border border-emerald-800/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Index Type:</span>
                      <span className="font-bold text-gray-200">FAISS Index (CPU)</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Average Chunks / PDF:</span>
                      <span className="font-bold text-gray-200">
                        {stats.uploaded_documents > 0 
                          ? (stats.number_of_chunks / stats.uploaded_documents).toFixed(1) 
                          : "0.0"}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Cache Status:</span>
                      <span className="font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-[10px] font-mono">Active</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )
        )}

      </div>
    </div>
  );
}
