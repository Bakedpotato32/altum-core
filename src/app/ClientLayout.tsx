'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Home, BookOpen, MessagesSquare, User, Globe } from 'lucide-react'; 
import { LanguageContext, dict } from '@/lib/LanguageContext';
import { motion } from 'framer-motion';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter(); 
  const [lang, setLang] = useState('EN');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem('lang');
    if (savedLang) setLang(savedLang);
  }, []);

  const toggleLang = () => {
    const newLang = lang === 'EN' ? 'HI' : 'EN';
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  const isLogin = pathname === '/login' || pathname === '/';
  const isKidsGame = pathname.startsWith('/kids/') || pathname === '/kids/alphabet' || pathname === '/kids/colors' || pathname === '/kids/numbers' || pathname === '/kids/theater';
  
  // NEW: Detect if we are anywhere inside the Arcade OR the Admin section
  const isArcade = pathname.startsWith('/arcade');
  const isAdmin = pathname.startsWith('/admin');
  
  // Combine conditions to hide the bottom navigation bar
  const hideBottomNav = isArcade || isAdmin;

  if (!mounted) return null;

  // 1. Fullscreen Mode for Login and Kids Games (No Header, No Nav)
  if (isLogin || isKidsGame) {
    return (
      <LanguageContext.Provider value={{ lang, t: (k:any)=>dict[lang as 'EN']?.[k] || k, toggleLang }}>
        <div className="fixed inset-0 w-full h-full overflow-y-auto no-scrollbar bg-[#f8fafc]">
          {children}
        </div>
      </LanguageContext.Provider>
    );
  }

  // 2. ULTIMATE PWA LAYOUT (With Header)
  return (
    <LanguageContext.Provider value={{ lang, t: (k:any)=>dict[lang as 'EN']?.[k] || k, toggleLang }}>
      
      <div className="fixed inset-0 bg-[#f8fafc] text-slate-900 font-sans flex flex-col overflow-hidden">
        
        {/* FROSTED HEADER */}
        <header 
          className="flex-none z-[1000] w-full flex justify-between items-center px-5 bg-[#f8fafc]/85 backdrop-blur-xl border-b border-slate-200/60"
          style={{ 
            height: 'calc(80px + env(safe-area-inset-top))',
            paddingTop: 'env(safe-area-inset-top)' 
          }}
        >
          <div 
            className="flex items-center gap-3 cursor-pointer active:scale-95 transition-transform" 
            onClick={() => router.push('/dashboard')}
          >
            <div className="w-10 h-10 rounded-[12px] bg-blue-500 flex items-center justify-center shadow-[0_4px_12px_rgba(59,130,246,0.3)]">
               <span className="text-white font-black text-[20px]">A</span>
            </div>
            <h1 className="text-[22px] font-black italic m-0 tracking-tight text-slate-900 leading-none">
              ALTUM<span className="text-blue-500">CORE</span>
            </h1>
          </div>

          <button 
            onClick={toggleLang} 
            className="px-4 py-2.5 rounded-[16px] bg-white border border-slate-200 text-[11px] font-black text-blue-500 flex items-center gap-2 shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-95 transition-transform uppercase tracking-widest"
          >
            <Globe size={14} strokeWidth={2.5} /> {lang}
          </button>
        </header>

        {/* SCROLLABLE MAIN CONTENT
          If the nav is hidden (Arcade or Admin), we remove the 130px bottom padding so the page uses the full screen.
        */}
        <main className={`flex-1 w-full overflow-y-auto overflow-x-hidden no-scrollbar pt-2 relative scroll-smooth ${hideBottomNav ? 'pb-4' : 'pb-[130px]'}`}>
          {children}
        </main>

        {/* FLOATING BOTTOM NAV - Hidden when hideBottomNav is true */}
        {!hideBottomNav && (
          <nav 
            className="absolute left-5 right-5 h-[72px] bg-white/95 backdrop-blur-lg rounded-[28px] flex justify-around items-center border border-slate-100 shadow-[0_15px_40px_rgba(0,0,0,0.08)] z-[1000] px-2"
            style={{ 
              bottom: 'calc(24px + env(safe-area-inset-bottom))' 
            }}
          >
             <NavIcon active={pathname === '/dashboard'} onClick={() => router.replace('/dashboard')} icon={<Home size={24} strokeWidth={2.5} />} />
             <NavIcon active={pathname.startsWith('/Materials')} onClick={() => router.replace('/Materials')} icon={<BookOpen size={24} strokeWidth={2.5} />} />
             <NavIcon active={pathname === '/ai-chat'} onClick={() => router.replace('/ai-chat')} icon={<MessagesSquare size={24} strokeWidth={2.5} />} />
             <NavIcon active={pathname.startsWith('/profile')} onClick={() => router.replace('/profile')} icon={<User size={24} strokeWidth={2.5} />} />
          </nav>
        )}

      </div>
    </LanguageContext.Provider>
  );
}

// Sub-component for Animated Nav Icons
function NavIcon({ active, onClick, icon }: any) {
  return (
    <div 
      onClick={onClick}
      className="flex flex-col items-center justify-center cursor-pointer w-[60px] h-full relative"
    >
      <div className={`transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${active ? 'text-blue-500 -translate-y-1.5 scale-110' : 'text-slate-400 scale-100'}`}>
        {icon}
      </div>
      {active && (
        <motion.div 
          layoutId="nav-dot"
          className="w-1.5 h-1.5 rounded-full bg-blue-500 absolute bottom-3"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </div>
  );
}
