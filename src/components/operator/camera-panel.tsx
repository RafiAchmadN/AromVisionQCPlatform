'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { bboxColor, rotCategory } from '@/lib/utils';
import type { ActiveSession } from './workspace';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Detection {
  object_class: string;
  confidence_score: number;
  rot_level: number;
  color_rgb: { r: number; g: number; b: number };
  color_deviation: number;
  color_category: string;
  defect_types: string[];
  defect_count: number;
  defect_severity: string;
  anomaly_score: number;
  bbox: { x: number; y: number; w: number; h: number };
}

type YoloStatus = 'checking' | 'online' | 'offline' | 'no-model';
type InspectionMode = 'simulation' | 'inspection';

// ─── Mock detection data ────────────────────────────────────────────────────

const FRUIT_QUALITY = [
  { name: 'Buah Segar',   rot: [2,  12]  as [number,number], conf: [0.88, 0.98] as [number,number], defects: ['minor_bruise'],               weight: 0.60 },
  { name: 'Busuk Ringan', rot: [25, 42]  as [number,number], conf: [0.76, 0.90] as [number,number], defects: ['brown_spot', 'soft_area'],     weight: 0.22 },
  { name: 'Busuk Sedang', rot: [50, 68]  as [number,number], conf: [0.62, 0.80] as [number,number], defects: ['mold', 'brown_spot'],           weight: 0.13 },
  { name: 'Busuk Berat',  rot: [75, 92]  as [number,number], conf: [0.52, 0.72] as [number,number], defects: ['mold', 'decay', 'rupture'],    weight: 0.05 },
];

function rand(min: number, max: number) { return min + Math.random() * (max - min); }

function colorRgbFromCategory(cat: string): { r: number; g: number; b: number } {
  switch (cat) {
    case 'Normal':         return { r: 80,  g: 155, b: 60  };
    case 'Pucat':          return { r: 200, g: 178, b: 95  };
    case 'Terlalu Matang': return { r: 145, g: 82,  b: 50  };
    default:               return { r: 120, g: 60,  b: 60  };
  }
}

function defectTypesFromSeverity(severity: string, pool: string[]): string[] {
  if (severity === 'Minor')    return pool.slice(0, 1);
  if (severity === 'Moderate') return pool.slice(0, Math.min(2, pool.length));
  return pool;
}

function mockDetection(w: number, h: number): Detection {
  let r = Math.random();
  let fc = FRUIT_QUALITY[0];
  for (const q of FRUIT_QUALITY) { r -= q.weight; if (r <= 0) { fc = q; break; } }

  const rot      = rand(fc.rot[0],  fc.rot[1]);
  const conf     = rand(fc.conf[0], fc.conf[1]);
  const severity = rot < 20 ? 'Minor' : rot < 55 ? 'Moderate' : 'Severe';
  const defectCount = fc.name === 'Buah Segar'
    ? Math.floor(Math.random() * 2)
    : 1 + Math.floor(Math.random() * fc.defects.length);
  const colorCat  = rot < 15 ? 'Normal' : rot < 40 ? 'Pucat' : rot < 70 ? 'Terlalu Matang' : 'Abnormal';

  const bw = rand(130, 210);
  const bh = rand(110, 190);

  return {
    object_class:      fc.name,
    confidence_score:  parseFloat(conf.toFixed(3)),
    rot_level:         parseFloat(rot.toFixed(1)),
    color_rgb:         colorRgbFromCategory(colorCat),
    color_deviation:   parseFloat((rot * 0.4).toFixed(2)),
    color_category:    colorCat,
    defect_types:      defectTypesFromSeverity(severity, fc.defects),
    defect_count:      defectCount,
    defect_severity:   severity,
    anomaly_score:     parseFloat(((rot / 100) * 0.65 + (1 - conf) * 0.35).toFixed(4)),
    bbox: {
      x: rand(w * 0.12, w * 0.88 - bw),
      y: rand(h * 0.12, h * 0.88 - bh),
      w: bw,
      h: bh,
    },
  };
}

// ─── Frame capture ──────────────────────────────────────────────────────────

