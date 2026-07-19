import type { Transaction, CustomerFeatures, ChurnFactor, ChurnPrediction, ChurnLevel } from './types';

// Reference date for "days since last order" calculations
// Dataset spans Jan 2023 - Mar 2024, so we use the last date as "today"
const REFERENCE_DATE = new Date('2024-03-26');

/**
 * Data Cleaning & Preprocessing
 * Handles missing values, type coercion, outlier detection
 */
export function cleanTransactions(raw: Transaction[]): Transaction[] {
  return raw.filter(t => {
    if (!t.customer_id || !t.order_id || !t.date) return false;
    if (t.total_amount < 0 || t.unit_price < 0) return false;
    if (t.quantity < 1 || t.quantity > 10) return false;
    if (t.customer_rating < 1 || t.customer_rating > 5) return false;
    if (t.delivery_time_days < 1 || t.delivery_time_days > 30) return false;
    if (t.session_duration_minutes < 1 || t.session_duration_minutes > 120) return false;
    if (t.age < 18 || t.age > 75) return false;
    return true;
  }).map(t => ({
    ...t,
    discount_amount: t.discount_amount || 0,
    is_returning_customer: Boolean(t.is_returning_customer),
    city: t.city?.trim() || 'Bilinmiyor',
    gender: t.gender?.trim() || 'Bilinmiyor',
    product_category: t.product_category?.trim() || 'Diger',
  }));
}

/**
 * Feature Engineering - Aggregates raw transactions into per-customer features
 * Produces RFM-like features + behavioral metrics
 */
