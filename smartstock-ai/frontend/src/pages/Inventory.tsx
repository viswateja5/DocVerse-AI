import { Card } from "../components/ui/Card"
import { AlertCircle } from "lucide-react"

export function Inventory() {
  const mockRows = [
    { id: "P001", store: "S001", eoq: 558, safety: 67, risk: "High", prob: "78%" },
    { id: "P002", store: "S001", eoq: 230, safety: 45, risk: "Low", prob: "5%" },
    { id: "P042", store: "S003", eoq: 1120, safety: 150, risk: "Medium", prob: "25%" },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Inventory Optimization</h1>
        <p className="text-muted-foreground mt-1">Smart replenishment recommendations.</p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">SKU ID</th>
                <th className="px-6 py-4 font-medium">Store</th>
                <th className="px-6 py-4 font-medium">EOQ</th>
                <th className="px-6 py-4 font-medium">Safety Stock</th>
                <th className="px-6 py-4 font-medium">Stockout Risk</th>
                <th className="px-6 py-4 font-medium">Probability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockRows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium">{row.id}</td>
                  <td className="px-6 py-4 text-muted-foreground">{row.store}</td>
                  <td className="px-6 py-4">{row.eoq}</td>
                  <td className="px-6 py-4">{row.safety}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      row.risk === 'High' ? 'bg-red-500/10 text-red-500' : 
                      row.risk === 'Medium' ? 'bg-yellow-500/10 text-yellow-500' : 
                      'bg-emerald-500/10 text-emerald-500'
                    }`}>
                      {row.risk}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    {row.risk === 'High' && <AlertCircle className="w-4 h-4 text-red-500" />}
                    {row.prob}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
