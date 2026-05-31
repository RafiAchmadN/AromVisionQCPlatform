'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SystemConfig } from '@/lib/types';

const TABS = ['Threshold', 'Kamera', 'Notifikasi', 'CRON'] as const;
type Tab = typeof TABS[number];

export function AdminConfigModule() {
  const [tab, setTab] = useState<Tab>('Threshold');
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { fetchConfig(); }, []);

  async function fetchConfig() {
    const res = await fetch('/api/config');
    if (res.ok) setConfig(await res.json());
  }

  async function saveConfig(updates: Partial<SystemConfig>) {
    setSaving(true); setMsg('');
    const res = await fetch('/api/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    setSaving(false);
    if (res.ok) { setMsg('Konfigurasi berhasil disimpan'); fetchConfig(); }
    else setMsg('Gagal menyimpan konfigurasi');
  }

  if (!config) return <p className="text-gray-500 text-sm">Memuat konfigurasi...</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-gray-900">Konfigurasi Sistem</h1>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-brand-500 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {msg && <p className={`text-sm ${msg.includes('berhasil') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}

      {tab === 'Threshold' && (
        <ThresholdTab config={config} onSave={saveConfig} saving={saving} />
      )}
      {tab === 'Kamera' && (
        <CameraTab config={config} onSave={saveConfig} saving={saving} />
      )}
      {tab === 'CRON' && (
        <CronTab config={config} saving={saving} />
      )}
      {tab === 'Notifikasi' && (
        <NotifikasiTab config={config} onSave={saveConfig} saving={saving} />
      )}
    </div>
  );
}

