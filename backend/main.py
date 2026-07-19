import pickle
from pathlib import Path

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Churn Guard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = Path(__file__).parent / "models" / "churn_modeli.pkl"
_model = None

CITIES = ["Ankara", "Antalya", "Bursa", "Eskisehir", "Gaziantep", "Istanbul", "Izmir", "Kayseri", "Konya"]
CATEGORIES = ["Books", "Electronics", "Fashion", "Food", "Home & Garden", "Sports", "Toys"]
PAYMENT_METHODS = ["Cash on Delivery", "Credit Card", "Debit Card", "Digital Wallet"]
DEVICES = ["Mobile", "Tablet"]


def load_model():
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Model dosyası bulunamadı: {MODEL_PATH}. "
                "Lütfen 'churn_modeli.pkl' dosyasını backend/models/ klasörüne ekleyin."
            )
        with open(MODEL_PATH, "rb") as f:
            _model = pickle.load(f)
    return _model


class PredictRequest(BaseModel):
    # Numeric features
    age: float = Field(..., ge=18, le=75)
    avg_unit_price: float = Field(..., ge=0)
    avg_quantity: float = Field(..., ge=1)
    avg_discount_used: float = Field(..., ge=0)
    avg_order_value: float = Field(..., ge=0)
    avg_session_duration: float = Field(..., ge=0)
    avg_pages_viewed: float = Field(..., ge=0)
    returning_ratio: float = Field(..., ge=0, le=1)
    avg_delivery_time: float = Field(..., ge=0)
    avg_rating: float = Field(..., ge=1, le=5)
    total_spent: float = Field(..., ge=0)
    total_orders: int = Field(..., ge=1)
    # Categorical (raw strings — backend does one-hot)
    gender: str = Field(default="Male")
    city: str = Field(default="Istanbul")
    favorite_category: str = Field(default="Electronics")
    payment_method: str = Field(default="Credit Card")
    favorite_device: str = Field(default="Mobile")


class PredictResponse(BaseModel):
    score: int
    level: str
    model_used: str


def score_to_level(score: int) -> str:
    if score >= 75:
        return "Kritik"
    if score >= 50:
        return "Yuksek"
    if score >= 25:
        return "Orta"
    return "Dusuk"


def build_feature_vector(req: PredictRequest) -> np.ndarray:
    """Builds the 36-feature vector matching model training order."""
    numeric = [
        req.age,
        req.avg_unit_price,
        req.avg_quantity,
        req.avg_discount_used,
        req.avg_order_value,
        req.avg_session_duration,
        req.avg_pages_viewed,
        1.0 if req.returning_ratio >= 0.5 else 0.0,
        req.avg_delivery_time,
        req.avg_rating,
        req.total_spent,
        float(req.total_orders),
    ]

    gender_male = 1.0 if req.gender.lower() in ("male", "erkek") else 0.0
    gender_other = 1.0 if req.gender.lower() in ("other", "diger", "diğer") else 0.0
    city_ohe = [1.0 if req.city == c else 0.0 for c in CITIES]
    cat_ohe = [1.0 if req.favorite_category == c else 0.0 for c in CATEGORIES]
    pay_ohe = [1.0 if req.payment_method == p else 0.0 for p in PAYMENT_METHODS]
    dev_ohe = [1.0 if req.favorite_device == d else 0.0 for d in DEVICES]

    return np.array([numeric + [gender_male, gender_other] + city_ohe + cat_ohe + pay_ohe + dev_ohe])


@app.get("/health")
def health():
    model_ready = MODEL_PATH.exists()
    return {"status": "ok", "model_loaded": model_ready}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    try:
        model = load_model()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    features = build_feature_vector(req)

    try:
        proba = model.predict_proba(features)[0]
        churn_proba = float(proba[1]) if len(proba) > 1 else float(proba[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model tahmin hatası: {str(e)}")

    score = max(0, min(100, int(round(churn_proba * 100))))

    return PredictResponse(
        score=score,
        level=score_to_level(score),
        model_used="random_forest",
    )
