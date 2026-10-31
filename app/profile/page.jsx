'use client';
import { useState, useEffect, useRef } from 'react';

const STATUS_LABELS = {
  mahasiswa:  'Mahasiswa',
  karyawan:   'Karyawan',
  wirausaha:  'Wirausaha',
  freelancer: 'Freelancer',
  lainnya:    'Lainnya',
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }));

export default function ProfilePage() {
  const [user,    setUser]    = useState(null);
  const [form,    setForm]    = useState({});
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState('');
  const [error,   setError]   = useState('');
  const avatarRef = useRef(null);

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) { setUser(d); setForm(d); }
      });
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg(''); setError('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          origin:    form.origin,
          status:    form.status,
          address:   form.address,
          bio:       form.bio,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      setUser((u) => ({ ...u, ...form }));
      setEditing(false);
      setMsg('Profil berhasil disimpan!');
    } catch {
      setError('Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    setSaving(true); setMsg(''); setError('');
    try {
      const res  = await fetch('/api/profile', { method: 'PUT', body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setUser((u) => ({ ...u, avatar_base64: data.avatar_base64 }));
      setForm((f) => ({ ...f, avatar_base64: data.avatar_base64 }));
      setMsg('Foto profil diperbarui!');
    } catch {
      setError('Gagal upload foto.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const initials = (user.full_name || user.username || '?')
    .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">Profil</h1>

      {/* Avatar */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 mb-5">
        <div className="flex items-center gap-5">
          {/* Avatar display */}
          <div
            className="relative w-20 h-20 rounded-full overflow-hidden flex-shrink-0 cursor-pointer group"
            onClick={() => avatarRef.current?.click()}
          >
            {user.avatar_base64 ? (
              <img
                src={user.avatar_base64}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                {initials}
              </div>
            )}
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium">Ganti</span>
            </div>
          </div>

          <input
            ref={avatarRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />

          <div>
            <p className="text-lg font-bold text-zinc-900 dark:text-white">
              {user.full_name || user.username}
            </p>
            <p className="text-zinc-400 text-sm">@{user.username}</p>
            {user.status && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full border border-blue-200 dark:border-blue-800">
                {STATUS_LABELS[user.status] ?? user.status}
              </span>
            )}
            <p className="text-zinc-400 text-xs mt-1">Klik foto untuk mengganti</p>
          </div>
        </div>
      </div>

      {/* Feedback messages */}
      {msg && (
        <div className="mb-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
          <p className="text-blue-700 dark:text-blue-300 text-sm">✓ {msg}</p>
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3">
          <p className="text-red-600 dark:text-red-400 text-sm">⚠️ {error}</p>
        </div>
      )}

      {/* Info card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Informasi Profil</p>
          {!editing && (
            <button
              onClick={() => { setEditing(true); setMsg(''); setError(''); }}
              className="text-sm px-3 py-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors font-medium"
            >
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <FormField label="Nama Lengkap" value={form.full_name ?? ''} onChange={set('full_name')} placeholder="Nama kamu" />
            <FormField label="Asal" value={form.origin ?? ''} onChange={set('origin')} placeholder="Kota / Kampus" />

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Status</label>
              <select
                value={form.status ?? ''}
                onChange={set('status')}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              >
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <FormField label="Alamat" value={form.address ?? ''} onChange={set('address')} placeholder="Alamat kamu" />
            <FormField label="Bio" value={form.bio ?? ''} onChange={set('bio')} placeholder="Ceritain sedikit tentang kamu" textarea />

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-all text-sm"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setForm(user); setError(''); }}
                className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-xl transition-all text-sm"
              >
                Batal
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <InfoRow label="Username"    value={`@${user.username}`} />
            <InfoRow label="Nama Lengkap" value={user.full_name}   />
            <InfoRow label="Asal"         value={user.origin}       />
            <InfoRow label="Status"       value={STATUS_LABELS[user.status] ?? user.status} />
            <InfoRow label="Alamat"       value={user.address}      />
            <InfoRow label="Bio"          value={user.bio}          />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── helpers ─────────────────────────────────────────────────────── */

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-4">
      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide sm:w-28 flex-shrink-0">{label}</span>
      <span className="text-sm text-zinc-900 dark:text-white">{value || <span className="text-zinc-300 dark:text-zinc-600 italic">Belum diisi</span>}</span>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, textarea }) {
  const cls = 'w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-300 dark:placeholder:text-zinc-600';
  return (
    <label className="block">
      <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{label}</span>
      {textarea
        ? <textarea value={value} onChange={onChange} placeholder={placeholder} rows={3} className={cls} />
        : <input type="text" value={value} onChange={onChange} placeholder={placeholder} className={cls} />
      }
    </label>
  );
}
