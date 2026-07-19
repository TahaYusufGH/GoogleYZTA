import { Brain, TrendingDown, Star, Clock, Package, Tag, Activity, Zap, Target } from 'lucide-react';
import type { CustomerFeatures } from '../lib/types';
import { predictChurn } from '../lib/dataProcessor';

interface ModelInsightsProps {
  customers: CustomerFeatures[];
}

interface FeatureImportance {
  name: string;
  label: string;
  weight: number;
  icon: typeof Brain;
  description: string;
}

const featureDefinitions: FeatureImportance[] = [
  {
    name: 'recency',
    label: 'Son Siparişten Geçen Süre',
    weight: 0.25,
    icon: Clock,
    description: 'Müşterinin son alışverişinden bu yana geçen gün sayısı. En güçlü churn göstergesi.',
  },
  {
    name: 'low_rating',
    label: 'Düşük Puan Oranı',
    weight: 0.18,
    icon: Star,
    description: '1-2 yıldız verilen siparişlerin oranı. Memnuniyetsizliğin doğrudan ölçümü.',
  },
  {
    name: 'avg_rating',
    label: 'Ortalama Müşteri Puanı',
    weight: 0.15,
    icon: TrendingDown,
    description: 'Tüm siparişlerin ortalama puanı. Düşük puan = yüksek churn riski.',
  },
  {
    name: 'delivery_time',
    label: 'Ortalama Teslimat Süresi',
    weight: 0.12,
    icon: Package,
    description: 'Siparişlerin ortalama teslimat süresi. 5 günden uzun süreler risk artırır.',
  },
  {
    name: 'order_frequency',
    label: 'Sipariş Sıklığı',
    weight: 0.12,
    icon: Activity,
    description: 'Siparişler arası ortalama gün sayısı. Artan aralıklar churn sinyali.',
  },
  {
    name: 'total_orders',
    label: 'Toplam Sipariş (Koruyucu)',
    weight: 0.08,
    icon: Package,
    description: 'Müşterinin toplam sipariş sayısı. Çok sipariş = düşük churn riski.',
  },
  {
    name: 'discount_dependency',
    label: 'İndirim Bağımlılığı',
    weight: 0.05,
    icon: Tag,
    description: 'Sadece indirimli alışveriş yapma eğilimi. İndirim biterse churn riski.',
  },
  {
    name: 'session_engagement',
    label: 'Oturum Etkileşimi',
    weight: 0.05,
    icon: Zap,
    description: 'Ortalama oturum süresi. Kısa oturumlar = azalan ilgi sinyali.',
  },
];

