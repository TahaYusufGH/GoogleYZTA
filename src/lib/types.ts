export interface Transaction {
  order_id: string;
  customer_id: string;
  date: string;
  age: number;
  gender: string;
  city: string;
  product_category: string;
  unit_price: number;
  quantity: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  device_type: string;
  session_duration_minutes: number;
  pages_viewed: number;
  is_returning_customer: boolean;
  delivery_time_days: number;
  customer_rating: number;
}

export interface CustomerFeatures {
  customer_id: string;
  age: number;
  gender: string;
  city: string;
  total_orders: number;
  total_spent: number;
  avg_order_value: number;
  avg_discount_used: number;
  avg_session_duration: number;
  avg_pages_viewed: number;
  avg_delivery_time: number;
  avg_rating: number;
  low_rating_ratio: number;
  returning_ratio: number;
  days_since_last_order: number;
  order_frequency_days: number;
  favorite_category: string;
  favorite_device: string;
  first_order_date: string;
  last_order_date: string;
  churn_risk_score: number;
  churn_risk_level: ChurnLevel;
  primary_churn_reason: string;
  secondary_churn_reasons: string[];
  recovery_strategy: string;
  recovery_message: string | null;
  message_generated_at: string | null;
  last_analyzed_at: string;
}

export type ChurnLevel = 'Dusuk' | 'Orta' | 'Yuksek' | 'Kritik';

export interface ChurnFactor {
  name: string;
  label: string;
  value: number;
  contribution: number;
  benchmark: number;
  direction: 'risk' | 'protective';
}

export interface ChurnPrediction {
  score: number;
  level: ChurnLevel;
  factors: ChurnFactor[];
  primaryReason: string;
  secondaryReasons: string[];
  recoveryStrategy: string;
}

export interface RecoveryMessage {
  subject: string;
  body: string;
  strategy: string;
  offerType: string;
  personalizationTags: string[];
}

export interface DashboardStats {
  totalCustomers: number;
  avgChurnScore: number;
  highRiskCount: number;
  criticalCount: number;
  lowRiskCount: number;
  mediumRiskCount: number;
  totalRevenue: number;
  avgRating: number;
  topChurnReasons: { reason: string; count: number }[];
  churnDistribution: { level: ChurnLevel; count: number; percentage: number }[];
  categoryStats: { category: string; revenue: number; orders: number; avgRating: number }[];
  cityStats: { city: string; customers: number; avgChurn: number }[];
}
