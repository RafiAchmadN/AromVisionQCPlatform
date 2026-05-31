'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/contexts/language-context';
import type { User } from '@/lib/types';

const TABS = ['Operator', 'Manager', 'Shift'] as const;
type Tab = typeof TABS[number];

const ROLE_OPTIONS = [{ value: 'Operator', label: 'Operator' }, { value: 'Manager', label: 'Manager' }, { value: 'Admin', label: 'Admin' }];
const SHIFT_OPTIONS = [{ value: 'Pagi', label: 'Pagi' }, { value: 'Siang', label: 'Siang' }, { value: 'Malam', label: 'Malam' }];

export function AdminUsersModule() {
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState<Tab>('Operator');
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Operator', shift: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

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
    if (res.ok) { setMsg('User berhasil dibuat'); setShowForm(false); fetchUsers(); }
    else setMsg(data.message ?? 'Gagal membuat user');
  }

  async function deactivate(id: string) {
    if (!confirm('Nonaktifkan user ini?')) return;
    await fetch(`/api/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'INACTIVE' }) });
    fetchUsers();
  }

  async function activate(id: string) {
    await fetch(`/api/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'ACTIVE' }) });
    fetchUsers();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{lang === 'en' ? 'User Management' : 'Manajemen Pengguna'}</h1>
        <Button size="sm" onClick={() => setShowForm(true)}>{lang === 'en' ? '+ Add User' : '+ Tambah User'}</Button>
      </div>

      {/* Tabs */}
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

      {msg && <p className="text-sm text-green-600">{msg}</p>}

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
                      <Button size="sm" variant="destructive" onClick={() => deactivate(u.id)} className="text-xs h-7 px-2">{lang === 'en' ? 'Deactivate' : 'Nonaktifkan'}</Button>
                    ) : (
                      <Button size="sm" variant="default" onClick={() => activate(u.id)} className="text-xs h-7 px-2">
                        {u.status === 'PENDING_ACTIVATION' ? (lang === 'en' ? 'Activate' : 'Aktivasi') : (lang === 'en' ? 'Enable' : 'Aktifkan')}
                      </Button>
                    )}
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
  );
}
