import React, { memo, useState, useEffect, useRef } from "react"
import { Card } from "../ui/Card"
import { EmptyState } from "../ui/EmptyState"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const mockSalesData = Array.from({ length: 30 }).map((_, i) => ({
  date: `2026-08-${String(i + 1).padStart(2, '0')}`,
  forecast: Math.floor(Math.random() * 2000) + 3000,
  historical: Math.floor(Math.random() * 2000) + 2800,
  revenue: Math.floor(Math.random() * 50000) + 80000,
}))

export const SalesCharts = React.memo(function SalesCharts() {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => observer.disconnect();
  }, []);

  if (!mockSalesData || mockSalesData.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="p-6 h-[400px]">
          <h3 className="font-semibold mb-6">Sales Forecast vs Historical</h3>
          <EmptyState title="No Sales Data" description="There is no historical or forecast data for this period." />
        </Card>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="space-y-6">
      <Card className="p-6 h-[400px]">
        <h3 className="font-semibold mb-6">Sales Forecast vs Historical</h3>
        {isVisible ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockSalesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#71717a" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#71717a" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val.split('-')[2]} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}
              itemStyle={{ color: 'var(--foreground)' }}
            />
            <Area type="monotone" dataKey="historical" stroke="#71717a" strokeWidth={2} fillOpacity={1} fill="url(#colorHistorical)" animationDuration={1000} />
            <Area type="monotone" dataKey="forecast" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorForecast)" animationDuration={1000} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/20 animate-pulse rounded-lg">Loading Chart...</div>
        )}
      </Card>

      <Card className="p-6 h-[300px]">
        <h3 className="font-semibold mb-6">Revenue Projection</h3>
        {isVisible ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockSalesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
             <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val.split('-')[2]} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}
              itemStyle={{ color: 'var(--foreground)' }}
            />
            <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" animationDuration={1000} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/20 animate-pulse rounded-lg">Loading Chart...</div>
        )}
      </Card>
    </div>
  )
})
