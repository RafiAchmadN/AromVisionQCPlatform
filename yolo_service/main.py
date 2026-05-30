"""
AromAI YOLO Inference Service
FastAPI + Ultralytics YOLOv11

Dataset: Fresh and Rotten Fruit Detection (Adithya - Roboflow)
Port  : 8000
Run   : uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import base64
import time
from pathlib import Path

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO

from class_map import resolve_class

app = FastAPI(title="AromAI YOLO Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

MODEL_PATH = Path("models/best.pt")
model: YOLO | None = None


@app.on_event("startup")
async def load_model():
    global model
    if MODEL_PATH.exists():
        model = YOLO(str(MODEL_PATH))
        print(f"[YOLO] Model loaded: {MODEL_PATH}  classes={list(model.names.values())}")
    else:
        print(f"[YOLO] WARNING: {MODEL_PATH} tidak ditemukan.")
        print("[YOLO] Jalankan python train.py untuk melatih model terlebih dahulu.")


# ---------- Schema ----------

class DetectRequest(BaseModel):
    image_b64: str      # JPEG frame dari webcam, base64-encoded
    conf: float = 0.02  # threshold rendah karena dataset training kecil (26 gambar)


class BBox(BaseModel):
    x: float
    y: float
    w: float
    h: float


class Detection(BaseModel):
    object_class: str
    confidence_score: float
    rot_level: float        # 0–100 persen
    color_category: str     # "Normal" | "Pucat" | "Terlalu Matang"
    defect_count: int
    defect_severity: str    # "Minor" | "Moderate" | "Severe"
    anomaly_score: float    # 0–1
    bbox: BBox


class DetectResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    detections: list[Detection]
    model_loaded: bool
    inference_ms: float
    frame_w: int
    frame_h: int


# ---------- Helper ----------

def _build_detection(cls_name: str, conf: float, x1: float, y1: float, x2: float, y2: float) -> Detection:
    mapping = resolve_class(cls_name)
    is_fresh: bool = mapping["is_fresh"]
    obj_class: str = mapping["object_class"]

    # rot_level: segar → 0-15%, busuk → 40-95%
    if is_fresh:
        rot_level = max(0.0, (1.0 - conf) * 20.0)
    else:
        rot_level = 45.0 + conf * 50.0

    # color_category
    if rot_level < 15:
        color_category = "Normal"
    elif rot_level < 40:
        color_category = "Pucat"
    else:
        color_category = "Terlalu Matang"

    # defect_count
    if rot_level < 10:
        defect_count = 0
    elif rot_level < 30:
        defect_count = 1
    elif rot_level < 60:
        defect_count = 2
    else:
        defect_count = 3 + int((rot_level - 60) / 15)

    # defect_severity
    if rot_level < 20:
        defect_severity = "Minor"
    elif rot_level < 50:
        defect_severity = "Moderate"
    else:
        defect_severity = "Severe"

    anomaly_score = min(1.0, rot_level / 100.0 + (1.0 - conf) * 0.15)

    return Detection(
        object_class=obj_class,
        confidence_score=round(conf, 4),
        rot_level=round(rot_level, 2),
        color_category=color_category,
        defect_count=defect_count,
        defect_severity=defect_severity,
        anomaly_score=round(anomaly_score, 4),
        bbox=BBox(x=round(x1, 1), y=round(y1, 1), w=round(x2 - x1, 1), h=round(y2 - y1, 1)),
    )


# ---------- Endpoints ----------

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "model_path": str(MODEL_PATH),
        "classes": list(model.names.values()) if model else [],
    }


@app.get("/classes")
async def get_classes():
    if model is None:
        return {"classes": [], "model_loaded": False}
    return {"classes": list(model.names.values()), "model_loaded": True}


@app.post("/detect", response_model=DetectResponse)
async def detect(req: DetectRequest):
    if model is None:
        raise HTTPException(
            503,
            detail="Model belum dimuat. Jalankan: python train.py terlebih dahulu.",
        )

    # Decode base64 → numpy image
    try:
        raw = base64.b64decode(req.image_b64)
        arr = np.frombuffer(raw, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception as exc:
        raise HTTPException(400, f"Gagal decode gambar: {exc}") from exc

    if img is None:
        raise HTTPException(400, "Gambar tidak valid atau kosong.")

    h, w = img.shape[:2]
    t0 = time.perf_counter()

    results = model.predict(img, conf=req.conf, verbose=False)

    inference_ms = (time.perf_counter() - t0) * 1000

    detections: list[Detection] = []
    for result in results:
        for box in result.boxes:
            cls_idx = int(box.cls[0])
            cls_name = model.names[cls_idx]
            conf_val = float(box.conf[0])
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            detections.append(_build_detection(cls_name, conf_val, x1, y1, x2, y2))

    return DetectResponse(
        detections=detections,
        model_loaded=True,
        inference_ms=round(inference_ms, 1),
        frame_w=w,
        frame_h=h,
    )
