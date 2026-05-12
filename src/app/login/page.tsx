'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, ArrowRight, Loader2, MessageSquare, Eye, EyeOff, Globe } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { getDeviceId } from '@/lib/fingerprint'; // Ensure you created this file as discussed

export default function LoginPage() {
  const { t, lang, toggleLang } = useLanguage();
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredId = studentId.trim().toUpperCase();
    if (!enteredId) return;
    setLoading(true);

    // 1. MASTER ADMIN BYPASS (Developer Mode)
    if (enteredId === 'DOITHARDKARAN5219A') {
      localStorage.clear();
      localStorage.setItem('role', 'principal');
      localStorage.setItem('staffName', 'Karan (Developer)');
      localStorage.setItem('assignedClass', 'All');
      router.replace('/admin');
      return;
    }

    try {
      // 2. CHECK STAFF TABLE (Internal security for teachers)
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
        router.replace('/admin');
        return;
      }

      // 3. STUDENT DEVICE BINDING LOGIC
      const currentDevice = getDeviceId();
      const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', enteredId)
        .single();

      if (student) {
        // CASE A: First time login (Bind the device)
        if (!student.device_id) {
          await supabase.from('students').update({ 
            device_id: currentDevice,
            device_status: 'verified' 
          }).eq('id', enteredId);
          
          proceedToDashboard(student);
        } 
        // CASE B: Returning on the same device
        else if (student.device_id === currentDevice) {
          if (student.device_status === 'blocked') {
            alert("This account has been suspended. Please contact Karan Sir.");
            setLoading(false);
            return;
          }
          proceedToDashboard(student);
        } 
        // CASE C: Security Breach / New Device
        else {
          // If status is already pending or verified on another device
          // We flag this specific request for your approval
          await supabase.from('students').update({ 
            device_status: 'pending',
            pending_device_id: currentDevice 
          }).eq('id', enteredId);
          
          // Store ID in local storage temporarily to check status on the pending page
          localStorage.setItem('attemptedLoginId', enteredId);
          router.push('/verification-pending');
        }
      } else {
        alert("ID not found or incorrect.");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const proceedToDashboard = (student: any) => {
    localStorage.clear();
    localStorage.setItem('role', 'student');
    localStorage.setItem('studentId', student.id);
    localStorage.setItem('studentName', student.name);
    localStorage.setItem('studentClass', student.class);
    router.replace('/dashboard');
  };

  return (
    // I replaced the inline layout styles with Tailwind classes to ensure perfect boundary control
    <div className="relative flex flex-col items-center justify-center w-full min-h-[100dvh] px-6 py-8 overflow-hidden" style={{ background: 'var(--background)', color: 'var(--text)' }}>

      {/* Ambient orbs */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: '-5%', left: '-10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      {/* Lang toggle */}
      <div style={{ position: 'absolute', top: 40, right: 20, zIndex: 10 }}>
        <button
          onClick={toggleLang}
          className="active:scale-95 transition-transform shadow-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer' }}
        >
          <Globe size={12} style={{ color: '#3b82f6' }} />
          <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text)' }}>
            {lang === 'EN' ? 'EN / हिन्दी' : 'हिन्दी / EN'}
          </span>
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>

        {/* ── Logo ── */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          {/* Icon mark */}
          <div style={{ width: 64, height: 64, borderRadius: 22, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 28px rgba(59,130,246,0.2)' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #2563eb, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff', opacity: 0.9 }} />
            </div>
          </div>

          <h1 style={{ fontSize: 52, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 0.9, color: 'var(--text)', marginBottom: 4 }}>
            ALTUM
            <span style={{ color: '#3b82f6', textShadow: '0 0 30px rgba(59,130,246,0.4)', marginLeft: 6 }}>
              CORE
            </span>
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14 }}>
            <div style={{ height: 1, width: 32, background: 'rgba(59,130,246,0.3)', borderRadius: 1 }} />
            <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.35 }}>
              {t('portalAccess')}
            </p>
            <div style={{ height: 1, width: 32, background: 'rgba(59,130,246,0.3)', borderRadius: 1 }} />
          </div>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14, boxSizing: 'border-box' }}>

          {/* Input */}
          <div style={{ borderRadius: 24, background: 'var(--card)', border: '1px solid var(--border)', padding: '6px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(59,130,246,0.45)')}
            onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            {/* Icon box */}
            <div style={{ width: 46, height: 46, borderRadius: 18, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={18} style={{ color: '#3b82f6' }} />
            </div>

            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={t('studentId')}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text)', fontFamily: 'inherit', padding: '12px 4px', width: '100%' }}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', opacity: 0.3, cursor: 'pointer', background: 'none', border: 'none', flexShrink: 0 }}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="active:scale-95 transition-transform"
            style={{ width: '100%', boxSizing: 'border-box', borderRadius: 22, padding: '20px', background: loading ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg, #1d4ed8, #3b82f6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 12px 36px rgba(59,130,246,0.4)', position: 'relative', overflow: 'hidden' }}
          >
            {/* Shine overlay */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)', pointerEvents: 'none' }} />
            {loading
              ? <Loader2 size={20} className="animate-spin" style={{ position: 'relative', zIndex: 1 }} />
              : <><span style={{ position: 'relative', zIndex: 1 }}>{t('launchCore')}</span><ArrowRight size={17} style={{ position: 'relative', zIndex: 1 }} /></>
            }
          </button>
        </form>

        {/* ── Divider ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', margin: '28px 0', boxSizing: 'border-box' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.2 }}>{t('help')}</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* ── WhatsApp Help ── */}
        <button
          onClick={() => window.open('https://wa.me/917054937918?text=Hello%20Karan%20Sir,%20I%20need%20help%20with%20my%20login%20code.', '_blank')}
          className="active:scale-95 transition-transform"
          style={{ width: '100%', boxSizing: 'border-box', borderRadius: 22, padding: '18px', background: 'var(--card)', border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 10, background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={14} fill="#25d366" style={{ color: '#25d366' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text)' }}>{t('contactAdmin')}</span>
          </div>
          <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.3 }}>{t('getHelpWhatsApp')}</p>
        </button>

      </div>

      <style>{`input::placeholder { opacity: 0.3; }`}</style>
    </div>
  );
}
