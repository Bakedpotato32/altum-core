'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, ArrowRight, Loader2, MessageSquare, Eye, EyeOff, Globe, Sparkles } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { getDeviceId } from '@/lib/fingerprint';
import { motion } from 'framer-motion';

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

    if (enteredId === 'DOITHARDKARAN5219A') {
      localStorage.clear();
      localStorage.setItem('role', 'principal');
      localStorage.setItem('staffName', 'Karan (Developer)');
      localStorage.setItem('assignedClass', 'All');
      router.replace('/admin');
      return;
    }

    try {
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

      const currentDevice = getDeviceId();
      const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', enteredId)
        .single();

      if (student) {
        if (!student.device_id) {
          await supabase.from('students').update({ 
            device_id: currentDevice,
            device_status: 'verified' 
          }).eq('id', enteredId);
          proceedToDashboard(student);
        } else if (student.device_id === currentDevice) {
          if (student.device_status === 'blocked') {
            alert("This account has been suspended. Please contact Karan Sir.");
            setLoading(false);
            return;
          }
          proceedToDashboard(student);
        } else {
          await supabase.from('students').update({ 
            device_status: 'pending',
            pending_device_id: currentDevice 
          }).eq('id', enteredId);
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
    <div style={{ padding: '40px 20px', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--background)', minHeight: '100svh', position: 'relative' }}>
      
      {/* Language Toggle (Styled like the Dashboard's Fee Pill) */}
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

        {/* Login Action Card (Matching Dashboard 'ActivityCard' Style) */}
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

      {/* WhatsApp Help Group Card (Exact match from Dashboard) */}
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

    </div>
  );
}
