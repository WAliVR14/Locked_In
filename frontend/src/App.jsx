import { useState, useEffect, useCallback } from 'react';
import api from './api/client';
import Login from './pages/Login';
import Layout from './components/Layout';
import Finance from './pages/Finance';
import { Activity, Database, Lock, Sparkles } from 'lucide-react';
import { RetroCard, RetroBadge, OrnamentalDivider } from './components/ui/RetroUI';

function App() {
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('locked_token')));

  const fetchSessionData = useCallback(async () => {
    const token = localStorage.getItem('locked_token');
    if (!token) return;

    try {
      const [meRes, sumRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/system/summary'),
      ]);
      setUser(meRes.data);
      setSummary(sumRes.data);
    } catch {
      localStorage.removeItem('locked_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('locked_token');
    if (!token) return;

    let isMounted = true;
    Promise.all([api.get('/auth/me'), api.get('/system/summary')])
      .then(([meRes, sumRes]) => {
        if (isMounted) {
          setUser(meRes.data);
          setSummary(sumRes.data);
        }
      })
      .catch(() => {
        if (isMounted) {
          localStorage.removeItem('locked_token');
          setUser(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('locked_token');
    setUser(null);
    setSummary(null);
    setActiveTab('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-crema text-tinta font-display flex items-center justify-center text-lg font-bold">
        Loading Locked_In Vault...
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={fetchSessionData} />;
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      user={user}
      onLogout={handleLogout}
    >
      {activeTab === 'finance' ? (
        <Finance onDataChange={fetchSessionData} />
      ) : (
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-tinta/20 pb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold font-display capitalize text-tinta">
                Domain: {activeTab}
              </h1>
              <p className="text-tinta-muted text-sm mt-1">
                Self-hosted modular ERP architecture · Event-Driven SQL Engine + FastAPI.
              </p>
            </div>
            <RetroBadge variant="oliva" className="self-start sm:self-auto">
              <Sparkles className="w-3.5 h-3.5" /> Mexican Heritage Retro UI
            </RetroBadge>
          </div>

          <OrnamentalDivider label="System Telemetry & Isolation" />

          {/* Telemetry cards for connection to the backend */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RetroCard>
              <div className="flex items-center justify-between text-tinta-muted text-xs font-bold uppercase tracking-wider mb-2">
                <span>API & Event Bus</span>
                <Activity className="w-4 h-4 text-nopal" />
              </div>
              <p className="text-xl font-bold font-display text-nopal">Online (JWT Active)</p>
            </RetroCard>

            <RetroCard variant="highlighted">
              <div className="flex items-center justify-between text-tinta-muted text-xs font-bold uppercase tracking-wider mb-2">
                <span>Multi-Tenant Vault</span>
                <Lock className="w-4 h-4 text-cempasuchil" />
              </div>
              <p className="text-xl font-bold font-display capitalize text-tinta">{user.role}</p>
            </RetroCard>

            <RetroCard>
              <div className="flex items-center justify-between text-tinta-muted text-xs font-bold uppercase tracking-wider mb-2">
                <span>Self-Hosted Records</span>
                <Database className="w-4 h-4 text-oliva" />
              </div>
              <p className="text-xl font-bold font-display text-tinta">
                {summary?.metrics?.accounts ?? 0} Accounts · {summary?.metrics?.pantry_items ?? 0} Items
              </p>
            </RetroCard>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default App;