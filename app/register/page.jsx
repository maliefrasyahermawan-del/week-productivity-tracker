'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const STATUS_OPTIONS = [
  { value: 'mahasiswa',  label: 'Mahasiswa' },
  { value: 'karyawan',   label: 'Karyawan'  },
  { value: 'wirausaha',  label: 'Wirausaha' },
  { value: 'freelancer', label: 'Freelancer'},
  { value: 'lainnya',    label: 'Lainnya'   },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name:       '',
    origin:          '',
    status:          'mahasiswa',
    username:        '',
    password:        '',
    favorite_animal: '',
    father_name:     '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSuccess(true);
      setTimeout(() => router.push('/login'), 1500);
    } catch {
      setError('Koneksi gagal. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">⚡</span>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mt-2">Daftar Akun</h1>
          <p className="text-zinc-400 text-sm mt-1">Buat akun baru untuk mulai tracking</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 space-y-4"
        >
          {success && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
              <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">
                ✓ Akun berhasil dibuat! Mengalihkan ke halaman login...
              </p>
            </div>
          )}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Informasi umum */}
          <Section title="Informasi Umum">
            <Field label="Nama Lengkap" value={form.full_name} onChange={set('full_name')} placeholder="Nama kamu" required={false} />
            <Field label="Asal (Kota / Kampus)" value={form.origin} onChange={set('origin')} placeholder="Contoh: Jakarta / UI" required={false} />
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={set('status')}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </Section>

          {/* Akun */}
          <Section title="Data Akun">
            <Field label="Username" value={form.username} onChange={set('username')} placeholder="username unik kamu" autoFocus />
            <Field label="Password" type="password" value={form.password} onChange={set('password')} placeholder="minimal 3 karakter" />
          </Section>

          {/* Keamanan */}
          <Section title="Pertanyaan Keamanan (untuk Lupa Password)">
            <Field
              label="Binatang yang paling kamu sukai?"
              value={form.favorite_animal}
              onChange={set('favorite_animal')}
              placeholder="Contoh: kucing"
            />
            <Field
              label="Siapa nama ayahmu?"
              value={form.father_name}
              onChange={set('father_name')}
              placeholder="Nama ayah"
            />
          </Section>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-all mt-2"
          >
            {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
          </button>

          <p className="text-center text-sm text-zinc-400">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Masuk</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

/* ── helpers ─────────────────────────────────────────────────────── */

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, type = 'text', value, onChange, placeholder, required = true, autoFocus }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
      />
    </label>
  );
}
