'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Loader2, IndianRupee, ShieldCheck, ShieldAlert, Clock, ReceiptText, AlertTriangle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useLanguage } from '@/lib/LanguageContext';

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
  }, []);

  if (loading || !student) return (
    <div className="h-svh flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div style={{ position: 'relative' }}>
        <div className="absolute inset-0 rounded-full animate-ping" style={{ border: '2px solid rgba(16,185,129,0.25)' }} />
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 className="animate-spin" size={20} style={{ color: '#10b981' }} />
        </div>
      </div>
    </div>
  );

  const clearance = getClearanceLevel(student.paid_till);

  const statusConfig: Record<string, { color: string; bg: string; border: string; glow: string; gradientFrom: string; gradientTo: string; title: string; subtitle: string; Icon: any; textLight: boolean }> = {
    cleared: {
      color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)',
      glow: 'rgba(16,185,129,0.4)', gradientFrom: '#059669', gradientTo: '#10b981',
      title: t('cleared'), subtitle: `Till: ${student.paid_till}`,
      Icon: ShieldCheck, textLight: true,
    },
    warning: {
      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)',
      glow: 'rgba(245,158,11,0.4)', gradientFrom: '#d97706', gradientTo: '#f59e0b',
      title: t('dueSoon'), subtitle: `${t('pendingFor')} 1 ${t('month')}`,
      Icon: AlertCircle, textLight: false,
    },
    alert: {
      color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)',
      glow: 'rgba(249,115,22,0.4)', gradientFrom: '#ea580c', gradientTo: '#f97316',
      title: t('overdue'), subtitle: `${t('pendingFor')} 2 ${t('months')}`,
      Icon: AlertTriangle, textLight: true,
    },
    danger: {
      color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)',
      glow: 'rgba(239,68,68,0.4)', gradientFrom: '#dc2626', gradientTo: '#ef4444',
      title: t('actionNeeded'),
      subtitle: student.paid_till && student.paid_till.toUpperCase() !== 'PENDING' ? `${t('overdueSince')} ${student.paid_till}` : t('contactAdmin'),
      Icon: ShieldAlert, textLight: true,
    },
  };

  const cfg = statusConfig[clearance.level];const totalPaid = history.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

  return (
    <div className="min-h-screen pb-40 font-sans" style={{ background: 'var(--background)', color: 'var(--text)' }}>

      {/* Ambient orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '-8%', right: '-12%', width: 340, height: 340, borderRadius: '50%', background: `radial-gradient(circle, ${cfg.glow.replace('0.4','0.08')} 0%, transparent 70%)`, filter: 'blur(50px)', transition: 'background 0.5s' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '-10%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      <div className="max-w-md mx-auto px-5 pt-28">

        {/* ── Back ── */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 mb-10 active:scale-95 transition-transform"
          style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.4 }}
        >
          <ArrowLeft size={15} strokeWidth={3} /> {t('dashboard')}
        </button>

        {/* ── Header ── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 44, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 0.92, color: 'var(--text)' }}>
            {t('feeDiary')}
          </h1>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.3, marginTop: 8 }}>
            {t('financeNode')}
          </p>
          <div style={{ marginTop: 16, height: 1, background: `linear-gradient(90deg, ${cfg.color}55, transparent)`, borderRadius: 1, transition: 'background 0.5s' }} />
        </div>

        {/* ── STATUS HERO CARD ── */}
        <div style={{ borderRadius: 32, background: `linear-gradient(135deg, ${cfg.gradientFrom}, ${cfg.gradientTo})`, padding: '28px 24px', position: 'relative', overflow: 'hidden', marginBottom: 20, boxShadow: `0 20px 60px ${cfg.glow}` }}>
          {/* Watermark icon */}
          <div style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.1, transform: 'rotate(-12deg)' }}>
            <cfg.Icon size={130} style={{ color: cfg.textLight ? '#fff' : '#000' }} />
          </div>
          {/* Shine overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)', borderRadius: 32, pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.28em', textTransform: 'uppercase', color: cfg.textLight ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)', marginBottom: 10 }}>
              {t('currentStatus')}
            </p>
            <h2 style={{ fontSize: 36, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 0.95, color: cfg.textLight ? '#fff' : '#1a1200', marginBottom: 8 }}>
              {cfg.title}
            </h2>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: cfg.textLight ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.5)' }}>
              {cfg.subtitle}
            </p>
          </div>
        </div>

        {/* ── TOTAL PAID PILL ── */}
        {history.length > 0 && (
          <div style={{ borderRadius: 20, background: 'var(--card)', border: '1px solid var(--border)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
            <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.35 }}>
              Total Paid
            </p>
            <span style={{ fontSize: 22, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.03em', color: '#10b981', textShadow: '0 0 16px rgba(16,185,129,0.3)' }}>
              ₹{totalPaid.toLocaleString('en-IN')}
            </span>
          </div>
        )}{/* ── PAYMENT HISTORY ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingLeft: 4 }}>
            <ReceiptText size={13} style={{ color: 'var(--text)', opacity: 0.3 }} />
            <h2 style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.3 }}>
              {t('paymentHistory')}
            </h2>
          </div>

          {history.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map((payment, index) => (
                <div
                  key={payment.id}
                  style={{
                    borderRadius: 24,
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    padding: '16px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14,
                    animation: 'fadeSlideIn 0.35s ease both',
                    animationDelay: `${index * 0.05}s`,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Left green stripe accent */}
                  <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: '0 3px 3px 0', background: 'linear-gradient(180deg, #10b981, #059669)', opacity: 0.6 }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0, paddingLeft: 8 }}>
                    {/* Icon */}
                    <div style={{ width: 44, height: 44, borderRadius: 16, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <IndianRupee size={18} style={{ color: '#10b981' }} />
                    </div>

                    {/* Text */}
                    <div style={{ minWidth: 0 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--text)', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
                        {payment.fee_title}
                      </h4>
                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.35, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={9} />
                        {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>

                  {/* Amount */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.03em', color: '#10b981', textShadow: '0 0 12px rgba(16,185,129,0.25)' }}>
                      ₹{Number(payment.amount_paid).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

          ) : (
            <div style={{ textAlign: 'center', padding: '60px 24px', borderRadius: 28, background: 'var(--card)', border: '1px dashed var(--border)', opacity: 0.5 }}>
              <ReceiptText size={36} style={{ color: 'var(--text)', opacity: 0.2, margin: '0 auto 12px' }} />
              <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.4, lineHeight: 1.8 }}>
                {t('noPaymentRecords')}
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}