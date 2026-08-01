import { memo } from "react"
import { Filter, Calendar, Store, Package, Tags, TicketPercent, PartyPopper } from "lucide-react"

export type Filters = {
  dateRange: string
  store: string
  product: string
  category: string
  promotion: string
  holiday: string
}

interface FilterBarProps {
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
}

export const FilterBar = memo(function FilterBar({ filters, setFilters }: FilterBarProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <div className="glass p-4 rounded-2xl flex flex-wrap gap-4 items-center mb-8 sticky top-4 z-40">
      <div className="flex items-center gap-2 mr-4 text-muted-foreground">
        <Filter className="w-4 h-4" />
        <span className="text-sm font-medium">Global Filters</span>
      </div>

      <div className="flex-1 flex flex-wrap gap-3">
        <div className="relative group">
          <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" aria-hidden="true" />
          <select aria-label="Filter by date range" name="dateRange" value={filters.dateRange} onChange={handleChange} className="pl-9 pr-8 py-2 bg-background border border-border rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer hover:bg-muted/50">
            <option value="7D">Last 7 Days</option>
            <option value="30D">Last 30 Days</option>
            <option value="3M">Last 3 Months</option>
            <option value="YTD">Year to Date</option>
          </select>
        </div>

        <div className="relative group">
          <Store className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" aria-hidden="true" />
          <select aria-label="Filter by store" name="store" value={filters.store} onChange={handleChange} className="pl-9 pr-8 py-2 bg-background border border-border rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer hover:bg-muted/50">
            <option value="ALL">All Stores</option>
            <option value="S001">S001 - Downtown</option>
            <option value="S002">S002 - Uptown</option>
            <option value="S003">S003 - Suburbs</option>
          </select>
        </div>

        <div className="relative group">
          <Package className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" aria-hidden="true" />
          <select aria-label="Filter by product" name="product" value={filters.product} onChange={handleChange} className="pl-9 pr-8 py-2 bg-background border border-border rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer hover:bg-muted/50">
            <option value="ALL">All Products</option>
            <option value="P1001">P1001 - iPhone 15</option>
            <option value="P1002">P1002 - MacBook Pro</option>
          </select>
        </div>
        
        <div className="relative group">
          <Tags className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" aria-hidden="true" />
          <select aria-label="Filter by category" name="category" value={filters.category} onChange={handleChange} className="pl-9 pr-8 py-2 bg-background border border-border rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer hover:bg-muted/50">
            <option value="ALL">All Categories</option>
            <option value="Electronics">Electronics</option>
            <option value="Apparel">Apparel</option>
            <option value="Home">Home</option>
          </select>
        </div>

        <div className="relative group">
          <TicketPercent className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" aria-hidden="true" />
          <select aria-label="Filter by promotion" name="promotion" value={filters.promotion} onChange={handleChange} className="pl-9 pr-8 py-2 bg-background border border-border rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer hover:bg-muted/50">
            <option value="ALL">All Promotions</option>
            <option value="Active">Active</option>
            <option value="None">None</option>
          </select>
        </div>

        <div className="relative group">
          <PartyPopper className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" aria-hidden="true" />
          <select aria-label="Filter by holiday" name="holiday" value={filters.holiday} onChange={handleChange} className="pl-9 pr-8 py-2 bg-background border border-border rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer hover:bg-muted/50">
            <option value="ALL">All Days</option>
            <option value="Holiday">Holidays Only</option>
            <option value="Non-Holiday">Non-Holidays</option>
          </select>
        </div>
      </div>
    </div>
  )
})
