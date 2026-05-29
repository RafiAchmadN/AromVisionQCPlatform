'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { bboxColor, rotCategory } from '@/lib/utils';

interface MockDetection {
  object_class: string;
  confidence_score: number;
  rot_level: number;
  color_category: string;
  defect_count: number;
  defect_severity: string;
  anomaly_score: number;
  bbox: { x: number; y: number; w: number; h: number };
}

// Simulasi deteksi YOLO untuk demo (diganti dengan data real dari YOLO service)
function generateMockDetection(canvasW: number, canvasH: number): MockDetection {
  const confidence = 0.65 + Math.random() * 0.34;
  const rot = Math.random() * 40;
  return {
    object_class: ['bawang_merah', 'bawang_putih', 'cabai', 'tomat'][Math.floor(Math.random() * 4)],
    confidence_score: confidence,
    rot_level: rot,
    color_category: rot < 10 ? 'Normal' : rot < 30 ? 'Pucat' : 'Terlalu Matang',
    defect_count: Math.floor(Math.random() * 4),
    defect_severity: rot < 15 ? 'Minor' : rot < 30 ? 'Moderate' : 'Severe',
    anomaly_score: rot / 100 + (1 - confidence) * 0.3,
    bbox: {
      x: 40 + Math.random() * (canvasW - 200),
      y: 40 + Math.random() * (canvasH - 200),
      w: 80 + Math.random() * 100,
      h: 80 + Math.random() * 100,
    },
  };
}

export function OperatorCameraPanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [detections, setDetections] = useState<MockDetection[]>([]);
  const [indicators, setIndicators] = useState({
    rot_level: 0,
    anomaly_score: 0,
    color_category: 'Normal',
    defect_count: 0,
    defect_severity: 'Minor',
    confidence: 0,
  });

  // Enumerate camera devices — only available in secure context (HTTPS / localhost)
  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setError(
        'Camera API tidak tersedia. Akses via localhost atau aktifkan HTTPS. ' +
        '(http://192.168.x.x tidak didukung oleh browser untuk akses kamera)'
      );
      return;
    }
    navigator.mediaDevices
      .enumerateDevices()
      .then((all) => {
        const cams = all.filter((d) => d.kind === 'videoinput');
        setDevices(cams);
        if (cams.length > 0) setSelectedDevice(cams[0].deviceId);
      })
      .catch(() => {});
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setDetections([]);
  }, []);

  const startCamera = useCallback(async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera API tidak tersedia. Gunakan localhost atau HTTPS.');
      return;
    }
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedDevice
          ? { deviceId: { exact: selectedDevice }, width: 1280, height: 720 }
          : { width: 1280, height: 720, facingMode: 'environment' },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);

      // Simulasi YOLO detections setiap 1.5 detik
      // Ganti bagian ini dengan data real dari YOLO Inference Service
      mockIntervalRef.current = setInterval(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const count = 1 + Math.floor(Math.random() * 3);
        const dets = Array.from({ length: count }, () =>
          generateMockDetection(canvas.width, canvas.height)
        );
        setDetections(dets);
        updateIndicators(dets);
        drawOverlay(dets, canvas);
      }, 1500);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Izin kamera ditolak. Izinkan akses kamera di browser Anda.');
        } else if (err.name === 'NotFoundError') {
          setError('Tidak ada kamera yang terdeteksi.');
        } else {
          setError(`Gagal mengakses kamera: ${err.message}`);
        }
      }
    }
  }, [selectedDevice]);

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  function updateIndicators(dets: MockDetection[]) {
    if (!dets.length) return;
    const avg = (key: keyof MockDetection) =>
      dets.reduce((s, d) => s + (d[key] as number), 0) / dets.length;
    setIndicators({
      rot_level: avg('rot_level'),
      anomaly_score: avg('anomaly_score'),
      color_category: dets[0].color_category,
      defect_count: dets.reduce((s, d) => s + d.defect_count, 0),
      defect_severity: dets[0].defect_severity,
      confidence: avg('confidence_score'),
    });
  }

  function drawOverlay(dets: MockDetection[], canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const d of dets) {
      const color = bboxColor(d.confidence_score, d.rot_level);
      const { x, y, w, h } = d.bbox;

      // Bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Label background
      const label = `${d.object_class} ${(d.confidence_score * 100).toFixed(0)}%`;
      ctx.font = 'bold 12px monospace';
      const textW = ctx.measureText(label).width + 8;
      ctx.fillStyle = color;
      ctx.fillRect(x, y - 20, textW, 20);

      // Label text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x + 4, y - 5);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-800">Live Camera & QC Monitor</h2>
        <Badge variant={cameraOn ? 'success' : 'secondary'}>
          {cameraOn ? 'Live' : 'Standby'}
        </Badge>
      </div>

      {/* Video feed */}
      <div className="relative flex-1 bg-gray-900 overflow-hidden min-h-0">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          width={1280}
          height={720}
        />
        {!cameraOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white bg-black/70">
            {error ? (
              <p className="text-sm text-red-400 text-center px-6">{error}</p>
            ) : (
              <p className="text-sm text-gray-300">Klik tombol di bawah untuk mengaktifkan kamera</p>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-3 bg-white shrink-0">
        {devices.length > 1 && (
          <select
            aria-label="Pilih kamera"
            title="Pilih kamera"
            className="text-xs border border-gray-200 rounded px-2 py-1 flex-1 focus:outline-none"
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            disabled={cameraOn}
          >
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Kamera ${d.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        )}
        {!cameraOn ? (
          <Button size="sm" onClick={startCamera} className="shrink-0">
            Aktifkan Kamera
          </Button>
        ) : (
          <Button size="sm" variant="destructive" onClick={stopCamera} className="shrink-0">
            Matikan Kamera
          </Button>
        )}
      </div>

      {/* Real-time indicators */}
      <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 shrink-0">
        <IndicatorCard
          label="Rot Level"
          value={`${indicators.rot_level.toFixed(1)}%`}
          sub={rotCategory(indicators.rot_level)}
          color={
            indicators.rot_level < 10 ? 'text-green-700'
            : indicators.rot_level < 30 ? 'text-yellow-700'
            : 'text-red-700'
          }
        />
        <IndicatorCard
          label="Confidence"
          value={`${(indicators.confidence * 100).toFixed(1)}%`}
          sub={indicators.confidence >= 0.8 ? 'Tinggi' : indicators.confidence >= 0.6 ? 'Sedang' : 'Rendah'}
          color={indicators.confidence >= 0.8 ? 'text-green-700' : indicators.confidence >= 0.6 ? 'text-yellow-700' : 'text-red-700'}
        />
        <IndicatorCard
          label="Anomaly Score"
          value={indicators.anomaly_score.toFixed(3)}
          sub={indicators.anomaly_score > 0.8 ? 'Kritis' : indicators.anomaly_score > 0.5 ? 'Waspada' : 'Normal'}
          color={indicators.anomaly_score > 0.8 ? 'text-red-700' : indicators.anomaly_score > 0.5 ? 'text-yellow-700' : 'text-green-700'}
        />
        <IndicatorCard
          label="Defect"
          value={`${indicators.defect_count} cacat`}
          sub={indicators.defect_severity}
          color={indicators.defect_severity === 'Severe' ? 'text-red-700' : indicators.defect_severity === 'Moderate' ? 'text-yellow-700' : 'text-gray-700'}
        />
      </div>
    </div>
  );
}

function IndicatorCard({
  label, value, sub, color = 'text-gray-900',
}: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <Card>
      <CardContent className="py-2 px-3">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-base font-semibold ${color}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </CardContent>
    </Card>
  );
}
