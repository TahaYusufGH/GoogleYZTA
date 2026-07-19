import { Users, AlertTriangle, TrendingUp, Star, Loader2, Database, RefreshCw } from 'lucide-react';
import type { DashboardStats, CustomerFeatures } from '../lib/types';
import { getLevelColor, getLevelLabel } from './shared';

interface DashboardProps {
  stats: DashboardStats | null;
  customers: CustomerFeatures[];
  loading: boolean;
  seeding: boolean;
  onSeed: () => void;
  onSelectCustomer: (id: string) => void;
}

export function Dashboard({ stats, customers, loading, seeding, onSeed, onSelectCustomer }: DashboardProps) {
  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  if (!stats || customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6 animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-100 to-sky-200 flex items-center justify-center">
          <Database className="w-10 h-10 text-sky-600" />
        </div>
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Veri Bulunamadı</h2>
          <p className="text-sm text-slate-500 mb-6">
            Henüz müşteri verisi oluşturulmamış. Analizi başlatmak için aşağıdaki butona tıklayın.
            200 müşteri için sentetik veri üretilip churn tahmini yapılacaktır.
          </p>
          <button onClick={onSeed} disabled={seeding} className="btn-primary inline-flex items-center gap-2">
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {seeding ? 'Veri Oluşturuluyor...' : 'Veri Üret ve Analiz Et'}
          </button>
        </div>
      </div>
    );
  }

  const topRiskCustomers = customers.slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Genel Bakış</h1>
          <p className="text-sm text-slate-500 mt-1">Müşteri churn risk analizi ve geri kazanım özeti</p>
        </div>
        <button onClick={onSeed} disabled={seeding} className="btn-secondary inline-flex items-center gap-2 text-sm">
          {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {seeding ? 'Yenileniyor...' : 'Verileri Yenile'}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Toplam Müşteri"
          value={stats.totalCustomers.toString()}
          color="sky"
        />
        <StatCard
          icon={AlertTriangle}
          label="Yüksek Risk"
          value={(stats.highRiskCount + stats.criticalCount).toString()}
          subtext={`${stats.criticalCount} kritik`}
          color="red"
        />
        <StatCard
          icon={TrendingUp}
          label="Toplam Gelir"
          value={`₺${formatNumber(stats.totalRevenue)}`}
          color="emerald"
        />
        <StatCard
          icon={Star}
          label="Ort. Puan"
          value={`${stats.avgRating}/5`}
          color="amber"
        />
      </div>

      {/* Churn Distribution + Top Reasons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Churn Distribution */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Churn Risk Dağılımı</h3>
          <div className="space-y-3">
            {stats.churnDistribution.map(d => {
              const colors = getLevelColor(d.level);
              return (
                <div key={d.level} className="flex items-center gap-3">
                  <div className="w-20 text-sm font-medium text-slate-600">{getLevelLabel(d.level)}</div>
                  <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden">
                    <div
                      className={`h-full ${colors.dot} rounded-lg transition-all duration-700 ease-out flex items-center justify-end px-2`}
                      style={{ width: `${Math.max(d.percentage, 5)}%` }}
                    >
                      <span className="text-[11px] font-bold text-white">{d.count}</span>
                    </div>
                  </div>
                  <div className="w-12 text-right text-xs text-slate-400 font-medium">
                    %{d.percentage.toFixed(0)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Ortalama Risk Skoru</span>
              <span className="font-bold text-slate-700">{stats.avgChurnScore}/100</span>
            </div>
          </div>
        </div>

        {/* Top Churn Reasons */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-800 mb-4">En Sık Churn Nedenleri</h3>
          <div className="space-y-3">
            {stats.topChurnReasons.map((r, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-600 leading-snug truncate">{r.reason}</p>
                </div>
                <div className="text-sm font-bold text-slate-700 shrink-0">{r.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category + City Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Performance */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Kategori Performansı</h3>
          <div className="space-y-3">
            {stats.categoryStats.slice(0, 6).map(c => (
              <div key={c.category} className="flex items-center gap-3">
                <div className="w-28 text-sm font-medium text-slate-600 truncate">{c.category}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-5 bg-slate-100 rounded-md overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-400 to-sky-500 rounded-md transition-all duration-700"
                        style={{ width: `${(c.revenue / stats.categoryStats[0].revenue) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 w-16 text-right">
                      ₺{formatNumber(c.revenue)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* City Risk Map */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Şehir Bazlı Risk Haritası</h3>
          <div className="space-y-3">
            {stats.cityStats.slice(0, 6).map(c => {
              const riskColor = c.avgChurn >= 50 ? 'text-red-600 bg-red-50' : c.avgChurn >= 25 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50';
              return (
                <div key={c.city} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                      {c.city.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-600">{c.city}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{c.customers} müşteri</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${riskColor}`}>
                      {c.avgChurn}/100
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Risk Customers */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">En Yüksek Riskli Müşteriler</h3>
          <span className="text-xs text-slate-400 font-medium">Acil aksiyon gerekenler</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">Müşteri</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">Şehir</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">Sipariş</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">Harcama</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">Risk Skoru</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">Seviye</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {topRiskCustomers.map(c => {
                const colors = getLevelColor(c.churn_risk_level);
                return (
                  <tr
                    key={c.customer_id}
                    onClick={() => onSelectCustomer(c.customer_id)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <td className="py-3">
                      <span className="text-sm font-semibold text-slate-700 group-hover:text-sky-600 transition-colors">
                        {c.customer_id}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-slate-500">{c.city}</td>
                    <td className="py-3 text-sm text-slate-500">{c.total_orders}</td>
                    <td className="py-3 text-sm text-slate-500">₺{formatNumber(c.total_spent)}</td>
                    <td className="py-3">
                      <span className={`text-sm font-bold ${colors.text}`}>{c.churn_risk_score}</span>
                    </td>
                    <td className="py-3">
                      <span className={`badge ${colors.bg} ${colors.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                        {getLevelLabel(c.churn_risk_level)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtext, color }: {
  icon: typeof Users;
  label: string;
  value: string;
  subtext?: string;
  color: 'sky' | 'red' | 'emerald' | 'amber';
}) {
  const colors = {
    sky: { bg: 'bg-sky-50', icon: 'text-sky-600', ring: 'ring-sky-100' },
    red: { bg: 'bg-red-50', icon: 'text-red-600', ring: 'ring-red-100' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', ring: 'ring-amber-100' },
  };
  const c = colors[color];

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">{value}</p>
          {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center ring-4 ${c.ring}`}>
          <Icon className={`w-5 h-5 ${c.icon}`} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}
