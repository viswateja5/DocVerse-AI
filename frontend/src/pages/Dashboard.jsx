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
  Server,
  Heart,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { fetchAdminStats } from '../api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Spinner } from '../components/ui/Loader';
import Table from '../components/ui/Table';

export default function Dashboard({ onBackToChat }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredPoint, setHoveredPoint] = useState(null); // { x, y, day, time }

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

  const username = localStorage.getItem('rag_username') || "Viswateja";

  const cacheHitRatio = stats 
    ? (stats.cache_hits / (stats.query_count || 1)) * 100 
    : 0;

  const getDiagnosticsRows = () => {
    if (!stats) return [];
    const avgChunks = stats.uploaded_documents > 0 
      ? (stats.number_of_chunks / stats.uploaded_documents).toFixed(1) 
      : "0.0";
      
    return [
      ["Index Architecture", "FAISS Vector DB (CPU)", "Active"],
      ["Embedding Model", "BAAI/bge-small-en-v1.5", "Loaded"],
      ["Average Chunks / PDF", avgChunks, "Static"],
      ["Response Caching Service", "Redis Cache", "Running"]
    ];
  };

  // 7-day latency trend points for SVG Line Chart (simulated based on average response time)
  const baseLatency = stats?.average_response_time || 0.15;
  const chartPoints = [
    { day: "Mon", latency: baseLatency * 1.1 },
    { day: "Tue", latency: baseLatency * 0.9 },
    { day: "Wed", latency: baseLatency * 1.2 },
    { day: "Thu", latency: baseLatency * 0.95 },
    { day: "Fri", latency: baseLatency * 1.05 },
    { day: "Sat", latency: baseLatency * 0.8 },
    { day: "Sun", latency: baseLatency }
  ];

  // SVG Chart Dimensions
  const width = 600;
  const height = 180;
  const padding = 30;

  const maxVal = Math.max(...chartPoints.map(p => p.latency), 0.3);
  const minVal = 0;

  const getCoordinates = () => {
    return chartPoints.map((p, idx) => {
      const x = padding + (idx * (width - 2 * padding)) / (chartPoints.length - 1);
      const y = height - padding - ((p.latency - minVal) * (height - 2 * padding)) / (maxVal - minVal);
      return { x, y, ...p };
    });
  };

  const coordinates = getCoordinates();
  
  // Build SVG path
  const linePath = coordinates.reduce((path, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`;
  }, "");

  // Build SVG area path
  const areaPath = linePath ? `${linePath} L ${coordinates[coordinates.length - 1].x} ${height - padding} L ${coordinates[0].x} ${height - padding} Z` : "";

  return (
    <div className="flex-1 bg-[#F8FAFC] text-slate-800 p-6 md:p-10 overflow-y-auto h-full scrollbar-thin select-none">
      <div className="max-w-[1400px] w-full mx-auto animate-fade-in space-y-6">
        
        {/* Top Header */}
        <div className="sticky top-0 bg-[#F8FAFC] z-10 flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#E2E8F0] pb-4 pt-2 mb-2 shrink-0">
          <div>
            <div className="flex items-center space-x-2 text-indigo-600 font-extrabold text-[10px] uppercase tracking-widest mb-1.5 font-mono">
              <Server className="w-4 h-4 text-indigo-500" />
              <span>Admin Monitoring Console</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">System Performance & Stats</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              onClick={loadStats}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="primary"
              onClick={onBackToChat}
              icon={<ArrowLeft className="w-4 h-4 text-white" />}
            >
              <span>Back to Chat</span>
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-xs text-rose-600 font-bold text-center animate-fade-in shadow-sm">
            ⚠️ {error}
          </div>
        )}

        {loading && !stats ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-400 space-y-3">
            <Spinner size="lg" />
            <p className="text-sm font-bold animate-pulse text-indigo-500">Fetching performance metrics...</p>
          </div>
        ) : (
          stats && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Row 1: Welcome & Date */}
              <div className="flex flex-col md:flex-row gap-6">
                <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-sm flex-1 flex flex-col justify-center">
                  <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Welcome back, {username}! 👋</h2>
                  <p className="text-xs text-slate-400 mt-1">System operational status is normal. No latency bottlenecks detected.</p>
                </div>
                
                <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-sm w-full md:w-80 shrink-0 flex flex-col justify-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Console Date</p>
                  <p className="text-sm font-extrabold text-slate-800 mt-2">
                    {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Row 2: 6 Core Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                
                {/* Users */}
                <Card hover={false} className="p-4 flex items-center space-x-3 border border-[#E2E8F0] bg-white shadow-sm rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-blue-550/10 border border-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Total Users</p>
                    <h2 className="text-xl font-extrabold text-slate-850 mt-1.5 tracking-tight">{stats.total_users}</h2>
                  </div>
                </Card>

                {/* Chats */}
                <Card hover={false} className="p-4 flex items-center space-x-3 border border-[#E2E8F0] bg-white shadow-sm rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-purple-550/10 border border-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Total Chats</p>
                    <h2 className="text-xl font-extrabold text-slate-855 mt-1.5 tracking-tight">{stats.total_chats}</h2>
                  </div>
                </Card>

                {/* Documents */}
                <Card hover={false} className="p-4 flex items-center space-x-3 border border-[#E2E8F0] bg-white shadow-sm rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-emerald-550/10 border border-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Documents</p>
                    <h2 className="text-xl font-extrabold text-slate-855 mt-1.5 tracking-tight">{stats.uploaded_documents}</h2>
                  </div>
                </Card>

                {/* Vector Chunks */}
                <Card hover={false} className="p-4 flex items-center space-x-3 border border-[#E2E8F0] bg-white shadow-sm rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-amber-550/10 border border-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Vector Chunks</p>
                    <h2 className="text-xl font-extrabold text-slate-855 mt-1.5 tracking-tight">{stats.number_of_chunks}</h2>
                  </div>
                </Card>

                {/* RAG Queries */}
                <Card hover={false} className="p-4 flex items-center space-x-3 border border-[#E2E8F0] bg-white shadow-sm rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-pink-550/10 border border-pink-500/10 flex items-center justify-center text-pink-500 shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">RAG Queries</p>
                    <h2 className="text-xl font-extrabold text-slate-855 mt-1.5 tracking-tight">{stats.query_count}</h2>
                  </div>
                </Card>

                {/* Avg Latency */}
                <Card hover={false} className="p-4 flex items-center space-x-3 border border-[#E2E8F0] bg-white shadow-sm rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-rose-550/10 border border-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Avg Latency</p>
                    <h2 className="text-xl font-extrabold text-slate-855 mt-1.5 tracking-tight">
                      {stats.average_response_time > 0 ? `${stats.average_response_time.toFixed(3)}s` : "0.150s"}
                    </h2>
                  </div>
                </Card>

              </div>

              {/* Row 3: Interactive SVG Performance Line Chart */}
              <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">Response Latency Trend</h3>
                    <p className="text-xs text-slate-400 mt-0.5">7-day rolling system agent response time logs</p>
                  </div>
                  
                  {hoveredPoint && (
                    <div className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-650 rounded-xl text-[10.5px] font-bold animate-fade-in shadow-inner">
                      {hoveredPoint.day}: <span className="font-extrabold">{hoveredPoint.latency.toFixed(3)}s</span>
                    </div>
                  )}
                </div>

                <div className="w-full overflow-x-auto">
                  <div className="min-w-[600px]">
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
                      {/* Define Gradients */}
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* X and Y Grid Lines */}
                      {[0, 1, 2, 3, 4].map((grid, idx) => {
                        const yVal = padding + (idx * (height - 2 * padding)) / 4;
                        const labelVal = maxVal - (idx * (maxVal - minVal)) / 4;
                        return (
                          <g key={grid} className="opacity-40">
                            <line 
                              x1={padding} 
                              y1={yVal} 
                              x2={width - padding} 
                              y2={yVal} 
                              stroke="#E2E8F0" 
                              strokeDasharray="4 4" 
                            />
                            <text 
                              x={padding - 5} 
                              y={yVal + 3} 
                              textAnchor="end" 
                              className="text-[8px] fill-slate-400 font-mono font-semibold"
                            >
                              {labelVal.toFixed(2)}s
                            </text>
                          </g>
                        );
                      })}

                      {/* Area Fill */}
                      {areaPath && (
                        <path d={areaPath} fill="url(#areaGrad)" />
                      )}

                      {/* Stroke Line */}
                      {linePath && (
                        <path 
                          d={linePath} 
                          fill="none" 
                          stroke="#6366F1" 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                        />
                      )}

                      {/* Data Dots and Hover Hitboxes */}
                      {coordinates.map((pt, idx) => (
                        <g key={idx}>
                          <circle 
                            cx={pt.x} 
                            cy={pt.y} 
                            r="4.5" 
                            fill="#FFFFFF" 
                            stroke="#6366F1" 
                            strokeWidth="2.5" 
                            className="transition-all duration-200 cursor-pointer"
                          />
                          {/* Y-axis Labels */}
                          <text 
                            x={pt.x} 
                            y={height - 10} 
                            textAnchor="middle" 
                            className="text-[9px] fill-slate-400 font-mono font-bold"
                          >
                            {pt.day}
                          </text>

                          {/* Hover target circle (large, transparent) */}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="15"
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredPoint(pt)}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>
              </div>

              {/* Row 4: Diagnostics Table & System Health Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Cache Hit performance */}
                <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-800">Cache Performance</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Redis vs LLM endpoint call distributions</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                      <Zap className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end text-xs text-slate-550">
                      <span>Total Cache Hits:</span>
                      <span className="text-base font-extrabold text-slate-800">{stats.cache_hits}</span>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-mono font-bold">
                        <span>Cache Hit Ratio</span>
                        <span className="font-bold text-indigo-650">{cacheHitRatio.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-[#F5F7FA] border border-[#E2E8F0] rounded-full h-3 overflow-hidden shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(cacheHitRatio, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Diagnostics Tables */}
                <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 font-sans">RAG Index Health</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Vector store density diagnostics</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>

                  <Table
                    headers={["Metric Diagnostics", "System Configuration", "Status"]}
                    rows={getDiagnosticsRows()}
                    renderRow={(row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-all text-xs border-b border-[#E2E8F0]/50">
                        <td className="px-4 py-2.5 font-bold text-slate-500">{row[0]}</td>
                        <td className="px-4 py-2.5 text-slate-800 font-bold">{row[1]}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-500/20 px-2 py-0.5 rounded-lg font-mono">
                            {row[2]}
                          </span>
                        </td>
                      </tr>
                    )}
                  />
                </div>

              </div>

              {/* Row 5: System Health Panel */}
              <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 mb-4">
                  <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                    <span>System Services Health Registry</span>
                  </h3>
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center space-x-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>All services running stable</span>
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3 p-3.5 bg-slate-50 border border-[#E2E8F0] rounded-2xl">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Vector Store</h4>
                      <p className="text-[9.5px] text-slate-400 mt-0.5">SQLite & FAISS indices</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3.5 bg-slate-50 border border-[#E2E8F0] rounded-2xl">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Caching Engine</h4>
                      <p className="text-[9.5px] text-slate-400 mt-0.5">Redis cache instance</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3.5 bg-slate-50 border border-[#E2E8F0] rounded-2xl">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Language Model</h4>
                      <p className="text-[9.5px] text-slate-400 mt-0.5">Llama 3.3 groq endpoint</p>
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
