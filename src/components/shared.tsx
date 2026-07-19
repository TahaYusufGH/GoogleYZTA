import type { ChurnLevel } from '../lib/types';

export function getChurnColor(score: number): { bg: string; text: string; border: string; gradient: string } {
  if (score >= 75) return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', gradient: 'from-red-500 to-red-600' };
  if (score >= 50) return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', gradient: 'from-orange-500 to-orange-600' };
  if (score >= 25) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', gradient: 'from-amber-400 to-amber-500' };
  return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', gradient: 'from-emerald-400 to-emerald-500' };
}

export function getLevelColor(level: ChurnLevel): { bg: string; text: string; dot: string } {
  switch (level) {
    case 'Kritik': return { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' };
    case 'Yuksek': return { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' };
    case 'Orta': return { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' };
    case 'Dusuk': return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' };
  }
}

export function getLevelLabel(level: ChurnLevel): string {
  switch (level) {
    case 'Kritik': return 'Kritik';
    case 'Yuksek': return 'Yüksek';
    case 'Orta': return 'Orta';
    case 'Dusuk': return 'Düşük';
  }
}
