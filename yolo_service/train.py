"""
Training script — AromAI QC Platform
Dataset: Fresh and Rotten Fruit Detection (Adithya, Roboflow)

Langkah:
  1. pip install -r requirements.txt
  2. python train.py  (akan download dataset otomatis jika ada API key)

Hasil training disimpan ke: runs/detect/aromai_fruit/weights/best.pt
Kemudian di-copy ke: models/best.pt
"""

import shutil
from pathlib import Path

# -----------------------------------------------------------------------
# Konfigurasi
# -----------------------------------------------------------------------
ROBOFLOW_API_KEY = "s0SSpHSPTfSiVG04Iawp"           # Isi API key Roboflow Anda (gratis)
ROBOFLOW_WORKSPACE = "adithya"
ROBOFLOW_PROJECT = "fresh-and-rotten-fruits"
ROBOFLOW_VERSION = 1            # Cek versi terbaru di halaman Roboflow

EPOCHS = 100                    # 100 epoch untuk konvergensi yang lebih baik
IMG_SIZE = 640                  # Ukuran input YOLO
BATCH = 16                      # Kurangi jika VRAM kurang (8, 4)
MODEL_BASE = "yolo11s.pt"       # yolo11s = lebih akurat dari nano, tetap ringan
PROJECT_NAME = "aromai_fruit"

DATASET_DIR = Path("dataset")
MODEL_OUT = Path("models/best.pt")
# -----------------------------------------------------------------------


def download_dataset():
    """Download dataset dari Roboflow menggunakan API key."""
    if not ROBOFLOW_API_KEY:
        print("[SKIP] ROBOFLOW_API_KEY kosong.")
        print("       Unduh manual dari https://universe.roboflow.com/adithya/fresh-and-rotten-fruits")
        print(f"       Ekstrak ke folder: {DATASET_DIR.resolve()}/")
        print("       Pastikan ada file data.yaml di dalamnya.")
        return None

    from roboflow import Roboflow
    rf = Roboflow(api_key=ROBOFLOW_API_KEY)
    project = rf.workspace(ROBOFLOW_WORKSPACE).project(ROBOFLOW_PROJECT)
    dataset = project.version(ROBOFLOW_VERSION).download("yolov11", location=str(DATASET_DIR))
    print(f"[OK] Dataset diunduh ke: {DATASET_DIR.resolve()}")
    return dataset


def find_data_yaml() -> Path | None:
    """Cari file data.yaml di dalam folder dataset."""
    for candidate in [
        DATASET_DIR / "data.yaml",
        DATASET_DIR / f"{ROBOFLOW_PROJECT}-{ROBOFLOW_VERSION}" / "data.yaml",
        *list(DATASET_DIR.rglob("data.yaml")),
    ]:
        if candidate.exists():
            return candidate
    return None


def patch_data_yaml(original: Path) -> Path:
    """
    Tulis ulang data.yaml dengan absolute path yang benar.
    Scan folder dataset untuk menemukan train/valid/test/images yang aktual,
    karena path relatif di data.yaml Roboflow kadang tidak cocok dengan
    struktur folder hasil ekstrak.
    """
    import yaml

    with open(original) as f:
        cfg = yaml.safe_load(f)

    dataset_root = original.parent.resolve()

    def find_images_dir(split: str) -> str | None:
        """Cari folder images untuk split tertentu (train/valid/val/test)."""
        aliases = [split]
        if split == "val":
            aliases = ["valid", "val"]
        for alias in aliases:
            candidate = dataset_root / alias / "images"
            if candidate.exists() and any(candidate.iterdir()):
                return str(candidate)
        return None

    updated = False
    for key in ("train", "val", "test"):
        if key not in cfg:
            continue
        found = find_images_dir(key)
        if found:
            cfg[key] = found
            updated = True

    if not updated:
        # Fallback: resolve relatif terhadap yaml dir
        def make_abs(p: str) -> str:
            path = Path(p)
            return str(path) if path.is_absolute() else str((dataset_root / path).resolve())
        for key in ("train", "val", "test"):
            if key in cfg and cfg[key]:
                cfg[key] = make_abs(str(cfg[key]))

    patched = dataset_root / "data_abs.yaml"
    with open(patched, "w") as f:
        yaml.dump(cfg, f, default_flow_style=False, allow_unicode=True)

    print(f"[PATCH] data.yaml dengan absolute path → {patched}")
    for k in ("train", "val", "test"):
        if k in cfg:
            print(f"        {k}: {cfg[k]}")
    return patched


def train(data_yaml: Path):
    from ultralytics import YOLO
    print(f"[TRAIN] Mulai training: epochs={EPOCHS}, imgsz={IMG_SIZE}, batch={BATCH}")
    print(f"[TRAIN] Dataset: {data_yaml}")

    model = YOLO(MODEL_BASE)
    results = model.train(
        data=str(data_yaml),
        epochs=EPOCHS,
        imgsz=IMG_SIZE,
        batch=BATCH,
        name=PROJECT_NAME,
        patience=20,        # lebih sabar sebelum early stop
        save=True,
        plots=True,
        augment=True,       # aktifkan augmentasi bawaan YOLO
        degrees=10.0,       # rotasi ringan untuk robustness
        flipud=0.1,
        fliplr=0.5,
        mosaic=1.0,
        mixup=0.1,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
    )
    return results


def copy_best_model():
    best_candidates = sorted(Path("runs/detect").rglob("best.pt"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not best_candidates:
        print("[ERROR] best.pt tidak ditemukan setelah training.")
        return

    best_src = best_candidates[0]
    MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(best_src, MODEL_OUT)
    print(f"[OK] Model disalin ke: {MODEL_OUT.resolve()}")


if __name__ == "__main__":
    print("=" * 60)
    print("  AromAI QC Platform — YOLO Training Script")
    print("=" * 60)

    download_dataset()

    data_yaml = find_data_yaml()
    if data_yaml is None:
        print("\n[ERROR] data.yaml tidak ditemukan.")
        print(f"  Pastikan dataset ada di folder: {DATASET_DIR.resolve()}/")
        print("  Unduh manual dari Roboflow dan ekstrak di sana.")
        raise SystemExit(1)

    print(f"\n[OK] data.yaml ditemukan: {data_yaml}")
    patched_yaml = patch_data_yaml(data_yaml)
    train(patched_yaml)
    copy_best_model()

    print("\n[SELESAI] Model siap digunakan.")
    print(f"  Lokasi: {MODEL_OUT.resolve()}")
    print("\nJalankan inference server:")
    print("  uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
