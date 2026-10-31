import {
  CalendarCheck2,
  Wallet,
  ShoppingBasket,
  Dumbbell,
  Compass,
  LineChart,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { RetroBadge } from './ui/RetroUI';

const navItems = [
  { id: 'dashboard', label: 'Today', icon: CalendarCheck2 },
  { id: 'finance', label: 'Finance', icon: Wallet },
  { id: 'groceries', label: 'Pantry & Home', icon: ShoppingBasket },
  { id: 'gym', label: 'Bio & Gym', icon: Dumbbell },
  { id: 'strategy', label: 'Strategy & Career', icon: Compass },
  { id: 'insights', label: 'Insights', icon: LineChart },
];

export default function Layout({ activeTab, setActiveTab, user, onLogout, children }) {
  const isDemo = user?.role === 'demo';

  return (
    <div className="min-h-screen bg-crema text-tinta flex flex-col md:flex-row">
      {/* Sidebar for Laptop / Desktop */}
      <aside className="hidden md:flex flex-col w-68 bg-crema-paper border-r-2 border-tinta p-6 shadow-vintage-sm">
        <div className="mb-6 pb-4 border-b-2 border-double border-tinta/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-nopal text-crema border-2 border-tinta shadow-vintage-sm flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold font-display text-tinta tracking-tight leading-none">
                Locked_In
              </h2>
              <span className="text-[11px] text-tinta-muted font-medium">
                Personal ERP v2.0
              </span>
            </div>
          </div>
          <div className="mt-3">
            <RetroBadge variant={isDemo ? 'maiz' : 'nopal'}>
              {isDemo ? '◆ Demo Mode (Recruiter)' : '◆ Administrator Vault'}
            </RetroBadge>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-nopal text-crema border-2 border-tinta shadow-vintage-sm translate-x-0.5'
                    : 'text-tinta-muted hover:bg-maiz-soft hover:text-tinta border-2 border-transparent'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="pt-4 mt-4 border-t-2 border-double border-tinta/30">
          <p className="text-xs font-medium text-tinta-muted truncate mb-3">{user?.email}</p>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 border-tinta bg-crema hover:bg-cempasuchil hover:text-crema text-tinta text-xs font-bold transition shadow-vintage-sm"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-crema-paper border-b-2 border-tinta px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-nopal text-crema border border-tinta flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="font-bold font-display text-base text-tinta">Locked_In</span>
          <RetroBadge variant={isDemo ? 'maiz' : 'nopal'}>
            {isDemo ? 'Demo' : 'Admin'}
          </RetroBadge>
        </div>
        <button
          onClick={onLogout}
          className="text-tinta hover:text-cempasuchil p-1.5 rounded-lg border border-tinta/30 bg-crema"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Dynamic Main Content */}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation Bar (Mobile PWA - 6 Unified Domains) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-crema-paper border-t-2 border-tinta grid grid-cols-6 py-1.5 px-1 z-50">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] transition ${
                active
                  ? 'bg-nopal text-crema font-bold border border-tinta shadow-vintage-sm'
                  : 'text-tinta-muted font-medium'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="truncate max-w-[54px]">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}