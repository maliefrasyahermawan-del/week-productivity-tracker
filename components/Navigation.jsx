'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/app/providers';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/upload',    label: 'Upload'    },
  { href: '/history',   label: 'History'   },
];

export default function Navigation() {
  const pathname     = usePathname();
  const router       = useRouter();
  const { dark, toggle } = useTheme();
  const [user,    setUser]    = useState(null);
  const [menuOpen, setMenu]   = useState(false);

  // Fetch current user on every route change
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then(setUser)
      .catch(() => setUser(null));
  }, [pathname]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  const initials = user
    ? (user.full_name || user.username || '?')
        .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <nav className="bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="font-bold text-base text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            ⚡ Productivity Tracker
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-1">
            {/* Nav links (only when logged in) */}
            {user && NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  pathname === href
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {label}
              </Link>
            ))}

            {/* Theme toggle */}
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="w-8 h-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all ml-1 text-base"
            >
              {dark ? '☀️' : '🌙'}
            </button>

            {/* User avatar / dropdown */}
            {user && (
              <div className="relative ml-1">
                <button
                  onClick={() => setMenu((v) => !v)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                >
                  {/* Mini avatar */}
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                    {user.avatar_base64 ? (
                      <img src={user.avatar_base64} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {initials}
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300 hidden sm:block font-medium">
                    {user.full_name || user.username}
                  </span>
                  <span className="text-zinc-400 text-xs">▾</span>
                </button>

                {/* Dropdown menu */}
                {menuOpen && (
                  <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                    <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                      <Link
                        href="/profile"
                        onClick={() => setMenu(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        👤 Profil
                      </Link>
                      <hr className="border-zinc-100 dark:border-zinc-800 mx-3" />
                      <button
                        onClick={() => { setMenu(false); logout(); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        🚪 Keluar
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
