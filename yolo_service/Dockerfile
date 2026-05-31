FROM python:3.12-slim

WORKDIR /app

# System libs minimal untuk opencv-python-headless
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only PyTorch 2.4.0 — native numpy 2.x support, tidak perlu pin numpy
RUN pip install --no-cache-dir \
    torch==2.4.0+cpu \
    torchvision==0.19.0+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# Install dependensi lain
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
