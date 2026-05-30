# AromVision QC Platform

**AI-powered Quality Control platform untuk proses manufaktur Sima Arome — buah segar & ekstrak natural.**

Built for [CyberHack 2026](https://cyberhack.id) · Co-organised with UKM Cyber Security ITS · Sponsored by Xtremax, AWS, BuildPad

---

## Masalah yang Diselesaikan

Sima Arome, produsen ekstrak natural Indonesia untuk F&B, kosmetik & wellness, menghadapi tiga hambatan utama:

| Pain Point | Dampak |
|---|---|
| QC manual dengan mata | Throughput berhenti ketika staf QC tidak ada |
| Input data ganda di banyak tool | Error, rework, tidak ada satu sumber kebenaran |
| Keputusan produksi di kepala orang | Riwayat lot, jadwal PPIC, dispatch tersebar di notebook & chat |

---

## Apa yang Dilakukan AromVision

AromVision adalah **platform operasi QC terpadu** yang menghubungkan lini inspeksi langsung ke review manajemen — menggantikan pengecekan manual dan spreadsheet dengan satu sistem terintegrasi dan teraudit.

```
Webcam / Kamera
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│           AromVision QC Platform  (Next.js 15)              │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Operator   │  │   Manager    │  │      Admin       │  │
│  │  Dashboard   │  │  Dashboard   │  │      Panel       │  │
│  │              │  │              │  │                  │  │
│  │ • Mode Sim   │  │ • Lot Queue  │  │ • User RBAC      │  │
│  │ • Mode Insp  │  │ • AI Decision│  │ • Threshold Cfg  │  │
│  │ • Lot Create │  │ • Auto-Appr  │  │ • Audit Viewer   │  │
│  │ • Shift Info │  │ • Override   │  │ • Report Export  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         └────────────────┬┘──────────────────-┘            │
│                          │  Next.js API Routes              │
│         ┌────────────────┼──────────────┐                   │
│         ▼                ▼              ▼                   │
│  ┌─────────────┐  ┌────────────┐  ┌──────────────┐         │
│  │  Supabase   │  │  YOLOv11   │  │  Nodemailer  │         │
│  │ PostgreSQL  │  │  FastAPI   │  │    Email      │         │
│  │  Auth + RLS │  │  (Railway) │  │ Notifications │         │
│  └─────────────┘  └────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## Fitur Utama

### Mode Inspeksi Ganda
- **Mode Simulasi** — mock detection buah dengan distribusi probabilistik, selalu berjalan tanpa perlu YOLO service
- **Mode Inspeksi** — deteksi real-time YOLOv11 via webcam, confidence threshold 0.45

### AI Quality Control (Focus Area 02)
- **YOLOv11 terlatih** — dataset Fruit Freshness Detection (960 gambar, 4 kelas: fresh / slightly_rotten / moderately_rotten / severely_rotten)
- **Hasil training**: mAP50 **98.4%** · Precision **98.4%** · Recall **98.2%**
- **Per-deteksi**: rot level, color category, defect count, defect severity, anomaly score
- **14 jenis buah** didukung: Pisang, Apel, Buah Naga, Delima, Jeruk, Anggur, Lemon, Stroberi, Bolazakar, Leci, Blackberry, Bilberry, Buah Nangka, Nanas

### Auto-Approval System
- Batch dengan `avg_confidence ≥ 95%` **DAN** `avg_rot_level ≤ 5%` → langsung **APPROVED** tanpa antrian manajer
- Di bawah threshold → masuk **MANAGER_REVIEW** untuk keputusan manual
- Decision record otomatis dengan `is_system_decision: true`

### Integrated Operations System (Focus Area 01)
- **Lifecycle lot**: `INSPECTION_RUNNING → MANAGER_REVIEW → APPROVED / REJECTED / QUARANTINED / ESCALATED`
- **State machine** enforcement — transisi tidak valid ditolak di layer API
- **Frame pipeline** — setiap deteksi tersimpan ke DB, aggregate otomatis saat sesi selesai
- **Manajemen shift**: Operator & Manager terhubung per shift (Pagi / Siang / Malam)

### Enterprise Readiness
- **RBAC** dua layer: Next.js middleware + Supabase RLS
- **Audit log immutable** — trigger Postgres blokir UPDATE & DELETE di `audit_logs`
- **Notifikasi** in-app + email (nodemailer) per event type
- **Laporan otomatis** harian, mingguan, bulanan + ekspor CSV
- **Rate-limit login** — 5 percobaan gagal → lockout 15 menit

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS |
| Backend | Next.js API Routes, Zod validation |
| Database | Supabase (PostgreSQL 15, Auth, RLS) |
| AI Inference | YOLOv11 (Ultralytics 8.3.50), FastAPI, OpenCV |
| AI Deployment | Railway (Dockerfile, CPU-only torch) |
| Notifications | Nodemailer (email), in-app real-time |
| Scheduling | node-cron |
| Charts | Recharts |
| Testing | Vitest + fast-check, Playwright (E2E) |

---

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.12+
- Supabase project (free tier)

### 1. Clone & install
```bash
git clone https://github.com/RafiAchmadN/TestHackathon.git aromai-qc
cd aromai-qc
npm install
```

### 2. Environment variables
```bash
cp .env.local.example .env.local
# Isi NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# Opsional: YOLO_SERVICE_URL=https://<url-railway>.railway.app
```

### 3. Database migrations
Jalankan di Supabase SQL Editor:
```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
```

### 4. Seed demo data
```bash
npm run dev
curl -X POST http://localhost:3000/api/setup/seed \
  -H "Content-Type: application/json" \
  -d '{"token": "aromai-demo-seed"}'
```

### 5. Demo credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@aromai.demo | AromAI2026! |
| Manager | manager@aromai.demo | AromAI2026! |
| Operator | operator@aromai.demo | AromAI2026! |

### 6. Jalankan (tanpa YOLO — Mode Simulasi)
```bash
npm run dev
# Login sebagai operator → buat lot → aktifkan kamera → pilih mode Simulasi
```

---

## YOLO Service (Mode Inspeksi)

### Lokal
```bash
cd yolo_service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Model sudah tersedia di models/best.pt (terlatih)
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Production (Railway)
1. Buka [railway.app](https://railway.app) → **New Service** → **GitHub Repo**
2. Pilih repo ini, set **Root Directory = `yolo_service`**
3. Railway otomatis detect `Dockerfile` dan build Python service
4. Copy URL Railway → set di Amplify env: `YOLO_SERVICE_URL=https://<url>.railway.app`

---

## Alur Pipeline QC

```
Operator buat Lot
      │
      ▼
Kamera capture frame tiap 1.5 detik
      │
      ▼
Mode Simulasi: mockDetection()    Mode Inspeksi: YOLO FastAPI /detect
      │                                    │
      └──────────────┬────────────────────┘
                     ▼
        POST /api/inspection/frames (session auth)
        → frame_data tersimpan di Supabase
                     │
                     ▼
        Operator klik "Selesai Inspeksi"
                     │
                     ▼
        completeSession() — agregat semua frame:
        avg_confidence, avg_rot_level, avg_anomaly,
        grade (A/B/C/Reject), pass/fail count
                     │
            ┌────────┴────────┐
            ▼                 ▼
    confidence≥95%      di bawah threshold
    & rot≤5%
            │                 │
            ▼                 ▼
        APPROVED          MANAGER_REVIEW
     (otomatis)          Manager memutuskan:
                     Approve / Reject / Quarantine / Escalate
```

---

## Arsitektur Keamanan

| Layer | Kontrol |
|---|---|
| Transport | HTTPS (Amplify enforce) |
| Autentikasi | Supabase Auth (JWT, 8 jam) |
| Otorisasi | Role-based: middleware blokir akses per role |
| Isolasi data | RLS: Operator hanya lihat lot sendiri |
| Audit trail | `audit_logs` immutable (Postgres trigger) |
| Login | Rate limit 5x / 15 menit → lockout |
| Input | Zod schema di semua API route |

---

## Struktur Project

```
├── src/
│   ├── app/
│   │   ├── admin/          ← Dashboard, users, config, audit, reports
│   │   ├── manager/        ← Lot queue + decision panel
│   │   ├── operator/       ← Camera QC + lot creation
│   │   └── api/            ← Auth, lots, inspection, decisions, reports…
│   ├── components/
│   │   ├── admin/
│   │   ├── manager/
│   │   ├── operator/       ← CameraPanel (Simulasi/Inspeksi) + LotPanel + Workspace
│   │   └── shared/         ← Topbar, NotificationBell, ErrorBoundary
│   └── lib/
│       ├── inspection-hooks.ts  ← Session completion + auto-approval engine
│       ├── auto-decision.ts     ← Rule-based QC decision
│       ├── state-machine.ts     ← Lot status transition enforcement
│       ├── audit.ts             ← Immutable audit log writer
│       ├── notifications.ts     ← Multi-channel notification dispatcher
│       └── cron-jobs.ts         ← Scheduled report jobs
├── yolo_service/
│   ├── main.py             ← FastAPI inference server
│   ├── train.py            ← YOLOv11 training script
│   ├── class_map.py        ← YOLO class → platform domain (14 buah)
│   ├── models/best.pt      ← Model terlatih (mAP50 98.4%)
│   ├── Dockerfile          ← CPU-only torch untuk Railway
│   └── railway.toml        ← Railway deployment config
└── supabase/
    └── migrations/
        ├── 001_initial_schema.sql
        └── 002_rls_policies.sql
```

---

## Live Demo

**[https://main.d1cao7uhcec3x9.amplifyapp.com](https://main.d1cao7uhcec3x9.amplifyapp.com)**

> Deployed on BuildPad (AWS Amplify) · Gunakan demo credentials di atas

---

## Tim

**Team Berkakang Fighter** · CyberHack 2026

| Nama | Role |
|---|---|
| Ainur Rizza | AI/ML Engineer |
| Rafi Achmad Nabihan | Full Stack Developer |
| Medika Alfian | UI/UX Designer |

---

*Built at CyberHack 2026, ITS Surabaya · Powered by Hackpad*
