# AromAI YOLO Service — Setup Guide

## Langkah 1: Install Python dependencies

```bash
cd yolo_service
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Langkah 2: Download dataset Adithya (Roboflow)

### Opsi A — Manual (tanpa API key)
1. Buka: https://universe.roboflow.com/adithya/fresh-and-rotten-fruits
2. Klik **Download Dataset** → pilih format **YOLOv11** → versi terbaru
3. Ekstrak ZIP ke folder `yolo_service/dataset/`
4. Pastikan ada file `dataset/data.yaml`

### Opsi B — Otomatis via API key (lebih mudah)
1. Buat akun gratis di https://roboflow.com
2. Buka: Account Settings → Roboflow API Key → copy key
3. Edit `train.py`, isi `ROBOFLOW_API_KEY = "ISI_KEY_ANDA_DI_SINI"`
4. Jalankan training (step 3 di bawah)

## Langkah 3: Training model

```bash
python train.py
```

Training selesai dalam ~15-30 menit (CPU) atau ~5 menit (GPU).
Model terbaik otomatis disalin ke `models/best.pt`.

## Langkah 4: Jalankan inference server

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Cek di browser: http://localhost:8000/health

## Langkah 5: Jalankan Next.js (terminal terpisah)

```bash
cd ../Execute
npm run dev
```

Buka dashboard: http://localhost:3000

---

## Cara kerja integrasi

```
Webcam → canvas.drawImage → base64 JPEG
  → POST /api/yolo/detect (Next.js proxy)
    → POST http://localhost:8000/detect (FastAPI)
      → Ultralytics YOLO model (best.pt)
        → detections JSON
  → drawOverlay (canvas bounding box)
```

- Jika YOLO service **online**: badge "YOLO Online", bounding box real
- Jika YOLO service **offline**: badge "AI Offline (Mock)", simulasi acak
- Status diperiksa setiap 10 detik (otomatis reconnect)

## Kelas dataset Adithya

| Kelas YOLO | Platform |
|---|---|
| freshapple | apel (segar) |
| freshbanana | pisang (segar) |
| freshorange | jeruk (segar) |
| rottenapple | apel (busuk) |
| rottenbanana | pisang (busuk) |
| rottenorange | jeruk (busuk) |

Tambahkan kelas baru di `class_map.py`.
