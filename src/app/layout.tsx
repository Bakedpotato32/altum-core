'use client';
import "./globals.css";
import Link from 'next/link';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Home, BookOpen, Bot, User, Moon, Globe } from 'lucide-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login' || pathname === '/';

  return (
    <html lang="en">
      <head>
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#050508" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Register Service Worker Script */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js');
            });
          }
        `}} />
      </head>

      <body className="bg-[#050508] text-white antialiased overflow-hidden">
        {/* Tailwind Script */}
        <Script 
          src="https://cdn.tailwindcss.com" 
          strategy="beforeInteractive" 
        />
        
        {/* Global Background Glows */}
        <div className="fixed inset-0 pointer-events-none -z-10">
           <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full" />
           <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-600/5 blur-[100px] rounded-full" />
        </div>

        {/* FIXED GLOBAL HEADER */}
        {!isLogin && (
          <header className="fixed top-0 left-0 right-0 px-6 pt-10 pb-4 z-[100] flex justify-between items-center bg-gradient-to-b from-[#050508] via-[#050508]/80 to-transparent backdrop-blur-sm">
            <h1 className="text-xl font-black italic uppercase tracking-tighter">
              ALTUM<span className="text-blue-500">CORE</span>
            </h1>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest">
                <Globe size={12} className="text-blue-400" />
                <span className="text-zinc-200">EN / हिन्दी</span>
              </button>
              <button className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-orange-400">
                <Moon size={16} />
              </button>
            </div>
          </header>
        )}

        {/* SNAPPY PAGE TRANSITIONS */}
        <main className="h-svh overflow-y-auto pb-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ opacity: 1, willChange: "opacity" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* FLOATING NAVIGATION */}
        {!isLogin && (
          <div className="fixed bottom-8 left-6 right-6 z-[100]">
            <nav className="h-20 bg-white/[0.03] border border-white/10 backdrop-blur-2xl rounded-[32px] flex justify-around items-center shadow-2xl relative">
              <LayoutGroup>
                <NavItem href="/dashboard" icon={<Home size={22} />} active={pathname === '/dashboard'} />
                <NavItem href="/Materials" icon={<BookOpen size={22} />} active={pathname === '/Materials'} />
                <NavItem href="/ai-chat" icon={<Bot size={22} />} active={pathname === '/ai-chat'} />
                <NavItem href="/profile" icon={<User size={22} />} active={pathname.startsWith('/profile')} />
              </LayoutGroup>
            </nav>
          </div>
        )}
      </body>
    </html>
  );
}

function NavItem({ href, icon, active }: { href: string, icon: React.ReactNode, active: boolean }) {
  return (
    <Link href={href} className="relative flex flex-col items-center justify-center w-16 h-full">
      <div className={`transition-all duration-300 z-10 ${active ? 'scale-125 text-blue-500 -translate-y-1' : 'text-zinc-500'}`}>
        {icon}
      </div>
      {active && (
        <motion.div 
          layoutId="nav-dot"
          className="absolute bottom-3 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]"
          transition={{ type: "tween", duration: 0.2 }}
        />
      )}
    </Link>
  );
}
