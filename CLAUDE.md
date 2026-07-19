# E-Commerce Churn Guard — CLAUDE.md

## Proje nedir
Türkiye'deki e-ticaret müşterileri için churn (platform terk) riskini tahmin edip,
riskli müşterilere otomatik kişiselleştirilmiş Türkçe geri kazanım mesajı üreten
bir CRM / karar destek paneli. Takım: Ceyda (Data Scientist — veri bilimi tarafı
tamamlandı) + yazılım ekibi (biz).

## Mevcut durum (ÖNEMLİ — gerçek durum, plandaki değil)
Repo şu an React + Vite + TypeScript + Tailwind + Supabase üzerine kurulu.
Orijinal plan FastAPI + Streamlit/Flet + Docker'dı ama proje bu yönde ilerlemedi,
mevcut kod tabanı bu şekilde devam edecek. Asıl sorun şu:

- `src/lib/dataProcessor.ts` içindeki `predictChurn()` fonksiyonu Ceyda'nın eğittiği
  **Random Forest modelini (`churn_modeli.pkl`) kullanmıyor**. Elle belirlenmiş
  ağırlıklarla (recency, low_rating, delivery_time vb.) çalışan bir kural tabanlı
  (heuristic) skorlama.
- `src/lib/recoveryAgent.ts` gerçek bir LLM API'sine bağlı değil. Önceden yazılmış
  şablonları (`strategyTemplates`) duruma göre seçen bir **simülasyon**.
- `churn_modeli.pkl` dosyası bu repoda **yok**. Ceyda'dan alınıp eklenmesi lazım.
- Supabase şeması (`customer_features` tablosu) zaten `churn_risk_score`,
  `churn_risk_level`, `recovery_message` gibi kolonları içeriyor — şema değişmeyecek,
  sadece bu alanları dolduran mantık gerçek model/LLM ile değişecek.

## Bu fazın hedefi
1. **FastAPI backend** kurmak, `churn_modeli.pkl`'i yükleyip `/predict` endpoint'i
   sunmak (girdi: müşteri feature'ları → çıktı: `predict_proba` ile risk skoru).
2. Frontend'deki `predictChurn()` çağrısını, TS heuristic yerine bu FastAPI
   endpoint'ine istek atacak şekilde değiştirmek (heuristic kodu tamamen silmek
   yerine, model erişilemezse fallback olarak bırakılabilir — buna karar ver).
3. `recoveryAgent.ts`'i gerçek bir LLM API'sine (Gemini API varsayılan; .env'de
   anahtar yoksa OpenAI'a geçilebilir) bağlamak. Prompt yapısı zaten
   `yzta.pdf` / proje brief'inde tanımlı: sistem prompt + müşteri ID, risk skoru,
   en sık terk nedeni, kategori, puan → kişiselleştirilmiş Türkçe mesaj.
4. Risk skoru Kritik (%68+) veya Yüksek geldiğinde "AI Geri Kazanım" stratejisi,
   Düşük risk'te "İzleme" stratejisi otomatik atanmalı (mevcut mantık korunacak,
   sadece veri kaynağı gerçek model/LLM olacak).

## Tech stack
- Frontend: React 18, Vite, TypeScript, Tailwind, lucide-react
- Backend (yeni): Python, FastAPI, scikit-learn, pickle
- DB: Supabase (Postgres), `@supabase/supabase-js`
- LLM: Gemini API (öncelik) veya OpenAI API

## Dosya haritası (mevcut repo)
```
src/lib/dataProcessor.ts    # feature engineering + heuristic churn skorlama (değişecek)
src/lib/recoveryAgent.ts    # template tabanlı sahte LLM mesajı (değişecek)
src/lib/useChurnData.ts     # Supabase'den veri çekme hook'u
src/lib/dataSeeder.ts       # sahte/random veri ile DB doldurma
src/lib/supabase.ts         # Supabase client
src/lib/types.ts            # Transaction, CustomerFeatures, ChurnPrediction tipleri
src/components/             # Dashboard, CustomerList, CustomerDetail, ModelInsights, Sidebar
supabase/migrations/        # customer_features, transactions şeması
data/                       # ham CSV'ler
```

## Kurallar / kısıtlar
- Mevcut UI bileşenlerini (Dashboard, CustomerList, CustomerDetail) kırma;
  sadece veri kaynağını gerçek backend/LLM'e bağla.
- Supabase şemasını değiştirme, sadece dolduran mantığı değiştir.
- API anahtarlarını asla kod içine gömme, `.env` üzerinden oku.
- Yeni backend için ayrı bir `backend/` klasörü aç (FastAPI + requirements.txt +
  churn_modeli.pkl burada duracak).
- Türkçe metin/mesajlarda mevcut ton (kurumsal ama samimi) korunmalı.
- Her adımdan sonra çalıştığını doğrulamadan bir sonrakine geçme.