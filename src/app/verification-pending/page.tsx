'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, Clock, MessageSquare, RefreshCcw, ChevronLeft } from 'lucide-react';

export default function VerificationPending() {
  const router = useRouter();
  const [studentName, setStudentName] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem('attemptedLoginId');
    if (!id) {
      router.replace('/login');
      return;
    }

    // Fetch student name to make it personal
    const getStudent = async () => {
      const { data } = await supabase.from('students').select('name').eq('id', id).single();
      if (data) setStudentName(data.name);
    };
    getStudent();
  }, []);

  const checkStatus = async () => {
    setChecking(true);
    const id = localStorage.getItem('attemptedLoginId');
    const { data } = await supabase.from('students').select('device_status, device_id').eq('id', id).single();
    
    if (data?.device_status === 'verified') {
      // If Admin (you) approved it, clear the temporary ID and send them to login
      localStorage.removeItem('attemptedLoginId');
      alert("Device Approved! You can now login.");
      router.replace('/login');
    } else {
      setTimeout(() => {
        setChecking(false);
        alert("Status: Still Pending. Please wait for Karan Sir to approve.");
      }, 800);
    }
  };

  return (
    <div style={{ minHeight: '100svh', background: 'var(--background)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', color: 'var(--text)', textAlign: 'center' }}>
      
      <div style={{ width: 80, height: 80, borderRadius: 30, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <ShieldAlert size={36} style={{ color: '#f97316' }} />
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', marginBottom: 8 }}>
        Security <span style={{ color: '#f97316' }}>Gate</span>
      </h1>
      
      <p style={{ fontSize: 13, fontWeight: 600, opacity: 0.6, maxWidth: 280, lineHeight: 1.6 }}>
        Hello <span style={{ color: 'var(--text)', fontWeight: 800 }}>{studentName || 'Student'}</span>, this device is not recognized for your ID.
      </p>

      <div style={{ margin: '32px 0', padding: '20px', borderRadius: 24, background: 'var(--card)', border: '1px solid var(--border)', width: '100%', maxWidth: 320 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Clock size={18} style={{ color: '#f97316' }} />
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status: Verification Pending</span>
        </div>
        <p style={{ fontSize: 10, fontWeight: 600, opacity: 0.5, textAlign: 'left' }}>
          Your login request has been sent to Karan Sir. Please wait for approval or contact him via WhatsApp.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
        <button 
          onClick={checkStatus}
          disabled={checking}
          style={{ width: '100%', padding: '18px', borderRadius: 18, background: 'var(--text)', color: 'var(--background)', border: 'none', fontWeight: 900, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}
        >
          <RefreshCcw size={16} className={checking ? 'animate-spin' : ''} />
          Check Approval Status
        </button>

        <button 
          onClick={() => window.open('https://wa.me/917054937918', '_blank')}
          style={{ width: '100%', padding: '18px', borderRadius: 18, background: 'rgba(37,211,102,0.1)', color: '#25d366', border: '1px solid rgba(37,211,102,0.2)', fontWeight: 900, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}
        >
          <MessageSquare size={16} fill="#25d366" />
          Message Karan Sir
        </button>

        <button 
          onClick={() => router.replace('/login')}
          style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--text)', opacity: 0.4, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}
        >
          <ChevronLeft size={14} /> Back to Login
        </button>
      </div>
    </div>
  );
}
