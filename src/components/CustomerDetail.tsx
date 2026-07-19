import { useState, useEffect } from 'react';
import {
  ArrowLeft, MapPin, Calendar, Star, Package, DollarSign, Clock,
  Sparkles, RefreshCw, Copy, Check, AlertCircle, Loader2, Mail, Tag
} from 'lucide-react';
import type { CustomerFeatures, Transaction, ChurnFactor } from '../lib/types';
import { getLevelColor, getLevelLabel, getChurnColor } from './shared';
import { predictChurn } from '../lib/dataProcessor';

interface CustomerDetailProps {
  customer: CustomerFeatures;
  onBack: () => void;
  getTransactions: (id: string) => Promise<Transaction[]>;
  onRegenerateMessage: (id: string) => Promise<string | null>;
}

export function CustomerDetail({ customer, onBack, getTransactions, onRegenerateMessage }: CustomerDetailProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [message, setMessage] = useState(customer.recovery_message || '');
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const prediction = predictChurn(customer);
  const colors = getLevelColor(customer.churn_risk_level);
  const scoreColors = getChurnColor(customer.churn_risk_score);

  useEffect(() => {
    setLoadingTx(true);
    getTransactions(customer.customer_id).then(tx => {
      setTransactions(tx);
      setLoadingTx(false);
    });
    setMessage(customer.recovery_message || '');
  }, [customer.customer_id, customer.recovery_message, getTransactions]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    const newMsg = await onRegenerateMessage(customer.customer_id);
    if (newMsg) setMessage(newMsg);
    setRegenerating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <button onClick={onBack} className="btn-ghost inline-flex items-center gap-1.5 text-sm -ml-2">
        <ArrowLeft className="w-4 h-4" />
        Müşteri Listesi
      </button>

      {/* Customer Header */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center text-lg font-bold ${colors.text} ring-4 ${colors.bg}/30`}>
              {customer.customer_id.replace('CUST_', '').slice(-3)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{customer.customer_id}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{customer.city}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{customer.age} yaş</span>
                <span>{customer.gender}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${scoreColors.text}`}>{customer.churn_risk_score}</div>
              <div className="text-xs text-slate-400 font-medium">Risk Skoru</div>
            </div>
            <div className={`badge ${colors.bg} ${colors.text} text-sm px-3 py-1.5`}>
              <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
              {getLevelLabel(customer.churn_risk_level)}
            </div>
          </div>
        </div>
      </div>

      {/* Churn Score Gauge + Factor Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Gauge */}
        <div className="card p-6 flex flex-col items-center justify-center">
          <h3 className="font-semibold text-slate-800 mb-4 self-start">Churn Risk Skoru</h3>
          <ScoreGauge score={customer.churn_risk_score} level={customer.churn_risk_level} />
          <div className="mt-4 text-center">
            <p className="text-sm text-slate-500">{prediction.primaryReason}</p>
          </div>
        </div>

        {/* Factor Breakdown */}
        <div className="card p-6 lg:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-4">Risk Faktörleri Analizi</h3>
          <div className="space-y-3">
            {prediction.factors
              .sort((a, b) => b.contribution - a.contribution)
              .map((f, i) => (
                <FactorBar key={i} factor={f} />
              ))}
          </div>
        </div>
      </div>

      {/* Customer Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard icon={Package} label="Sipariş" value={customer.total_orders.toString()} />
        <MetricCard icon={DollarSign} label="Harcama" value={`₺${formatNum(customer.total_spent)}`} />
        <MetricCard icon={Star} label="Ort. Puan" value={customer.avg_rating.toFixed(1)} />
        <MetricCard icon={Clock} label="Teslimat" value={`${customer.avg_delivery_time.toFixed(0)} gün`} />
        <MetricCard icon={Calendar} label="Son Sipariş" value={`${customer.days_since_last_order} gün`} />
        <MetricCard icon={Tag} label="Kategori" value={customer.favorite_category} />
      </div>

      {/* AI Recovery Message */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">AI Geri Kazanım Mesajı</h3>
              <p className="text-xs text-slate-400">Kişiselleştirilmiş müşteri iletişim önerisi</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={!message}
              className="btn-ghost text-sm inline-flex items-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Kopyalandı' : 'Kopyala'}
            </button>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="btn-primary text-sm inline-flex items-center gap-1.5"
            >
              {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {regenerating ? 'Üretiliyor...' : 'Yeniden Üret'}
            </button>
          </div>
        </div>

        {/* Strategy Badge */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="badge bg-sky-50 text-sky-700">
            <Mail className="w-3 h-3" />
            {prediction.recoveryStrategy}
          </span>
          {prediction.secondaryReasons.map((r, i) => (
            <span key={i} className="badge bg-slate-100 text-slate-500">{r.split('(')[0].trim()}</span>
          ))}
        </div>

        {/* Message Content */}
        {message ? (
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-200">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-600">
                {getSubject(prediction.recoveryStrategy, customer)}
              </span>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-slate-600 leading-relaxed font-sans">{message}</pre>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <AlertCircle className="w-6 h-6 text-slate-300" />
            <p className="text-sm text-slate-400">Henüz mesaj üretilmedi. "Yeniden Üret" butonuna tıklayın.</p>
          </div>
        )}

        {customer.message_generated_at && (
          <p className="text-xs text-slate-400 mt-3">
            Son üretilme: {new Date(customer.message_generated_at).toLocaleString('tr-TR')}
          </p>
        )}
      </div>

      {/* Transaction History */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Sipariş Geçmişi</h3>
        {loadingTx ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Sipariş kaydı bulunamadı</p>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">Tarih</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">Kategori</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">Tutar</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">Teslimat</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">Puan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transactions.map(t => (
                  <tr key={t.order_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 text-sm text-slate-500">{t.date}</td>
                    <td className="py-3 text-sm font-medium text-slate-600">{t.product_category}</td>
                    <td className="py-3 text-sm font-medium text-slate-600">₺{t.total_amount.toFixed(2)}</td>
                    <td className="py-3">
                      <span className={`text-sm ${t.delivery_time_days > 10 ? 'text-red-500 font-medium' : 'text-slate-500'}`}>
                        {t.delivery_time_days} gün
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map(n => (
                          <Star
                            key={n}
                            className={`w-3 h-3 ${n <= t.customer_rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreGauge({ score, level }: { score: number; level: string }) {
  const colors = getChurnColor(score);
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-44 h-44">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="70" fill="none" stroke="rgb(241 245 249)" strokeWidth="12" />
        <circle
          cx="80" cy="80" r="70" fill="none"
          stroke={`url(#gradient-${score >= 75 ? 'red' : score >= 50 ? 'orange' : score >= 25 ? 'amber' : 'green'})`}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="gradient-red" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(239 68 68)" />
            <stop offset="100%" stopColor="rgb(220 38 38)" />
          </linearGradient>
          <linearGradient id="gradient-orange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(251 146 60)" />
            <stop offset="100%" stopColor="rgb(234 88 12)" />
          </linearGradient>
          <linearGradient id="gradient-amber" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(251 191 36)" />
            <stop offset="100%" stopColor="rgb(245 158 11)" />
          </linearGradient>
          <linearGradient id="gradient-green" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(52 211 153)" />
            <stop offset="100%" stopColor="rgb(16 185 129)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold ${colors.text}`}>{score}</span>
        <span className="text-xs text-slate-400 font-medium mt-1">/ 100</span>
        <span className={`badge ${colors.bg} ${colors.text} mt-2`}>{getLevelLabel(level as any)}</span>
      </div>
    </div>
  );
}

function FactorBar({ factor }: { factor: ChurnFactor }) {
  const isRisk = factor.direction === 'risk';
  const barColor = isRisk
    ? factor.contribution > 50 ? 'bg-red-500' : factor.contribution > 25 ? 'bg-orange-500' : 'bg-amber-400'
    : 'bg-emerald-500';
  const textColor = isRisk
    ? factor.contribution > 50 ? 'text-red-600' : factor.contribution > 25 ? 'text-orange-600' : 'text-amber-600'
    : 'text-emerald-600';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-600">{factor.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {typeof factor.value === 'number' && factor.value < 1 && factor.value > 0
              ? `%${(factor.value * 100).toFixed(0)}`
              : factor.value}
          </span>
          <span className={`text-xs font-bold ${textColor}`}>{factor.contribution.toFixed(0)}</span>
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${Math.min(factor.contribution, 100)}%` }}
        />
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-base font-bold text-slate-700 truncate">{value}</p>
    </div>
  );
}

function getSubject(strategy: string, _c: CustomerFeatures): string {
  if (strategy.includes('delivery')) return 'Teslimat Telafi Mesajı';
  if (strategy.includes('service_recovery')) return 'Hizmet Telafi Mesajı';
  if (strategy.includes('discount')) return 'İndirim Teklifi';
  if (strategy.includes('engagement')) return 'Etkileşim Artırma';
  if (strategy.includes('winback')) return 'Geri Kazanım Mesajı';
  return 'Kişiselleştirilmiş Mesaj';
}

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toFixed(0);
}
