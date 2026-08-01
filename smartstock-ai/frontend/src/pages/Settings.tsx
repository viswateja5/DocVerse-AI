import { useEffect, useState } from "react"
import { Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Moon, Sun } from "lucide-react"

export function Settings() {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark")

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
    localStorage.setItem("theme", theme)
  }, [theme])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage platform preferences.</p>
      </div>

      <Card className="p-6 max-w-2xl">
        <h3 className="font-semibold mb-6">Appearance</h3>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Theme Preference</p>
            <p className="text-sm text-muted-foreground">Select your preferred interface theme.</p>
          </div>
          
          <div className="flex bg-muted/50 p-1 rounded-xl">
            <button
              onClick={() => setTheme("light")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                theme === "light" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sun className="w-4 h-4" /> Light
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                theme === "dark" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Moon className="w-4 h-4" /> Dark
            </button>
          </div>
        </div>
      </Card>
      
      <div className="flex justify-end max-w-2xl">
         <Button>Save Changes</Button>
      </div>
    </div>
  )
}
