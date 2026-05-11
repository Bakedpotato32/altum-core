'use client';
import "./globals.css";
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Home, BookOpen, Bot, User, Moon, Sun, Globe } from 'lucide-react';
import { LanguageContext, dict } from '@/lib/LanguageContext';
import Script from 'next/script';

// 🚀 Native App Behavior
import NativeAppBehavior from '@/components/NativeApp';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter(); 
  
  // 🛡️ Route Detectors
  const isLogin = pathname === '/login' || pathname === '/';
  const isAdmin = pathname.startsWith('/admin');
  
  // 🎮 Detect if we are inside an actual game
  const isGamePage = pathname.startsWith('/arcade/') && pathname !== '/arcade/leaderboard';

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [lang, setLang] = useState('EN');

  useEffect(() => {
    // We no longer use the destructive "mounted" state. 
    // We just smoothly apply the theme on the first client-side render.
    const savedTheme = localStorage.getItem('theme');
    const savedLang = localStorage.getItem('lang');

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

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content={isDarkMode ? "#050508" : "#f4f7f6"} />
        {/* Forces the app to behave exactly like a native app viewport, ignoring browser zoom/resizes */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
      </head>

      {/* Removed overflow-hidden from body to prevent Chrome PWA freezing */}
      <body className="antialiased font-sans bg-[var(--background)] overscroll-none touch-manipulation" suppressHydrationWarning>
        
        <NativeAppBehavior />
        <Script src="https://cdn.tailwindcss.com" strategy="afterInteractive" />
        
        <LanguageContext.Provider value={{ lang, t, toggleLang }}>
          {/* Header */}
          {!isLogin && !isGamePage && (
            <header className={`fixed top-0 left-0 right-0 px-6 pt-10 pb-4 z-[100] flex justify-between items-center backdrop-blur-md transition-all duration-500 bg-gradient-to-b ${isDarkMode ? 'from-[#050508] via-[#050508]/80' : 'from-[#f4f7f6] via-[#f4f7f6]/80'} to-transparent`}>
              
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="AltumCore Logo" className="w-8 h-8 object-contain drop-shadow-sm" />
                <h1 className="text-xl font-black italic uppercase tracking-tighter text-[var(--text)] pt-1">
                  ALTUM<span className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">CORE</span>
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={toggleLang} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-[var(--card)] border-[var(--border)] active:scale-95 transition-all shadow-sm">
                  <Globe size={12} className="text-blue-500" />
                  <span className="text-[9px] font-black uppercase text-[var(--text)]">{lang === 'EN' ? 'EN / हिन्दी' : 'हिन्दी / EN'}</span>
                </button>
                <button onClick={toggleTheme} className={`w-9 h-9 rounded-xl border flex items-center justify-center bg-[var(--card)] border-[var(--border)] shadow-sm active:scale-95 transition-all ${isDarkMode ? 'text-orange-400' : 'text-blue-600'}`}>
                  {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
                </button>
              </div>
            </header>
          )}

          {/* 🚀 New Architecture: Fixed wrapper for scrolling to bypass Android's body lock bug */}
          <div className="fixed inset-0 overflow-y-auto overflow-x-hidden">
            <main className={`min-h-[100dvh] w-full ${isGamePage ? 'p-0' : `pt-20 ${isAdmin ? 'pb-10' : 'pb-32'}`}`}>
              <AnimatePresence mode="wait">
                <motion.div key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  {children}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>

          {/* Bottom Nav */}
          {!isLogin && !isAdmin && !isGamePage && (
            <div className="fixed bottom-6 left-6 right-6 z-[100]">
              <nav className={`h-20 border backdrop-blur-2xl rounded-[35px] flex justify-between items-center shadow-2xl px-3 bg-[var(--card)]/90 border-[var(--border)] ${isDarkMode ? 'shadow-black/50' : 'shadow-[0_15px_40px_rgba(0,0,0,0.08)]'}`}>
                <LayoutGroup>
                  <NavItem onClick={() => { const role = localStorage.getItem('role'); router.replace(role === 'principal' || role === 'teacher' ? '/admin' : '/dashboard'); }} icon={<Home size={22} />} active={pathname === '/dashboard' || pathname === '/admin'} />
                  <NavItem onClick={() => router.replace('/Materials')} icon={<BookOpen size={22} />} active={pathname.startsWith('/Materials')} />
                  <NavItem onClick={() => router.replace('/ai-chat')} icon={<Bot size={24} />} active={pathname === '/ai-chat'} />
                  <NavItem onClick={() => router.replace('/profile')} icon={<User size={24} />} active={pathname.startsWith('/profile')} />
                </LayoutGroup>
              </nav>
            </div>
          )}
        </LanguageContext.Provider>
      </body>
    </html>
  );
}

function NavItem({ onClick, icon, active }: { onClick: () => void, icon: React.ReactNode, active: boolean }) {
  return (
    <button onClick={onClick} className="relative flex flex-col items-center justify-center w-[22%] h-14 rounded-[24px] cursor-pointer tap-highlight-transparent">
      {active && (
        <motion.div layoutId="active-nav-pill" className="absolute inset-0 bg-blue-500/10 border border-blue-500/20 rounded-[22px]" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
      )}
      <div className={`relative z-10 transition-all duration-300 ${active ? 'scale-110 text-blue-600 dark:text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-zinc-400 hover:text-zinc-500'}`}>
        {icon}
      </div>
    </button>
  );
}
