import { useState, useMemo } from 'react';
import { Search, ChevronRight, MapPin, ShoppingBag, Loader2 } from 'lucide-react';
import type { CustomerFeatures, ChurnLevel } from '../lib/types';
import { getLevelColor, getLevelLabel } from './shared';

interface CustomerListProps {
  customers: CustomerFeatures[];
  loading: boolean;
  onSelectCustomer: (id: string) => void;
}

type FilterLevel = 'all' | ChurnLevel;
type SortBy = 'risk' | 'spent' | 'orders' | 'rating';

export function CustomerList({ customers, loading, onSelectCustomer }: CustomerListProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterLevel>('all');
  const [sortBy, setSortBy] = useState<SortBy>('risk');

  const filtered = useMemo(() => {
    let result = [...customers];

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(c =>
        c.customer_id.toLowerCase().includes(s) ||
        c.city.toLowerCase().includes(s) ||
        c.favorite_category.toLowerCase().includes(s)
      );
    }

    if (filter !== 'all') {
      result = result.filter(c => c.churn_risk_level === filter);
    }

    switch (sortBy) {
      case 'risk': result.sort((a, b) => b.churn_risk_score - a.churn_risk_score); break;
      case 'spent': result.sort((a, b) => b.total_spent - a.total_spent); break;
      case 'orders': result.sort((a, b) => b.total_orders - a.total_orders); break;
      case 'rating': result.sort((a, b) => a.avg_rating - b.avg_rating); break;
    }

    return result;
  }, [customers, search, filter, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Müşteri Listesi</h1>
        <p className="text-sm text-slate-500 mt-1">{customers.length} müşteri analiz edildi</p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Müşteri ID, şehir veya kategori ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as FilterLevel)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="all">Tüm Seviyeler</option>
              <option value="Kritik">Kritik</option>
              <option value="Yuksek">Yüksek</option>
              <option value="Orta">Orta</option>
              <option value="Dusuk">Düşük</option>
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortBy)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="risk">Risk Skoru</option>
              <option value="spent">Toplam Harcama</option>
              <option value="orders">Sipariş Sayısı</option>
              <option value="rating">Puan (Düşük→Yüksek)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Müşteri</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-3">Şehir</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-3">Sipariş</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-3">Harcama</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-3">Puan</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-3">Risk</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-3">Seviye</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(c => {
                const colors = getLevelColor(c.churn_risk_level);
                return (
                  <tr
                    key={c.customer_id}
                    onClick={() => onSelectCustomer(c.customer_id)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${colors.bg} flex items-center justify-center text-xs font-bold ${colors.text}`}>
                          {c.customer_id.replace('CUST_', '').slice(-3)}
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-slate-700 group-hover:text-sky-600 transition-colors">
                            {c.customer_id}
                          </span>
                          <p className="text-[11px] text-slate-400">{c.favorite_category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-slate-500">
                        <MapPin className="w-3 h-3 text-slate-300" />
                        {c.city}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-500">{c.total_orders}</td>
                    <td className="px-3 py-3 text-sm font-medium text-slate-600">₺{formatNum(c.total_spent)}</td>
                    <td className="px-3 py-3">
                      <span className={`text-sm font-medium ${c.avg_rating <= 2.5 ? 'text-red-600' : c.avg_rating <= 3.5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {c.avg_rating.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${colors.dot}`}
                            style={{ width: `${c.churn_risk_score}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold ${colors.text}`}>{c.churn_risk_score}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`badge ${colors.bg} ${colors.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                        {getLevelLabel(c.churn_risk_level)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <ShoppingBag className="w-8 h-8 text-slate-300" />
            <p className="text-sm text-slate-400">Filtrelerle eşleşen müşteri bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toFixed(0);
}
