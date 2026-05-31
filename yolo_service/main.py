"""
AromVision YOLO Inference Service
FastAPI + Ultralytics YOLOv11

Dataset: Fresh and Rotten Fruit Detection
Port  : 8000
Run   : uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import asyncio
import base64
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO

from class_map import resolve_class

app = FastAPI(title="AromVision YOLO Service", version="2.0.0")

import os
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

MODEL_PATH = Path("models/best.pt")
model: YOLO | None = None
_executor = ThreadPoolExecutor(max_workers=1)


def _load_yolo() -> YOLO | None:
    if not MODEL_PATH.exists():
        print(f"[YOLO] WARNING: {MODEL_PATH} tidak ditemukan.")
        return None
    m = YOLO(str(MODEL_PATH))
    print(f"[YOLO] Model loaded: {MODEL_PATH}  classes={list(m.names.values())}")
    return m


@app.on_event("startup")
async def load_model():
    global model
    loop = asyncio.get_event_loop()
    model = await loop.run_in_executor(_executor, _load_yolo)


# ---------- Schema ----------

class DetectRequest(BaseModel):
    image_b64: str
    conf: float = 0.10          # threshold webcam real-world dengan background bebas


class BBox(BaseModel):
    x: float
    y: float
    w: float
    h: float


class ColorRGB(BaseModel):
    r: int
    g: int
    b: int


class Detection(BaseModel):
    object_class:     str
    confidence_score: float
    rot_level:        float      # 0–100 persen
    color_rgb:        ColorRGB
    color_deviation:  float      # 0–50
    color_category:   str        # "Normal" | "Pucat" | "Terlalu Matang" | "Abnormal"
    defect_types:     list[str]
    defect_count:     int
    defect_severity:  str        # "Minor" | "Moderate" | "Severe"
    anomaly_score:    float      # 0–1
    bbox:             BBox


class DetectResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    detections:   list[Detection]
    model_loaded: bool
    inference_ms: float
    frame_w:      int
    frame_h:      int


# ---------- Helper ----------

def _color_rgb(color_category: str) -> ColorRGB:
    """Approximate RGB from colour category."""
    if color_category == "Normal":
        return ColorRGB(r=80,  g=155, b=60)
    if color_category == "Pucat":
        return ColorRGB(r=200, g=178, b=95)
    if color_category == "Terlalu Matang":
        return ColorRGB(r=145, g=82,  b=50)
    return ColorRGB(r=120, g=60, b=60)  # Abnormal


def _defect_types(defect_severity: str) -> list[str]:
    if defect_severity == "Minor":
        return ["minor_bruise"]
    if defect_severity == "Moderate":
        return ["brown_spot", "soft_area"]
    return ["mold", "brown_spot", "decay"]


def _build_detection(
    cls_name: str, conf: float,
    x1: float, y1: float, x2: float, y2: float,
) -> Detection:
    mapping = resolve_class(cls_name)
    is_fresh: bool = mapping["is_fresh"]
    obj_class: str = mapping["object_class"]

    # rot_level: confidence-proportional — low confidence means uncertain, not severely rotten
    # fresh:  conf=0.90 → 2%,  conf=0.50 → 10%, conf=0.10 → 18%
    # rotten: conf=0.10 → 9%,  conf=0.50 → 45%, conf=0.90 → 81%
    if is_fresh:
        rot_level = max(0.0, (1.0 - conf) * 20.0)
    else:
        rot_level = conf * 90.0

    # color_category
    if rot_level < 15:
        color_category = "Normal"
    elif rot_level < 40:
        color_category = "Pucat"
    elif rot_level < 75:
        color_category = "Terlalu Matang"
    else:
        color_category = "Abnormal"

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

    color_deviation = round(min(50.0, rot_level * 0.45), 2)
    anomaly_score   = min(1.0, rot_level / 100.0 + (1.0 - conf) * 0.15)

    return Detection(
        object_class=     obj_class,
        confidence_score= round(conf, 4),
        rot_level=        round(rot_level, 2),
        color_rgb=        _color_rgb(color_category),
        color_deviation=  color_deviation,
        color_category=   color_category,
        defect_types=     _defect_types(defect_severity),
        defect_count=     defect_count,
        defect_severity=  defect_severity,
        anomaly_score=    round(anomaly_score, 4),
        bbox=BBox(x=round(x1, 1), y=round(y1, 1), w=round(x2 - x1, 1), h=round(y2 - y1, 1)),
    )


# ---------- Endpoints ----------

@app.get("/health")
async def health():
    return {
        "status":       "ok",
        "model_loaded": model is not None,
        "model_path":   str(MODEL_PATH),
        "classes":      list(model.names.values()) if model else [],
    }


@app.get("/test-detect")
async def test_detect():
    """Diagnosa: jalankan inference pada gambar sintetis 100x100 merah."""
    import numpy as _np
    import torch as _torch
    diag = {
        "numpy_version": _np.__version__,
        "torch_version": _torch.__version__,
        "numpy_importable": True,
    }
    if model is None:
        return {"ok": False, "error": "model not loaded", **diag}
    try:
        img = _np.zeros((100, 100, 3), dtype=_np.uint8)
        img[:] = (40, 40, 180)
        t0 = time.perf_counter()
        results = model.predict(img, conf=0.05, verbose=False)
        ms = (time.perf_counter() - t0) * 1000
        n = sum(len(r.boxes) for r in results)
        return {"ok": True, "inference_ms": round(ms, 1), "detections": n, **diag}
    except Exception as exc:
        import traceback
        return {"ok": False, "error": str(exc), "traceback": traceback.format_exc()[-600:], **diag}


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

    try:
        raw = base64.b64decode(req.image_b64)
        arr = np.frombuffer(raw, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception as exc:
        raise HTTPException(400, f"Gagal decode gambar: {exc}") from exc

    if img is None:
        raise HTTPException(400, "Gambar tidak valid atau kosong.")

    h, w = img.shape[:2]
    print(f"[YOLO] Running predict on {w}x{h} image, conf={req.conf}", flush=True)
    t0 = time.perf_counter()

    try:
        results = model.predict(img, conf=req.conf, verbose=False)
    except Exception as exc:
        import traceback
        tb = traceback.format_exc()
        print(f"[YOLO] predict() failed:\n{tb}", flush=True)
        raise HTTPException(500, detail=f"Inference gagal: {type(exc).__name__}: {exc}") from exc

    inference_ms = (time.perf_counter() - t0) * 1000
    print(f"[YOLO] Inference done in {inference_ms:.1f}ms", flush=True)

    detections: list[Detection] = []
    try:
        for result in results:
            for box in result.boxes:
                cls_idx  = int(box.cls[0])
                cls_name = model.names[cls_idx]
                conf_val = float(box.conf[0])
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                detections.append(_build_detection(cls_name, conf_val, x1, y1, x2, y2))
    except Exception as exc:
        import traceback
        tb = traceback.format_exc()
        print(f"[YOLO] result parsing failed:\n{tb}", flush=True)
        raise HTTPException(500, detail=f"Gagal memproses hasil: {type(exc).__name__}: {exc}") from exc

    print(f"[YOLO] {len(detections)} detections", flush=True)
    return DetectResponse(
        detections=  detections,
        model_loaded=True,
        inference_ms=round(inference_ms, 1),
        frame_w=     w,
        frame_h=     h,
    )
