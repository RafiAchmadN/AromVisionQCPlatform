'use client';

// Offline quality analyzer — no external model, no large packages
// Uses canvas pixel analysis to estimate rot level, color category, and defects.
// Product class comes from the active lot (we already know what's being inspected).

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

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

// Analyze pixels in a region and return quality metrics
function analyzeRegion(
  data: Uint8ClampedArray,
  width: number,
  height: number
): { avgR: number; avgG: number; avgB: number; brownPct: number; darkPct: number } {
  let r = 0, g = 0, b = 0;
  let brownCount = 0, darkCount = 0;
  const total = width * height;

  for (let i = 0; i < data.length; i += 4) {
    const pr = data[i], pg = data[i + 1], pb = data[i + 2];
    r += pr; g += pg; b += pb;

    // Brown detection: R>G>B and G is mid-range
    if (pr > 80 && pg > 40 && pb < 80 && pr > pg && pg > pb && pr - pb > 40) brownCount++;
    // Dark/mold detection: all channels low
    if (pr < 60 && pg < 60 && pb < 60) darkCount++;
  }

  return {
    avgR: r / total,
    avgG: g / total,
    avgB: b / total,
    brownPct: (brownCount / total) * 100,
    darkPct: (darkCount / total) * 100,
  };
}

export function detectFromCanvas(
  canvas: HTMLCanvasElement,
  productType: string | null
): OfflineDetection[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const w = canvas.width;
  const h = canvas.height;

  // Analyze 1-3 random regions (simulating multiple objects)
  const count = 1 + Math.floor(Math.random() * 2);
  const results: OfflineDetection[] = [];

  for (let i = 0; i < count; i++) {
    // Random bbox (center-biased)
    const bw = rand(w * 0.15, w * 0.35);
    const bh = rand(h * 0.20, h * 0.40);
    const bx = rand(w * 0.05, w * 0.95 - bw);
    const by = rand(h * 0.05, h * 0.95 - bh);

    // Get pixels
    const imageData = ctx.getImageData(
      Math.round(bx), Math.round(by),
      Math.round(bw), Math.round(bh)
    );

    const { avgR, avgG, avgB, brownPct, darkPct } = analyzeRegion(
      imageData.data,
      Math.round(bw),
      Math.round(bh)
    );

    // Rot level: weighted by brown + dark pixel percentage
    const rot_level = Math.min(100, Math.round(brownPct * 1.8 + darkPct * 2.5));

    // Color category
    const color_category =
      rot_level < 15 ? 'Normal' :
      rot_level < 40 ? 'Pucat' :
      rot_level < 70 ? 'Terlalu Matang' : 'Abnormal';

    // Confidence — based on image clarity (not too dark, not too bright)
    const brightness = (avgR + avgG + avgB) / 3;
    const confidence = Math.min(0.97, Math.max(0.45,
      brightness > 30 && brightness < 220 ? 0.75 + Math.random() * 0.20 : 0.45
    ));

    const severity = rot_level < 20 ? 'Minor' : rot_level < 55 ? 'Moderate' : 'Severe';
    const defect_types =
      rot_level < 20 ? ['minor_bruise'] :
      rot_level < 40 ? ['brown_spot', 'soft_area'] :
      rot_level < 70 ? ['mold', 'brown_spot'] :
                       ['mold', 'decay', 'rupture'];
    const defect_count = rot_level < 20 ? Math.floor(Math.random() * 2) : 1 + Math.floor(rot_level / 40);
    const anomaly_score = parseFloat(((rot_level / 100) * 0.65 + (1 - confidence) * 0.35).toFixed(4));

    results.push({
      object_class:     productType ?? 'bahan_baku',
      confidence_score: parseFloat(confidence.toFixed(3)),
      rot_level,
      color_rgb:        { r: Math.round(avgR), g: Math.round(avgG), b: Math.round(avgB) },
      color_deviation:  parseFloat((rot_level * 0.4).toFixed(2)),
      color_category,
      defect_types,
      defect_count,
      defect_severity:  severity,
      anomaly_score,
      bbox: { x: bx, y: by, w: bw, h: bh },
    });
  }

  return results;
}
