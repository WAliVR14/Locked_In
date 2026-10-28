import { Home, Wallet, ShoppingCart, Dumbbell, Target, LogOut, ShieldCheck } from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Today', icon: Home },
  { id: 'finance', label: 'Finance', icon: Wallet },
  { id: 'groceries', label: 'Groceries', icon: ShoppingCart },
  { id: 'gym', label: 'Gym', icon: Dumbbell },
  { id: 'goals', label: 'Goals and Social', icon: Target },
];

export default function Layout({ activeTab, setActiveTab, user, onLogout, children }) {
  const isDemo = user?.role === 'demo';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar for Laptop / Desktopo */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-6">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Locked_In</h2>
          </div>
          <span
            className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isDemo
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isDemo ? 'Demo Mode (Recruiter)' : 'Administrator Mode'}
          </span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                  active
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5" /> {item.label}
              </button>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-slate-800">
          <p className="text-xs text-slate-500 truncate mb-3">{user?.email}</p>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm transition"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
      </aside>

      {/* Mobile top header (Visible only on mobile) */}
      <header className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-sm">Locked_In</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400">
            {isDemo ? 'Demo' : 'Admin'}
          </span>
        </div>
        <button onClick={onLogout} className="text-slate-400 hover:text-red-400 p-1">
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Dynamic Main Content */}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation Bar (Visible only on mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex justify-around py-2 z-50">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center p-2 text-xs transition ${
                active ? 'text-emerald-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}