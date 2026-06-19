import React, { useState } from 'react';
import { Database, Loader2, UserPlus } from 'lucide-react';
import { signupUser } from '../api';

export default function Register({ onSignupSuccess, onNavigateToLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    
    if (username.length < 3) {
      setError("Username must be at least 3 characters long");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await signupUser(username, password);
      setSuccess(true);
      setTimeout(() => {
        onSignupSuccess();
      }, 1500);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || "Registration failed. Username may already be taken.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0b0f] via-[#12131a] to-[#181922] flex flex-col justify-center items-center px-4 font-sans selection:bg-emerald-800 select-none">
      <div className="w-full max-w-md bg-[#13141c]/95 border border-white/5 rounded-3xl p-8 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md animate-fade-in">
        {/* Brand Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-emerald-950/30 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <Database className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Create Account</h1>
          <p className="text-xs text-gray-500 mt-1 font-mono uppercase tracking-widest">Register for AI Document Search</p>
        </div>

        {error && (
          <div className="mb-5 bg-rose-950/20 border border-rose-800/30 p-3 rounded-xl text-xs text-rose-400 font-bold text-center animate-fade-in">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="mb-5 bg-emerald-950/20 border border-emerald-800/30 p-3 rounded-xl text-xs text-emerald-400 font-bold text-center animate-fade-in">
            ✅ Registration successful! Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Min 3 characters"
              className="w-full py-3 px-4 rounded-xl bg-[#181922] border border-white/5 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-emerald-500 transition-all duration-300 shadow-inner"
              disabled={loading || success}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full py-3 px-4 rounded-xl bg-[#181922] border border-white/5 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-emerald-500 transition-all duration-300 shadow-inner"
              disabled={loading || success}
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] disabled:bg-gray-800 disabled:from-gray-800 disabled:to-gray-800 text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-all duration-300 shadow-[0_4px_12px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_20px_rgba(16,185,129,0.35)] focus:outline-none mt-8"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 text-white" />
                <span>Sign Up</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          Already have an account?{' '}
          <button 
            onClick={onNavigateToLogin}
            className="text-emerald-400 hover:underline font-bold focus:outline-none transition-colors"
            disabled={loading || success}
          >
            Log in here
          </button>
        </div>
      </div>
    </div>
  );
}
