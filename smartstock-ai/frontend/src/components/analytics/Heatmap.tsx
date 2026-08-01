import React from "react"
import { Card } from "../ui/Card"
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const hours = Array.from({ length: 12 }).map((_, i) => `${(i + 8).toString().padStart(2, '0')}:00`) // 8am to 7pm

interface HeatmapEntry {
  day: string;
  hour: string;
  dayIndex: number;
  hourIndex: number;
  demand: number;
}
const heatmapData: HeatmapEntry[] = []
for (let d = 0; d < days.length; d++) {
  for (let h = 0; h < hours.length; h++) {
    heatmapData.push({
      day: days[d],
      hour: hours[h],
      dayIndex: d,
      hourIndex: h,
      demand: Math.floor(Math.random() * 100),
    })
  }
}

export const Heatmap = React.memo(function Heatmap() {
  // Color scale for heatmap based on demand
  const getColor = (value: number) => {
    if (value > 80) return '#ef4444' // High demand (Red)
    if (value > 50) return '#f59e0b' // Medium demand (Orange)
    if (value > 20) return '#10b981' // Low demand (Green)
    return '#3f3f46' // Minimal demand (Gray)
  }

  const CustomShape = (props: any) => {
    const { cx, cy, payload } = props
    const size = 35 // Size of the heatmap square
    return (
      <rect 
        x={cx - size / 2} 
        y={cy - size / 2} 
        width={size} 
        height={size} 
        fill={getColor(payload.demand)} 
        rx={4} // Rounded corners
        ry={4}
        className="transition-colors duration-500 hover:opacity-80 cursor-pointer"
      />
    )
  }

  return (
    <Card className="p-6 h-[500px]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold">Weekly Demand Heatmap</h3>
        <div className="flex gap-2 items-center text-xs text-muted-foreground">
           <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#3f3f46]"></span> Minimal</span>
           <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#10b981]"></span> Low</span>
           <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#f59e0b]"></span> Medium</span>
           <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#ef4444]"></span> High</span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} horizontal={false} />
          
          <XAxis 
            type="category" 
            dataKey="hour" 
            name="Time" 
            allowDuplicatedCategory={false} 
            stroke="var(--muted-foreground)" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            type="category" 
            dataKey="day" 
            name="Day" 
            allowDuplicatedCategory={false} 
            stroke="var(--muted-foreground)" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          <ZAxis type="number" dataKey="demand" range={[100, 100]} />
          
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="glass p-3 rounded-xl border border-border shadow-soft-sm">
                    <p className="font-semibold text-sm">{data.day} at {data.hour}</p>
                    <p className="text-sm text-primary mt-1">Demand Score: {data.demand}</p>
                  </div>
                )
              }
              return null
            }}
          />
          
          <Scatter data={heatmapData} shape={<CustomShape />} animationDuration={1000} />
        </ScatterChart>
      </ResponsiveContainer>
    </Card>
  )
})
