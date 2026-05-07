'use client';
import React, { useState, useEffect } from 'react';
import { Calendar, Star, ArrowUpRight, Zap, Loader2, MessageSquare, Trophy, ChevronRight, Crown, ListChecks, Bell, Megaphone, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';

export default function Dashboard() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [student, setStudent] = useState<any>(null);
  const [globalNotice, setGlobalNotice] = useState("...");
  const [classNotice, setClassNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [rank, setRank] = useState<number | string>('--');

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
    const role = localStorage.getItem('role');
    if (role === 'principal' || role === 'teacher') { router.push('/admin'); return; }
    const activeId = localStorage.getItem('studentId');
    if (!activeId) { router.push('/login'); return; }

    const fetchDashboardData = async () => {
      setLoading(true);
      const { data: studentData } = await supabase.from('students').select('*').eq('id', activeId).single();
      if (studentData) {
        setStudent(studentData);
        const cleanClass = studentData.class.toLowerCase().replace(/(st|nd|rd|th)/g, "").trim();
        const classNoticeKey = `notice_class_${cleanClass}`;
        const [globalRes, classRes] = await Promise.all([
          supabase.from('config').select('value').eq('key', 'global_notice').maybeSingle(),
          supabase.from('config').select('value').eq('key', classNoticeKey).maybeSingle()
        ]);
        if (globalRes.data) setGlobalNotice(globalRes.data.value);
        if (classRes.data) setClassNotice(classRes.data.value);
        const { data: classmates } = await supabase.from('students').select('id').eq('class', studentData.class);
        const classmateIds = classmates ? classmates.map(c => c.id) : [activeId];
        const { data: allScores } = await supabase.from('test_scores').select('student_id, marks_obtained, total_marks').in('student_id', classmateIds);
        if (allScores) {
          const studentStats: any = {};
          classmateIds.forEach(id => { studentStats[id] = { got: 0, total: 0 }; });
          allScores.forEach(s => {
            if (studentStats[s.student_id]) {
              studentStats[s.student_id].got += Number(s.marks_obtained);
              studentStats[s.student_id].total += Number(s.total_marks);
            }
          });
          const rankedList = Object.keys(studentStats)
            .filter(id => studentStats[id].total > 0)
            .map(id => ({ id, avg: (studentStats[id].got / studentStats[id].total) * 100 }))
            .sort((a, b) => b.avg - a.avg);
          const myRank = rankedList.findIndex(item => item.id === activeId) + 1;
          setRank(myRank > 0 ? myRank : '--');
        }
      }
      setLoading(false);
    };
    fetchDashboardData();
  }, [router]);

  if (loading || !student) return (
    <div className="h-svh flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div style={{ position: 'relative' }}>
        <div className="absolute inset-0 rounded-full animate-ping" style={{ border: '2px solid rgba(59,130,246,0.25)' }} />
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <Loader2 className="animate-spin" size={22} style={{ color: '#3b82f6' }} />
        </div>
      </div>
    </div>
  );

  const clearance = getClearanceLevel(student.paid_till);

  const badgeConfig: Record<string, { bg: string; border: string; label: string; color: string }> = {
    cleared:  { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)',  label: t('paidTill'),     color: '#10b981' },
    warning:  { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.3)',   label: t('dueSoon'),      color: '#f59e0b' },
    alert:    { bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.3)',   label: t('overdue'),      color: '#f97316' },
    danger:   { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)',   label: t('actionNeeded'), color: '#ef4444' },
  };
  const badge = badgeConfig[clearance.level];
  return (
    <div className="min-h-screen pb-32 font-sans" style={{ background: 'var(--background)', color: 'var(--text)' }}>

      {/* Ambient orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '-5%', right: '-10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '-10%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      {/* ── HERO ── */}
      <div className="px-5 pt-28 pb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          
          {/* Avatar & Name block */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
            {/* Cube-shaped Profile Picture */}
            <div style={{ 
              width: 64, 
              height: 64, 
              borderRadius: 20, 
              background: 'rgba(59,130,246,0.1)', 
              border: '1px solid rgba(59,130,246,0.2)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flexShrink: 0, 
              overflow: 'hidden',
              boxShadow: '0 4px 15px rgba(59,130,246,0.15)'
            }}>
              {student.avatar_url ? (
                <img src={student.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 28, fontWeight: 900, fontStyle: 'italic', color: '#3b82f6' }}>
                  {student.name[0]}
                </span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.35, marginBottom: 4 }}>
                {t('welcome')}
              </p>
              <h1 style={{ fontSize: 30, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 0.95, color: 'var(--text)' }}>
                {student.name.split(' ')[0].split('').map((char: string, i: number) => (
                  <span key={i} style={{ color: i === 0 ? '#3b82f6' : 'var(--text)' }}>{char}</span>
                ))}
              </h1>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.3, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {student.class} {t('student')} · ID: {student.id}
              </p>
            </div>
          </div>

          {/* Fee badge */}
          <div style={{ flexShrink: 0, padding: '10px 14px', borderRadius: 16, background: badge.bg, border: `1px solid ${badge.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 7, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: badge.color, opacity: 0.8 }}>
              {badge.label}
            </span>
            <span style={{ fontSize: 13, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em', color: badge.color }}>
              {student.paid_till || t('pending')}
            </span>
          </div>
        </div>

        {/* Thin accent line */}
        <div style={{ marginTop: 24, height: 1, background: 'linear-gradient(90deg, rgba(59,130,246,0.4), transparent)', borderRadius: 1 }} />
      </div>

      <div className="px-5 space-y-3">

        {/* ── LIVE NOTICE ── */}
        <div style={{ borderRadius: 28, background: 'var(--card)', border: '1px solid var(--border)', padding: '20px 20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -8, top: -8, opacity: 0.05 }}>
            <Megaphone size={72} style={{ color: '#3b82f6' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px rgba(59,130,246,0.6)', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#3b82f6' }}>
              {t('liveNotice')}
            </span>
          </div>
          <p style={{ fontSize: 13, fontWeight: 800, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1.45, color: 'var(--text)', position: 'relative', zIndex: 1 }}>
            "{globalNotice}"
          </p>
        </div>

        {/* ── CLASS UPDATE ── */}
        <div style={{ borderRadius: 28, background: 'rgba(249,115,22,0.04)', border: '1px dashed rgba(249,115,22,0.25)', padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -8, top: -8, opacity: 0.05 }}>
            <Bell size={72} style={{ color: '#f97316' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Bell size={9} style={{ color: '#f97316' }} />
            <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#f97316' }}>
              {student.class} {t('update')}
            </span>
          </div>
          <p style={{ fontSize: 13, fontWeight: 800, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1.45, color: 'var(--text)', position: 'relative', zIndex: 1 }}>
            {classNotice ? `"${classNotice}"` : "No specific updates for your class today. Keep studying! 🦊"}
          </p>
        </div>

        {/* ── FEE DIARY ── */}
        <div
          onClick={() => router.push('/fees')}
          style={{ borderRadius: 28, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s', position: 'relative', overflow: 'hidden' }}
          className="active:scale-[0.98]"
        >
          <div style={{ position: 'absolute', right: -16, top: '50%', transform: 'translateY(-50%)', opacity: 0.04 }}>
            <Wallet size={90} style={{ color: '#10b981' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
            <div style={{ width: 52, height: 52, borderRadius: 18, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={24} style={{ color: '#10b981' }} />
            </div>
            <div>
              <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#10b981', marginBottom: 3 }}>{t('financeNode')}</p>
              <h3 style={{ fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1 }}>{t('feeDiary')}</h3>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: 'rgba(16,185,129,0.5)', flexShrink: 0 }} />
        </div>

        {/* ── RANK ── */}
        <div
          onClick={() => router.push('/leaderboard')}
          style={{ borderRadius: 28, background: 'var(--card)', border: '1px solid var(--border)', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
          className="active:scale-[0.98]"
        >
          <div style={{ position: 'absolute', right: -16, top: '50%', transform: 'translateY(-50%)', opacity: 0.04 }}>
            <Trophy size={90} style={{ color: '#f5c842' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
            <div style={{ width: 52, height: 52, borderRadius: 18, background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={24} style={{ color: '#f5c842' }} />
            </div>
            <div>
              <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#f5c842', marginBottom: 3 }}>{t('rank')}</p>
              <h3 style={{ fontSize: 28, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1, textShadow: rank === 1 ? '0 0 20px rgba(245,200,66,0.3)' : 'none' }}>
                {rank === 1 ? <Crown size={20} style={{ display: 'inline', color: '#f5c842', marginRight: 4 }} /> : null}#{rank}
              </h3>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: 'rgba(200,200,200,0.3)', flexShrink: 0 }} />
        </div>

        {/* ── SYLLABUS ── */}
        <div
          onClick={() => router.push('/syllabus')}
          style={{ borderRadius: 28, background: 'var(--card)', border: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          className="active:scale-[0.98]"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ListChecks size={20} style={{ color: '#ef4444' }} />
            </div>
            <div>
              <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text)', opacity: 0.35, marginBottom: 3 }}>{t('syllabus')}</p>
              <h4 style={{ fontSize: 15, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--text)', lineHeight: 1 }}>{t('trackProgress')}</h4>
            </div>
          </div>
          <ArrowUpRight size={16} style={{ color: 'rgba(200,200,200,0.3)', flexShrink: 0 }} />
        </div>

        {/* ── WHATSAPP ── */}
        <div
          onClick={() => window.open('https://chat.whatsapp.com/Fdahi7f77q15O7i2KNvAc3', '_blank')}
          style={{ borderRadius: 28, background: 'var(--card)', border: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          className="active:scale-[0.98]"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 16, background: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(37,211,102,0.25)' }}>
              <MessageSquare size={20} fill="white" style={{ color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#25d366', marginBottom: 3 }}>{t('support')}</p>
              <h4 style={{ fontSize: 15, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--text)', lineHeight: 1 }}>{t('whatsappGroup')}</h4>
            </div>
          </div>
          <ArrowUpRight size={16} style={{ color: 'rgba(200,200,200,0.3)', flexShrink: 0 }} />
        </div>

      </div>
    </div>
  );
}
