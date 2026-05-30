# AromAI QC Platform

**AI-powered Quality Control platform for Sima Arome's raw material and extract manufacturing pipeline.**

Built for [CyberHack 2026](https://cyberhack.id) · Co-organised with UKM Cyber Security ITS · Sponsored by Xtremax, AWS, BuildPad

---

## The Problem

Sima Arome — Indonesia's natural extract manufacturer — faces three compounding bottlenecks:

| Pain Point | Impact |
|---|---|
| Manual QC by trained eyes | Throughput halts when QC staff are unavailable |
| Double data entry across notebooks, spreadsheets, and apps | Errors, rework, and blame loops |
| No system of record | PPIC schedules, lot histories, and QC decisions live in people's heads |

---

## What AromAI Does

AromAI is a **unified QC operations platform** that connects the inspection line directly to management review — replacing manual eyeballing and scattered spreadsheets with a single, auditable system.

```
Webcam / Camera
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│               AromAI QC Platform  (Next.js 15)              │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Operator   │  │   Manager    │  │      Admin       │  │
│  │  Dashboard   │  │  Dashboard   │  │      Panel       │  │
│  │              │  │              │  │                  │  │
│  │ • Camera QC  │  │ • Lot Queue  │  │ • User RBAC      │  │
│  │ • Live YOLO  │  │ • AI Decision│  │ • Threshold Cfg  │  │
│  │ • Lot Create │  │ • Override   │  │ • Audit Viewer   │  │
│  │ • Shift Info │  │ • Escalation │  │ • Report Export  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         └────────────────┬┘──────────────────-┘            │
│                          │  Next.js API Routes              │
│         ┌────────────────┼──────────────┐                   │
│         ▼                ▼              ▼                   │
│  ┌─────────────┐  ┌────────────┐  ┌──────────────┐         │
│  │  Supabase   │  │  YOLOv11   │  │  Nodemailer  │         │
│  │ PostgreSQL  │  │  FastAPI   │  │    Email      │         │
│  │  Auth + RLS │  │  Port 8000 │  │ Notifications │         │
│  └─────────────┘  └────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Features

### AI Quality Control (Focus Area 02)
- **Real-time YOLO v11 inference** — webcam frame → FastAPI → bounding box overlays in < 100ms
- **Per-object metrics**: rot level (0–100%), colour category, defect count, defect severity, anomaly score
- **Graceful fallback**: mock detection mode when AI service is offline (demo always works)
- **Model-agnostic**: swap the `.pt` model file to target extract powder, botanical inputs, or any visual QC domain

### Integrated Operations System (Focus Area 01)
- **Lot lifecycle management**: `INSPECTION_RUNNING → MANAGER_REVIEW → APPROVED / REJECTED / QUARANTINED / ESCALATED`
- **State machine enforcement**: invalid transitions are rejected at the API layer
- **Auto-decision engine**: configurable rule evaluation (confidence threshold, rot level, anomaly score) per product type and grade (A / B / C / Reject)
- **Manager override**: full override with mandatory reason, recorded in audit trail
- **Shift management**: operators and managers linked by shift (Pagi / Siang / Malam)

### Enterprise Readiness
- **RBAC** enforced at two layers: Next.js middleware (route-level) + Supabase RLS policies (database-level)
- **Immutable audit logs**: Postgres trigger blocks `UPDATE` and `DELETE` on `audit_logs` — tamper-proof compliance trail
- **Notification system**: in-app bell + email (nodemailer) per event type, configurable per role
- **Automated reports**: daily, weekly, and monthly cron jobs with CSV export
- **Configurable thresholds**: per-product-type grading rules stored in DB, editable by Admin without code changes
- **Rate-limited authentication**: brute-force protection with lockout

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS |
| Backend | Next.js API Routes, Zod validation |
| Database | Supabase (PostgreSQL 15, Auth, RLS) |
| AI Inference | YOLOv11 (Ultralytics), FastAPI, OpenCV |
| Notifications | Nodemailer (email), in-app real-time |
| Scheduling | node-cron (server-side cron jobs) |
| Charts | Recharts |
| Testing | Vitest + fast-check (property tests), Playwright (E2E) |

---

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.10+
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Clone & install

```bash
git clone https://github.com/RafiAchmadN/TestHackathon.git aromai-qc
cd aromai-qc
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
# Fill in your Supabase URL, anon key, and service role key
```

### 3. Apply database migrations

Run in the Supabase SQL editor (Dashboard → SQL Editor):

```
supabase/migrations/001_initial_schema.sql   ← schema + enums + indexes + seed config
supabase/migrations/002_rls_policies.sql     ← Row Level Security policies
```

### 4. Seed demo data

```bash
# With Next.js running (npm run dev), POST to the seed endpoint:
curl -X POST http://localhost:3000/api/setup/seed \
  -H "Content-Type: application/json" \
  -d '{"token": "aromai-demo-seed"}'
```

This creates three demo accounts and five sample lots covering every status in the lot lifecycle.

### 5. Demo credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@aromai.demo | AromAI2026! |
| Manager | manager@aromai.demo | AromAI2026! |
| Operator | operator@aromai.demo | AromAI2026! |

### 6. Start the AI service (optional — real YOLO inference)

```bash
# Terminal 1 — one-time model training (~15 min)
npm run yolo:setup
npm run yolo:train

# Terminal 2 — inference server
npm run yolo:start

# Terminal 3 — Next.js
npm run dev
```

The platform automatically detects whether the YOLO service is online and falls back to mock mode if not — **the demo works without training the model**.

### 7. Start without AI (fastest for demo)

```bash
npm run dev
# Log in as operator@aromai.demo → start a live inspection → mock detections activate automatically
```

---

## How the QC Pipeline Works

```
Operator creates a Lot
        │
        ▼
Camera captures frames every 500ms
        │
        ▼
Frame → base64 JPEG → /api/yolo/detect → FastAPI /detect → YOLOv11
        │
        ▼
Result: object_class, confidence, rot_level, color_category,
        defect_count, defect_severity, anomaly_score, bbox
        │
        ▼
Frame data stored → InspectionReport aggregated on session close
        │
        ▼
Auto-decision engine evaluates rules:
  • avg_confidence >= confidence_min
  • final_anomaly_score < quarantine_threshold
  • grade-specific rot and defect thresholds
        │
        ▼
Lot → MANAGER_REVIEW
        │
        ▼
Manager: Approve / Reject / Quarantine / Escalate
(every decision + override reason → audit_logs, immutable)
```

---

## Security Architecture

| Layer | Control |
|---|---|
| Transport | HTTPS (enforced by deployment platform) |
| Authentication | Supabase Auth (JWT, 8-hour sessions) |
| Authorisation | Role-based: middleware blocks route access by role |
| Data isolation | Supabase RLS: Operators see only their lots; Managers see all; Admins manage all |
| Audit trail | Immutable `audit_logs` table (Postgres trigger prevents UPDATE/DELETE) |
| Login protection | 5-attempt rate limit per 15-minute window with automatic lockout |
| Input validation | Zod schemas on every API route |

---

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── admin/          ← Admin pages (dashboard, users, config, audit, reports)
│   │   ├── manager/        ← Manager dashboard (lot queue + decision panel)
│   │   ├── operator/       ← Operator dashboard (camera QC + lot creation)
│   │   └── api/            ← API routes (auth, lots, inspection, decisions, reports…)
│   ├── components/
│   │   ├── admin/
│   │   ├── manager/
│   │   ├── operator/       ← Camera panel + lot panel
│   │   └── shared/         ← Topbar, notification bell, error boundary
│   └── lib/
│       ├── auto-decision.ts   ← Rule-based QC decision engine
│       ├── state-machine.ts   ← Lot status transition enforcement
│       ├── audit.ts           ← Immutable audit log writer
│       ├── notifications.ts   ← Multi-channel notification dispatcher
│       └── cron-jobs.ts       ← Scheduled report jobs
├── yolo_service/
│   ├── main.py             ← FastAPI inference server
│   ├── train.py            ← YOLOv11 training script
│   ├── class_map.py        ← YOLO class → platform domain mapping
│   └── SETUP.md            ← AI service setup guide
└── supabase/
    └── migrations/
        ├── 001_initial_schema.sql   ← Full schema + indexes + seeded defaults
        └── 002_rls_policies.sql     ← Row Level Security (defense-in-depth)
```

---

## Live Demo

**[https://main.d1g00ngd7p9e7u.amplifyapp.com](https://main.d1g00ngd7p9e7u.amplifyapp.com)**

> Deployed on BuildPad (AWS Amplify) · Use demo credentials above

---

## The Team

**Team Berkakang Fighter** · CyberHack 2026

| Name | Role |
|---|---|
| Ainur Rizza | [Role] |
| Rafi Achmad Nabihan | [Role] |
| Medika Alfian | [Role] |

---

*Built at CyberHack 2026, ITS Surabaya · Powered by Hackpad*
