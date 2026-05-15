'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, Clock, MessageSquare, RefreshCcw, ChevronLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VerificationPending() {
  const router = useRouter();
  const [studentName, setStudentName] = useState('');
  const [checking, setChecking] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = localStorage.getItem('attemptedLoginId');
    if (!id) {
      router.replace('/login');
      return;
    }

    const getStudent = async () => {
      const { data } = await supabase.from('students').select('name').eq('id', id).single();
      if (data) setStudentName(data.name);
    };
    getStudent();
  }, [router]);

  const checkStatus = async () => {
    setChecking(true);
    const id = localStorage.getItem('attemptedLoginId');
    const { data } = await supabase.from('students').select('device_status').eq('id', id).single();
    
    if (data?.device_status === 'verified') {
      localStorage.removeItem('attemptedLoginId');
      router.replace('/login');
    } else {
      setTimeout(() => {
        setChecking(false);
      }, 1000);
    }
  };

  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100svh', background: 'var(--background)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', boxSizing: 'border-box' }}>
      
      {/* Ambient Orbs */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -10, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      {/* Main Icon Header */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ width: '100px', height: '100px', borderRadius: '35px', background: 'linear-gradient(135deg, #f97316, #fbbf24)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px', boxShadow: '0 15px 35px rgba(249, 115, 22, 0.25)', position: 'relative' }}
      >
        <ShieldAlert size={48} color="#fff" />
        <div style={{ position: 'absolute', inset: -4, borderRadius: '40px', border: '1px solid rgba(249,115,22,0.2)' }} />
      </motion.div>

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--text)', letterSpacing: '-0.5px' }}>
          Security <span style={{ color: '#f97316' }}>Gate</span>
        </h1>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#64748b', lineHeight: 1.6, maxWidth: '280px' }}>
          Hello <span style={{ color: 'var(--text)', fontWeight: 900 }}>{studentName || 'Student'}</span>, this device is not yet verified for your account.
        </p>
      </div>

      {/* Status Card */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{ width: '100%', maxWidth: '340px', background: 'var(--card)', borderRadius: '28px', border: '1px solid var(--border)', padding: '24px', marginBottom: '32px', boxShadow: '0 8px 25px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={16} color="#f97316" />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#f97316' }}>Verification Pending</span>
        </div>
        <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#94a3b8', lineHeight: 1.6 }}>
          Your request is waiting for Karan Sir's approval. Please check back shortly or reach out directly.
        </p>
        <div style={{ position: 'absolute', right: '-15px', bottom: '-20px', fontSize: '80px', opacity: 0.03, fontWeight: 900, fontStyle: 'italic', pointerEvents: 'none' }}>GATE</div>
      </motion.div>

      {/* Action Buttons */}
      <div style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <motion.button 
          whileTap={{ scale: 0.97 }}
          onClick={checkStatus}
          disabled={checking}
          style={{ width: '100%', padding: '20px', borderRadius: '22px', background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff', border: 'none', fontWeight: 900, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.1)', opacity: checking ? 0.7 : 1 }}
        >
          {checking ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
          Check Status
        </motion.button>

        <motion.button 
          whileTap={{ scale: 0.97 }}
          onClick={() => window.open('https://wa.me/917054937918', '_blank')}
          style={{ width: '100%', padding: '20px', borderRadius: '22px', background: 'linear-gradient(135deg, #22c55e, #10b981)', color: '#fff', border: 'none', fontWeight: 900, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(16, 185, 129, 0.2)' }}
        >
          <MessageSquare size={18} fill="#fff" />
          Message Karan Sir
        </motion.button>

        <button 
          onClick={() => router.replace('/login')}
          style={{ marginTop: '12px', background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', letterSpacing: '1px' }}
        >
          <ChevronLeft size={16} strokeWidth={3} /> Back to Login
        </button>
      </div>

    </div>
  );
}
