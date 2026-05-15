'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Loader2, IndianRupee, ShieldCheck, ShieldAlert, Clock, ReceiptText, AlertTriangle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useLanguage } from '@/lib/LanguageContext';
import { motion } from 'framer-motion';

export default function StudentFeeDiary() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const getClearanceLevel = (paidTill: string | null) => {
    if (!paidTill || paidTill.toUpperCase() === 'PENDING') return { level: 'danger', monthsBehind: 99 };
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const str = paidTill.toUpperCase();
    let parsedMonth = -1;
    let parsedYear = currentYear;
    months.forEach((m, idx) => { if (str.includes(m)) parsedMonth = idx; });
    const yearMatch = str.match(/\d{4}/);
    if (yearMatch) parsedYear = parseInt(yearMatch[0]);
    if (parsedMonth === -1) return { level: 'cleared', monthsBehind: 0 };
    const totalCurrentMonths = currentYear * 12 + currentMonth;
    const totalPaidMonths = parsedYear * 12 + parsedMonth;
    const monthsBehind = totalCurrentMonths - totalPaidMonths;
    if (monthsBehind <= 0) return { level: 'cleared', monthsBehind: 0 };
    if (monthsBehind === 1) return { level: 'warning', monthsBehind: 1 };
    if (monthsBehind === 2) return { level: 'alert', monthsBehind: 2 };
    return { level: 'danger', monthsBehind };
  };

  useEffect(() => {
    const activeId = localStorage.getItem('studentId');
    if (!activeId) { router.push('/login'); return; }
    const fetchFees = async () => {
      setLoading(true);
      const [{ data: stData }, { data: histData }] = await Promise.all([
        supabase.from('students').select('*').eq('id', activeId).single(),
        supabase.from('fee_payments').select('*').eq('student_id', activeId).order('payment_date', { ascending: false })
      ]);
      if (stData) setStudent(stData);
      if (histData) setHistory(histData);
      setLoading(false);
    };
    fetchFees();
  }, [router]);

  if (loading || !student) return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
      <Loader2 className="animate-spin" color="#10b981" size={32} />
    </div>
  );

  const clearance = getClearanceLevel(student.paid_till);

  const statusConfig: Record<string, { color: string; glow: string; gradient: string; title: string; subtitle: string; Icon: any; textLight: boolean }> = {
    cleared: {
      color: '#10b981', glow: 'rgba(16,185,129,0.3)', gradient: 'linear-gradient(135deg, #10b981, #059669)',
      title: t('cleared') || 'CLEARED', subtitle: `Till: ${student.paid_till}`, Icon: ShieldCheck, textLight: true,
    },
    warning: {
      color: '#f59e0b', glow: 'rgba(245,158,11,0.3)', gradient: 'linear-gradient(135deg, #fcd34d, #f59e0b)',
      title: t('dueSoon') || 'DUE SOON', subtitle: `${t('pendingFor') || 'PENDING FOR'} 1 ${t('month') || 'MONTH'}`, Icon: AlertCircle, textLight: false,
    },
    alert: {
      color: '#f97316', glow: 'rgba(249,115,22,0.3)', gradient: 'linear-gradient(135deg, #fb923c, #ea580c)',
      title: t('overdue') || 'OVERDUE', subtitle: `${t('pendingFor') || 'PENDING FOR'} 2 ${t('months') || 'MONTHS'}`, Icon: AlertTriangle, textLight: true,
    },
    danger: {
      color: '#ef4444', glow: 'rgba(239,68,68,0.3)', gradient: 'linear-gradient(135deg, #ef4444, #b91c1c)',
      title: t('actionNeeded') || 'ACTION NEEDED',
      subtitle: student.paid_till && student.paid_till.toUpperCase() !== 'PENDING' ? `${t('overdueSince') || 'OVERDUE SINCE'} ${student.paid_till}` : (t('contactAdmin') || 'CONTACT ADMIN'),
      Icon: ShieldAlert, textLight: true,
    },
  };

  const cfg = statusConfig[clearance.level];
  const totalPaid = history.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

  return (
    <div style={{ minHeight: '100svh', background: 'var(--background)', color: 'var(--text)', padding: '40px 20px 120px', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>

      {/* Ambient Orbs */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -10, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '320px', height: '320px', borderRadius: '50%', background: cfg.glow, filter: 'blur(80px)', transition: 'background 0.5s ease' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '-10%', width: '260px', height: '260px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.08)', filter: 'blur(80px)' }} />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <button 
          onClick={() => router.push('/dashboard')}
          style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', flexShrink: 0, transition: 'transform 0.2s' }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <ChevronLeft size={26} strokeWidth={2.5} />
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <ReceiptText size={14} color={cfg.color} strokeWidth={3} />
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 900, color: cfg.color, letterSpacing: '1px', textTransform: 'uppercase' }}>
              FINANCE NODE
            </p>
          </div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--text)', lineHeight: 1 }}>
            {t('feeDiary') || 'FEE DIARY'}
          </h1>
        </div>
      </div>

      {/* STATUS HERO CARD */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
        style={{ borderRadius: '32px', background: cfg.gradient, padding: '32px 28px', position: 'relative', overflow: 'hidden', marginBottom: '24px', boxShadow: `0 15px 40px ${cfg.glow}` }}
      >
        {/* Watermark icon */}
        <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.15, transform: 'rotate(-15deg)', pointerEvents: 'none' }}>
          <cfg.Icon size={140} style={{ color: cfg.textLight ? '#fff' : '#000' }} />
        </div>
        {/* Shine overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)', borderRadius: '32px', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '10px', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase', color: cfg.textLight ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)' }}>
            {t('currentStatus') || 'CURRENT STATUS'}
          </p>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '38px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.5px', lineHeight: 1, color: cfg.textLight ? '#fff' : '#1a1200' }}>
            {cfg.title}
          </h2>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: cfg.textLight ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.7)' }}>
            {cfg.subtitle}
          </p>
        </div>
      </motion.div>

      {/* TOTAL PAID PILL */}
      {history.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} style={{ borderRadius: '24px', background: 'var(--card)', border: '1px solid var(--border)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', boxShadow: '0 8px 20px rgba(0,0,0,0.03)' }}>
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#64748b' }}>
            TOTAL PAID
          </p>
          <span style={{ fontSize: '26px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.5px', color: '#10b981', textShadow: '0 0 15px rgba(16,185,129,0.3)', lineHeight: 1 }}>
            ₹{totalPaid.toLocaleString('en-IN')}
          </span>
        </motion.div>
      )}

      {/* PAYMENT HISTORY */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingLeft: '8px' }}>
          <ReceiptText size={16} color="#94a3b8" />
          <h2 style={{ margin: 0, fontSize: '12px', fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#94a3b8' }}>
            {t('paymentHistory') || 'PAYMENT HISTORY'}
          </h2>
        </div>

        {history.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {history.map((payment, index) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                style={{
                  borderRadius: '24px', background: 'var(--card)', border: '1px solid var(--border)',
                  padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                  position: 'relative', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                }}
              >
                {/* Left accent stripe */}
                <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '4px', borderRadius: '0 4px 4px 0', background: 'linear-gradient(180deg, #10b981, #059669)' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0, paddingLeft: '6px' }}>
                  {/* Icon Box */}
                  <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IndianRupee size={20} color="#10b981" />
                  </div>

                  {/* Text Details */}
                  <div style={{ minWidth: 0 }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--text)', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {payment.fee_title}
                    </h4>
                    <p style={{ margin: 0, fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={10} />
                      {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                    </p>
                  </div>
                </div>

                {/* Amount */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontSize: '20px', fontWeight: 900, fontStyle: 'italic', color: '#10b981', lineHeight: 1 }}>
                    ₹{Number(payment.amount_paid).toLocaleString('en-IN')}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '60px 24px', borderRadius: '32px', background: 'var(--card)', border: '2px dashed var(--border)' }}>
            <ReceiptText size={48} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#94a3b8', lineHeight: 1.6 }}>
              {t('noPaymentRecords') || 'NO PAYMENT RECORDS FOUND'}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
