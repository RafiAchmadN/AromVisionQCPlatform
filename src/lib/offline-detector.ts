'use client';

// Offline fruit detector using HuggingFace Transformers.js
// Model: Xenova/yolos-tiny (~28MB, downloads once, cached in browser)
// Detects COCO classes including: apple, banana, orange, carrot, broccoli

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

// COCO class → Indonesian name (only fruit/vegetable classes we care about)
const COCO_ID: Record<string, string> = {
  apple:      'apel',
  banana:     'pisang',
  orange:     'jeruk',
  broccoli:   'brokoli',
  carrot:     'wortel',
  tomato:     'tomat',
  strawberry: 'stroberi',
  lemon:      'lemon',
  pear:       'pir',
  peach:      'persik',
  mango:      'mangga',
  grape:      'anggur',
};

// Ideal "fresh" RGB for each fruit — used to compute color deviation
const IDEAL_COLOR: Record<string, { r: number; g: number; b: number }> = {
  apel:    { r: 210, g: 50,  b: 50  },
  pisang:  { r: 230, g: 210, b: 50  },
  jeruk:   { r: 240, g: 150, b: 30  },
  brokoli: { r: 60,  g: 150, b: 60  },
  wortel:  { r: 220, g: 100, b: 30  },
  tomat:   { r: 200, g: 50,  b: 50  },
};

// Singleton pipeline — loaded once per browser session
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pipeline: any = null;
let pipelineLoading = false;
let loadError: string | null = null;

export async function loadModel(
  onProgress?: (pct: number) => void
): Promise<void> {
  if (pipeline) return;
  if (loadError) throw new Error(loadError);
  if (pipelineLoading) {
    // Wait until loaded
    await new Promise<void>((resolve, reject) => {
      const t = setInterval(() => {
        if (pipeline)  { clearInterval(t); resolve(); }
        if (loadError) { clearInterval(t); reject(new Error(loadError)); }
      }, 200);
    });
    return;
  }
  pipelineLoading = true;
  try {
    const { pipeline: createPipeline, env } = await import('@huggingface/transformers');
    env.allowLocalModels = false;
    pipeline = await createPipeline(
      'object-detection',
      'Xenova/yolos-tiny',
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        progress_callback: (p: any) => {
          if (p?.progress != null) onProgress?.(Math.round(p.progress));
        },
      }
    );
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'Model load failed';
    pipelineLoading = false;
    throw e;
  }
  pipelineLoading = false;
}

function analyzePixels(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  fruitName: string
): { rot_level: number; color_rgb: { r: number; g: number; b: number }; color_category: string } {
  // Sample pixels inside bbox
  const sx = Math.max(0, Math.round(x));
  const sy = Math.max(0, Math.round(y));
  const sw = Math.min(Math.round(w), ctx.canvas.width  - sx);
  const sh = Math.min(Math.round(h), ctx.canvas.height - sy);

  if (sw <= 0 || sh <= 0) {
    return { rot_level: 20, color_rgb: { r: 180, g: 120, b: 80 }, color_category: 'Normal' };
  }

  const data = ctx.getImageData(sx, sy, sw, sh).data;
  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
  }
  if (count === 0) return { rot_level: 20, color_rgb: { r: 180, g: 120, b: 80 }, color_category: 'Normal' };

  const avgR = r / count, avgG = g / count, avgB = b / count;

  // Color deviation from ideal fresh color
  const ideal = IDEAL_COLOR[fruitName] ?? { r: 180, g: 120, b: 80 };
  const deviation = Math.sqrt(
    Math.pow(avgR - ideal.r, 2) +
    Math.pow(avgG - ideal.g, 2) +
    Math.pow(avgB - ideal.b, 2)
  );
  // Normalize to 0-100% rot level — max deviation ~220 (full contrast)
  const rot_level = Math.min(100, Math.round((deviation / 220) * 100));

  const color_category =
    rot_level < 15 ? 'Normal' :
    rot_level < 40 ? 'Pucat' :
    rot_level < 70 ? 'Terlalu Matang' : 'Abnormal';

  return { rot_level, color_rgb: { r: Math.round(avgR), g: Math.round(avgG), b: Math.round(avgB) }, color_category };
}

export async function detectOffline(
  canvas: HTMLCanvasElement
): Promise<OfflineDetection[]> {
  if (!pipeline) throw new Error('Model not loaded');

  // Run YOLOS inference
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = await pipeline(canvas.toDataURL('image/jpeg', 0.8));

  const ctx = canvas.getContext('2d');
  const out: OfflineDetection[] = [];

  for (const r of results) {
    const label: string = (r.label ?? '').toLowerCase();
    const idName = COCO_ID[label];
    if (!idName) continue; // skip non-fruit detections

    const conf: number = parseFloat((r.score ?? 0).toFixed(3));
    const box = r.box ?? {};
    const bx = box.xmin ?? 0, by = box.ymin ?? 0;
    const bw = (box.xmax ?? 0) - bx, bh = (box.ymax ?? 0) - by;

    const pixels = ctx
      ? analyzePixels(ctx, bx, by, bw, bh, idName)
      : { rot_level: 20, color_rgb: { r: 180, g: 120, b: 80 }, color_category: 'Normal' };

    const rot = pixels.rot_level;
    const severity = rot < 20 ? 'Minor' : rot < 55 ? 'Moderate' : 'Severe';
    const defect_types =
      rot < 20 ? ['minor_bruise'] :
      rot < 40 ? ['brown_spot', 'soft_area'] :
      rot < 70 ? ['mold', 'brown_spot'] :
                 ['mold', 'decay', 'rupture'];
    const defect_count = rot < 20 ? Math.floor(Math.random() * 2) : 1 + Math.floor(rot / 40);
    const anomaly_score = parseFloat(((rot / 100) * 0.65 + (1 - conf) * 0.35).toFixed(4));

    out.push({
      object_class: idName,
      confidence_score: conf,
      rot_level: rot,
      color_rgb: pixels.color_rgb,
      color_deviation: parseFloat((rot * 0.4).toFixed(2)),
      color_category: pixels.color_category,
      defect_types,
      defect_count,
      defect_severity: severity,
      anomaly_score,
      bbox: { x: bx, y: by, w: bw, h: bh },
    });
  }

  return out;
}
