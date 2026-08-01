import React, { useEffect, useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Users, Database, Activity, HardDrive, ShieldAlert, Cpu, Trash2, Shield, Loader2, ArrowLeft } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import api from '../../lib/axios';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<any>(null);
  const [system, setSystem] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 73,
    overscan: 5,
  });

  // CPU/Mem history for real-time charting
  const [systemHistory, setSystemHistory] = useState<any[]>([]);

  const fetchStats = async () => {
    try {
      const [resStats, resSystem, resLogs] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/system'),
        api.get('/admin/audit-logs')
      ]);
      setStats(resStats.data);
      setSystem(resSystem.data);
      setAuditLogs(resLogs.data);
      setSystemHistory(prev => [...prev.slice(-20), { time: new Date().toLocaleTimeString(), cpu: resSystem.data.cpu_percent, mem: resSystem.data.memory_percent }]);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const res = await api.get('/admin/users');
    setUsers(res.data);
  };

  const fetchDatasets = async () => {
    const res = await api.get('/admin/datasets');
    setDatasets(res.data);
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        await api.delete(`/admin/users/${id}`);
        setUsers(users.filter(u => u.id !== id));
      } catch (e: any) {
        alert(e.response?.data?.detail || "Failed to delete user");
      }
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'datasets') fetchDatasets();
  }, [activeTab]);

  const tabs = [
    { id: 'overview', label: 'Platform Overview' },
    { id: 'users', label: 'User Management' },
    { id: 'datasets', label: 'Global Datasets' },
    { id: 'audit', label: 'Audit Logs' }
  ];

  if (loading && !stats) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 pt-4 min-h-screen pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            <ShieldAlert className="w-8 h-8" /> Enterprise Admin Console
          </h1>
          <p className="text-muted-foreground mt-1">Platform management, telemetry, and security oversight.</p>
        </div>
        
        <div className="flex p-1 bg-muted/50 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                activeTab === tab.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="adminTab"
                  className="absolute inset-0 bg-card shadow-sm rounded-lg"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            
            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 bg-gradient-to-br from-card to-card/50 backdrop-blur-3xl border border-border shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Users className="w-24 h-24" /></div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Users</p>
                <p className="text-4xl font-bold text-blue-500">{stats?.total_users}</p>
              </Card>
              <Card className="p-6 bg-gradient-to-br from-card to-card/50 backdrop-blur-3xl border border-border shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Database className="w-24 h-24" /></div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Datasets</p>
                <p className="text-4xl font-bold text-emerald-500">{stats?.total_datasets}</p>
              </Card>
              <Card className="p-6 bg-gradient-to-br from-card to-card/50 backdrop-blur-3xl border border-border shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Activity className="w-24 h-24" /></div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">API Requests</p>
                <p className="text-4xl font-bold text-purple-500">{stats?.prediction_requests}</p>
              </Card>
              <Card className="p-6 bg-gradient-to-br from-card to-card/50 backdrop-blur-3xl border border-border shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><HardDrive className="w-24 h-24" /></div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Storage Used</p>
                <p className="text-4xl font-bold text-rose-500">{stats?.storage_mb} MB</p>
              </Card>
            </div>

            {/* System Health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 bg-card/60 backdrop-blur-xl border border-border shadow-2xl h-[350px]">
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-6"><Cpu className="w-5 h-5 text-primary" /> CPU Utilization</h3>
                <ResponsiveContainer width="100%" height="85%">
                  <AreaChart data={systemHistory}>
                    <defs>
                      <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis dataKey="time" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="cpu" stroke="#ec4899" fill="url(#colorCpu)" strokeWidth={2} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6 bg-card/60 backdrop-blur-xl border border-border shadow-2xl h-[350px]">
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-6"><HardDrive className="w-5 h-5 text-primary" /> Memory Usage</h3>
                <ResponsiveContainer width="100%" height="85%">
                  <AreaChart data={systemHistory}>
                    <defs>
                      <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis dataKey="time" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="mem" stroke="#3b82f6" fill="url(#colorMem)" strokeWidth={2} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            
            <Card className="p-0 overflow-hidden bg-card/60 backdrop-blur-xl border border-border shadow-2xl">
              <div className="bg-muted/50 text-muted-foreground uppercase text-xs flex p-4 font-medium border-b border-border">
                <div className="flex-1">Email</div>
                <div className="w-24">Role</div>
                <div className="w-24">Status</div>
                <div className="w-32">Created At</div>
                <div className="w-16 text-right">Actions</div>
              </div>
              <div ref={parentRef} className="h-[400px] overflow-auto custom-scrollbar relative">
                <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const u = users[virtualRow.index];
                    return (
                      <div
                        key={virtualRow.index}
                        className="flex items-center p-4 border-b border-border/50 hover:bg-muted/30 transition-colors absolute top-0 left-0 w-full"
                        style={{ height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}
                      >
                        <div className="flex-1 font-medium text-foreground truncate pr-4">{u.email}</div>
                        <div className="w-24">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{u.role}</span>
                        </div>
                        <div className="w-24">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${u.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>{u.is_active ? 'Active' : 'Disabled'}</span>
                        </div>
                        <div className="w-32 text-muted-foreground text-sm">{new Date(u.created_at).toLocaleDateString()}</div>
                        <div className="w-16 text-right">
                          <button onClick={() => handleDeleteUser(u.id)} className="text-rose-500 hover:text-rose-400 p-2"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'datasets' && (
          <motion.div key="datasets" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
             <Card className="p-0 overflow-hidden bg-card/60 backdrop-blur-xl border border-border shadow-2xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4 font-medium">Dataset Name</th>
                    <th className="px-6 py-4 font-medium">Owner</th>
                    <th className="px-6 py-4 font-medium">Size</th>
                    <th className="px-6 py-4 font-medium">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {datasets.map(d => (
                    <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">{d.name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{d.owner}</td>
                      <td className="px-6 py-4 text-muted-foreground">{(d.size_bytes / 1024 / 1024).toFixed(2)} MB</td>
                      <td className="px-6 py-4 text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </motion.div>
        )}

        {activeTab === 'audit' && (
          <motion.div key="audit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="p-6 bg-card/60 backdrop-blur-xl border border-border shadow-2xl">
              <h3 className="font-semibold text-lg mb-6">Recent System Activity</h3>
              <div className="space-y-4">
                {auditLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-4 p-4 border border-border rounded-xl bg-background/50">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg"><Shield className="w-5 h-5" /></div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{log.action}</p>
                      <p className="text-sm text-muted-foreground">{log.user}</p>
                    </div>
                    <p className="text-sm font-mono text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
