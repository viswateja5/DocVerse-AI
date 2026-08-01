import React, { Suspense } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Layout } from "./components/layout/Layout"
import { ErrorBoundary } from "./components/ui/ErrorBoundary"
import { Skeleton } from "./components/ui/Skeleton"
import { AuthProvider } from "./context/AuthContext"
import { ProtectedRoute } from "./components/layout/ProtectedRoute"
import { Login } from "./pages/auth/Login"
import { Register } from "./pages/auth/Register"
import { ForgotPassword } from "./pages/auth/ForgotPassword"
import { ResetPassword } from "./pages/auth/ResetPassword"
import { Toaster, toast } from "react-hot-toast"
import { useEffect } from "react"

// Lazy load heavy page chunks
const Dashboard = React.lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })))
const Forecast = React.lazy(() => import("./pages/Forecast").then(m => ({ default: m.Forecast })))
const Inventory = React.lazy(() => import("./pages/Inventory").then(m => ({ default: m.Inventory })))
const Settings = React.lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })))
const MyDatasets = React.lazy(() => import("./pages/MyDatasets").then(m => ({ default: m.MyDatasets })))
const DatasetEDA = React.lazy(() => import("./pages/DatasetEDA").then(m => ({ default: m.DatasetEDA })))
const DatasetSchema = React.lazy(() => import("./pages/DatasetSchema").then(m => ({ default: m.DatasetSchema })))
const AdminDashboard = React.lazy(() => import("./pages/admin/AdminDashboard").then(m => ({ default: m.AdminDashboard })))

// Full page loader
function PageLoader() {
  return (
    <div className="space-y-6 w-full h-full p-4">
      <Skeleton className="h-12 w-1/3" />
      <Skeleton className="h-[400px] w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    </div>
  )
}

function App() {
  useEffect(() => {
    const handleOnline = () => toast.success("Back online. Connection restored.");
    const handleOffline = () => toast.error("You are offline. Reconnecting...");
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
  }, []);

  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <BrowserRouter>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected Workspace Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="forecast" element={<Forecast />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="datasets" element={<MyDatasets />} />
                  <Route path="datasets/:id/eda" element={<DatasetEDA />} />
                  <Route path="datasets/:id/schema" element={<DatasetSchema />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Route>

              {/* Admin Protected Routes */}
              <Route element={<ProtectedRoute requiredRole="admin" />}>
                <Route path="/" element={<Layout />}>
                  <Route path="admin" element={<AdminDashboard />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
