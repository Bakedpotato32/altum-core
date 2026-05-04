'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, ArrowRight, Loader2, MessageSquare, Eye, EyeOff, Globe } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export default function LoginPage() {
  const { t, lang, toggleLang } = useLanguage(); 
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); 
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    const enteredId = studentId.trim();
    if (!enteredId) return;
    setLoading(true);

    // Admin Access
    if (enteredId === 'AC5219A') {
      localStorage.clear();
      localStorage.setItem('role', 'admin'); 
      router.push('/admin'); 
      return;
    }

    const { data } = await supabase.from('students').select('*').eq('id', enteredId).single();

    if (data) {
      localStorage.clear();
      localStorage.setItem('role', 'student');
      localStorage.setItem('studentId', data.id);
      localStorage.setItem('studentName', data.name);
      localStorage.setItem('studentClass', data.class);
      router.push('/dashboard'); 
    } else {
      alert("ID not found or incorrect. Tap the button below to contact Admin.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-8 text-[var(--text)] font-sans relative">
      
      {/* LANGUAGE TOGGLE */}
      <div className="absolute top-10 right-6">
        <button onClick={toggleLang} className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-[var(--card)] border-[var(--border)] active:scale-95 transition-all shadow-sm">
          <Globe size={14} className="text-blue-500" />
          <span className="text-[10px] font-black uppercase text-[var(--text)]">
            {lang === 'EN' ? 'EN / हिन्दी' : 'हिन्दी / EN'}
          </span>
        </button>
      </div>

      <div className="w-full max-w-sm text-center">
        {/* REBRANDED LOGO: Added a tiny margin between the words for clarity */}
        <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-2">
          WINNER'S <span className="text-blue-500 ml-1">ACADEMY</span>
        </h1>
        {/* Improved spacing for "PORTAL ACCESS" */}
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[8px] mb-16 italic opacity-60">
          {t('portalAccess')}
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="bg-[var(--card)] border border-white/10 rounded-[32px] p-2 flex items-center group focus-within:border-blue-500 focus-within:bg-white/5 transition-all shadow-md">
            <div className="w-12 h-12 rounded-2xl bg-zinc-500/10 flex items-center justify-center text-zinc-400 group-focus-within:text-blue-500 group-focus-within:bg-blue-500/10 transition-colors">
                <User size={20} />
            </div>
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder={t('studentId')} 
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.toUpperCase())}
              className="bg-transparent border-none flex-1 py-4 px-4 font-black uppercase text-[12px] tracking-widest outline-none text-[var(--text)] placeholder:text-zinc-500"
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="w-12 h-12 flex items-center justify-center text-zinc-500 hover:text-[var(--text)] transition-colors active:scale-90"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-6 rounded-[32px] flex items-center justify-center gap-3 font-black uppercase tracking-[4px] shadow-xl active:scale-95 transition-all">
            {loading ? <Loader2 className="animate-spin" /> : <>{t('launchCore')} <ArrowRight size={18}/></>}
          </button>
        </form>

        <div className="flex items-center gap-4 my-10 opacity-20">
            <div className="h-[1px] bg-zinc-700 flex-1"></div>
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">{t('help')}</span>
            <div className="h-[1px] bg-zinc-700 flex-1"></div>
        </div>

        <button onClick={() => window.open('https://wa.me/917054937918', '_blank')} className="w-full bg-[var(--card)] border border-white/10 py-5 rounded-[30px] flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 transition-all border-dashed hover:border-white/20">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-[#25d366]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text)]">{t('contactAdmin')}</span>
          </div>
          <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest">{t('getHelpWhatsApp')}</p>
        </button>
      </div>
    </div>
  );
}