export function ModelInsights({ customers }: ModelInsightsProps) {
  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <Brain className="w-12 h-12 text-slate-300" />
        <p className="text-sm text-slate-400">Model analizini görmek için veri yükleyin</p>
      </div>
    );
  }

  // Compute average factor contributions across all customers
  const factorAverages = new Map<string, number>();
  for (const c of customers) {
    const pred = predictChurn(c);
    for (const f of pred.factors) {
      factorAverages.set(f.name, (factorAverages.get(f.name) || 0) + f.contribution);
    }
  }
  for (const [key, val] of factorAverages) {
    factorAverages.set(key, val / customers.length);
  }

  // Strategy distribution
  const strategyMap = new Map<string, number>();
  for (const c of customers) {
    const pred = predictChurn(c);
    const s = pred.recoveryStrategy;
    strategyMap.set(s, (strategyMap.get(s) || 0) + 1);
  }
  const strategies = [...strategyMap.entries()].sort((a, b) => b[1] - a[1]);

  // Score distribution histogram
  const buckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const c of customers) {
    const idx = Math.min(9, Math.floor(c.churn_risk_score / 10));
    buckets[idx]++;
  }
  const maxBucket = Math.max(...buckets);

  const strategyLabels: Record<string, string> = {
    winback_loyal: 'Sadık Müşteriyi Geri Kazanma',
    winback_new: 'Yeni Müşteriyi Geri Kazanma',
    service_recovery: 'Hizmet Telafi',
    delivery_apology: 'Teslimat Özrü',
    discount_offer: 'İndirim Teklifi',
    engagement_boost: 'Etkileşim Artırma',
    personalized_recommendation: 'Kişiselleştirilmiş Öneri',
    monitor: 'İzleme (Düşük Risk)',
    general_winback: 'Genel Geri Kazanım',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Model Analizi</h1>
        <p className="text-sm text-slate-500 mt-1">Churn tahmin modelinin özellikleri ve performansı</p>
      </div>

      {/* Model Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <Brain className="w-5 h-5 text-sky-600" />
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Model Tipi</span>
          </div>
          <p className="text-lg font-bold text-slate-700">Ağırlıklı Lojistik Regresyon</p>
          <p className="text-xs text-slate-400 mt-1">8 özellik × ağırlık matrisi</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Target className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Analiz Edilen</span>
          </div>
          <p className="text-lg font-bold text-slate-700">{customers.length} Müşteri</p>
          <p className="text-xs text-slate-400 mt-1">Tüm veri seti üzerinden</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Ort. Risk</span>
          </div>
          <p className="text-lg font-bold text-slate-700">
            {(customers.reduce((s, c) => s + c.churn_risk_score, 0) / customers.length).toFixed(1)}/100
          </p>
          <p className="text-xs text-slate-400 mt-1">Popülasyon ortalaması</p>
        </div>
      </div>

      {/* Feature Importance */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-800 mb-1">Özellik Önem Sıralaması</h3>
        <p className="text-xs text-slate-400 mb-5">Modeldeki her özelliğin churn skoruna katkısı (ağırlık × ortalama değer)</p>
        <div className="space-y-4">
          {featureDefinitions.map((f) => {
            const avgContribution = factorAverages.get(f.name) || 0;
            const Icon = f.icon;
            return (
              <div key={f.name} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-700">{f.label}</span>
                      <span className="text-xs text-slate-400">Ağırlık: %{(f.weight * 100).toFixed(0)}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-600">{avgContribution.toFixed(1)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(avgContribution, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Score Distribution Histogram */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-800 mb-1">Skor Dağılımı</h3>
        <p className="text-xs text-slate-400 mb-5">Müşteri churn skorlarının histogram dağılımı</p>
        <div className="flex items-end justify-between gap-1.5 h-40">
          {buckets.map((count, i) => {
            const height = maxBucket > 0 ? (count / maxBucket) * 100 : 0;
            const color = i >= 7 ? 'from-red-400 to-red-500' : i >= 5 ? 'from-orange-400 to-orange-500' : i >= 2 ? 'from-amber-400 to-amber-500' : 'from-emerald-400 to-emerald-500';
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {count}
                </span>
                <div
                  className={`w-full bg-gradient-to-t ${color} rounded-t-md transition-all duration-500 hover:opacity-80`}
                  style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                />
                <span className="text-[10px] text-slate-400 font-medium">{i * 10}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
          <span>Düşük Risk</span>
          <span>Yüksek Risk</span>
        </div>
      </div>

      {/* Recovery Strategy Distribution */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-800 mb-1">Geri Kazanım Stratejileri Dağılımı</h3>
        <p className="text-xs text-slate-400 mb-5">AI ajanının müşterilere önerdiği stratejiler</p>
        <div className="space-y-3">
          {strategies.map(([strategy, count]) => {
            const pct = (count / customers.length) * 100;
            return (
              <div key={strategy} className="flex items-center gap-3">
                <div className="w-48 text-sm font-medium text-slate-600 truncate">
                  {strategyLabels[strategy] || strategy}
                </div>
                <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-lg transition-all duration-700 flex items-center justify-end px-2"
                    style={{ width: `${Math.max(pct, 3)}%` }}
                  >
                    <span className="text-[11px] font-bold text-white">{count}</span>
                  </div>
                </div>
                <div className="w-12 text-right text-xs text-slate-400 font-medium">
                  %{pct.toFixed(0)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pipeline Diagram */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-800 mb-5">Veri İşleme Pipeline'ı</h3>
        <div className="flex flex-col lg:flex-row items-stretch gap-3">
          <PipelineStep
            num={1}
            icon={Package}
            title="Veri Toplama"
            desc="Ham transaction verileri"
            color="sky"
          />
          <PipelineArrow />
          <PipelineStep
            num={2}
            icon={Activity}
            title="Veri Temizleme"
            desc="Eksik/Geçersiz veri filtreleme"
            color="emerald"
          />
          <PipelineArrow />
          <PipelineStep
            num={3}
            icon={Brain}
            title="Feature Engineering"
            desc="Müşteri bazlı özellik üretimi"
            color="amber"
          />
          <PipelineArrow />
          <PipelineStep
            num={4}
            icon={Target}
            title="Churn Tahmini"
            desc="0-100 risk skoru"
            color="orange"
          />
          <PipelineArrow />
          <PipelineStep
            num={5}
            icon={Zap}
            title="AI Geri Kazanım"
            desc="Kişiselleştirilmiş mesaj"
            color="red"
          />
        </div>
      </div>
    </div>
  );
}

function PipelineStep({ num, icon: Icon, title, desc, color }: {
  num: number;
  icon: typeof Brain;
  title: string;
  desc: string;
  color: string;
}) {
  const colors: Record<string, { bg: string; text: string; ring: string }> = {
    sky: { bg: 'bg-sky-50', text: 'text-sky-600', ring: 'ring-sky-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', ring: 'ring-orange-100' },
    red: { bg: 'bg-red-50', text: 'text-red-600', ring: 'ring-red-100' },
  };
  const c = colors[color];

  return (
    <div className="flex-1 flex flex-col items-center text-center p-4 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
      <div className={`w-12 h-12 rounded-2xl ${c.bg} flex items-center justify-center ring-4 ${c.ring} mb-3`}>
        <Icon className={`w-6 h-6 ${c.text}`} />
      </div>
      <span className="text-[10px] font-bold text-slate-300 mb-1">ADIM {num}</span>
      <h4 className="text-sm font-bold text-slate-700">{title}</h4>
      <p className="text-xs text-slate-400 mt-1">{desc}</p>
    </div>
  );
}

function PipelineArrow() {
  return (
    <div className="flex items-center justify-center text-slate-300">
      <svg className="w-6 h-6 rotate-90 lg:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    </div>
  );
}
