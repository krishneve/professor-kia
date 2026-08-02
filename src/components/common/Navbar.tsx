import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, LogOut, UserCheck, BookOpen, Shield, Sparkles } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const isTeacher = user.role === 'teacher';

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
      {/* Brand & Platform Badge */}
      <div className="flex items-center space-x-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-base tracking-tight text-white">KIA</span>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Intelligence Assessor
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 hidden sm:block">
            {isTeacher ? 'Faculty Portal • Class & Viva Control' : 'Student Portal • Curriculum & Assessments'}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-4">
        {/* Role Badge */}
        <div
          className={`px-3 py-1 rounded-full border text-xs font-medium flex items-center space-x-1.5 ${
            isTeacher
              ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
              : 'border-violet-500/30 bg-violet-500/10 text-violet-300'
          }`}
        >
          {isTeacher ? <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> : <BookOpen className="w-3.5 h-3.5 text-violet-400" />}
          <span className="capitalize">{user.role}</span>
        </div>

        {/* User Info */}
        <div className="hidden md:flex items-center space-x-2 border-l border-zinc-800 pl-4 text-xs">
          <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300">
            {user.full_name.charAt(0)}
          </div>
          <div className="text-left">
            <div className="font-semibold text-zinc-200">{user.full_name}</div>
            <div className="text-[10px] text-zinc-500">{user.email}</div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          title="Sign Out"
          className="p-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition flex items-center space-x-1 text-xs"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
