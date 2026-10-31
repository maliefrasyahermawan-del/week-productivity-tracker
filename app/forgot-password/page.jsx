'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// step: 'questions' | 'reset' | 'done'
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState('questions');
  const [form, setForm] = useState({
    username:        '',
    favorite_animal: '',
    father_name:     '',
    new_password:    '',
    confirm:         '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'verify', ...form }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setStep('reset');
    } catch {
      setError('Koneksi gagal.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'reset', ...form }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setStep('done');
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      setError('Koneksi gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">🔑</span>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mt-2">Lupa Password</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {step === 'questions' && 'Jawab pertanyaan keamanan untuk verifikasi identitas'}
            {step === 'reset'     && 'Buat password baru untuk akun kamu'}
            {step === 'done'      && 'Password berhasil direset!'}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-5">
            {[
              { s: 'questions', label: '1 · Verifikasi' },
              { s: 'reset',     label: '2 · Reset' },
            ].map(({ s, label }) => (
              <div
                key={s}
                className={`flex-1 text-center text-xs font-semibold py-1 rounded-lg ${
                  step === s || (step === 'done' && s === 'reset')
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* ── Step 1: Pertanyaan Keamanan ── */}
          {step === 'questions' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <Field label="Username" value={form.username} onChange={set('username')} placeholder="Username kamu" autoFocus />
              <Field
                label="Binatang yang paling kamu sukai?"
                value={form.favorite_animal}
                onChange={set('favorite_animal')}
                placeholder="Jawaban kamu"
              />
              <Field
                label="Siapa nama ayahmu?"
                value={form.father_name}
                onChange={set('father_name')}
                placeholder="Jawaban kamu"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-all"
              >
                {loading ? 'Memverifikasi...' : 'Verifikasi'}
              </button>
            </form>
          )}

          {/* ── Step 2: Reset Password ── */}
          {step === 'reset' && (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-2">
                <p className="text-blue-700 dark:text-blue-300 text-sm">✓ Identitas terverifikasi untuk <strong>{form.username}</strong></p>
              </div>
              <Field
                label="Password Baru"
                type="password"
                value={form.new_password}
                onChange={set('new_password')}
                placeholder="minimal 3 karakter"
                autoFocus
              />
              <Field
                label="Konfirmasi Password"
                type="password"
                value={form.confirm}
                onChange={set('confirm')}
                placeholder="ulangi password baru"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-all"
              >
                {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
              </button>
            </form>
          )}

          {/* ── Step 3: Selesai ── */}
          {step === 'done' && (
            <div className="text-center py-4">
              <p className="text-5xl mb-3">✅</p>
              <p className="text-zinc-700 dark:text-zinc-300 font-medium">Password berhasil direset!</p>
              <p className="text-zinc-400 text-sm mt-1">Mengalihkan ke halaman login...</p>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-zinc-400 mt-4">
          <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">← Kembali ke Login</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, type = 'text', value, onChange, placeholder, autoFocus }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        required
        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
      />
    </label>
  );
}