function captureFrame(video: HTMLVideoElement, quality = 0.75): string | null {
  const tmp = document.createElement('canvas');
  tmp.width  = video.videoWidth  || 640;
  tmp.height = video.videoHeight || 480;
  const ctx = tmp.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, tmp.width, tmp.height);
  return tmp.toDataURL('image/jpeg', quality).split(',')[1] ?? null;
}

// ─── Component ─────────────────────────────────────────────────────────────

interface Props {
  activeSession: ActiveSession | null;
}

export function OperatorCameraPanel({ activeSession }: Props) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef  = useRef(false);

  const [mode, setMode]               = useState<InspectionMode>('simulation');
  const [cameraOn, setCameraOn]       = useState(false);
  const [error, setError]             = useState('');
  const [devices, setDevices]         = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [detections, setDetections]   = useState<Detection[]>([]);
  const [yoloStatus, setYoloStatus]   = useState<YoloStatus>('checking');
  const [inferenceMs, setInferenceMs] = useState<number | null>(null);
  const [savedCount, setSavedCount]   = useState(0);
  const [indicators, setIndicators]   = useState({
    rot_level: 0, anomaly_score: 0,
    color_category: 'Normal', defect_count: 0,
    defect_severity: 'Minor', confidence: 0,
  });

  // Reset saved count when session changes
  useEffect(() => { setSavedCount(0); }, [activeSession?.sessionId]);

  // YOLO health check
  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const res = await fetch('/api/yolo/health');
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!mounted) return;
        if      (data.status === 'offline') setYoloStatus('offline');
        else if (!data.model_loaded)        setYoloStatus('no-model');
        else                                setYoloStatus('online');
      } catch { if (mounted) setYoloStatus('offline'); }
    }
    check();
    const t = setInterval(check, 10_000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  // Enumerate cameras
  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setError('Camera API tidak tersedia. Akses via localhost atau aktifkan HTTPS.');
      return;
    }
    navigator.mediaDevices.enumerateDevices()
      .then((all) => {
        const cams = all.filter((d) => d.kind === 'videoinput');
        setDevices(cams);
        if (cams.length > 0) setSelectedDevice(cams[0].deviceId);
      })
      .catch(() => {});
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (videoRef.current)    videoRef.current.srcObject = null;
    setCameraOn(false);
    setDetections([]);
    pendingRef.current = false;
  }, []);

  // ─── Save one detection frame to DB ────────────────────────────────────────
  const saveFrame = useCallback(async (det: Detection) => {
    if (!activeSession) return;
    try {
      await fetch('/api/inspection/frames', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lot_id:        activeSession.lotId,
          session_id:    activeSession.sessionId,
          object_class:  det.object_class,
          confidence_score: det.confidence_score,
          rot_level:     det.rot_level,
          color_rgb:     det.color_rgb,
          color_deviation: det.color_deviation,
          color_category: det.color_category,
          defect_types:  det.defect_types,
          defect_count:  det.defect_count,
          defect_severity: det.defect_severity,
          anomaly_score: det.anomaly_score,
          bbox_coordinates: { x: det.bbox.x, y: det.bbox.y, width: det.bbox.w, height: det.bbox.h },
        }),
      });
      setSavedCount((c) => c + 1);
    } catch {
      // non-blocking – never interrupt detection loop
    }
  }, [activeSession]);

  // ─── Inference tick ────────────────────────────────────────────────────────
  const runInference = useCallback(async () => {
    if (pendingRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const useRealYolo = mode === 'inspection' && yoloStatus === 'online';

    if (useRealYolo) {
      const b64 = captureFrame(video);
      if (!b64) return;
      pendingRef.current = true;
      try {
        const res = await fetch('/api/yolo/detect', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ image_b64: b64, conf: 0.45 }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const dets: Detection[] = (data.detections ?? []).map((d: Detection & { color_rgb?: { r: number; g: number; b: number }; color_deviation?: number; defect_types?: string[] }) => ({
          ...d,
          color_rgb:       d.color_rgb       ?? colorRgbFromCategory(d.color_category),
          color_deviation: d.color_deviation ?? parseFloat((d.rot_level * 0.4).toFixed(2)),
          defect_types:    d.defect_types    ?? defectTypesFromSeverity(d.defect_severity, ['minor_bruise']),
        }));
        setInferenceMs(data.inference_ms ?? null);
        setDetections(dets);
        updateIndicators(dets);
        drawOverlay(dets, canvas, data.frame_w ?? canvas.width, data.frame_h ?? canvas.height);
        for (const det of dets) saveFrame(det).catch(() => {});
      } catch {
        setYoloStatus('offline');
      } finally {
        pendingRef.current = false;
      }
    } else {
      // Simulation mode — always mock regardless of YOLO status
      const count = 1 + Math.floor(Math.random() * 2);
      const dets  = Array.from({ length: count }, () => mockDetection(canvas.width, canvas.height));
      setDetections(dets);
      updateIndicators(dets);
      drawOverlay(dets, canvas, canvas.width, canvas.height);
      for (const det of dets) saveFrame(det).catch(() => {});
    }
  }, [mode, yoloStatus, saveFrame]);

  const startCamera = useCallback(async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera API tidak tersedia. Gunakan localhost atau HTTPS.');
      return;
    }
    if (mode === 'inspection' && yoloStatus !== 'online') {
      setError('Mode Inspeksi memerlukan YOLO service online. Jalankan uvicorn di folder yolo_service/.');
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
      intervalRef.current = setInterval(runInference, 1500);
    } catch (err) {
      if (err instanceof Error) {
        if      (err.name === 'NotAllowedError') setError('Izin kamera ditolak. Izinkan akses kamera di browser.');
        else if (err.name === 'NotFoundError')   setError('Tidak ada kamera yang terdeteksi.');
        else                                     setError(`Gagal mengakses kamera: ${err.message}`);
      }
    }
  }, [selectedDevice, runInference, mode, yoloStatus]);

  // Restart interval when yoloStatus / mode changes
  useEffect(() => {
    if (!cameraOn) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(runInference, 1500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [yoloStatus, mode, cameraOn, runInference]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  function updateIndicators(dets: Detection[]) {
    if (!dets.length) return;
    const avg = (key: keyof Detection) =>
      dets.reduce((s, d) => s + (d[key] as number), 0) / dets.length;
    setIndicators({
      rot_level:      avg('rot_level'),
      anomaly_score:  avg('anomaly_score'),
      color_category: dets[0].color_category,
      defect_count:   dets.reduce((s, d) => s + d.defect_count, 0),
      defect_severity: dets[0].defect_severity,
      confidence:     avg('confidence_score'),
    });
  }

  function drawOverlay(dets: Detection[], canvas: HTMLCanvasElement, srcW: number, srcH: number) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scaleX = canvas.width  / srcW;
    const scaleY = canvas.height / srcH;
    for (const d of dets) {
      const color = bboxColor(d.confidence_score, d.rot_level);
      const x = d.bbox.x * scaleX, y = d.bbox.y * scaleY;
      const w = d.bbox.w * scaleX, h = d.bbox.h * scaleY;
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      const label  = `${d.object_class} ${(d.confidence_score * 100).toFixed(0)}%`;
      const textW  = ctx.measureText(label).width + 8;
      ctx.font      = 'bold 12px monospace';
      ctx.fillStyle = color;
      ctx.fillRect(x, y - 20, textW, 20);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x + 4, y - 5);
    }
  }

  // ─── Derived badge info ─────────────────────────────────────────────────────
  const yoloBadge = {
    checking:  { label: 'Memeriksa AI...', variant: 'secondary' as const },
    online:    { label: 'YOLO Online',     variant: 'success'   as const },
    'no-model':{ label: 'Model Belum Ada', variant: 'warning'   as const },
    offline:   { label: 'AI Offline',      variant: 'secondary' as const },
  }[yoloStatus];

  const canStartInspection = mode === 'inspection' && yoloStatus === 'online';
  const canStartSimulation = mode === 'simulation';

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-brand-100">
        <h2 className="text-base font-semibold text-gray-800">Live Camera & QC Monitor</h2>
        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex rounded-md border border-brand-200 overflow-hidden text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setMode('simulation'); if (cameraOn) stopCamera(); }}
              className={`px-2.5 py-1 transition-colors ${mode === 'simulation' ? 'bg-brand-600 text-white' : 'text-brand-700 hover:bg-brand-50'}`}
            >
              Simulasi
            </button>
            <button
              type="button"
              onClick={() => { setMode('inspection'); if (cameraOn) stopCamera(); }}
              className={`px-2.5 py-1 transition-colors ${mode === 'inspection' ? 'bg-brand-600 text-white' : 'text-brand-700 hover:bg-brand-50'}`}
            >
              Inspeksi
            </button>
          </div>
          <Badge variant={yoloBadge.variant}>{yoloBadge.label}</Badge>
          <Badge variant={cameraOn ? 'success' : 'secondary'}>{cameraOn ? 'Live' : 'Standby'}</Badge>
        </div>
      </div>

      {/* ── Video feed ── */}
      <div className="relative flex-1 bg-gray-900 overflow-hidden min-h-0">
        <video ref={videoRef} className="w-full h-full object-contain" muted playsInline />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" width={1280} height={720} />
        {!cameraOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white bg-black/70">
            {error
              ? <p className="text-sm text-red-400 text-center px-6">{error}</p>
              : <p className="text-sm text-gray-300">Klik tombol di bawah untuk mengaktifkan kamera</p>
            }
          </div>
        )}
        {cameraOn && inferenceMs !== null && mode === 'inspection' && (
          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded font-mono">
            {inferenceMs.toFixed(0)} ms
          </div>
        )}
        {cameraOn && (
          <div className={`absolute top-2 left-2 text-white text-xs px-2 py-1 rounded font-semibold ${mode === 'simulation' ? 'bg-yellow-600/80' : 'bg-green-700/80'}`}>
            {mode === 'simulation' ? 'SIMULASI' : 'INSPEKSI'}
          </div>
        )}
        {/* Frame counter */}
        {cameraOn && activeSession && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded font-mono">
            {savedCount} frame tersimpan
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div className="px-4 py-2 border-t border-brand-100 flex items-center gap-3 bg-white shrink-0">
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
          <Button
            size="sm"
            onClick={startCamera}
            className="shrink-0"
            disabled={mode === 'inspection' && !canStartInspection && !canStartSimulation}
          >
            {mode === 'inspection' ? 'Mulai Inspeksi' : 'Aktifkan Kamera'}
          </Button>
        ) : (
          <Button size="sm" variant="destructive" onClick={stopCamera} className="shrink-0">
            Matikan Kamera
          </Button>
        )}
        {!activeSession && (
          <span className="text-xs text-amber-600 font-medium">← Buat lot dulu</span>
        )}
      </div>

      {/* ── Real-time indicators ── */}
      <div className="grid grid-cols-2 gap-2 p-3 bg-[#e8f2e8] shrink-0">
        <IndicatorCard
          label="Rot Level"
          value={`${indicators.rot_level.toFixed(1)}%`}
          sub={rotCategory(indicators.rot_level)}
          color={indicators.rot_level < 15 ? 'text-green-700' : indicators.rot_level < 40 ? 'text-yellow-700' : 'text-red-700'}
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

      {/* ── Mode info bar ── */}
      {mode === 'inspection' && yoloStatus !== 'online' && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 text-xs text-amber-800 shrink-0 flex flex-col gap-1">
          {yoloStatus === 'no-model' && (
            <span>Model belum terlatih. Jalankan <code className="font-mono bg-amber-100 px-1 rounded">python train.py</code> di folder <code className="font-mono bg-amber-100 px-1 rounded">yolo_service/</code></span>
          )}
          {(yoloStatus === 'offline' || yoloStatus === 'checking') && (
            <>
              <span className="font-semibold">YOLO service tidak terhubung.</span>
              <span>
                <strong>Lokal:</strong> jalankan <code className="font-mono bg-amber-100 px-1 rounded">uvicorn main:app --port 8000</code> di folder <code className="font-mono bg-amber-100 px-1 rounded">yolo_service/</code>
              </span>
              <span>
                <strong>Production:</strong> deploy YOLO service ke Railway/Render, lalu set env <code className="font-mono bg-amber-100 px-1 rounded">YOLO_SERVICE_URL</code> di Amplify.
              </span>
              <span className="text-amber-600">Gunakan mode <strong>Simulasi</strong> untuk demo tanpa YOLO service.</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function IndicatorCard({ label, value, sub, color = 'text-gray-900' }: {
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