export function engineerFeatures(transactions: Transaction[]): CustomerFeatures[] {
  const byCustomer = new Map<string, Transaction[]>();

  for (const t of transactions) {
    if (!byCustomer.has(t.customer_id)) {
      byCustomer.set(t.customer_id, []);
    }
    byCustomer.get(t.customer_id)!.push(t);
  }

  const features: CustomerFeatures[] = [];

  for (const [customerId, orders] of byCustomer) {
    const sorted = orders.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstDate = new Date(sorted[0].date);
    const lastDate = new Date(sorted[sorted.length - 1].date);
    const daysSinceLast = Math.floor((REFERENCE_DATE.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    const totalSpent = orders.reduce((s, o) => s + o.total_amount, 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalSpent / totalOrders;
    const avgDiscount = orders.reduce((s, o) => s + o.discount_amount, 0) / totalOrders;
    const avgSession = orders.reduce((s, o) => s + o.session_duration_minutes, 0) / totalOrders;
    const avgPages = orders.reduce((s, o) => s + o.pages_viewed, 0) / totalOrders;
    const avgDelivery = orders.reduce((s, o) => s + o.delivery_time_days, 0) / totalOrders;
    const avgRating = orders.reduce((s, o) => s + o.customer_rating, 0) / totalOrders;
    const lowRatingCount = orders.filter(o => o.customer_rating <= 2).length;
    const lowRatingRatio = lowRatingCount / totalOrders;
    const returningCount = orders.filter(o => o.is_returning_customer).length;
    const returningRatio = returningCount / totalOrders;

    // Order frequency: average days between orders
    let avgFreqDays = 0;
    if (totalOrders > 1) {
      let totalDays = 0;
      for (let i = 1; i < sorted.length; i++) {
        totalDays += (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / (1000 * 60 * 60 * 24);
      }
      avgFreqDays = totalDays / (sorted.length - 1);
    } else {
      // Single order: use days since first order as proxy
      avgFreqDays = Math.floor((REFERENCE_DATE.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Favorite category and device
    const catCounts = new Map<string, number>();
    const deviceCounts = new Map<string, number>();
    for (const o of orders) {
      catCounts.set(o.product_category, (catCounts.get(o.product_category) || 0) + 1);
      deviceCounts.set(o.device_type, (deviceCounts.get(o.device_type) || 0) + 1);
    }
    const favoriteCategory = [...catCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Diger';
    const favoriteDevice = [...deviceCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Mobile';

    // Latest demographic info
    const latest = sorted[sorted.length - 1];

    features.push({
      customer_id: customerId,
      age: latest.age,
      gender: latest.gender,
      city: latest.city,
      total_orders: totalOrders,
      total_spent: Math.round(totalSpent * 100) / 100,
      avg_order_value: Math.round(avgOrderValue * 100) / 100,
      avg_discount_used: Math.round(avgDiscount * 100) / 100,
      avg_session_duration: Math.round(avgSession * 10) / 10,
      avg_pages_viewed: Math.round(avgPages * 10) / 10,
      avg_delivery_time: Math.round(avgDelivery * 10) / 10,
      avg_rating: Math.round(avgRating * 10) / 10,
      low_rating_ratio: Math.round(lowRatingRatio * 1000) / 1000,
      returning_ratio: Math.round(returningRatio * 1000) / 1000,
      days_since_last_order: daysSinceLast,
      order_frequency_days: Math.round(avgFreqDays * 10) / 10,
      favorite_category: favoriteCategory,
      favorite_device: favoriteDevice,
      first_order_date: sorted[0].date,
      last_order_date: sorted[sorted.length - 1].date,
      churn_risk_score: 0,
      churn_risk_level: 'Dusuk',
      primary_churn_reason: '',
      secondary_churn_reasons: [],
      recovery_strategy: '',
      recovery_message: null,
      message_generated_at: null,
      last_analyzed_at: new Date().toISOString(),
    });
  }

  return features;
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

/**
 * Tries the FastAPI backend first; falls back to heuristic if backend is unreachable.
 */
export async function predictChurnWithModel(features: CustomerFeatures): Promise<ChurnPrediction> {
  const discountDependency = features.avg_order_value > 0
    ? features.avg_discount_used / features.avg_order_value
    : 0;

  try {
    const res = await fetch(`${API_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        age: features.age,
        avg_unit_price: features.avg_order_value,
        avg_quantity: 1,
        avg_discount_used: features.avg_discount_used,
        avg_order_value: features.avg_order_value,
        avg_session_duration: features.avg_session_duration,
        avg_pages_viewed: features.avg_pages_viewed,
        returning_ratio: features.returning_ratio,
        avg_delivery_time: features.avg_delivery_time,
        avg_rating: features.avg_rating,
        total_spent: features.total_spent,
        total_orders: features.total_orders,
        gender: features.gender,
        city: features.city,
        favorite_category: features.favorite_category,
        payment_method: 'Credit Card',
        favorite_device: features.favorite_device,
      }),
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      const data = await res.json() as { score: number; level: string };
      const score = data.score;
      const level = data.level as import('./types').ChurnLevel;
      const heuristic = predictChurn(features);
      return { ...heuristic, score, level };
    }
  } catch {
    // Backend ulaşılamıyor — heuristic fallback
  }

  return predictChurn(features);
}

/**
 * Churn Prediction Model
 * Weighted logistic-regression-style scoring algorithm
 * Each factor contributes a weighted risk score (0-100)
 */
export function predictChurn(features: CustomerFeatures): ChurnPrediction {
  const factors: ChurnFactor[] = [];

  // Factor 1: Days since last order (recency) - strongest predictor
  // >180 days = very high risk, >90 = high, >60 = medium
  const recencyScore = Math.min(100, (features.days_since_last_order / 180) * 100);
  factors.push({
    name: 'recency',
    label: 'Son Siparişten Bu Yana Geçen Gün',
    value: features.days_since_last_order,
    contribution: recencyScore,
    benchmark: 60,
    direction: 'risk',
  });

  // Factor 2: Low rating ratio - dissatisfaction signal
  const ratingScore = features.low_rating_ratio * 100;
  factors.push({
    name: 'low_rating',
    label: 'Düşük Puan Oranı (1-2 yıldız)',
    value: features.low_rating_ratio,
    contribution: ratingScore,
    benchmark: 0.15,
    direction: 'risk',
  });

  // Factor 3: Average delivery time - logistics dissatisfaction
  const deliveryScore = Math.min(100, Math.max(0, (features.avg_delivery_time - 5) / 15) * 100);
  factors.push({
    name: 'delivery_time',
    label: 'Ortalama Teslimat Süresi (gün)',
    value: features.avg_delivery_time,
    contribution: deliveryScore,
    benchmark: 5,
    direction: 'risk',
  });

  // Factor 4: Average rating (inverse) - lower rating = higher churn
  const avgRatingScore = Math.max(0, (4.0 - features.avg_rating) / 3.0) * 100;
  factors.push({
    name: 'avg_rating',
    label: 'Ortalama Müşteri Puanı',
    value: features.avg_rating,
    contribution: avgRatingScore,
    benchmark: 4.0,
    direction: 'risk',
  });

  // Factor 5: Order frequency decline (longer gaps = higher churn)
  const freqScore = Math.min(100, (features.order_frequency_days / 120) * 100);
  factors.push({
    name: 'order_frequency',
    label: 'Sipariş Sıklığı (gün arası)',
    value: features.order_frequency_days,
    contribution: freqScore,
    benchmark: 30,
    direction: 'risk',
  });

  // Factor 6: Total orders (protective - loyal customers churn less)
  const loyaltyScore = Math.max(0, 100 - (features.total_orders / 10) * 100);
  factors.push({
    name: 'total_orders',
    label: 'Toplam Sipariş Sayısı',
    value: features.total_orders,
    contribution: loyaltyScore,
    benchmark: 5,
    direction: 'protective',
  });

  // Factor 7: Discount dependency - customers who only buy with discounts
  const discountRatio = features.avg_order_value > 0
    ? features.avg_discount_used / features.avg_order_value
    : 0;
  const discountScore = Math.min(100, discountRatio * 200);
  factors.push({
    name: 'discount_dependency',
    label: 'İndirim Bağımlılığı Oranı',
    value: Math.round(discountRatio * 100) / 100,
    contribution: discountScore,
    benchmark: 0.1,
    direction: 'risk',
  });

  // Factor 8: Session engagement decline (shorter sessions = less engaged)
  const engagementScore = Math.max(0, (15 - features.avg_session_duration) / 15) * 100;
  factors.push({
    name: 'session_engagement',
    label: 'Ortalama Oturum Süresi (dk)',
    value: features.avg_session_duration,
    contribution: engagementScore,
    benchmark: 15,
    direction: 'risk',
  });

  // Weighted ensemble: recency is strongest, then rating, then delivery
  const weights: Record<string, number> = {
    recency: 0.25,
    low_rating: 0.18,
    delivery_time: 0.12,
    avg_rating: 0.15,
    order_frequency: 0.12,
    total_orders: 0.08,
    discount_dependency: 0.05,
    session_engagement: 0.05,
  };

  let rawScore = 0;
  for (const f of factors) {
    rawScore += f.contribution * (weights[f.name] || 0);
  }

  // Apply sigmoid-like normalization for a more natural distribution
  const score = Math.round(Math.min(100, Math.max(0, rawScore)));

  // Determine churn level
  let level: ChurnLevel;
  if (score >= 75) level = 'Kritik';
  else if (score >= 50) level = 'Yuksek';
  else if (score >= 25) level = 'Orta';
  else level = 'Dusuk';

  // Determine primary and secondary churn reasons
  const sortedFactors = [...factors].sort((a, b) => b.contribution - a.contribution);
  const primaryReason = factorToReason(sortedFactors[0].name, features);
  const secondaryReasons = sortedFactors
    .slice(1, 3)
    .filter(f => f.contribution > 20)
    .map(f => factorToReason(f.name, features));

  // Determine recovery strategy
  const recoveryStrategy = determineStrategy(sortedFactors[0].name, features, score);

  return {
    score,
    level,
    factors,
    primaryReason,
    secondaryReasons,
    recoveryStrategy,
  };
}

function factorToReason(factorName: string, f: CustomerFeatures): string {
  switch (factorName) {
    case 'recency':
      return `Uzun süredir alışveriş yapmıyor (${f.days_since_last_order} gün)`;
    case 'low_rating':
      return `Düşük puanlı sipariş oranı yüksek (%${(f.low_rating_ratio * 100).toFixed(0)})`;
    case 'delivery_time':
      return `Teslimat sürelerinden memnuniyetsizlik (ort. ${f.avg_delivery_time.toFixed(0)} gün)`;
    case 'avg_rating':
      return `Genel memnuniyet düşük (ort. ${f.avg_rating.toFixed(1)}/5 puan)`;
    case 'order_frequency':
      return `Sipariş sıklığı azalıyor (ort. ${f.order_frequency_days.toFixed(0)} gün aralık)`;
    case 'total_orders':
      return `Az sayıda sipariş geçmişi (${f.total_orders} sipariş) - düşük bağlılık`;
    case 'discount_dependency':
      return `Sadece indirimli alışveriş eğilimi`;
    case 'session_engagement':
      return `Site ile etkileşim azalıyor (ort. ${f.avg_session_duration.toFixed(0)} dk oturum)`;
    default:
      return 'Genel churn riski';
  }
}

function determineStrategy(topFactor: string, f: CustomerFeatures, score: number): string {
  if (score < 25) return 'monitor';

  switch (topFactor) {
    case 'recency':
      return f.total_orders > 3 ? 'winback_loyal' : 'winback_new';
    case 'low_rating':
    case 'avg_rating':
      return 'service_recovery';
    case 'delivery_time':
      return 'delivery_apology';
    case 'discount_dependency':
      return 'discount_offer';
    case 'order_frequency':
    case 'total_orders':
      return 'engagement_boost';
    case 'session_engagement':
      return 'personalized_recommendation';
    default:
      return 'general_winback';
  }
}
