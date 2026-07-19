import type { CustomerFeatures, ChurnPrediction, RecoveryMessage } from './types';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SYSTEM_PROMPT = `Sen bir e-ticaret CRM uzmanısın. Türk müşterilere yönelik kişiselleştirilmiş, samimi ama kurumsal tonda geri kazanım e-postaları yazıyorsun.
Mesaj Türkçe olmalı, müşteriye "siz" ile hitap etmeli, abartılı vaatlerde bulunmamalı ve somut bir teklifle bitmelidir.
SADECE e-posta gövdesini (konu satırı dahil) yaz, başka açıklama ekleme.
Format:
KONU: <konu satırı>
---
<e-posta gövdesi>`;

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);

  const data = (await res.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini boş yanıt döndürdü');
  return text.trim();
}

function buildPrompt(features: CustomerFeatures, prediction: ChurnPrediction): string {
  return `Müşteri bilgileri:
- Müşteri ID: ${features.customer_id}
- Yaş: ${features.age}, Şehir: ${features.city}
- Churn risk skoru: %${prediction.score} (${prediction.level})
- Birincil terk nedeni: ${prediction.primaryReason}
- Favori kategori: ${features.favorite_category}
- Ortalama puan: ${features.avg_rating.toFixed(1)}/5
- Son siparişten geçen gün: ${features.days_since_last_order}
- Toplam sipariş: ${features.total_orders}
- Uygulanan strateji: ${prediction.recoveryStrategy}

Bu müşteriyi geri kazanmak için kişiselleştirilmiş bir e-posta yaz.`;
}

function parseGeminiOutput(raw: string): { subject: string; body: string } {
  const lines = raw.split('\n');
  const subjectLine = lines.find(l => l.startsWith('KONU:'));
  const subject = subjectLine ? subjectLine.replace('KONU:', '').trim() : 'Size özel bir teklifimiz var';
  const sepIdx = lines.findIndex(l => l.trim() === '---');
  const body = sepIdx >= 0 ? lines.slice(sepIdx + 1).join('\n').trim() : raw;
  return { subject, body };
}

// Şablon tabanlı fallback — Gemini ulaşılamazsa veya toplu seed işleminde kullanılır
export function generateFallbackMessage(
  features: CustomerFeatures,
  prediction: ChurnPrediction,
): RecoveryMessage {
  const strategy = prediction.recoveryStrategy;
  const offerCode = generateOfferCode(features, strategy);

  const subject = strategy === 'service_recovery'
    ? 'Deneyiminiz için özür borçluyuz - telafi fırsatı'
    : strategy === 'delivery_apology'
    ? 'Kargo gecikmesi için özür - telafi kuponunuz'
    : 'Sizi özledik - size özel teklif';

  const body = [
    `Değerli müşterimiz,`,
    ``,
    `${prediction.primaryReason} konusunda yaşadığınız deneyimi anlıyoruz.`,
    ``,
    `Sizi tekrar platformumuzda görmek için size özel bir teklif hazırladık.`,
    `Kupon Kodunuz: ${offerCode}`,
    ``,
    `Not: Bu teklif ${features.city} şehri ve ${features.favorite_category} kategorisindeki ilgi alanlarınıza göre hazırlanmıştır.`,
    ``,
    `Saygılarımızla,`,
    `Müşteri İlişkileri Ekibi`,
  ].join('\n');

  return {
    subject,
    body,
    strategy,
    offerType: getOfferType(strategy),
    personalizationTags: [features.favorite_category, features.city, prediction.primaryReason],
  };
}

export async function generateRecoveryMessage(
  features: CustomerFeatures,
  prediction: ChurnPrediction,
): Promise<RecoveryMessage> {
  const strategy = prediction.recoveryStrategy;
  const offerCode = generateOfferCode(features, strategy);

  if (GEMINI_API_KEY) {
    try {
      const raw = await callGemini(buildPrompt(features, prediction));
      const { subject, body } = parseGeminiOutput(raw);

      const enrichedBody = `${body}\n\nSize özel kupon kodunuz: ${offerCode}`;

      return {
        subject,
        body: enrichedBody,
        strategy,
        offerType: getOfferType(strategy),
        personalizationTags: [features.favorite_category, features.city, prediction.primaryReason],
      };
    } catch (err) {
      console.warn('Gemini API hatası, fallback şablona geçiliyor:', err);
    }
  }

  return generateFallbackMessage(features, prediction);
}

function generateOfferCode(f: CustomerFeatures, strategy: string): string {
  const prefix = strategy.substring(0, 3).toUpperCase();
  const custNum = f.customer_id.replace(/\D/g, '').slice(-4);
  const random = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${custNum}-${random}`;
}

function getOfferType(strategy: string): string {
  const types: Record<string, string> = {
    winback_loyal: 'İndirim + Ücretsiz Kargo',
    winback_new: 'Yeni Müşteri İndirimi',
    service_recovery: 'Telafi Paketi',
    delivery_apology: 'Hızlı Teslimat Garantisi + İndirim',
    discount_offer: 'Ekstra İndirim Kuponu',
    engagement_boost: 'Kişiselleştirilmiş Öneri + İndirim',
    personalized_recommendation: 'Kişiselleştirilmiş Öneri',
    monitor: 'Sadakat İndirimi',
    general_winback: 'Geri Dönüş İndirimi',
  };
  return types[strategy] || 'Özel Teklif';
}
