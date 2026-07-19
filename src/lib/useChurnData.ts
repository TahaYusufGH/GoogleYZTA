import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import type { CustomerFeatures, Transaction, DashboardStats, ChurnLevel } from './types';
import { seedDatabase } from './dataSeeder';
import { predictChurnWithModel } from './dataProcessor';
import { generateRecoveryMessage } from './recoveryAgent';

export function useChurnData() {
  const [customers, setCustomers] = useState<CustomerFeatures[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('customer_features')
      .select('*')
      .order('churn_risk_score', { ascending: false });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setLoading(false);
      return;
    }

    setCustomers(data as CustomerFeatures[]);
    computeStats(data as CustomerFeatures[]);
    setLoading(false);
  }, []);

  const seed = useCallback(async () => {
    setSeeding(true);
    setError(null);
    try {
      const result = await seedDatabase(200);
      await loadData();
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Veri oluşturma hatası');
      return null;
    } finally {
      setSeeding(false);
    }
  }, [loadData]);

  const computeStats = (data: CustomerFeatures[]) => {
    const total = data.length;
    const avgScore = data.reduce((s, c) => s + c.churn_risk_score, 0) / total;
    const highRisk = data.filter(c => c.churn_risk_level === 'Yuksek').length;
    const critical = data.filter(c => c.churn_risk_level === 'Kritik').length;
    const lowRisk = data.filter(c => c.churn_risk_level === 'Dusuk').length;
    const mediumRisk = data.filter(c => c.churn_risk_level === 'Orta').length;
    const totalRevenue = data.reduce((s, c) => s + c.total_spent, 0);
    const avgRating = data.reduce((s, c) => s + c.avg_rating, 0) / total;

    // Top churn reasons
    const reasonMap = new Map<string, number>();
    for (const c of data) {
      if (c.primary_churn_reason) {
        const key = c.primary_churn_reason.split('(')[0].trim();
        reasonMap.set(key, (reasonMap.get(key) || 0) + 1);
      }
    }
    const topChurnReasons = [...reasonMap.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Churn distribution
    const levels: ChurnLevel[] = ['Dusuk', 'Orta', 'Yuksek', 'Kritik'];
    const churnDistribution = levels.map(level => {
      const count = data.filter(c => c.churn_risk_level === level).length;
      return { level, count, percentage: (count / total) * 100 };
    });

    // Category stats
    const catMap = new Map<string, { revenue: number; orders: number; ratingSum: number; ratingCount: number }>();
    for (const c of data) {
      const cat = c.favorite_category;
      if (!catMap.has(cat)) catMap.set(cat, { revenue: 0, orders: 0, ratingSum: 0, ratingCount: 0 });
      const entry = catMap.get(cat)!;
      entry.revenue += c.total_spent;
      entry.orders += c.total_orders;
      entry.ratingSum += c.avg_rating * c.total_orders;
      entry.ratingCount += c.total_orders;
    }
    const categoryStats = [...catMap.entries()]
      .map(([category, v]) => ({
        category,
        revenue: Math.round(v.revenue),
        orders: v.orders,
        avgRating: v.ratingCount > 0 ? Math.round((v.ratingSum / v.ratingCount) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // City stats
    const cityMap = new Map<string, { customers: number; churnSum: number }>();
    for (const c of data) {
      if (!cityMap.has(c.city)) cityMap.set(c.city, { customers: 0, churnSum: 0 });
      const entry = cityMap.get(c.city)!;
      entry.customers++;
      entry.churnSum += c.churn_risk_score;
    }
    const cityStats = [...cityMap.entries()]
      .map(([city, v]) => ({
        city,
        customers: v.customers,
        avgChurn: Math.round((v.churnSum / v.customers) * 10) / 10,
      }))
      .sort((a, b) => b.avgChurn - a.avgChurn);

    setStats({
      totalCustomers: total,
      avgChurnScore: Math.round(avgScore * 10) / 10,
      highRiskCount: highRisk,
      criticalCount: critical,
      lowRiskCount: lowRisk,
      mediumRiskCount: mediumRisk,
      totalRevenue: Math.round(totalRevenue),
      avgRating: Math.round(avgRating * 10) / 10,
      topChurnReasons,
      churnDistribution,
      categoryStats,
      cityStats,
    });
  };

  const getCustomerTransactions = useCallback(async (customerId: string): Promise<Transaction[]> => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

    return (data || []) as Transaction[];
  }, []);

  const regenerateMessage = useCallback(async (customerId: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('customer_features')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (error || !data) {
      console.error('Error fetching customer for regeneration:', error);
      return null;
    }

    const features = data as CustomerFeatures;
    const prediction = await predictChurnWithModel(features);
    const msg = await generateRecoveryMessage(features, prediction);

    const { error: updateError } = await supabase
      .from('customer_features')
      .update({
        recovery_message: msg.body,
        message_generated_at: new Date().toISOString(),
      })
      .eq('customer_id', customerId);

    if (updateError) {
      console.error('Error updating message:', updateError);
      return null;
    }

    // Update local state
    setCustomers(prev => prev.map(c =>
      c.customer_id === customerId
        ? { ...c, recovery_message: msg.body, message_generated_at: new Date().toISOString() }
        : c
    ));

    return msg.body;
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    customers,
    loading,
    seeding,
    error,
    stats,
    seed,
    loadData,
    getCustomerTransactions,
    regenerateMessage,
  };
}
