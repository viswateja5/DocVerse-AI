import { Card } from "../ui/Card"
import { BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

const featureImportanceData = [
  { feature: "Price_Difference", importance: 0.85 },
  { feature: "Sales_Lag_7", importance: 0.72 },
  { feature: "Discount", importance: 0.65 },
  { feature: "Is_Holiday", importance: 0.58 },
  { feature: "Rolling_Mean_30", importance: 0.45 },
].sort((a, b) => a.importance - b.importance) // Sort for horizontal bar chart

const residualData = Array.from({ length: 100 }).map(() => ({
  actual: Math.random() * 1000 + 500,
  residual: (Math.random() - 0.5) * 200,
}))

const modelComparisonData = [
  { model: "XGBoost", wape: 12.4, rmse: 145 },
  { model: "RandomForest", wape: 14.1, rmse: 168 },
  { model: "LGBM", wape: 15.2, rmse: 182 },
  { model: "ARIMA", wape: 22.8, rmse: 290 },
]

export function ModelCharts() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 h-[400px]">
          <h3 className="font-semibold mb-6">Global Feature Importance (SHAP/LIME)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={featureImportanceData} margin={{ top: 0, right: 30, left: 60, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis dataKey="feature" type="category" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}
                itemStyle={{ color: 'var(--foreground)' }}
                cursor={{ fill: 'var(--muted)' }}
              />
              <Bar dataKey="importance" fill="#ec4899" radius={[0, 4, 4, 0]} animationDuration={1000} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 h-[400px]">
          <h3 className="font-semibold mb-6">Residual Analysis</h3>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" dataKey="actual" name="Actual Sales" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis type="number" dataKey="residual" name="Residual Error" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}
                itemStyle={{ color: 'var(--foreground)' }}
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Scatter data={residualData} fill="#3b82f6" animationDuration={1000}>
                {residualData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={Math.abs(entry.residual) > 100 ? '#ef4444' : '#3b82f6'} fillOpacity={0.6} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6 h-[300px]">
        <h3 className="font-semibold mb-6">Model Comparison (WAPE %)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={modelComparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="model" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)' }}
              itemStyle={{ color: 'var(--foreground)' }}
              cursor={{ fill: 'var(--muted)' }}
            />
            <Bar dataKey="wape" fill="#8b5cf6" radius={[4, 4, 0, 0]} animationDuration={1000} barSize={40}>
              {modelComparisonData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#8b5cf6'} /> // Highlight best model
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