function ThresholdTab({ config, onSave, saving }: { config: SystemConfig; onSave: (u: Partial<SystemConfig>) => void; saving: boolean }) {
  const [f, setF] = useState({
    confidence_min: config.confidence_min,
    rot_threshold_a: config.rot_threshold_a,
    rot_threshold_b: config.rot_threshold_b,
    rot_threshold_c: config.rot_threshold_c,
    defect_threshold_a: config.defect_threshold_a,
    defect_threshold_b: config.defect_threshold_b,
    defect_threshold_c: config.defect_threshold_c,
    anomaly_quarantine_threshold: config.anomaly_quarantine_threshold,
    anomaly_escalation_threshold: config.anomaly_escalation_threshold,
    session_max_duration_sec: config.session_max_duration_sec,
    conveyor_stop_detect_sec: config.conveyor_stop_detect_sec,
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Threshold YOLO & Decision Engine</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <Input label="Confidence Min (0–1)" type="number" step="0.01" min={0} max={1} value={f.confidence_min} onChange={(e) => setF(p => ({...p, confidence_min: Number(e.target.value)}))} />
        <Input label="Rot Threshold Grade A (%)" type="number" value={f.rot_threshold_a} onChange={(e) => setF(p => ({...p, rot_threshold_a: Number(e.target.value)}))} />
        <Input label="Rot Threshold Grade B (%)" type="number" value={f.rot_threshold_b} onChange={(e) => setF(p => ({...p, rot_threshold_b: Number(e.target.value)}))} />
        <Input label="Rot Threshold Grade C (%)" type="number" value={f.rot_threshold_c} onChange={(e) => setF(p => ({...p, rot_threshold_c: Number(e.target.value)}))} />
        <Input label="Defect Threshold Grade A" type="number" value={f.defect_threshold_a} onChange={(e) => setF(p => ({...p, defect_threshold_a: Number(e.target.value)}))} />
        <Input label="Defect Threshold Grade B" type="number" value={f.defect_threshold_b} onChange={(e) => setF(p => ({...p, defect_threshold_b: Number(e.target.value)}))} />
        <Input label="Defect Threshold Grade C" type="number" value={f.defect_threshold_c} onChange={(e) => setF(p => ({...p, defect_threshold_c: Number(e.target.value)}))} />
        <Input label="Anomaly Quarantine Threshold" type="number" step="0.01" value={f.anomaly_quarantine_threshold} onChange={(e) => setF(p => ({...p, anomaly_quarantine_threshold: Number(e.target.value)}))} />
        <Input label="Anomaly Escalation Threshold" type="number" step="0.01" value={f.anomaly_escalation_threshold} onChange={(e) => setF(p => ({...p, anomaly_escalation_threshold: Number(e.target.value)}))} />
        <Input label="Durasi Maks Sesi (detik)" type="number" value={f.session_max_duration_sec} onChange={(e) => setF(p => ({...p, session_max_duration_sec: Number(e.target.value)}))} />
        <Input label="Conveyor Stop Detect (detik)" type="number" value={f.conveyor_stop_detect_sec} onChange={(e) => setF(p => ({...p, conveyor_stop_detect_sec: Number(e.target.value)}))} />
        <div className="col-span-2">
          <Button onClick={() => onSave(f)} loading={saving}>Simpan Threshold</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CameraTab({ config, onSave, saving }: { config: SystemConfig; onSave: (u: Partial<SystemConfig>) => void; saving: boolean }) {
  const [f, setF] = useState({ camera_url: config.camera_url, camera_resolution: config.camera_resolution, camera_fps: config.camera_fps });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');

  async function testConnection() {
    setTesting(true);
    const res = await fetch('/api/camera/status');
    setTestResult(res.ok ? 'Koneksi berhasil' : 'Koneksi gagal');
    setTesting(false);
  }

  async function restart() {
    await fetch('/api/camera/restart', { method: 'POST' });
    alert('Camera Service direstart');
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Konfigurasi Kamera</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Input label="URL Stream Kamera" value={f.camera_url} onChange={(e) => setF(p => ({...p, camera_url: e.target.value}))} />
        <Input label="Resolusi" value={f.camera_resolution} onChange={(e) => setF(p => ({...p, camera_resolution: e.target.value}))} placeholder="1920x1080" />
        <Input label="Frame Rate (FPS)" type="number" value={f.camera_fps} onChange={(e) => setF(p => ({...p, camera_fps: Number(e.target.value)}))} />
        {testResult && <p className={`text-sm ${testResult.includes('berhasil') ? 'text-green-600' : 'text-red-600'}`}>{testResult}</p>}
        <div className="flex gap-2">
          <Button onClick={() => onSave(f)} loading={saving}>Simpan</Button>
          <Button variant="outline" onClick={testConnection} loading={testing}>Test Koneksi</Button>
          <Button variant="destructive" onClick={restart}>Restart Camera Service</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CronTab({ config, saving: _saving }: { config: SystemConfig; saving: boolean }) {
  const cc = config.cron_config ?? {};
  const [schedules, setSchedules] = useState({
    metrics_refresh_cron:     cc.metrics_refresh_cron     ?? '0 * * * *',
    daily_report_cron:        cc.daily_report_cron        ?? '0 0 * * *',
    archive_frame_data_cron:  cc.archive_frame_data_cron  ?? '0 0 * * *',
    weekly_report_cron:       cc.weekly_report_cron       ?? '0 0 * * 1',
    monthly_report_cron:      cc.monthly_report_cron      ?? '0 0 1 * *',
  });
  const [triggering, setTriggering] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function triggerJob(job: string) {
    setTriggering(job);
    await fetch(`/api/cron/${job}/trigger`, { method: 'POST' });
    setTriggering(null);
  }

  async function saveCron() {
    setSaving(true); setMsg('');
    const res = await fetch('/api/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cron_config: { ...cc, ...schedules } }),
    });
    setSaving(false);
    setMsg(res.ok ? 'Jadwal CRON berhasil disimpan' : 'Gagal menyimpan');
  }

  const jobs: { id: string; label: string; field: keyof typeof schedules; desc: string }[] = [
    { id: 'metrics-refresh',    label: 'Rekap Metrics',    field: 'metrics_refresh_cron',    desc: 'Refresh statistik dashboard' },
    { id: 'daily-report',       label: 'Laporan Harian',   field: 'daily_report_cron',        desc: 'Generate laporan harian otomatis' },
    { id: 'archive-frame-data', label: 'Arsip Frame Data', field: 'archive_frame_data_cron',  desc: 'Arsipkan data frame lama' },
    { id: 'weekly-report',      label: 'Laporan Mingguan', field: 'weekly_report_cron',       desc: 'Generate laporan mingguan' },
    { id: 'monthly-report',     label: 'Laporan Bulanan',  field: 'monthly_report_cron',      desc: 'Generate laporan bulanan' },
  ];

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Konfigurasi CRON Jobs</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="text-xs text-gray-400 mb-3">Format: menit jam hari-bulan bulan hari-minggu (contoh: <span className="font-mono">0 8 * * *</span> = setiap hari jam 08:00)</p>
        <div className="divide-y divide-gray-100">
          {jobs.map((job) => (
            <div key={job.id} className="flex items-center gap-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{job.label}</p>
                <p className="text-xs text-gray-400">{job.desc}</p>
              </div>
              <input
                type="text"
                value={schedules[job.field]}
                onChange={(e) => setSchedules((p) => ({ ...p, [job.field]: e.target.value }))}
                className="w-36 rounded-md border border-gray-200 px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                placeholder="* * * * *"
              />
              <Button size="sm" variant="outline" onClick={() => triggerJob(job.id)} loading={triggering === job.id}>
                Trigger
              </Button>
            </div>
          ))}
        </div>
        {msg && <p className={`text-xs mt-1 ${msg.includes('berhasil') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}
        <div className="pt-3">
          <Button onClick={saveCron} loading={saving}>Simpan Jadwal</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NotifikasiTab({ config, onSave, saving }: { config: SystemConfig; onSave: (u: Partial<SystemConfig>) => void; saving: boolean }) {
  const nc = config.notification_config ?? {};
  const events = [
    { key: 'LOT_APPROVED',           label: 'Lot Disetujui' },
    { key: 'LOT_REJECTED',           label: 'Lot Ditolak' },
    { key: 'LOT_QUARANTINED',        label: 'Lot Dikarantina' },
    { key: 'LOT_ESCALATED',          label: 'Lot Dieskalasi' },
    { key: 'SESSION_COMPLETE',       label: 'Sesi Inspeksi Selesai' },
    { key: 'CRITICAL_QUALITY_ALERT', label: 'Alert Kualitas Kritis' },
    { key: 'SYSTEM_ALERT',           label: 'Alert Sistem' },
  ];

  const initSettings = () => Object.fromEntries(
    events.map(({ key }) => {
      const v = nc[key];
      const s = (v && typeof v === 'object' && !Array.isArray(v))
        ? (v as { in_app: boolean; email: boolean; push: boolean })
        : { in_app: true, email: false, push: false };
      return [key, s];
    })
  );

  const [settings, setSettings] = useState<Record<string, { in_app: boolean; email: boolean; push: boolean }>>(initSettings);
  const [recipients, setRecipients] = useState<string>(
    Array.isArray(nc.report_recipients) ? nc.report_recipients.join(', ') : ''
  );

  function toggle(event: string, channel: 'in_app' | 'email' | 'push') {
    setSettings((p) => ({ ...p, [event]: { ...p[event], [channel]: !p[event][channel] } }));
  }

  function save() {
    const recipientList = recipients.split(',').map((s) => s.trim()).filter(Boolean);
    onSave({ notification_config: { ...settings, report_recipients: recipientList } as SystemConfig['notification_config'] });
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Konfigurasi Notifikasi</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Event toggles */}
        <div>
          <div className="grid grid-cols-[1fr_64px_64px_64px] gap-x-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
            <span>Event</span><span className="text-center">In-App</span><span className="text-center">Email</span><span className="text-center">Push</span>
          </div>
          <div className="divide-y divide-gray-100">
            {events.map(({ key, label }) => (
              <div key={key} className="grid grid-cols-[1fr_64px_64px_64px] gap-x-3 items-center py-2.5 px-1">
                <span className="text-sm text-gray-700">{label}</span>
                {(['in_app', 'email', 'push'] as const).map((ch) => (
                  <div key={ch} className="flex justify-center">
                    <button
                      type="button"
                      title={`Toggle ${ch} untuk ${label}`}
                      onClick={() => toggle(key, ch)}
                      className={`w-9 h-5 rounded-full transition-colors relative ${settings[key]?.[ch] ? 'bg-brand-500' : 'bg-gray-200'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${settings[key]?.[ch] ? 'left-4' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Report recipients */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Penerima Laporan (pisahkan dengan koma)</label>
          <input
            type="text"
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder="email1@domain.com, email2@domain.com"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <Button onClick={save} loading={saving}>Simpan Notifikasi</Button>
      </CardContent>
    </Card>
  );
}
