'use client';

// Dynamic import — prevents onnxruntime-web from being evaluated server-side
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ortPromise: Promise<any> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getOrt(): Promise<any> {
  if (!ortPromise) ortPromise = import('onnxruntime-web');
  return ortPromise;
}

const MODEL_URL   = '/models/best.onnx';
const INPUT_SIZE  = 640;
const CONF_THRESH = 0.20;
const IOU_THRESH  = 0.45;
const NUM_ANCHORS = 8400;

export interface OfflineDetection {
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

// Singleton ONNX session
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sessionPromise: Promise<any> | null = null;
export function resetYoloSession() { sessionPromise = null; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Use jsdelivr CDN for WASM runtime — avoids local serving issues on Amplify/Next.js
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/';

async function initSession(): Promise<any> {
  if (sessionPromise) return sessionPromise;
  const ort = await getOrt();
  ort.env.wasm.wasmPaths = WASM_CDN;
  ort.env.wasm.numThreads = 1;
  sessionPromise = ort.InferenceSession.create(MODEL_URL, {
    executionProviders: ['wasm'],
  });
  return sessionPromise;
}

// Call this when entering inspection mode to preload model in background
export function preloadYoloModel(): void {
  initSession().catch(() => {
    sessionPromise = null; // allow retry
  });
}

// Resize source canvas to 640×640 and convert to float32 CHW [0,1]
function preprocess(source: HTMLCanvasElement): Float32Array {
  const tmp = document.createElement('canvas');
  tmp.width = tmp.height = INPUT_SIZE;
  const ctx = tmp.getContext('2d')!;
  ctx.drawImage(source, 0, 0, INPUT_SIZE, INPUT_SIZE);
  const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
  const pixels = INPUT_SIZE * INPUT_SIZE;
  const input  = new Float32Array(3 * pixels);
  for (let i = 0; i < pixels; i++) {
    input[0 * pixels + i] = data[i * 4 + 0] / 255; // R
    input[1 * pixels + i] = data[i * 4 + 1] / 255; // G
    input[2 * pixels + i] = data[i * 4 + 2] / 255; // B
  }
  return input;
}

function iou(a: number[], b: number[]): number {
  const x1 = Math.max(a[0], b[0]), y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[2], b[2]), y2 = Math.min(a[3], b[3]);
  if (x2 <= x1 || y2 <= y1) return 0;
  const inter = (x2 - x1) * (y2 - y1);
  return inter / ((a[2]-a[0])*(a[3]-a[1]) + (b[2]-b[0])*(b[3]-b[1]) - inter);
}

// Map YOLO freshness class → quality metrics (mirrors main.py logic)
function classToMetrics(classId: number, conf: number) {
  const isFresh  = classId === 0;
  const rot_raw  = isFresh ? Math.max(0, (1 - conf) * 20) : conf * 90;
  const rot_level = Math.round(rot_raw * 100) / 100;

  const color_category =
    rot_level < 15 ? 'Normal' :
    rot_level < 40 ? 'Pucat' :
    rot_level < 75 ? 'Terlalu Matang' : 'Abnormal';

  const color_rgb =
    color_category === 'Normal'         ? { r: 80,  g: 155, b: 60  } :
    color_category === 'Pucat'          ? { r: 200, g: 178, b: 95  } :
    color_category === 'Terlalu Matang' ? { r: 145, g: 82,  b: 50  } :
                                          { r: 120, g: 60,  b: 60  };

  const defect_severity = rot_level < 20 ? 'Minor' : rot_level < 50 ? 'Moderate' : 'Severe';

  const defect_types =
    rot_level < 20 ? ['minor_bruise'] :
    rot_level < 40 ? ['brown_spot', 'soft_area'] :
    rot_level < 70 ? ['mold', 'brown_spot'] :
                     ['mold', 'decay', 'rupture'];

  const defect_count =
    rot_level < 10 ? 0 :
    rot_level < 30 ? 1 :
    rot_level < 60 ? 2 :
    3 + Math.floor((rot_level - 60) / 15);

  const anomaly_score = Math.min(1.0,
    Math.round((rot_level / 100 + (1 - conf) * 0.15) * 10000) / 10000
  );

  return { rot_level, color_category, color_rgb, color_deviation: +(rot_level * 0.45).toFixed(2), defect_severity, defect_types, defect_count, anomaly_score };
}

export async function detectFromCanvas(
  canvas: HTMLCanvasElement,
  productType: string | null,
): Promise<OfflineDetection[]> {
  const ort  = await getOrt();
  const sess = await initSession();

  const inputData = preprocess(canvas);
  const tensor    = new ort.Tensor('float32', inputData, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const result    = await sess.run({ images: tensor });
  const raw       = result.output0.data as Float32Array;

  // output0 shape [1, 8, 8400]: rows are [cx, cy, w, h, cls0..cls3], cols are anchors
  const candidates: Array<{ bbox: number[]; score: number; classId: number }> = [];

  for (let i = 0; i < NUM_ANCHORS; i++) {
    let maxScore = 0, classId = 0;
    for (let c = 0; c < 4; c++) {
      const s = raw[(4 + c) * NUM_ANCHORS + i];
      if (s > maxScore) { maxScore = s; classId = c; }
    }
    if (maxScore < CONF_THRESH) continue;

    const cx = raw[0 * NUM_ANCHORS + i];
    const cy = raw[1 * NUM_ANCHORS + i];
    const w  = raw[2 * NUM_ANCHORS + i];
    const h  = raw[3 * NUM_ANCHORS + i];
    candidates.push({ bbox: [cx - w/2, cy - h/2, cx + w/2, cy + h/2], score: maxScore, classId });
  }

  // Greedy NMS
  candidates.sort((a, b) => b.score - a.score);
  const kept: typeof candidates = [];
  const suppressed = new Set<number>();
  for (let i = 0; i < candidates.length; i++) {
    if (suppressed.has(i)) continue;
    kept.push(candidates[i]);
    for (let j = i + 1; j < candidates.length; j++) {
      if (iou(candidates[i].bbox, candidates[j].bbox) > IOU_THRESH) suppressed.add(j);
    }
  }

  const scaleX = canvas.width  / INPUT_SIZE;
  const scaleY = canvas.height / INPUT_SIZE;
  const objectClass = productType ?? 'bahan_baku';

  return kept.map(({ bbox, score, classId }) => ({
    object_class:     objectClass,
    confidence_score: Math.round(score * 1000) / 1000,
    bbox: {
      x: bbox[0] * scaleX,
      y: bbox[1] * scaleY,
      w: (bbox[2] - bbox[0]) * scaleX,
      h: (bbox[3] - bbox[1]) * scaleY,
    },
    ...classToMetrics(classId, score),
  }));
}
