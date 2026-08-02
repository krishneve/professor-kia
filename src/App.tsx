import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { AuthPage } from './components/auth/AuthPage';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { StudentDashboard } from './components/student/StudentDashboard';
import { GraduationCap } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div className="flex items-center space-x-2 text-xs text-zinc-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
          <span>Initializing KIA Phase 1 Architecture...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <Navbar />
      {user.role === 'teacher' ? <TeacherDashboard /> : <StudentDashboard />}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
