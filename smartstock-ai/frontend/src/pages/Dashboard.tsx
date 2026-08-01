import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Card } from "../components/ui/Card";
import { SalesCharts } from "../components/analytics/SalesCharts";
import { Heatmap } from "../components/analytics/Heatmap";
import { InsightsFeed } from "../components/analytics/InsightsFeed";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";
import { Activity, Users, Database, ShieldCheck, Zap } from "lucide-react";

const DashboardHero3D = React.memo(function DashboardHero3D() {
  return (
    <div className="w-full h-[250px] relative rounded-3xl overflow-hidden mb-8 border border-border/50 shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/10 backdrop-blur-md z-10" />
      <div className="absolute inset-0 z-20 flex flex-col justify-center px-12 pointer-events-none">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground drop-shadow-lg mb-4">
            Command Center
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl">
            Real-time analytics, AI insights, and system telemetry mapped into an interactive grid.
          </p>
        </motion.div>
      </div>
    </div>
  );
});

export function Dashboard() {
  const [layout, setLayout] = useState<any[]>([
    { i: "kpi1", x: 0, y: 0, w: 3, h: 2 },
    { i: "kpi2", x: 3, y: 0, w: 3, h: 2 },
    { i: "kpi3", x: 6, y: 0, w: 3, h: 2 },
    { i: "kpi4", x: 9, y: 0, w: 3, h: 2 },
    { i: "sales", x: 0, y: 2, w: 8, h: 4 },
    { i: "insights", x: 8, y: 2, w: 4, h: 4 },
    { i: "heatmap", x: 0, y: 6, w: 12, h: 4 },
  ]);

  const [isDragging, setIsDragging] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {}, []);

  const onLayoutChange = React.useCallback((newLayout: any) => {
    setLayout(newLayout);
  }, []);

  return (
    <div className="pb-20">
      <DashboardHero3D />

      <div ref={gridRef} className="relative">
        <GridLayout
          className="layout"
          layout={layout}
          // @ts-ignore - ReactGridLayout prop mismatch
          cols={12}
          rowHeight={100}
          width={1200}
          onLayoutChange={onLayoutChange}
          onDragStart={() => setIsDragging(true)}
          onDragStop={() => setIsDragging(false)}
          onResizeStart={() => setIsDragging(true)}
          onResizeStop={() => setIsDragging(false)}
          draggableHandle=".drag-handle"
          isResizable={true}
          margin={[24, 24]}
        >
          {/* KPI 1 */}
          <div key="kpi1">
            <Card className="h-full bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-2xl border border-blue-500/20 shadow-xl overflow-hidden flex flex-col justify-center p-6 relative group transition-all duration-300 hover:-translate-y-1 hover:shadow-blue-500/20">
              <div className="drag-handle absolute top-2 right-2 opacity-0 group-hover:opacity-100 cursor-move text-muted-foreground p-1"><Zap className="w-4 h-4"/></div>
              <p className="text-sm font-medium tracking-wider text-muted-foreground uppercase">Total Revenue</p>
              <p className="text-4xl font-bold text-foreground mt-2">$24.5M</p>
            </Card>
          </div>

          {/* KPI 2 */}
          <div key="kpi2">
            <Card className="h-full bg-gradient-to-br from-emerald-500/10 to-transparent backdrop-blur-2xl border border-emerald-500/20 shadow-xl overflow-hidden flex flex-col justify-center p-6 relative group transition-all duration-300 hover:-translate-y-1 hover:shadow-emerald-500/20">
              <div className="drag-handle absolute top-2 right-2 opacity-0 group-hover:opacity-100 cursor-move text-muted-foreground p-1"><Activity className="w-4 h-4"/></div>
              <p className="text-sm font-medium tracking-wider text-muted-foreground uppercase">Active Predictions</p>
              <p className="text-4xl font-bold text-foreground mt-2">1,492</p>
            </Card>
          </div>

          {/* KPI 3 */}
          <div key="kpi3">
            <Card className="h-full bg-gradient-to-br from-purple-500/10 to-transparent backdrop-blur-2xl border border-purple-500/20 shadow-xl overflow-hidden flex flex-col justify-center p-6 relative group transition-all duration-300 hover:-translate-y-1 hover:shadow-purple-500/20">
              <div className="drag-handle absolute top-2 right-2 opacity-0 group-hover:opacity-100 cursor-move text-muted-foreground p-1"><Users className="w-4 h-4"/></div>
              <p className="text-sm font-medium tracking-wider text-muted-foreground uppercase">Global Users</p>
              <p className="text-4xl font-bold text-foreground mt-2">84</p>
            </Card>
          </div>

          {/* KPI 4 */}
          <div key="kpi4">
            <Card className="h-full bg-gradient-to-br from-rose-500/10 to-transparent backdrop-blur-2xl border border-rose-500/20 shadow-xl overflow-hidden flex flex-col justify-center p-6 relative group transition-all duration-300 hover:-translate-y-1 hover:shadow-rose-500/20">
              <div className="drag-handle absolute top-2 right-2 opacity-0 group-hover:opacity-100 cursor-move text-muted-foreground p-1"><ShieldCheck className="w-4 h-4"/></div>
              <p className="text-sm font-medium tracking-wider text-muted-foreground uppercase">System Health</p>
              <p className="text-4xl font-bold text-emerald-500 mt-2">99.9%</p>
            </Card>
          </div>

          {/* Sales Chart */}
          <div key="sales" className="relative group">
            <div className="drag-handle absolute top-2 right-2 z-50 opacity-0 group-hover:opacity-100 cursor-move text-muted-foreground bg-background/50 p-2 rounded-lg backdrop-blur-sm"><Activity className="w-4 h-4"/></div>
            <div className={`h-full w-full ${isDragging ? 'pointer-events-none' : ''}`}>
              <ErrorBoundary>
                <SalesCharts />
              </ErrorBoundary>
            </div>
          </div>

          {/* Insights Feed */}
          <div key="insights" className="relative group">
            <div className="drag-handle absolute top-2 right-2 z-50 opacity-0 group-hover:opacity-100 cursor-move text-muted-foreground bg-background/50 p-2 rounded-lg backdrop-blur-sm"><Database className="w-4 h-4"/></div>
            <div className={`h-full w-full ${isDragging ? 'pointer-events-none' : ''} overflow-y-auto`}>
              <ErrorBoundary>
                <InsightsFeed />
              </ErrorBoundary>
            </div>
          </div>

          {/* Heatmap */}
          <div key="heatmap" className="relative group">
            <div className="drag-handle absolute top-2 right-2 z-50 opacity-0 group-hover:opacity-100 cursor-move text-muted-foreground bg-background/50 p-2 rounded-lg backdrop-blur-sm"><Activity className="w-4 h-4"/></div>
            <div className={`h-full w-full ${isDragging ? 'pointer-events-none' : ''}`}>
              <ErrorBoundary>
                <Heatmap />
              </ErrorBoundary>
            </div>
          </div>

        </GridLayout>
      </div>
    </div>
  );
}
