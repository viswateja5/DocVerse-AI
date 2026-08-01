import { Component } from "react"
import type { ErrorInfo, ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-8 text-center space-y-6">
          <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
            <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-500" />
          </div>
          <div className="space-y-2 max-w-md">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">System Error Encountered</h2>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message || "An unexpected runtime error occurred. Our engineering team has been notified."}
            </p>
          </div>
          <button
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors shadow-sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4" /> Reload Platform
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
