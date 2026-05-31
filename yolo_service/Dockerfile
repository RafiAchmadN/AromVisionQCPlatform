FROM python:3.12-slim

WORKDIR /app

# System libs minimal untuk opencv-python-headless
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only torch dulu (jauh lebih kecil dari GPU torch: ~200MB vs 2GB)
RUN pip install --no-cache-dir \
    torch==2.2.0+cpu \
    torchvision==0.17.0+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# Install dependensi lain
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir "opencv-python-headless==4.10.0.84" --force-reinstall && \
    pip install --no-cache-dir "numpy==1.26.4" --force-reinstall

# Copy source code dan model
COPY . .

ENV YOLO_OFFLINE=1
ENV ULTRALYTICS_OFFLINE=1

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
