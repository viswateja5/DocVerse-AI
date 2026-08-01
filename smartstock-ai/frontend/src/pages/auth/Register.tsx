import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../lib/axios';
import { Card } from '../../components/ui/Card';
import toast from 'react-hot-toast';

interface FieldErrors {
  email?: string;
  password?: string;
}

export function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGeneralError('');
    setFieldErrors({});
    
    try {
      await api.post('/auth/register', {
        email,
        password
      });
      
      toast.success('Registration successful! Redirecting to login...', { duration: 4000 });
      setTimeout(() => navigate('/login'), 2000);
      
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error("Registration Error:", err);
      }
      
      if (err.response) {
        const status = err.response.status;
        const detail = err.response.data?.detail || err.response.data?.error;
        const detailsArray = err.response.data?.details || (Array.isArray(err.response.data?.detail) ? err.response.data?.detail : null);
        
        if (status === 422) {
          // Unprocessable Entity - Validation Error
          const newFieldErrors: FieldErrors = {};
          if (Array.isArray(detailsArray)) {
            detailsArray.forEach((errItem: any) => {
              const field = errItem.loc?.[errItem.loc.length - 1];
              if (field === 'email' || field === 'password') {
                newFieldErrors[field as keyof FieldErrors] = errItem.msg;
              }
            });
          }
          if (Object.keys(newFieldErrors).length > 0) {
            setFieldErrors(newFieldErrors);
          } else {
            setGeneralError('Please check your inputs and try again.');
          }
        } else if (status === 409) {
          setGeneralError('An account with this email already exists.');
        } else if (status === 400 || status === 401) {
          setGeneralError(typeof detail === 'string' ? detail : 'Invalid registration details.');
        } else if (status >= 500) {
          setGeneralError('Server error. Please try again later.');
        } else {
          setGeneralError(typeof detail === 'string' ? detail : `Registration failed. Please try again. (HTTP ${status})`);
        }
      } else {
        setGeneralError('Network error. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background py-12">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] " />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] "  />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="w-full max-w-md z-10 relative px-4"
      >
        <Card className="p-8 backdrop-blur-2xl bg-card/60">
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-primary/10 rounded-2xl mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Create Workspace</h1>
            <p className="text-muted-foreground mt-2 text-sm">Join the enterprise forecasting platform</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {generalError && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm text-center">
                {generalError}
              </motion.div>
            )}

            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  className={`w-full pl-10 pr-4 py-2.5 bg-background/50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                    fieldErrors.email ? 'border-red-500/50' : 'border-border'
                  }`}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({...prev, email: undefined})); }}
                />
              </div>
              {fieldErrors.email && <p className="text-xs text-red-500 ml-1">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-10 py-2.5 bg-background/50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                    fieldErrors.password ? 'border-red-500/50' : 'border-border'
                  }`}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({...prev, password: undefined})); }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-xs text-red-500 ml-1">{fieldErrors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>Sign up <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
