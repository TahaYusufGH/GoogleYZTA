/*
# E-Commerce Customer Churn Analysis Tables

## Purpose
Stores transaction data, customer features, churn predictions, and AI-generated
recovery messages for an e-commerce churn prediction and recovery system.

## New Tables

1. **transactions** - Raw e-commerce transaction records (mirrors CSV structure)
   - order_id, customer_id, date, age, gender, city, product_category
   - unit_price, quantity, discount_amount, total_amount
   - payment_method, device_type, session_duration_minutes, pages_viewed
   - is_returning_customer, delivery_time_days, customer_rating

2. **customer_features** - Aggregated per-customer features (feature engineering output)
   - customer_id (unique), demographic + behavioral aggregates
   - total_orders, total_spent, avg_order_value, avg_discount_used
   - avg_session_duration, avg_pages_viewed, avg_delivery_time, avg_rating
   - low_rating_ratio, returning_ratio, days_since_last_order, order_frequency
   - favorite_category, favorite_device, churn_risk_score (0-100), churn_risk_level
   - primary_churn_reason, recovery_strategy, recovery_message
   - message_generated_at, last_analyzed_at

## Security
- Single-tenant app (no auth, management dashboard)
- RLS enabled on all tables
- anon + authenticated roles have full CRUD (data is intentionally shared)
*/

-- Transactions table (raw order data)
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  customer_id text NOT NULL,
  date date NOT NULL,
  age integer NOT NULL,
  gender text NOT NULL,
  city text NOT NULL,
  product_category text NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  quantity integer NOT NULL,
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL,
  payment_method text NOT NULL,
  device_type text NOT NULL,
  session_duration_minutes integer NOT NULL,
  pages_viewed integer NOT NULL,
  is_returning_customer boolean NOT NULL DEFAULT false,
  delivery_time_days integer NOT NULL,
  customer_rating integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
CREATE POLICY "anon_select_transactions" ON transactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
CREATE POLICY "anon_insert_transactions" ON transactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
CREATE POLICY "anon_update_transactions" ON transactions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;
CREATE POLICY "anon_delete_transactions" ON transactions FOR DELETE
  TO anon, authenticated USING (true);

-- Customer features table (aggregated + ML output)
CREATE TABLE IF NOT EXISTS customer_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text UNIQUE NOT NULL,
  age integer,
  gender text,
  city text,
  total_orders integer NOT NULL DEFAULT 0,
  total_spent numeric(12,2) NOT NULL DEFAULT 0,
  avg_order_value numeric(12,2) NOT NULL DEFAULT 0,
  avg_discount_used numeric(10,2) NOT NULL DEFAULT 0,
  avg_session_duration numeric(6,1) NOT NULL DEFAULT 0,
  avg_pages_viewed numeric(6,1) NOT NULL DEFAULT 0,
  avg_delivery_time numeric(6,1) NOT NULL DEFAULT 0,
  avg_rating numeric(3,1) NOT NULL DEFAULT 0,
  low_rating_ratio numeric(4,3) NOT NULL DEFAULT 0,
  returning_ratio numeric(4,3) NOT NULL DEFAULT 0,
  days_since_last_order integer NOT NULL DEFAULT 0,
  order_frequency_days numeric(6,1) NOT NULL DEFAULT 0,
  favorite_category text,
  favorite_device text,
  first_order_date date,
  last_order_date date,
  churn_risk_score integer NOT NULL DEFAULT 0,
  churn_risk_level text NOT NULL DEFAULT 'Dusuk',
  primary_churn_reason text,
  secondary_churn_reasons text[],
  recovery_strategy text,
  recovery_message text,
  message_generated_at timestamptz,
  last_analyzed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_features_customer_id ON customer_features(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_features_churn_score ON customer_features(churn_risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_customer_features_churn_level ON customer_features(churn_risk_level);

ALTER TABLE customer_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_customer_features" ON customer_features;
CREATE POLICY "anon_select_customer_features" ON customer_features FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_customer_features" ON customer_features;
CREATE POLICY "anon_insert_customer_features" ON customer_features FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_customer_features" ON customer_features;
CREATE POLICY "anon_update_customer_features" ON customer_features FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_customer_features" ON customer_features;
CREATE POLICY "anon_delete_customer_features" ON customer_features FOR DELETE
  TO anon, authenticated USING (true);