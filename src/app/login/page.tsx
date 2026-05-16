'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, ArrowRight, Loader2, MessageSquare, Eye, EyeOff, Globe, Sparkles, Smartphone, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { getDeviceId } from '@/lib/fingerprint';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const { t, lang, toggleLang } = useLanguage();
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [initialChecking, setInitialChecking] = useState(true); // For Auto-Login loader
  
  // Device Naming State
  const [showDevicePrompt, setShowDevicePrompt] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [pendingStudent, setPendingStudent] = useState<any>(null);

  const router = useRouter();

  // --- AUTO LOGIN SYSTEM ---
  useEffect(() => {
    const checkAutoLogin = async () => {
      const savedRole = localStorage.getItem('role');
      const savedId = localStorage.getItem('studentId');

      // Auto-login for staff
      if (savedRole === 'principal' || savedRole === 'teacher') {
        router.replace('/admin');
        return;
      }

      // Auto-login for verified students
      if (savedRole === 'student' && savedId) {
        const currentDevice = getDeviceId();
        const { data: student } = await supabase.from('students').select('*').eq('id', savedId).single();

        // If verified AND the stored device string includes the current device ID
        if (student && student.device_status === 'verified' && student.device_id && student.device_id.includes(currentDevice)) {
          router.replace('/dashboard');
          return; // Stop here, redirecting...
        }
      }
      
      // If we reach here, they need to log in normally
      setInitialChecking(false);
    };

    checkAutoLogin();
  }, [router]);

  // --- LOGIN LOGIC ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredId = studentId.trim().toUpperCase();
    if (!enteredId) return;
    setLoading(true);

    // Developer Override
    if (enteredId === 'DOITHARDKARAN5219A') {
      localStorage.clear();
      localStorage.setItem('role', 'principal');
      localStorage.setItem('staffName', 'Karan (Developer)');
      localStorage.setItem('assignedClass', 'All');
      router.replace('/admin');
      return;
    }

    try {
      // Check Staff
      const { data: staffMember } = await supabase.from('staff').select('*').eq('id', enteredId).single();
      if (staffMember) {
        localStorage.clear();
        localStorage.setItem('role', staffMember.role);
        localStorage.setItem('staffName', staffMember.name);
        localStorage.setItem('assignedClass', staffMember.assigned_class);
        router.replace('/admin');
        return;
      }

      // Check Student
      const currentDevice = getDeviceId();
      const { data: student } = await supabase.from('students').select('*').eq('id', enteredId).single();

      if (student) {
        // If device is already verified and matches current fingerprint
        if (student.device_id && student.device_id.includes(currentDevice)) {
          if (student.device_status === 'blocked') {
            alert("This account has been suspended. Please contact Karan Sir.");
            setLoading(false);
            return;
          }
          proceedToDashboard(student);
        } 
        // If completely new device OR no device bound yet -> Prompt for Name!
        else {
          setPendingStudent(student);
          setShowDevicePrompt(true);
          setLoading(false);
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

  // --- DEVICE REGISTRATION LOGIC ---
  const submitDeviceName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim() || !pendingStudent) return;
    setLoading(true);

    const currentDevice = getDeviceId();
    // Combine their friendly name with the secure fingerprint for Admin view
    const formattedDeviceName = `${deviceName.trim()} [${currentDevice}]`;

    if (!pendingStudent.device_id) {
      // First time ever logging in -> Auto Approve & bind
      await supabase.from('students').update({ 
        device_id: formattedDeviceName,
        device_status: 'verified' 
      }).eq('id', pendingStudent.id);
      proceedToDashboard(pendingStudent);
    } else {
      // Trying to log into a SECOND device -> Send to Admin Security Gate
      await supabase.from('students').update({ 
        device_status: 'pending',
        pending_device_id: formattedDeviceName 
      }).eq('id', pendingStudent.id);
      localStorage.setItem('attemptedLoginId', pendingStudent.id);
      router.push('/verification-pending');
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

  // Show a clean loading screen while checking Auto-Login
  if (initialChecking) {
    return (
      <div style={{ minHeight: '100svh', background: 'var(--background)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <Loader2 size={48} color="#3b82f6" className="animate-spin" />
        <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase' }}>Authenticating...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--background)', minHeight: '100svh', position: 'relative' }}>
      
      {/* Language Toggle */}
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <div 
          onClick={toggleLang}
          style={{ background: 'var(--card)', padding: '10px 14px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}
        >
          <Globe size={14} color="#3b82f6" />
          <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, color: 'var(--text)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {lang === 'EN' ? 'EN / हिन्दी' : 'हिन्दी / EN'}
          </p>
        </div>
      </div>

      {/* Main Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px', marginTop: '20px' }}>
        <div style={{ width: '80px', height: '80px', margin: '0 auto 20px', borderRadius: '24px', background: 'linear-gradient(135deg, #3b82f6, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(59,130,246,0.3)' }}>
          <Sparkles size={36} color="white" />
        </div>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '42px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--text)', lineHeight: 1 }}>
          ALTUM<span style={{ color: '#3b82f6' }}>CORE</span>
        </h1>
        <p style={{ margin: 0, fontSize: '11px', fontWeight: 900, color: '#94a3b8', letterSpacing: '2px', textTransform: 'uppercase' }}>
          {t('portalAccess')}
        </p>
      </div>

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Chunky Input Field */}
        <div style={{ 
          display: 'flex', alignItems: 'center', background: 'var(--card)', 
          borderRadius: '26px', border: '2px solid var(--border)', 
          padding: '8px 16px', height: '72px', boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.02)'
        }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '16px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={22} color="#3b82f6" />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder={t('studentId')}
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            style={{ 
              flex: 1, background: 'transparent', border: 'none', outline: 'none', 
              fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', 
              color: 'var(--text)', padding: '0 12px', width: '100%' 
            }}
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ background: 'none', border: 'none', padding: '10px', color: '#94a3b8', cursor: 'pointer', flexShrink: 0 }}>
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* Login Action Card */}
        <motion.button 
          type="submit"
          disabled={loading}
          whileTap={!loading ? { scale: 0.96 } : {}}
          style={{ 
            background: 'linear-gradient(135deg, #3b82f6, #4f46e5)', 
            borderRadius: '26px', padding: '20px', position: 'relative', overflow: 'hidden', 
            cursor: loading ? 'not-allowed' : 'pointer', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 10px 25px rgba(59,130,246,0.3)', width: '100%'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', zIndex: 1 }}>
            <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.25)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.2)' }}>
              {loading ? <Loader2 size={24} color="white" className="animate-spin" /> : <ArrowRight size={24} color="white" />}
            </div>
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1 }}>{t('launchCore')}</h3>
              <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '10px', fontWeight: 900, letterSpacing: '0.5px', textTransform: 'uppercase' }}>SECURE LOGIN</p>
            </div>
          </div>
          <ArrowRight color="white" size={24} style={{ opacity: 0.7 }} />
          
          <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', fontSize: '75px', opacity: 0.15, pointerEvents: 'none' }}>
            🚀
          </span>
        </motion.button>
      </form>

      {/* WhatsApp Help Group Card */}
      <motion.div 
        whileTap={{ scale: 0.97 }}
        onClick={() => window.open('https://wa.me/917054937918?text=Hello%20Karan%20Sir,%20I%20need%20help%20with%20my%20login%20code.', '_blank')}
        style={{ 
          background: 'linear-gradient(135deg, #22c55e, #16a34a)', 
          borderRadius: '26px', padding: '16px 20px', marginTop: '16px',
          position: 'relative', overflow: 'hidden', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 10px 25px rgba(34,197,94,0.2)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', zIndex: 1 }}>
          <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.25)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <MessageSquare size={24} fill="white" color="white" />
          </div>
          <div>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1 }}>{t('contactAdmin')}</h3>
            <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '10px', fontWeight: 900, letterSpacing: '0.5px' }}>{t('getHelpWhatsApp')}</p>
          </div>
        </div>
        <ArrowRight color="white" size={24} style={{ opacity: 0.7 }} />
        
        <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', fontSize: '75px', opacity: 0.15, pointerEvents: 'none' }}>
          💬
        </span>
      </motion.div>

      {/* --- DEVICE NAMING PROMPT (Glassmorphic Modal) --- */}
      <AnimatePresence>
        {showDevicePrompt && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }}
          >
            <motion.form 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onSubmit={submitDeviceName} 
              style={{ width: '100%', maxWidth: '400px', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 1)', borderRadius: '40px', padding: '32px', boxShadow: '0 25px 50px rgba(0,0,0,0.15)', textAlign: 'center' }}
            >
              <div style={{ width: '64px', height: '64px', margin: '0 auto 16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={32} color="#3b82f6" />
              </div>

              <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#0f172a' }}>
                New <span style={{ color: '#3b82f6' }}>Device</span>
              </h2>
              <p style={{ margin: '0 0 24px 0', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                What should we call this phone?
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input 
                  required type="text" 
                  value={deviceName} 
                  onChange={(e) => setDeviceName(e.target.value)} 
                  placeholder="e.g., Papa's Phone" 
                  style={{ width: '100%', background: '#ffffff', border: '2px solid #e2e8f0', borderRadius: '20px', padding: '20px', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a', outline: 'none', boxSizing: 'border-box', textAlign: 'center' }} 
                />

                <motion.button 
                  whileTap={!loading ? { scale: 0.95 } : {}}
                  type="submit" disabled={loading} 
                  style={{ width: '100%', background: 'linear-gradient(135deg, #3B82F6, #4F46E5)', color: '#ffffff', padding: '20px', borderRadius: '24px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 8px 25px rgba(59, 130, 246, 0.4)' }}
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <>Register Device <ShieldCheck size={20} strokeWidth={2.5} /></>}
                </motion.button>
                
                <button type="button" onClick={() => { setShowDevicePrompt(false); setLoading(false); }} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
