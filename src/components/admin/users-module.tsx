'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/contexts/language-context';
import { Trash2 } from 'lucide-react';
import type { User } from '@/lib/types';

const TABS = ['Operator', 'Manager', 'Shift'] as const;
type Tab = typeof TABS[number];

const ROLE_OPTIONS = [{ value: 'Operator', label: 'Operator' }, { value: 'Manager', label: 'Manager' }, { value: 'Admin', label: 'Admin' }];
const SHIFT_OPTIONS = [{ value: 'Pagi', label: 'Pagi' }, { value: 'Siang', label: 'Siang' }, { value: 'Malam', label: 'Malam' }];

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
function DeleteModal({
  user,
  lang,
  onConfirm,
  onCancel,
  loading,
  error,
}: {
  user: User;
  lang: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  error: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-red-100 bg-red-50">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-red-800">
              {lang === 'en' ? 'Delete Account' : 'Hapus Akun'}
            </h3>
            <p className="text-xs text-red-600 mt-0.5">
              {lang === 'en' ? 'This action cannot be undone' : 'Tindakan ini tidak bisa dibatalkan'}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* User info */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email} · {user.role}</p>
            </div>
          </div>

          {/* Warning text */}
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              {lang === 'en'
                ? 'Deleting this account will permanently:'
                : 'Menghapus akun ini secara permanen akan:'}
            </p>
            <ul className="list-none space-y-1.5">
              {(lang === 'en' ? [
                '✗ Remove all login access for this user',
                '✗ Delete account from the system',
                '✓ Lots and inspection history are kept',
                '✓ Action recorded in audit log',
              ] : [
                '✗ Menghapus semua akses login pengguna ini',
                '✗ Menghapus akun dari sistem secara permanen',
                '✓ Lot dan riwayat inspeksi tetap tersimpan',
                '✓ Tindakan tercatat di audit log',
              ]).map((item) => (
                <li key={item} className={`flex items-start gap-2 text-xs ${item.startsWith('✗') ? 'text-red-600' : 'text-gray-500'}`}>
                  <span className="shrink-0">{item.charAt(0)}</span>
                  <span>{item.slice(2)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Note: only possible if no lots */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            {lang === 'en'
              ? '⚠ If this user has active lots, deletion will be blocked. Use Deactivate instead.'
              : '⚠ Jika user memiliki lot aktif, penghapusan akan ditolak. Gunakan Nonaktifkan sebagai gantinya.'}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-6 pb-6">
          <Button
            variant="destructive"
            onClick={onConfirm}
            loading={loading}
            className="flex-1"
          >
            {lang === 'en' ? 'Yes, Delete Account' : 'Ya, Hapus Akun'}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="flex-1"
          >
            {lang === 'en' ? 'Cancel' : 'Batal'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function AdminUsersModule() {
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState<Tab>('Operator');
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Operator', shift: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => { fetchUsers(); }, [tab]);

  async function fetchUsers() {
    const role = tab === 'Shift' ? undefined : tab;
    const params = role ? `?role=${role}` : '';
    const res = await fetch(`/api/users${params}`);
    if (res.ok) { const d = await res.json(); setUsers(d.data ?? []); }
  }

  async function createUser() {
    setSaving(true); setMsg('');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, shift: form.shift || undefined }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) { setMsg(lang === 'en' ? 'User created successfully' : 'User berhasil dibuat'); setShowForm(false); fetchUsers(); }
    else setMsg(data.message ?? (lang === 'en' ? 'Failed to create user' : 'Gagal membuat user'));
  }

  async function deactivate(id: string) {
    await fetch(`/api/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'INACTIVE' }) });
    fetchUsers();
  }

  async function activate(id: string) {
    await fetch(`/api/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'ACTIVE' }) });
    fetchUsers();
  }

  async function deleteUser() {
    if (!deleteTarget) return;
    setDeleting(true); setDeleteError('');
    const res = await fetch(`/api/users/${deleteTarget.id}`, { method: 'DELETE' });
    const data = await res.json();
    setDeleting(false);
    if (res.ok) {
      setDeleteTarget(null);
      setMsg(lang === 'en' ? `Account "${deleteTarget.name}" deleted` : `Akun "${deleteTarget.name}" dihapus`);
      fetchUsers();
    } else {
      setDeleteError(data.message ?? (lang === 'en' ? 'Failed to delete user' : 'Gagal menghapus user'));
    }
  }

  return (
    <>
      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          lang={lang}
          onConfirm={deleteUser}
          onCancel={() => { setDeleteTarget(null); setDeleteError(''); }}
          loading={deleting}
          error={deleteError}
        />
      )}

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">{lang === 'en' ? 'User Management' : 'Manajemen Pengguna'}</h1>
          <Button size="sm" onClick={() => setShowForm(true)}>{lang === 'en' ? '+ Add User' : '+ Tambah User'}</Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {TABS.map((tabName) => (
            <button
              key={tabName}
              onClick={() => setTab(tabName)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === tabName ? 'border-brand-500 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {tabName === 'Shift' ? (lang === 'en' ? 'Shift' : 'Shift') : tabName}
            </button>
          ))}
        </div>

        {msg && (
          <p className={`text-sm ${msg.includes('dihapus') || msg.includes('deleted') ? 'text-red-600' : 'text-green-600'}`}>
            {msg}
          </p>
        )}

        {showForm && (
          <Card>
            <CardHeader><CardTitle className="text-sm">{lang === 'en' ? 'Add New User' : 'Tambah User Baru'}</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label={t('common.name')} value={form.name} onChange={(e) => setForm(p => ({...p, name: e.target.value}))} required />
                <Input label={t('common.email')} type="email" value={form.email} onChange={(e) => setForm(p => ({...p, email: e.target.value}))} required />
                <Input label="Password" type="password" value={form.password} onChange={(e) => setForm(p => ({...p, password: e.target.value}))} required />
                <Select label={t('common.role')} options={ROLE_OPTIONS} value={form.role} onChange={(e) => setForm(p => ({...p, role: e.target.value}))} />
                <Select label={t('lot.shift')} options={SHIFT_OPTIONS} value={form.shift} onChange={(e) => setForm(p => ({...p, shift: e.target.value}))} placeholder={lang === 'en' ? 'Select shift...' : 'Pilih shift...'} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={createUser} loading={saving}>{t('common.save')}</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('common.email')}</TableHead>
                <TableHead>{t('common.role')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('lot.shift')}</TableHead>
                <TableHead>{lang === 'en' ? 'Joined' : 'Bergabung'}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-sm">{u.name}</TableCell>
                  <TableCell className="text-xs text-gray-500">{u.email}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{u.role}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={u.status === 'ACTIVE' ? 'success' : u.status === 'INACTIVE' ? 'destructive' : 'warning'} className="text-xs">
                      {u.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{u.shift ?? '-'}</TableCell>
                  <TableCell className="text-xs">{new Date(u.created_at).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {u.status === 'ACTIVE' ? (
                        <Button size="sm" variant="destructive" onClick={() => deactivate(u.id)} className="text-xs h-7 px-2">
                          {lang === 'en' ? 'Deactivate' : 'Nonaktifkan'}
                        </Button>
                      ) : (
                        <Button size="sm" variant="default" onClick={() => activate(u.id)} className="text-xs h-7 px-2">
                          {u.status === 'PENDING_ACTIVATION' ? (lang === 'en' ? 'Activate' : 'Aktivasi') : (lang === 'en' ? 'Enable' : 'Aktifkan')}
                        </Button>
                      )}
                      {/* Delete button — shown for non-active users or as secondary option */}
                      <button
                        type="button"
                        title={lang === 'en' ? 'Delete account permanently' : 'Hapus akun secara permanen'}
                        onClick={() => { setDeleteTarget(u); setDeleteError(''); }}
                        className="h-7 w-7 flex items-center justify-center rounded border border-red-200 text-red-400 hover:text-red-600 hover:bg-red-50 hover:border-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8">{t('common.noData')}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </>
  );
}
