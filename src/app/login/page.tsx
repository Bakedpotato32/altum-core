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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredId = studentId.trim();
    if (!enteredId) return;
    setLoading(true);

    try {
      // 1. Check Staff Table (Principal/Teachers)
      const { data: staffMember } = await supabase
        .from('staff')
        .select('*')
        .eq('id', enteredId)
        .single();

      if (staffMember) {
        localStorage.clear();
        localStorage.setItem('role', staffMember.role); 
        localStorage.setItem('staffName', staffMember.name);
        localStorage.setItem('assignedClass', staffMember.assigned_class);
        router.push('/admin'); 
        return;
      }

      // 2. Check Students Table
      const { data: student } = await supabase.from('students').select('*').eq('id', enteredId).single();

      if (student) {
        localStorage.clear();
        localStorage.setItem('role', 'student');
        localStorage.setItem('studentId', student.id);
        localStorage.setItem('studentName', student.name);
        localStorage.setItem('studentClass', student.class);
        router.push('/dashboard'); 
      } else {
        alert("ID not found or incorrect.");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="login-container p-8 text-[var(--text)] relative">
      <div className="absolute top-10 right-6">
        <button onClick={toggleLang} className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-[var(--card)] border-[var(--border)] active:scale-95 transition-all">
          <Globe size={14} className="text-blue-500" />
          <span className="text-[10px] font-black uppercase">{lang === 'EN' ? 'EN / हिन्दी' : 'हिन्दी / EN'}</span>
        </button>
      </div>

      <div className="w-full max-w-sm text-center flex flex-col items-center">
        <div className="min-h-[160px] flex flex-col items-center justify-center mb-8">
          <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">
            WINNER'S <span className="text-blue-500 ml-1">ACADEMY</span>
          </h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[8px] mt-6 italic opacity-60">
            {t('portalAccess')}
          </p>
        </div>

        <form onSubmit={handleLogin} className="w-full space-y-6">
          <div className="bg-[var(--card)] border border-white/10 rounded-[32px] p-2 flex items-center group focus-within:border-blue-500 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-zinc-500/10 flex items-center justify-center text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                <User size={20} />
            </div>
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder={t('studentId')} 
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.toUpperCase())}
              className="bg-transparent border-none flex-1 py-4 px-4 font-black uppercase text-[12px] tracking-widest outline-none text-[var(--text)]"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="w-12 h-12 flex items-center justify-center text-zinc-500">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-6 rounded-[32px] flex items-center justify-center gap-3 font-black uppercase tracking-[4px] active:scale-95 transition-all">
            {loading ? <Loader2 className="animate-spin" /> : <>{t('launchCore')} <ArrowRight size={18}/></>}
          </button>
        </form>
      </div>
    </div>
  );
}
