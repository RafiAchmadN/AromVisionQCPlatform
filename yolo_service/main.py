"""
AromVision YOLO Inference Service
FastAPI + Ultralytics YOLOv11  OR  Roboflow Hosted API

Inference mode (auto-detected at startup):
  ROBOFLOW_API_KEY set  →  Roboflow Hosted Inference (no local model needed)
  ROBOFLOW_API_KEY not set  →  Local YOLOv11 from models/best.pt

Dataset: Fresh and Rotten Fruit Detection
Port  : 8000
Run   : uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import asyncio
import base64
import os
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import cv2
import httpx
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO

from class_map import resolve_class

app = FastAPI(title="AromVision YOLO Service", version="3.0.0")

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Mode detection ────────────────────────────────────────────────────────────
ROBOFLOW_API_KEY = os.environ.get("ROBOFLOW_API_KEY", "")
ROBOFLOW_MODEL   = os.environ.get(
    "ROBOFLOW_MODEL_ID",
    "fresh-rotten-fruit-onb50-vbqco/8"   # default: model dari screenshot class list
)
ROBOFLOW_URL = f"https://detect.roboflow.com/{ROBOFLOW_MODEL}"

USE_ROBOFLOW = bool(ROBOFLOW_API_KEY)

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
    if USE_ROBOFLOW:
        print(f"[MODE] Roboflow Hosted Inference — model: {ROBOFLOW_MODEL}")
        print(f"[MODE] Local model loading SKIPPED (ROBOFLOW_API_KEY is set)")
    else:
        print(f"[MODE] Local YOLOv11 — loading {MODEL_PATH}")
        loop = asyncio.get_event_loop()
        model = await loop.run_in_executor(_executor, _load_yolo)


# ── Schema ────────────────────────────────────────────────────────────────────

class DetectRequest(BaseModel):
    image_b64: str
    conf: float = 0.10


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
    rot_level:        float
    color_rgb:        ColorRGB
    color_deviation:  float
    color_category:   str
    defect_types:     list[str]
    defect_count:     int
    defect_severity:  str
    anomaly_score:    float
    bbox:             BBox


class DetectResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    detections:   list[Detection]
    model_loaded: bool
    inference_ms: float
    frame_w:      int
    frame_h:      int


# ── Helpers ───────────────────────────────────────────────────────────────────

def _color_rgb(color_category: str) -> ColorRGB:
    if color_category == "Normal":        return ColorRGB(r=80,  g=155, b=60)
    if color_category == "Pucat":         return ColorRGB(r=200, g=178, b=95)
    if color_category == "Terlalu Matang":return ColorRGB(r=145, g=82,  b=50)
    return ColorRGB(r=120, g=60, b=60)


def _defect_types(defect_severity: str) -> list[str]:
    if defect_severity == "Minor":    return ["minor_bruise"]
    if defect_severity == "Moderate": return ["brown_spot", "soft_area"]
    return ["mold", "brown_spot", "decay"]


def _build_detection(
    cls_name: str, conf: float,
    x1: float, y1: float, x2: float, y2: float,
) -> Detection:
    mapping = resolve_class(cls_name)
    is_fresh: bool = mapping["is_fresh"]
    obj_class: str = mapping["object_class"]

    # rot_level: confidence-proportional — low confidence = uncertain, not severely rotten
    if is_fresh:
        rot_level = max(0.0, (1.0 - conf) * 20.0)
    else:
        rot_level = conf * 90.0

    if rot_level < 15:   color_category = "Normal"
    elif rot_level < 40: color_category = "Pucat"
    elif rot_level < 75: color_category = "Terlalu Matang"
    else:                color_category = "Abnormal"

    if rot_level < 10:   defect_count = 0
    elif rot_level < 30: defect_count = 1
    elif rot_level < 60: defect_count = 2
    else:                defect_count = 3 + int((rot_level - 60) / 15)

    if rot_level < 20:   defect_severity = "Minor"
    elif rot_level < 50: defect_severity = "Moderate"
    else:                defect_severity = "Severe"

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


# ── Roboflow inference ────────────────────────────────────────────────────────

async def _roboflow_detect(image_b64: str, conf: float) -> tuple[list[Detection], float, int, int]:
    """Call Roboflow Hosted API, return (detections, inference_ms, frame_w, frame_h)."""
    conf_pct = max(1, int(conf * 100))  # Roboflow uses 1–100

    t0 = time.perf_counter()
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            ROBOFLOW_URL,
            params={"api_key": ROBOFLOW_API_KEY, "confidence": conf_pct},
            content=image_b64.encode(),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    inference_ms = (time.perf_counter() - t0) * 1000

    if resp.status_code != 200:
        raise HTTPException(502, detail=f"Roboflow API error {resp.status_code}: {resp.text[:300]}")

    data = resp.json()
    frame_w = data.get("image", {}).get("width",  640)
    frame_h = data.get("image", {}).get("height", 480)

    detections: list[Detection] = []
    for pred in data.get("predictions", []):
        cls_name   = pred["class"]
        conf_val   = float(pred["confidence"])
        cx, cy     = float(pred["x"]),     float(pred["y"])
        pw, ph     = float(pred["width"]), float(pred["height"])
        # Roboflow returns center-based → convert to top-left
        x1, y1 = cx - pw / 2, cy - ph / 2
        x2, y2 = cx + pw / 2, cy + ph / 2
        detections.append(_build_detection(cls_name, conf_val, x1, y1, x2, y2))

    print(f"[Roboflow] {len(detections)} detections in {inference_ms:.1f}ms", flush=True)
    return detections, inference_ms, frame_w, frame_h


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status":       "ok",
        "mode":         "roboflow" if USE_ROBOFLOW else "local",
        "model_loaded": USE_ROBOFLOW or model is not None,
        "roboflow_model": ROBOFLOW_MODEL if USE_ROBOFLOW else None,
        "model_path":   str(MODEL_PATH) if not USE_ROBOFLOW else None,
        "classes":      list(model.names.values()) if (not USE_ROBOFLOW and model) else [],
    }


@app.get("/test-detect")
async def test_detect():
    """Diagnosa: jalankan inference pada gambar sintetis 100x100 merah."""
    import numpy as _np
    import torch as _torch
    diag = {
        "numpy_version": _np.__version__,
        "torch_version": _torch.__version__,
        "mode": "roboflow" if USE_ROBOFLOW else "local",
    }
    if USE_ROBOFLOW:
        # Buat gambar sintetis kecil, encode ke base64, kirim ke Roboflow
        try:
            img = _np.zeros((100, 100, 3), dtype=_np.uint8)
            img[:] = (40, 40, 180)
            _, buf = cv2.imencode(".jpg", img)
            b64 = base64.b64encode(buf).decode()
            dets, ms, _, _ = await _roboflow_detect(b64, 0.05)
            return {"ok": True, "inference_ms": round(ms, 1), "detections": len(dets), **diag}
        except Exception as exc:
            return {"ok": False, "error": str(exc), **diag}
    else:
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
    if USE_ROBOFLOW:
        return {
            "classes": [
                "freshapple","freshbanana","freshcucumber","freshokra","freshorange","freshpotato","freshtomato",
                "rottenapple","rottenbanana","rottencucumber","rottenokra","rottenorange","rottenpotato","rottentomato",
            ],
            "model_loaded": True,
            "mode": "roboflow",
        }
    if model is None:
        return {"classes": [], "model_loaded": False, "mode": "local"}
    return {"classes": list(model.names.values()), "model_loaded": True, "mode": "local"}


@app.post("/detect", response_model=DetectResponse)
async def detect(req: DetectRequest):
    # ── Roboflow path ──────────────────────────────────────────────────────────
    if USE_ROBOFLOW:
        print(f"[Roboflow] Running detect, conf={req.conf}", flush=True)
        try:
            dets, ms, fw, fh = await _roboflow_detect(req.image_b64, req.conf)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(500, detail=f"Roboflow call failed: {exc}") from exc

        return DetectResponse(
            detections=  dets,
            model_loaded=True,
            inference_ms=round(ms, 1),
            frame_w=     fw,
            frame_h=     fh,
        )

    # ── Local YOLO path ────────────────────────────────────────────────────────
    if model is None:
        raise HTTPException(
            503,
            detail="Model belum dimuat. Set ROBOFLOW_API_KEY atau jalankan python train.py.",
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
