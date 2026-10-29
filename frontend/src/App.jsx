import { useState, useEffect, useCallback } from 'react';
import api from './api/client';
import Login from './pages/Login';
import Layout from './components/Layout';
import Finance from './pages/Finance';
import { Activity, Database, Lock } from 'lucide-react';

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
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">
        Loading Locked_In...
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
          <div>
            <h1 className="text-2xl md:text-3xl font-bold capitalize">
              Module: {activeTab}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Base architecture connected to PostgreSQL (Supabase) + FastAPI.
            </p>
          </div>

          {/* Telemetry cards for connection to the backend */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between text-slate-400 text-sm mb-2">
                <span>API Status</span>
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-emerald-400">Online (JWT Active)</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between text-slate-400 text-sm mb-2">
                <span>Multi-Tenant Isolation</span>
                <Lock className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xl font-bold capitalize">{user.role}</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between text-slate-400 text-sm mb-2">
                <span>Database Records</span>
                <Database className="w-4 h-4 text-sky-400" />
              </div>
              <p className="text-xl font-bold">
                {summary?.metrics?.accounts ?? 0} Accounts | {summary?.metrics?.pantry_items ?? 0} Groceries
              </p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default App;