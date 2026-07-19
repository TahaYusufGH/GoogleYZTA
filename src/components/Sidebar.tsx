import { TrendingDown, LayoutDashboard, Users, Brain, Sparkles } from 'lucide-react';

export type View = 'dashboard' | 'customers' | 'detail' | 'insights';

interface SidebarProps {
  view: View;
  onNavigate: (view: View) => void;
}

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Genel Bakış', icon: LayoutDashboard },
  { id: 'customers', label: 'Müşteri Listesi', icon: Users },
  { id: 'insights', label: 'Model Analizi', icon: Brain },
];

export function Sidebar({ view, onNavigate }: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      <div className="px-6 py-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center shadow-lg shadow-sky-500/30">
            <TrendingDown className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-sm leading-tight">ChurnGuard AI</h1>
            <p className="text-[11px] text-slate-400 font-medium">Müşteri Terki Tahmin Sistemi</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = view === item.id || (view === 'detail' && item.id === 'customers');
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-sky-50 text-sky-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] ${active ? 'text-sky-600' : 'text-slate-400'}`} strokeWidth={2} />
              {item.label}
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-500" />}
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-slate-100">
        <div className="bg-gradient-to-br from-sky-50 to-sky-100 rounded-2xl p-4 border border-sky-200">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-bold text-sky-800">AI Ajan Aktif</span>
          </div>
          <p className="text-[11px] text-sky-600 leading-relaxed">
            Geri kazanım mesajları otomatik olarak kişiselleştirilmektedir.
          </p>
        </div>
      </div>
    </aside>
  );
}
