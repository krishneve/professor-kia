import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, Check, AlertCircle, ArrowRight } from 'lucide-react';

interface JoinClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const JoinClassModal: React.FC<JoinClassModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { token } = useAuth();
  const [classCode, setClassCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!classCode.trim()) {
      setError('Please enter a class code');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/classes/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ class_code: classCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join class');
      }

      setClassCode('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl relative">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <KeyRound className="w-4 h-4 text-violet-400" />
            <span>Join Class via Code</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Enter the unique class code provided by your faculty teacher (e.g., <code className="text-violet-300 font-mono">AI2027A</code>).
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">Class Code</label>
            <input
              type="text"
              required
              placeholder="e.g. AI2027A"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.toUpperCase())}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-violet-200 font-mono tracking-wider focus:outline-none focus:border-violet-500 uppercase placeholder:normal-case placeholder:font-sans placeholder:text-zinc-600"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/20 flex items-center space-x-2 transition"
            >
              {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Join Class</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
