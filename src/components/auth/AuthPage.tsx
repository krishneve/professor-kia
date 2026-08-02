import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { GraduationCap, ShieldCheck, UserCheck, BookOpen, Sparkles, ArrowRight, AlertCircle, KeyRound, Mail, User as UserIcon } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, register, demoLogin } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>('teacher');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!fullName.trim()) {
          throw new Error('Full Name is required');
        }
        await register(fullName, email, password, role);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (demoRole: UserRole) => {
    setError(null);
    setLoading(true);
    try {
      await demoLogin(demoRole);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background Subtle Gradient Ambient Lights */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl"></div>
      </div>

      {/* Header Bar */}
      <header className="relative z-10 border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-white">KIA</span>
            <span className="ml-2 text-xs font-mono tracking-widest text-zinc-400 uppercase border border-zinc-800 rounded px-1.5 py-0.5">
              Phase 1 Platform
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs text-zinc-400">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
            System Operational
          </span>
        </div>
      </header>

      {/* Main Body */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Left Side: Pitch & Information */}
          <div className="md:col-span-6 space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Knowledge Intelligence Assessor</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Autonomous Academic Assessment Platform
            </h1>

            <p className="text-zinc-400 text-sm leading-relaxed">
              KIA provides structured viva management, real-time class enrollments, subject curriculum tracking, and faculty report management for modern institutions.
            </p>

            {/* Quick Demo Credentials Card */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm space-y-3">
              <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                <span>Instant Demo Access</span>
                <span className="text-indigo-400 text-[10px] lowercase">1-click login</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemo('teacher')}
                  disabled={loading}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200 text-xs font-medium transition group"
                >
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 text-indigo-400" />
                    <span>Teacher Demo</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDemo('student')}
                  disabled={loading}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-200 text-xs font-medium transition group"
                >
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-violet-400" />
                    <span>Student Demo</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs text-zinc-400">
              <div className="flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>JWT Protected Roles & Strict Route Boundaries</span>
              </div>
              <div className="flex items-start space-x-2">
                <GraduationCap className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>Class Join Codes & Real-Time Subjects</span>
              </div>
            </div>
          </div>

          {/* Right Side: Auth Form */}
          <div className="md:col-span-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl relative">
            
            {/* Toggle Login / Register Tabs */}
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 mb-6">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                  isLogin ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                  !isLogin ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {!isLogin && (
                <>
                  {/* Role Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Select Role</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole('teacher')}
                        className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center space-x-2 transition ${
                          role === 'teacher'
                            ? 'border-indigo-500 bg-indigo-500/20 text-white'
                            : 'border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Teacher</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRole('student')}
                        className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center space-x-2 transition ${
                          role === 'student'
                            ? 'border-violet-500 bg-violet-500/20 text-white'
                            : 'border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Student</span>
                      </button>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Full Name</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Prof. Alan Turing"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="user@kia.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Password</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>{isLogin ? 'Sign In to Dashboard' : 'Complete Registration'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <span className="text-xs text-zinc-500">
                {isLogin ? "Don't have an account yet?" : 'Already registered?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                  }}
                  className="text-indigo-400 hover:underline font-medium"
                >
                  {isLogin ? 'Register now' : 'Sign in'}
                </button>
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-800/60 bg-zinc-950 px-6 py-4 text-center text-xs text-zinc-500">
        KIA Platform • Powered by Autonomous Assessment Engine • Phase 1 Core Architecture
      </footer>
    </div>
  );
};
