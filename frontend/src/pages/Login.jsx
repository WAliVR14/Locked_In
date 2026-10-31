import { useState } from 'react';
import api from '../api/client';
import { ShieldCheck, Sparkles, Compass } from 'lucide-react';
import { RetroCard, RetroButton, RetroBadge, OrnamentalDivider } from '../components/ui/RetroUI';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handlePersonalLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      const { data } = await api.post('/auth/login', formData);
      localStorage.setItem('locked_token', data.access_token);
      if (onLoginSuccess) onLoginSuccess();
    } catch {
      setError('Invalid credentials. Please verify your email and password.');
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    try {
      const { data } = await api.post('/auth/demo-login');
      localStorage.setItem('locked_token', data.access_token);
      if (onLoginSuccess) onLoginSuccess();
    } catch {
      setError('Error connecting to the server.');
    }
  };

  return (
    <div className="min-h-screen bg-crema text-tinta flex items-center justify-center p-4">
      <RetroCard className="max-w-md w-full p-8 shadow-vintage-lg relative overflow-hidden">
        {/* Decorative tricolor editorial top bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-nopal via-maiz to-cempasuchil border-b border-tinta" />

        <div className="flex items-center justify-between mb-4 mt-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-nopal text-crema border-2 border-tinta shadow-vintage-sm flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold font-display tracking-tight text-tinta">
                Locked_In
              </h1>
              <p className="text-xs text-tinta-muted font-medium">
                Personal ERP & Life Telemetry
              </p>
            </div>
          </div>
          <RetroBadge variant="maiz">v2.0</RetroBadge>
        </div>

        {error && (
          <div className="bg-semantic-danger/10 border-2 border-semantic-danger text-semantic-danger rounded-xl px-4 py-2.5 text-xs font-semibold mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handlePersonalLogin} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-tinta-muted mb-1">
              Personal Email
            </label>
            <input
              type="email"
              required
              placeholder="william@locked.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-4 py-2.5 text-sm text-tinta placeholder:text-tinta-soft focus:outline-none focus:ring-2 focus:ring-nopal"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-tinta-muted mb-1">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-crema border-2 border-tinta rounded-xl px-4 py-2.5 text-sm text-tinta placeholder:text-tinta-soft focus:outline-none focus:ring-2 focus:ring-nopal"
            />
          </div>

          <RetroButton type="submit" variant="primary" className="w-full py-3">
            <Compass className="w-4 h-4" /> Access Personal Vault
          </RetroButton>
        </form>

        <OrnamentalDivider label="Portfolio & Recruiters" />

        <RetroButton
          type="button"
          onClick={handleDemoLogin}
          variant="accent"
          className="w-full py-3"
        >
          <Sparkles className="w-4 h-4" /> Try Interactive Demo (1-Click)
        </RetroButton>
      </RetroCard>
    </div>
  );
}