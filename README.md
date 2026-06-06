# AromVision — AI Quality Control Platform

> **AI-powered QC platform for Sima Arome's natural extract manufacturing** — replacing manual inspection and fragmented spreadsheets with a fully integrated, auditable system.

Built for **CyberHack 2026** · Co-organised with UKM Cyber Security ITS · Sponsored by Xtremax, AWS, BuildPad

🌐 **Live Demo:** [main.d1cao7uhcec3x9.amplifyapp.com](https://main.d1cao7uhcec3x9.amplifyapp.com)

---

## The Problem

Sima Arome — Indonesia's natural extracts manufacturer for F&B, cosmetics & wellness brands — faces four operational bottlenecks:

| Challenge | Impact |
|---|---|
| **Manual QC by eye** | Throughput stalls when QC staff are unavailable; results vary per person |
| **Double data entry across tools** | Same data re-entered 3× — notebooks, spreadsheets, chat |
| **Storage & production by spreadsheet** | No single source of truth; lot histories lost in chats |
| **No audit trail** | Decisions untraceable; compliance risk |

---

## Focus Areas Addressed

| # | Focus Area | Status |
|---|---|---|
| 01 | Integrated Operations System | ✅ Full lot lifecycle, RBAC, shift management, audit log |
| 02 | AI for Fruit & Raw-Material QC | ✅ YOLOv11 real-time detection, auto-grading, auto-approval |
| 03 | AI for Extract & Powder QC | 🔶 Partially — same freshness/defect model, powder QC roadmap |
| 04 | AI-Assisted Warehousing & Cold-Chain | 🗺️ Future roadmap |

---

## What AromVision Does

AromVision is a **three-role, end-to-end QC operations platform** that connects the inspection line directly to management review — replacing manual checks and spreadsheets with one integrated, audit-ready system.

```
Webcam / Camera
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│                 AromVision QC Platform  (Next.js 15)            │
│                                                                 │
│  ┌──────────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │   Operator Role  │  │  Manager Role  │  │   Admin Role   │  │
│  │                  │  │                │  │                │  │
│  │ • Create Lot     │  │ • Review Queue │  │ • User RBAC    │  │
│  │ • Live Camera QC │  │ • AI Decision  │  │ • Thresholds   │  │
│  │ • Simulation     │  │ • Override     │  │ • Audit Log    │  │
│  │ • Shift Select   │  │ • Reports      │  │ • Cron/Alerts  │  │
│  └────────┬─────────┘  └──────┬─────────┘  └──────┬─────────┘  │
│           └──────────────────┬┘──────────────────-┘            │
│                              │  Next.js API Routes              │
│           ┌──────────────────┼──────────────┐                  │
│           ▼                  ▼              ▼                  │
│  ┌──────────────┐   ┌──────────────┐  ┌──────────────────┐    │
│  │   Supabase   │   │   YOLOv11    │  │   Nodemailer     │    │
│  │ PostgreSQL   │   │   FastAPI    │  │ Email + In-app   │    │
│  │ Auth + RLS   │   │  (Railway)   │  │  Notifications   │    │
│  └──────────────┘   └──────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 🤖 AI Quality Control (Focus Area 02)
- **YOLOv11 trained model** — Fruit Freshness Detection dataset (960 images, 4 classes)
  - `fresh` / `slightly_rotten` / `moderately_rotten` / `severely_rotten`
- **Training results**: mAP50 **98.4%** · Precision **98.4%** · Recall **98.2%**
- **Per-detection output**: rot level %, color category, defect count, defect severity, anomaly score
- **13 fruit types** supported: Pisang, Apel, Buah Naga, Delima, Jeruk, Anggur, Lemon, Stroberi, Leci, Blackberry, Bilberry, Buah Nangka, Nanas

### 🎥 Dual Inspection Mode
| Mode | Description | YOLO Required |
|---|---|---|
| **Simulation** | Probabilistic mock detection, always available for demo | No |
| **Inspection** | Real-time YOLOv11 via webcam, confidence threshold 0.45 | Yes |

Real-time bounding box overlay on canvas, detection every 1.5 seconds, grade shown live per frame.

### ⚡ Auto-Approval Engine
- Batch with `avg_confidence ≥ 95%` **AND** `avg_rot_level ≤ 5%` → **APPROVED** automatically, no manager queue
- Below threshold → enters **MANAGER_REVIEW** with full AI decision rationale
- Every decision recorded with `is_system_decision` flag — fully auditable

### 🔄 Integrated Operations System (Focus Area 01)
- **Lot lifecycle state machine**: `INSPECTION_RUNNING → MANAGER_REVIEW → APPROVED / REJECTED / QUARANTINED / ESCALATED`
- Invalid transitions rejected at API layer — enforced server-side
- Frame pipeline: every detection stored to DB, aggregated automatically on session complete
- Shift management: Pagi / Siang / Malam — operators and managers linked per shift

### 🏢 Enterprise Readiness (30% judging weight)

| Control | Implementation |
|---|---|
| **RBAC** | Dual-layer: Next.js middleware + Supabase Row-Level Security |
| **Immutable audit log** | Postgres trigger blocks UPDATE & DELETE on `audit_logs` table |
| **Authentication** | Supabase Auth (JWT, 8h expiry), session-bound |
| **Login rate limiting** | 5 failed attempts → 15-minute lockout |
| **Input validation** | Zod schema on every API route |
| **Data isolation** | RLS: Operators only see their own lots |
| **Notifications** | In-app + email (nodemailer) per event type |
| **Scheduled reports** | Daily / weekly / monthly cron + CSV export (19 columns) |
| **Deployment** | BuildPad (AWS Amplify) frontend + Railway YOLO service |

---

## What Makes AromVision Different

Most QC hackathon submissions implement one thing — a detection model, or a dashboard, or a workflow tool. AromVision deliberately combines all three:

1. **Genuine trained model, not a placeholder** — YOLOv11 weights trained on real fruit freshness data, deployed as a separate microservice on Railway with async loading so the platform is always available even if the AI service is starting up.

2. **Dual-mode inspection solves the demo problem** — Simulation mode lets a judge or operator run a full inspection without a physical camera or Wi-Fi access to the YOLO service. This is how enterprise software should work: graceful degradation, not hard dependency.

3. **Rule-based auto-approval removes the manual bottleneck** — Sima Arome's core pain point is throughput. Clear batches skip the manager queue entirely; ambiguous ones escalate with AI rationale. The threshold is configurable by admin.

4. **Audit trail at the database layer** — The `audit_logs` immutability is enforced by a Postgres trigger (not just application-level logic), which is what makes it legally defensible for QC compliance.

5. **Three-role architecture mirrors Sima Arome's actual org structure** — Operator (inspection), Manager (review & approval), Admin (system configuration). Not a generic admin panel.

6. **Deployed on BuildPad** — Frontend runs on AWS Amplify via BuildPad, YOLO service on Railway. Full production deployment, not localhost.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS |
| Backend | Next.js API Routes, Zod validation |
| Database | Supabase (PostgreSQL 15, Auth, Row-Level Security) |
| AI Inference | YOLOv11 (Ultralytics 8.3), FastAPI, OpenCV (headless) |
| AI Deployment | Railway (Dockerfile, CPU-only PyTorch) |
| Charts | Custom SVG (donut + bezier trend lines) |
| Notifications | Nodemailer (SMTP email) + in-app |
| Scheduling | node-cron (daily/weekly/monthly reports) |

---

### Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@aromai.demo | AromAI2026! |
| Manager | manager@aromai.demo | AromAI2026! |
| Operator | operator@aromai.demo | AromAI2026! |

---

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.12+ (for local YOLO service)
- Supabase project (free tier works)

### 1. Clone & install
```bash
git clone https://github.com/RafiAchmadN/AromVisionQCPlatform.git
cd AromVisionQCPlatform
npm install
```

### 2. Environment variables
```bash
cp .env.local.example .env.local
# Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# Optional: YOLO_SERVICE_URL (defaults to Railway production URL)
```

### 3. Database setup
Run in Supabase SQL Editor (in order):
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

### 5. Run (without YOLO — Simulation Mode)
```bash
npm run dev
# Login as operator → create lot → start camera → select Simulation mode
```

---

## YOLO Service

### Local development
```bash
cd yolo_service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Trained model already at models/best.pt (mAP50 98.4%)
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Production (Railway)
1. Open [railway.app](https://railway.app) → **New Service** → **GitHub Repo**
2. Set **Root Directory = `yolo_service`**
3. Railway auto-detects `Dockerfile` and builds the Python service
4. Copy Railway URL → set `YOLO_SERVICE_URL` in Amplify/BuildPad env vars

---

## QC Pipeline Flow

```
Operator creates Lot
        │
        ▼
Camera captures frame every 1.5 seconds
        │
        ├─── Simulation Mode: mockDetection() (probabilistic)
        └─── Inspection Mode: POST → YOLO FastAPI /detect
                     │
                     ▼
        POST /api/inspection/frames (session auth)
        → frame_data stored in Supabase
                     │
                     ▼
        Operator clicks "Complete Inspection"
                     │
                     ▼
        completeSession() — aggregates all frames:
        avg_confidence, avg_rot_level, avg_anomaly_score,
        grade (A/B/C/Reject), pass/fail count, defect map
                     │
             ┌───────┴────────┐
             ▼                ▼
   confidence ≥ 95%     below threshold
   & rot_level ≤ 5%
             │                │
             ▼                ▼
         APPROVED        MANAGER_REVIEW
      (automatic)     Manager decides:
                  Approve / Reject / Quarantine / Escalate
```

---

## Security Architecture

| Layer | Control |
|---|---|
| Transport | HTTPS enforced by Amplify/BuildPad |
| Authentication | Supabase Auth (JWT, 8-hour expiry) |
| Authorization | Role-based middleware blocks access per role |
| Data isolation | RLS: Operators only see their own lots |
| Audit trail | `audit_logs` immutable — Postgres trigger blocks UPDATE & DELETE |
| Login protection | Rate limit: 5 attempts / 15 minutes → lockout |
| Input sanitization | Zod schema validation on all API routes |

---

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── admin/          ← Dashboard, user management, config, audit, reports
│   │   ├── manager/        ← Lot review queue + decision panel + reports
│   │   ├── operator/       ← Camera QC workspace + lot creation
│   │   └── api/            ← Auth, lots, inspection, decisions, reports, cron
│   ├── components/
│   │   ├── admin/          ← Overview, sidebar, config module (cron + notifications)
│   │   ├── manager/
│   │   ├── operator/       ← CameraPanel (Simulation/Inspection) + LotPanel
│   │   └── shared/         ← Topbar, NotificationBell, ErrorBoundary
│   └── lib/
│       ├── inspection-hooks.ts  ← Session completion + auto-approval engine
│       ├── auto-decision.ts     ← Rule-based QC decision logic
│       ├── state-machine.ts     ← Lot status transition enforcement
│       ├── audit.ts             ← Immutable audit log writer
│       ├── notifications.ts     ← Multi-channel notification dispatcher
│       └── cron-jobs.ts         ← Scheduled report generation
├── yolo_service/
│   ├── main.py             ← FastAPI inference server (async model loading)
│   ├── train.py            ← YOLOv11 training script
│   ├── class_map.py        ← YOLO class → platform domain mapping
│   ├── models/best.pt      ← Trained weights (mAP50 98.4%)
│   ├── Dockerfile          ← CPU-only PyTorch for Railway
│   └── railway.toml        ← Railway deployment config
└── supabase/
    └── migrations/
        ├── 001_initial_schema.sql
        └── 002_rls_policies.sql
```

---

## Team

**Team Berkakang Fighter** · CyberHack 2026 · ITS Surabaya

| Name | Role |
|---|---|
| Ainur Rizza | AI/ML Engineer — YOLOv11 training, FastAPI inference service |
| Rafi Achmad Nabihan | Full Stack Developer — Next.js platform, API, database |
| Medika Alfian | UI/UX Designer — interface design, user flows |

---

*Built at CyberHack 2026 · Powered by BuildPad & Hackpad · ITS Surabaya*
