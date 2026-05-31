FROM python:3.12-slim

WORKDIR /app

# System libs minimal untuk opencv-python-headless
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 1. Install numpy 1.x DULU — torch harus link ke numpy 1.x saat diimport
#    Jika numpy diinstall sesudah torch, torch sudah "lock" ke versi yang ditemukan saat build
RUN pip install --no-cache-dir "numpy==1.26.4"

# 2. Install CPU-only torch (lebih kecil dari GPU torch: ~200MB vs 2GB)
RUN pip install --no-cache-dir \
    torch==2.2.0+cpu \
    torchvision==0.17.0+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# 3. Install dependensi lain (ultralytics, fastapi, dll)
#    numpy sudah terinstall — pip tidak akan upgrade karena sudah ada
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir "opencv-python-headless==4.10.0.84" --force-reinstall && \
    python -c "import numpy; import torch; print('numpy:', numpy.__version__, '| torch:', torch.__version__)"

# Copy source code dan model
COPY . .

ENV YOLO_OFFLINE=1
ENV ULTRALYTICS_OFFLINE=1

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
