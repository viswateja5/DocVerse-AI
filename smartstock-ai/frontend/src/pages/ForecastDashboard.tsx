import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ScatterChart, Scatter, Cell, BarChart, Bar, ComposedChart } from 'recharts';
import { Card } from '../components/ui/Card';
import { AIInsights } from '../components/dashboard/AIInsights';
import { BrainCircuit, Activity, BarChart3, TrendingUp, Layers, Download, FileText, Image as ImageIcon, Table, FileSpreadsheet, ChevronDown, Code } from 'lucide-react';
import React, { useMemo, useState, useRef } from 'react';
import * as xlsx from 'xlsx';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

export const ForecastDashboard = React.memo(function ForecastDashboard({ data, onRestart }: { data: any, onRestart: () => void }) {
  const { champion_model, metrics, analytics } = data;
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const exportToCSV = () => {
    try {
      let csv = "Date,Actual,Forecast,CI_Lower,CI_Upper\n";
      mainChartData.forEach(row => {
        csv += `${row.date},${row.actual ?? ''},${row.forecast ?? ''},${row.lower ?? ''},${row.upper ?? ''}\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'forecast_results.csv';
      link.click();
      toast.success("CSV exported successfully");
    } catch (e) {
      toast.error("Failed to export CSV");
    }
  };

  const exportToExcel = () => {
    try {
      const wb = xlsx.utils.book_new();
      
      const wsData = mainChartData.map(row => ({
        Date: row.date,
        'Actual Sales': row.actual,
        'Forecast Sales': row.forecast,
        'Lower Bound (95%)': row.lower,
        'Upper Bound (95%)': row.upper
      }));
      const ws1 = xlsx.utils.json_to_sheet(wsData);
      xlsx.utils.book_append_sheet(wb, ws1, "Predictions");

      const wsMetrics = xlsx.utils.json_to_sheet([
        { Metric: "Champion Model", Value: champion_model },
        { Metric: "MAPE (%)", Value: metrics.mape },
        { Metric: "RMSE", Value: metrics.rmse }
      ]);
      xlsx.utils.book_append_sheet(wb, wsMetrics, "Metrics");

      xlsx.writeFile(wb, "forecast_results.xlsx");
      toast.success("Excel exported successfully");
    } catch (e) {
      toast.error("Failed to export Excel");
    }
  };

  const exportToPNG = async () => {
    if (!dashboardRef.current) return;
    const toastId = toast.loading("Capturing dashboard...");
    try {
      // Small timeout to ensure charts are fully animated
      await new Promise(r => setTimeout(r, 500)); 
      const dataUrl = await toPng(dashboardRef.current, { backgroundColor: '#09090b' });
      const link = document.createElement('a');
      link.download = 'forecast_dashboard.png';
      link.href = dataUrl;
      link.click();
      toast.success("PNG exported successfully", { id: toastId });
    } catch (err) {
      toast.error("Failed to export PNG", { id: toastId });
    }
  };

  const exportToPDF = async () => {
    if (!dashboardRef.current) return;
    const toastId = toast.loading("Generating PDF report...");
    try {
      await new Promise(r => setTimeout(r, 500));
      const dataUrl = await toPng(dashboardRef.current, { backgroundColor: '#09090b' });
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('forecast_report.pdf');
      toast.success("PDF exported successfully", { id: toastId });
    } catch (err) {
      toast.error("Failed to export PDF", { id: toastId });
    }
  };

  const exportToHTML = () => {
    const toastId = toast.loading("Generating Interactive HTML...");
    try {
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Forecast Report</title>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                body { font-family: -apple-system, sans-serif; background: #09090b; color: #fff; padding: 40px; }
                .card { background: #18181b; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #27272a; }
                h1, h2, h3 { color: #f4f4f5; }
            </style>
        </head>
        <body>
            <h1>Forecast Analytics Report</h1>
            <div class="card">
                <h3>Champion Model: ${champion_model}</h3>
                <p>MAPE: ${metrics.mape}% | RMSE: ${metrics.rmse}</p>
            </div>
            <div class="card" style="height: 500px;">
                <canvas id="mainChart"></canvas>
            </div>
            <script>
                const ctx = document.getElementById('mainChart').getContext('2d');
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ${JSON.stringify(mainChartData.map(d => d.date))},
                        datasets: [
                            { label: 'Actual', data: ${JSON.stringify(mainChartData.map(d => d.actual))}, borderColor: '#3b82f6', tension: 0.1 },
                            { label: 'Forecast', data: ${JSON.stringify(mainChartData.map(d => d.forecast))}, borderColor: '#ec4899', borderDash: [5, 5], tension: 0.1 }
                        ]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            </script>
        </body>
        </html>
        `;
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'interactive_forecast.html';
        link.click();
        toast.success("HTML exported successfully", { id: toastId });
    } catch (e) {
        toast.error("Failed to generate HTML", { id: toastId });
    }
  };

  
  // Prepare data for Main Chart (combining historical + forecast)
  const mainChartData = useMemo(() => {
    const hist = analytics.historical_dates.map((date: string, i: number) => ({
      date,
      actual: analytics.historical_actuals[i],
      lower: null,
      upper: null,
      forecast: null
    }));
    
    const future = analytics.forecast_dates.map((date: string, i: number) => ({
      date,
      actual: null,
      forecast: analytics.forecast_values[i],
      lower: analytics.ci_lower[i],
      upper: analytics.ci_upper[i]
    }));
    
    // Connect the lines by copying the last historical point to the start of forecast
    if (hist.length > 0 && future.length > 0) {
      const lastHist = hist[hist.length - 1];
      future.unshift({
        ...lastHist,
        forecast: lastHist.actual,
        lower: lastHist.actual,
        upper: lastHist.actual
      });
    }
    return [...hist, ...future];
  }, [analytics]);

  // Prepare data for Residuals
  const residualData = useMemo(() => {
    if (!analytics.test_actual || !analytics.test_predicted) return [];
    return analytics.test_actual.map((act: number, i: number) => ({
      actual: act,
      residual: act - analytics.test_predicted[i]
    }));
  }, [analytics]);

  // Prepare data for SHAP/Feature Importance
  const featureData = useMemo(() => {
    const importances = analytics.shap_values || analytics.feature_importance || {};
    return Object.entries(importances)
      .map(([feature, val]) => ({ feature, importance: Number(val) }))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 10); // top 10
  }, [analytics]);

  // Prepare data for Decomposition
  const decompData = useMemo(() => {
    return analytics.historical_dates.map((date: string, i: number) => ({
      date,
      trend: analytics.historical_trend[i] || null,
      seasonality: analytics.historical_seasonality[i] || null
    }));
  }, [analytics]);
  
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;
  const totalPages = Math.ceil(analytics.forecast_dates.length / rowsPerPage);
  
  return (
    <div className="space-y-8 min-h-screen pb-20 pt-4" ref={dashboardRef}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            <BrainCircuit className="w-8 h-8" />
            AI Forecast Results
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">Interactive explainability and predictive confidence bounds.</p>
        </div>
        
        <div className="flex gap-3 relative">
          <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex items-center gap-2 px-4 py-2 bg-card border border-border hover:bg-muted rounded-xl font-medium transition-all shadow-sm">
            <Download className="w-4 h-4" /> Export <ChevronDown className="w-4 h-4" />
          </button>
          
          <AnimatePresence>
            {showExportMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-12 right-32 w-56 bg-card/90 backdrop-blur-xl border border-border shadow-2xl rounded-xl overflow-hidden z-50 flex flex-col"
              >
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">Data Exports</div>
                <button onClick={() => { exportToCSV(); setShowExportMenu(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-muted text-sm text-left transition-colors"><Table className="w-4 h-4 text-emerald-500" /> Export as CSV</button>
                <button onClick={() => { exportToExcel(); setShowExportMenu(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-muted text-sm text-left transition-colors"><FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Export as Excel</button>
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border border-t mt-1">Report Exports</div>
                <button onClick={() => { exportToPDF(); setShowExportMenu(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-muted text-sm text-left transition-colors"><FileText className="w-4 h-4 text-rose-500" /> Save as PDF</button>
                <button onClick={() => { exportToPNG(); setShowExportMenu(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-muted text-sm text-left transition-colors"><ImageIcon className="w-4 h-4 text-rose-500" /> Save as PNG</button>
                <button onClick={() => { exportToHTML(); setShowExportMenu(false); }} className="flex items-center gap-3 px-4 py-3 hover:bg-muted text-sm text-left transition-colors"><Code className="w-4 h-4 text-blue-500" /> Interactive HTML</button>
              </motion.div>
            )}
          </AnimatePresence>

          <button onClick={onRestart} className="px-6 py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-xl font-medium transition-all shadow-sm">
            New Forecast
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-card to-card/50 backdrop-blur-3xl border border-border/50 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><Activity className="w-32 h-32" /></div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Champion Model</p>
          <p className="text-3xl font-bold text-foreground capitalize">{champion_model.replace('_', ' ')}</p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-card to-card/50 backdrop-blur-3xl border border-border/50 shadow-xl relative overflow-hidden">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Accuracy (MAPE)</p>
          <p className="text-3xl font-bold text-emerald-500">{metrics.mape}%</p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-card to-card/50 backdrop-blur-3xl border border-border/50 shadow-xl relative overflow-hidden">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Error (RMSE)</p>
          <p className="text-3xl font-bold text-rose-500">{metrics.rmse}</p>
        </Card>
      </div>

      <AIInsights insights={analytics?.insights || []} />

      {/* Main Forecast Chart */}
      <Card className="p-6 backdrop-blur-2xl bg-card/60 border border-border/50 shadow-2xl h-[500px]">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Forecast Trajectory & 95% Confidence Interval</h3>
        </div>
        <ResponsiveContainer width="100%" height="90%">
          <ComposedChart data={mainChartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} minTickGap={50} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={40} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(var(--card), 0.9)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
              itemStyle={{ color: 'var(--foreground)', fontSize: '13px' }}
              labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '4px', fontSize: '12px' }}
            />
            {/* Confidence Interval */}
            <Area type="monotone" dataKey="upper" stroke="none" fill="#ec4899" fillOpacity={0.1} />
            <Area type="monotone" dataKey="lower" stroke="none" fill="var(--card)" fillOpacity={1} />
            
            {/* Lines */}
            <Area type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorActual)" activeDot={{ r: 6, fill: '#3b82f6', stroke: 'var(--background)', strokeWidth: 2 }} />
            <Area type="monotone" dataKey="forecast" stroke="#ec4899" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorForecast)" activeDot={{ r: 6, fill: '#ec4899', stroke: 'var(--background)', strokeWidth: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SHAP Feature Importance */}
        <Card className="p-6 backdrop-blur-2xl bg-card/60 border border-border/50 shadow-2xl h-[400px]">
          <div className="flex items-center gap-2 mb-6">
            <Layers className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">SHAP Explanations (Feature Impact)</h3>
          </div>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart layout="vertical" data={featureData} margin={{ top: 0, right: 30, left: 60, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" opacity={0.5} />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis dataKey="feature" type="category" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}
                formatter={(val: any) => val.toFixed(4)}
              />
              <Bar dataKey="importance" fill="#8b5cf6" radius={[0, 4, 4, 0]} animationDuration={1500}>
                {featureData.map((_, i) => (
                   <Cell key={i} fill={i < 3 ? '#8b5cf6' : 'var(--primary)'} opacity={1 - (i * 0.08)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Residuals */}
        <Card className="p-6 backdrop-blur-2xl bg-card/60 border border-border/50 shadow-2xl h-[400px]">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Test Set Residuals (Heteroscedasticity)</h3>
          </div>
          <ResponsiveContainer width="100%" height="90%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis type="number" dataKey="actual" name="Actual" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis type="number" dataKey="residual" name="Residual" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}
              />
              <Scatter data={residualData} fill="#10b981" animationDuration={1500}>
                {residualData.map((entry: any, index: any) => (
                  <Cell key={`cell-${index}`} fill={Math.abs(entry.residual) > (metrics.rmse * 1.5) ? '#ef4444' : '#10b981'} fillOpacity={0.6} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend & Seasonality Decomposition */}
        <Card className="col-span-1 lg:col-span-2 p-6 backdrop-blur-2xl bg-card/60 border border-border/50 shadow-2xl">
           <h3 className="font-semibold text-lg mb-6">Time-Series Decomposition</h3>
           <div className="space-y-6">
              <div className="h-[150px]">
                <p className="text-xs text-muted-foreground mb-2">Extracted Trend</p>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={decompData}>
                    <Area type="monotone" dataKey="trend" stroke="#f59e0b" fill="none" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[150px]">
                <p className="text-xs text-muted-foreground mb-2">Extracted Seasonality</p>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={decompData}>
                    <Area type="monotone" dataKey="seasonality" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>
        </Card>

        {/* Prediction Table */}
        <Card className="col-span-1 p-6 backdrop-blur-2xl bg-card/60 border border-border/50 shadow-2xl flex flex-col">
          <h3 className="font-semibold text-lg mb-4">Forecast Data</h3>
          <div className="flex-1 overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Forecast</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {analytics.forecast_dates.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((date: string, i: number) => (
                  <tr key={date} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 font-mono text-xs">{date}</td>
                    <td className="px-4 py-2 text-right font-medium text-primary">
                      {analytics.forecast_values[page * rowsPerPage + i].toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center mt-4 text-xs">
             <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-2 disabled:opacity-30">Previous</button>
             <span className="text-muted-foreground">Page {page + 1} of {totalPages}</span>
             <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="p-2 disabled:opacity-30">Next</button>
          </div>
        </Card>
      </div>

    </div>
  );
});
