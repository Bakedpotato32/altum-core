'use client';
import "./globals.css";
import Link from 'next/link';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Home, BookOpen, Bot, User, Moon, Sun, Globe } from 'lucide-react';
import { LanguageContext, dict } from '@/lib/LanguageContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login' || pathname === '/';
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [lang, setLang] = useState('EN');
  const [homePath, setHomePath] = useState('/dashboard');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    const savedLang = localStorage.getItem('lang');
    const role = localStorage.getItem('role');

    if (role === 'admin') {
      setHomePath('/admin');
    } else {
      setHomePath('/dashboard');
    }

    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.remove('light-mode');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.add('light-mode');
      if (!savedTheme) localStorage.setItem('theme', 'light');
    }

    if (savedLang) setLang(savedLang);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDarkMode;
    setIsDarkMode(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    }
  };

  const toggleLang = () => {
    const newLang = lang === 'EN' ? 'HI' : 'EN';
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  const t = (key: string) => {
    return dict[lang as keyof typeof dict]?.[key as keyof typeof dict['EN']] || key;
  };

  if (!mounted) return <html lang="en"><body className="bg-[#f4f7f6]" /></html>;

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content={isDarkMode ? "#050508" : "#f4f7f6"} />
      </head>

      <body className="antialiased overflow-hidden font-sans bg-[var(--background)]">
        <Script src="https://cdn.tailwindcss.com" strategy="afterInteractive" />
        
        {/* <-- Passed toggleLang into the provider here --> */}
        <LanguageContext.Provider value={{ lang, t, toggleLang }}>
          {!isLogin && (
            <header className={`fixed top-0 left-0 right-0 px-6 pt-10 pb-4 z-[100] flex justify-between items-center backdrop-blur-md transition-all duration-500 bg-gradient-to-b ${isDarkMode ? 'from-[#050508] via-[#050508]/80' : 'from-[#f4f7f6] via-[#f4f7f6]/80'} to-transparent`}>
              <h1 className="text-xl font-black italic uppercase tracking-tighter text-[var(--text)]">
                WINNER'S<span className="text-blue-500">ACADEMY</span>
              </h1>
              <div className="flex items-center gap-3">
                <button onClick={toggleLang} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-[var(--card)] border-[var(--border)] active:scale-95 transition-all">
                  <Globe size={12} className="text-blue-500" />
                  <span className="text-[9px] font-black uppercase text-[var(--text)]">{lang === 'EN' ? 'EN / हिन्दी' : 'हिन्दी / EN'}</span>
                </button>
                <button onClick={toggleTheme} className={`w-9 h-9 rounded-xl border flex items-center justify-center bg-[var(--card)] border-[var(--border)] active:scale-95 transition-all ${isDarkMode ? 'text-orange-400' : 'text-blue-600'}`}>
                  {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
                </button>
              </div>
            </header>
          )}

          <main className="h-svh overflow-y-auto pb-32">
            <AnimatePresence mode="wait">
              <motion.div key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {children}
              </motion.div>
            </AnimatePresence>
          </main>

          {!isLogin && (
            <div className="fixed bottom-8 left-6 right-6 z-[100]">
              <nav className={`h-20 border backdrop-blur-2xl rounded-[32px] flex justify-around items-center shadow-2xl bg-[var(--card)] border-[var(--border)] ${isDarkMode ? 'shadow-black/50' : 'shadow-zinc-300'}`}>
                <LayoutGroup>
                  <NavItem href={homePath} icon={<Home size={22} />} active={pathname === '/dashboard' || pathname === '/admin'} />
                  <NavItem href="/Materials" icon={<BookOpen size={22} />} active={pathname.startsWith('/Materials')} />
                  <NavItem href="/ai-chat" icon={<Bot size={22} />} active={pathname === '/ai-chat'} />
                  <NavItem href="/profile" icon={<User size={22} />} active={pathname.startsWith('/profile')} />
                </LayoutGroup>
              </nav>
            </div>
          )}
        </LanguageContext.Provider>
      </body>
    </html>
  );
}

function NavItem({ href, icon, active }: { href: string, icon: React.ReactNode, active: boolean }) {
  return (
    <Link href={href} className="relative flex flex-col items-center justify-center w-16 h-full">
      <div className={`transition-all duration-300 z-10 ${active ? 'scale-125 text-blue-500 -translate-y-1' : 'text-[var(--text-muted)]'}`}>
        {icon}
      </div>
      {active && <motion.div layoutId="nav-dot" className="absolute bottom-3 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />}
    </Link>
  );
}
