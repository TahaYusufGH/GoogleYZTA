import type { Transaction } from './types';
import { supabase } from './supabase';
import { cleanTransactions, engineerFeatures, predictChurn } from './dataProcessor';
import { generateFallbackMessage as generateRecoveryMessage } from './recoveryAgent';

// Dataset parameters derived from CSV analysis
const CITIES = ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Konya', 'Gaziantep', 'Kayseri', 'Adana', 'Eskisehir'];
const GENDERS = ['Male', 'Female', 'Other'];
const CATEGORIES = ['Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Books', 'Beauty', 'Toys', 'Food'];
const PAYMENT_METHODS = ['Credit Card', 'Debit Card', 'Digital Wallet', 'Cash on Delivery', 'Bank Transfer'];
const DEVICES = ['Mobile', 'Desktop', 'Tablet'];

// Price ranges per category (min-max TRY)
const PRICE_RANGES: Record<string, [number, number]> = {
  Electronics: [200, 5000],
  Fashion: [50, 800],
  'Home & Garden': [100, 1500],
  Sports: [80, 2000],
  Books: [10, 120],
  Beauty: [20, 200],
  Toys: [25, 300],
  Food: [15, 150],
};

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generates realistic transaction data for 200 customers
 * Simulates the CSV dataset patterns (Turkish e-commerce, Jan 2023 - Mar 2024)
 */
export function generateTransactions(numCustomers = 200): Transaction[] {
  const transactions: Transaction[] = [];
  const startDate = new Date('2023-01-01');

  for (let i = 1; i <= numCustomers; i++) {
    const customerId = `CUST_${String(i).padStart(5, '0')}`;
    const age = randInt(18, 65);
    const gender = pick(GENDERS);
    const city = pick(CITIES);

    // Some customers churn early (1-3 orders), some are loyal (5-15 orders)
    const isChurner = Math.random() < 0.35;
    const numOrders = isChurner
      ? randInt(1, 3)
      : randInt(4, 15);

    // Churners tend to have worse experiences
    const baseDeliveryTime = isChurner ? randInt(8, 25) : randInt(2, 12);
    const baseRating = isChurner ? randInt(1, 3) : randInt(3, 5);

    let orderDate = new Date(startDate);
    orderDate.setDate(orderDate.getDate() + randInt(0, 30));

    for (let j = 1; j <= numOrders; j++) {
      const orderId = `ORD_${String(i).padStart(6, '0')}-${j}`;
      const category = pick(CATEGORIES);
      const [minPrice, maxPrice] = PRICE_RANGES[category];
      const unitPrice = Math.round(rand(minPrice, maxPrice) * 100) / 100;
      const quantity = randInt(1, 5);
      const hasDiscount = Math.random() < 0.3;
      const discountAmount = hasDiscount
        ? Math.round(unitPrice * quantity * rand(0.05, 0.25) * 100) / 100
        : 0;
      const totalAmount = Math.round((unitPrice * quantity - discountAmount) * 100) / 100;

      // Add some delivery time and rating variance
      const deliveryTime = Math.min(30, Math.max(1, baseDeliveryTime + randInt(-3, 5)));
      const rating = Math.min(5, Math.max(1, baseRating + randInt(-1, 1)));

      transactions.push({
        order_id: orderId,
        customer_id: customerId,
        date: orderDate.toISOString().split('T')[0],
        age,
        gender,
        city,
        product_category: category,
        unit_price: unitPrice,
        quantity,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        payment_method: pick(PAYMENT_METHODS),
        device_type: pick(DEVICES),
        session_duration_minutes: randInt(1, 60),
        pages_viewed: randInt(2, 25),
        is_returning_customer: j > 1,
        delivery_time_days: deliveryTime,
        customer_rating: rating,
      });

      // Next order date: churners have longer gaps or stop entirely
      if (j < numOrders) {
        const gapDays = isChurner ? randInt(40, 100) : randInt(10, 45);
        orderDate = new Date(orderDate);
        orderDate.setDate(orderDate.getDate() + gapDays);
      }
    }
  }

  return transactions;
}

/**
 * Full pipeline: generate → clean → engineer features → predict churn → generate recovery messages
 * Then persists everything to Supabase
 */
export async function seedDatabase(numCustomers = 200): Promise<{ customers: number; transactions: number }> {
  // Generate and process data
  const raw = generateTransactions(numCustomers);
  const cleaned = cleanTransactions(raw);
  const features = engineerFeatures(cleaned);

  // Run churn prediction for each customer
  const enrichedFeatures = features.map(f => {
    const prediction = predictChurn(f);
    const recoveryMsg = generateRecoveryMessage(f, prediction);

    return {
      ...f,
      churn_risk_score: prediction.score,
      churn_risk_level: prediction.level,
      primary_churn_reason: prediction.primaryReason,
      secondary_churn_reasons: prediction.secondaryReasons,
      recovery_strategy: prediction.recoveryStrategy,
      recovery_message: recoveryMsg.body,
      message_generated_at: new Date().toISOString(),
    };
  });

  // Clear existing data
  await supabase.from('customer_features').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Insert transactions in batches
  const batchSize = 500;
  for (let i = 0; i < cleaned.length; i += batchSize) {
    const batch = cleaned.slice(i, i + batchSize).map(t => ({
      order_id: t.order_id,
      customer_id: t.customer_id,
      date: t.date,
      age: t.age,
      gender: t.gender,
      city: t.city,
      product_category: t.product_category,
      unit_price: t.unit_price,
      quantity: t.quantity,
      discount_amount: t.discount_amount,
      total_amount: t.total_amount,
      payment_method: t.payment_method,
      device_type: t.device_type,
      session_duration_minutes: t.session_duration_minutes,
      pages_viewed: t.pages_viewed,
      is_returning_customer: t.is_returning_customer,
      delivery_time_days: t.delivery_time_days,
      customer_rating: t.customer_rating,
    }));
    const { error } = await supabase.from('transactions').insert(batch);
    if (error) console.error('Transaction insert error:', error);
  }

  // Insert customer features
  for (let i = 0; i < enrichedFeatures.length; i += batchSize) {
    const batch = enrichedFeatures.slice(i, i + batchSize);
    const { error } = await supabase.from('customer_features').insert(batch);
    if (error) console.error('Features insert error:', error);
  }

  return { customers: enrichedFeatures.length, transactions: cleaned.length };
}
