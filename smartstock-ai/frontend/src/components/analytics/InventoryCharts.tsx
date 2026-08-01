import { Card } from "../ui/Card"
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

const mockInventoryData = Array.from({ length: 14 }).map((_, i) => ({
  date: `2026-08-${String(i + 1).padStart(2, '0')}`,
  stock: Math.floor(Math.random() * 500) + 100,
  safetyStock: 150,
  riskScore: Math.random() * 100,
}))

export function InventoryCharts() {
  return (
    <div className="space-y-6">
      <Card className="p-6 h-[400px]">
        <h3 className="font-semibold mb-6">Inventory Trend vs Safety Stock</h3>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={mockInventoryData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val.split('-')[2]} />
            <YAxis yAxisId="left" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis yAxisId="right" orientation="right" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}
              itemStyle={{ color: 'var(--foreground)' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar yAxisId="left" dataKey="stock" name="Current Stock" fill="#6366f1" radius={[4, 4, 0, 0]} animationDuration={1000} />
            <Line yAxisId="left" type="stepAfter" dataKey="safetyStock" name="Safety Stock" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} animationDuration={1000} />
            <Line yAxisId="right" type="monotone" dataKey="riskScore" name="Risk Score %" stroke="#f59e0b" strokeWidth={3} animationDuration={1000} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
