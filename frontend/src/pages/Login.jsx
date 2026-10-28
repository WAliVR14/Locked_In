import { useState } from 'react';
import api from '../api/client';
import { ShieldCheck, Sparkles } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePersonalLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      const { data } = await api.post('/auth/login', formData);
      localStorage.setItem('locked_token', data.access_token);
      onLoginSuccess();
    } catch {
      setError('Invalid credentials. Check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/demo-login');
      localStorage.setItem('locked_token', data.access_token);
      onLoginSuccess();
    } catch {
      setError('Could not connect to the backend server (verify that it is running on port 8000).');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-8 h-8 text-emerald-400" />
          <h1 className="text-2xl font-bold tracking-tight">Locked_In</h1>
        </div>
        <p className="text-xs text-slate-400 mb-6">Personal ERP & Telemetry System</p>

        {error && (
          <div className="bg-red-950/50 border border-red-500/40 text-red-300 text-xs p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handlePersonalLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Personal email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500"
          />
          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-semibold py-3 rounded-lg transition"
          >
            {loading ? 'Connecting...' : 'Access My Space'}
          </button>
        </form>

        <div className="my-6 border-t border-slate-800 relative">
          <span className="bg-slate-900 px-3 text-xs text-slate-500 absolute -top-2.5 left-1/2 -translate-x-1/2">
            PORTFOLIO / RECRUITERS
          </span>
        </div>

        <button
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full bg-slate-800 hover:bg-slate-700 border border-emerald-500/40 text-emerald-300 font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition"
        >
          <Sparkles className="w-4 h-4" /> Try Demo Mode (1-Clic)
        </button>
      </div>
    </div>
  );
}