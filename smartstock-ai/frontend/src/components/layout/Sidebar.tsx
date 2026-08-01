import { useState } from "react"
import { NavLink } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Home, LineChart, Package, Settings, Sparkles, Database } from "lucide-react"

const navItems = [
  { path: "/", label: "Dashboard", icon: Home },
  { path: "/datasets", label: "My Datasets", icon: Database },
  { path: "/forecast", label: "Forecast", icon: LineChart },
  { path: "/inventory", label: "Inventory", icon: Package },
  { path: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.aside
      initial={{ width: 72 }}
      animate={{ width: isHovered ? 256 : 72 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="border-r border-border bg-card/40 backdrop-blur-3xl h-screen flex flex-col p-4 fixed left-0 top-0 z-50 overflow-hidden shadow-[4px_0_24px_-4px_rgba(0,0,0,0.1)]"
    >
      <div className="flex items-center gap-3 px-2 py-4 mb-8 whitespace-nowrap">
        <div className="p-2 bg-primary/10 rounded-xl shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <AnimatePresence>
          {isHovered && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10, transition: { duration: 0.1 } }}
              className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70"
            >
              SmartStock AI
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex flex-col gap-2 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `relative px-3 py-3 rounded-xl flex items-center gap-4 text-sm font-medium transition-colors overflow-hidden ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isActive ? "text-primary scale-110" : ""}`} />
                <AnimatePresence>
                  {isHovered && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10, transition: { duration: 0.1 } }}
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      
      <AnimatePresence>
        {isHovered && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="mt-auto px-4 py-6 text-xs text-muted-foreground/60 whitespace-nowrap"
          >
            © 2026 SmartStock
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  )
}
