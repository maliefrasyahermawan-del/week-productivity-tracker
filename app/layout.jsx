import ThemeProvider from './providers';
import Navigation from '@/components/Navigation';
import './globals.css';

export const metadata = {
  title: 'Productivity Tracker',
  description: 'Track your weekly productivity from daily schedule files.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Runs before React hydration — prevents flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme')??"dark";document.documentElement.classList.toggle('dark',t==='dark')}catch(e){document.documentElement.classList.add('dark')}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-white dark:bg-zinc-950 transition-colors duration-200">
        <ThemeProvider>
          <Navigation />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
