import { Outlet, useLocation } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { motion, AnimatePresence } from "framer-motion"
import { CommandPalette } from "../ui/CommandPalette"
import { TopNav } from "./TopNav"

export function Layout() {
  const location = useLocation()
  
  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      <Sidebar />
      <CommandPalette />
      
      <main className="flex-1 ml-[72px] transition-all duration-500 ease-in-out sm:hover:ml-64 overflow-y-auto z-10 relative flex flex-col h-screen">
        <TopNav />
        <div className="container mx-auto p-8 max-w-7xl flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
