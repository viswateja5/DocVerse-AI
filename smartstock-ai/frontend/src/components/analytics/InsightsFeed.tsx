import { memo } from "react"
import { motion, type Variants } from "framer-motion"
import { TrendingUp, AlertTriangle, Sparkles, AlertCircle, ArrowRight } from "lucide-react"

type InsightType = 'trend' | 'risk' | 'anomaly' | 'recommendation'

interface Insight {
  id: string
  type: InsightType
  title: string
  description: string
  metric?: string
}

const mockInsights: Insight[] = [
  {
    id: "1",
    type: "trend",
    title: "Demand Surge",
    description: "Expected to increase across all active electronics SKUs.",
    metric: "+18%"
  },
  {
    id: "2",
    type: "anomaly",
    title: "Holiday Spike Detected",
    description: "Upcoming long weekend is driving unprecedented early buys."
  },
  {
    id: "3",
    type: "recommendation",
    title: "Promotion Impact",
    description: "Recent flash sale increased total categorical sales.",
    metric: "+23%"
  },
  {
    id: "4",
    type: "risk",
    title: "Stock-out Risk High",
    description: "Supplier delays may affect inventory for P1002.",
  },
]

export const InsightsFeed = memo(function InsightsFeed() {
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  // Uses strict transform properties (x) instead of margins to guarantee GPU acceleration (60 FPS)
  const item: Variants = {
    hidden: { opacity: 0, x: -30, scale: 0.95 },
    show: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 30 } }
  }

  const getTypeStyles = (type: InsightType) => {
    switch (type) {
      case 'trend': return "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
      case 'risk': return "bg-red-500/10 border-red-500/20 text-red-500"
      case 'anomaly': return "bg-purple-500/10 border-purple-500/20 text-purple-500"
      case 'recommendation': return "bg-blue-500/10 border-blue-500/20 text-blue-500"
    }
  }

  const getTypeIcon = (type: InsightType) => {
    switch (type) {
      case 'trend': return <TrendingUp className="w-4 h-4" />
      case 'risk': return <AlertTriangle className="w-4 h-4" />
      case 'anomaly': return <Sparkles className="w-4 h-4" />
      case 'recommendation': return <AlertCircle className="w-4 h-4" />
    }
  }

  return (
    <section className="mb-8 overflow-hidden relative" aria-label="AI Business Insights">
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="flex gap-4 overflow-x-auto pb-4 pt-2 px-2 snap-x scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        role="region"
        aria-label="Scrollable insights feed"
        tabIndex={0}
      >
        {mockInsights.map((insight) => (
          <motion.div
            key={insight.id}
            variants={item}
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`min-w-[280px] max-w-[320px] snap-center glass rounded-2xl p-5 relative overflow-hidden group cursor-pointer border ${getTypeStyles(insight.type).split(' ')[1]}`}
            role="article"
            aria-labelledby={`insight-title-${insight.id}`}
          >
            {/* Background animated glow */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 blur-3xl opacity-20 rounded-full transition-all duration-500 group-hover:scale-150 group-hover:opacity-60 ${getTypeStyles(insight.type).split(' ')[0]}`} aria-hidden="true" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-3">
                <div className={`p-2 rounded-xl ${getTypeStyles(insight.type)}`} aria-hidden="true">
                  {getTypeIcon(insight.type)}
                </div>
                {insight.metric && (
                  <span className={`text-lg font-semibold ${getTypeStyles(insight.type).split(' ')[2]}`}>
                    {insight.metric}
                  </span>
                )}
              </div>
              
              <h4 id={`insight-title-${insight.id}`} className="font-semibold text-foreground mb-1">{insight.title}</h4>
              <p className="text-sm text-muted-foreground line-clamp-2">{insight.description}</p>
              
              <div className="mt-4 flex items-center text-xs font-medium text-foreground opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                View Details <ArrowRight className="w-3 h-3 ml-1" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
})
