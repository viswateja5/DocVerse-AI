import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Calendar, Gift, Tag, ShieldCheck, AlertTriangle, Activity, Sparkles, X } from 'lucide-react';
import { Card } from '../ui/Card';

interface Insight {
  title: string;
  description: string;
  type: 'positive' | 'negative' | 'info' | 'warning';
  icon: string;
}

export function AIInsights({ insights }: { insights: Insight[] }) {
  const [isVisible, setIsVisible] = React.useState(true);

  if (!insights || insights.length === 0 || !isVisible) return null;

  const getIcon = (iconName: string, type: string) => {
    let colorClass = "text-blue-500";
    if (type === 'positive') colorClass = "text-emerald-500";
    if (type === 'negative') colorClass = "text-rose-500";
    if (type === 'warning') colorClass = "text-amber-500";

    const icons: any = {
      TrendingUp: <TrendingUp className={`w-5 h-5 ${colorClass}`} />,
      TrendingDown: <TrendingDown className={`w-5 h-5 ${colorClass}`} />,
      Calendar: <Calendar className={`w-5 h-5 ${colorClass}`} />,
      Gift: <Gift className={`w-5 h-5 ${colorClass}`} />,
      Tag: <Tag className={`w-5 h-5 ${colorClass}`} />,
      ShieldCheck: <ShieldCheck className={`w-5 h-5 ${colorClass}`} />,
      AlertTriangle: <AlertTriangle className={`w-5 h-5 ${colorClass}`} />,
      Activity: <Activity className={`w-5 h-5 ${colorClass}`} />
    };

    return icons[iconName] || <Sparkles className={`w-5 h-5 ${colorClass}`} />;
  };

  const getGradient = (type: string) => {
    if (type === 'positive') return 'from-emerald-500/10 to-transparent border-emerald-500/20';
    if (type === 'negative') return 'from-rose-500/10 to-transparent border-rose-500/20';
    if (type === 'warning') return 'from-amber-500/10 to-transparent border-amber-500/20';
    return 'from-blue-500/10 to-transparent border-blue-500/20';
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full space-y-4 mb-8"
      >
        <div className="flex justify-between items-center px-1">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            AI Business Insights
          </h3>
          <button onClick={() => setIsVisible(false)} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {insights.map((insight, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className={`p-4 h-full bg-gradient-to-br ${getGradient(insight.type)} backdrop-blur-xl border flex gap-4 items-start`}>
                <div className="p-2 bg-background/50 rounded-xl shadow-sm shrink-0">
                  {getIcon(insight.icon, insight.type)}
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">{insight.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
