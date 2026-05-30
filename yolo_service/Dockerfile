FROM python:3.12-slim

WORKDIR /app

# System libs yang dibutuhkan opencv
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libgl1 \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only torch dulu (jauh lebih kecil dari GPU torch: ~200MB vs 2GB)
RUN pip install --no-cache-dir \
    torch==2.2.0+cpu \
    torchvision==0.17.0+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# Install dependensi lain
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code dan model
COPY . .

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
