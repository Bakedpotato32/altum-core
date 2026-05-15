'use client';
import React, { useState, useEffect } from 'react';
import { 
  Bell, Trophy, ChevronRight, ListChecks, Megaphone, 
  Gamepad2, Calculator, Loader2, Star, MessageSquare, ArrowUpRight,
  ReceiptText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';

export default function Dashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const [student, setStudent] = useState<any>(null);
  const [globalNotice, setGlobalNotice] = useState("...");
  const [classNotice, setClassNotice] = useState("");
  const [rank, setRank] = useState<number | string>('--');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const activeId = localStorage.getItem('studentId');
    if (!activeId) { router.push('/login'); return; }

    const fetchData = async () => {
      const { data: sData } = await supabase.from('students').select('*').eq('id', activeId).single();
      if (sData) {
        setStudent(sData);
        const cleanClass = sData.class.toLowerCase().replace(/(st|nd|rd|th)/g, "").trim();
        const [gn, cn] = await Promise.all([
          supabase.from('config').select('value').eq('key', 'global_notice').maybeSingle(),
          supabase.from('config').select('value').eq('key', `notice_class_${cleanClass}`).maybeSingle()
        ]);
        if (gn.data) setGlobalNotice(gn.data.value);
        if (cn.data) setClassNotice(cn.data.value);

        const { data: classmates } = await supabase.from('students').select('id').eq('class', sData.class);
        const classmateIds = classmates?.map(c => c.id) || [activeId];
        const { data: allScores } = await supabase.from('test_scores').select('student_id, marks_obtained, total_marks').in('student_id', classmateIds);
        if (allScores) {
          const stats: any = {};
          classmateIds.forEach(id => { stats[id] = { got: 0, total: 0 }; });
          allScores.forEach(s => { if (stats[s.student_id]) { stats[s.student_id].got += Number(s.marks_obtained); stats[s.student_id].total += Number(s.total_marks); }});
          const ranked = Object.keys(stats).filter(id => stats[id].total > 0).map(id => ({ id, avg: stats[id].got / stats[id].total })).sort((a,b) => b.avg - a.avg);
          const myPos = ranked.findIndex(x => x.id === activeId) + 1;
          setRank(myPos > 0 ? myPos : '--');
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [router]);

  if (loading || !student) return (
    <div style={{ minHeight: '50svh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 className="animate-spin" color="#3b82f6" size={32} />
    </div>
  );

  const isPending = student.paid_till?.toUpperCase() === 'PENDING' || !student.paid_till;

  return (
    <div style={{ padding: '16px 20px 40px', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. PROFILE SECTION */}
      <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '22px', border: '3px solid #3b82f6', padding: '3px', overflow: 'hidden', boxShadow: '0 8px 20px rgba(59, 130, 246, 0.2)', background: '#fff' }}>
             <img src={student.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Karan'} style={{ width: '100%', height: '100%', borderRadius: '14px', objectFit: 'cover' }} alt="avatar" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('welcomeBack')}</p>
            <h1 style={{ margin: '2px 0', fontSize: '26px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#0f172a', lineHeight: 1 }}>{student.name.split(' ')[0]}</h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>CLASS {student.class} • {student.id}</p>
          </div>
        </div>
        <div 
          onClick={() => router.push('/fees')} 
          style={{ background: isPending ? '#fee2e2' : '#dcfce7', padding: '10px 14px', borderRadius: '18px', textAlign: 'center', cursor: 'pointer', boxShadow: isPending ? '0 4px 15px rgba(239, 68, 68, 0.15)' : '0 4px 15px rgba(16, 185, 129, 0.15)', transition: 'transform 0.2s', flexShrink: 0 }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <p style={{ margin: 0, fontSize: '8px', fontWeight: 900, color: isPending ? '#ef4444' : '#10b981', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{t('feesStatus')}</p>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: isPending ? '#ef4444' : '#10b981' }}>{isPending ? t('pending') : student.paid_till}</p>
        </div>
      </div>

      {/* 2. SCHOOL NOTICE */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ position: 'relative', padding: '18px 22px', background: '#fff', borderRadius: '28px', boxShadow: '0 8px 25px rgba(0,0,0,0.04)', borderLeft: '5px solid #3b82f6', border: '1px solid #f1f5f9', borderLeftWidth: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Megaphone size={18} color="#3b82f6" />
          <span style={{ fontSize: '11px', fontWeight: 900, color: '#3b82f6', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{t('schoolNotice')}</span>
        </div>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#334155', lineHeight: 1.6, fontStyle: 'italic', opacity: 0.9 }}>"{globalNotice}"</p>
      </motion.div>

      {/* 3. CLASS NOTICE */}
      {classNotice && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ position: 'relative', padding: '18px 22px', background: '#fff', borderRadius: '28px', boxShadow: '0 8px 25px rgba(0,0,0,0.04)', borderLeft: '5px solid #f97316', border: '1px solid #f1f5f9', borderLeftWidth: '5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Bell size={18} color="#f97316" />
            <span style={{ fontSize: '11px', fontWeight: 900, color: '#f97316', letterSpacing: '0.5px', textTransform: 'uppercase' }}>CLASS {student.class} {t('classUpdate')}</span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#334155', lineHeight: 1.6, fontStyle: 'italic', opacity: 0.9 }}>"{classNotice}"</p>
        </motion.div>
      )}

      {/* 4. KIDS HUB (Main Banner) */}
      <motion.div 
        whileTap={{ scale: 0.96 }}
        onClick={() => router.push('/kids')}
        style={{ 
          background: 'linear-gradient(135deg, #FF416C, #8E2DE2)', 
          borderRadius: '32px', padding: '24px', position: 'relative', overflow: 'hidden', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 15px 35px rgba(142, 45, 226, 0.25)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', zIndex: 1 }}>
          <div style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.2)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)' }}>
            <Star fill="white" color="white" size={28} />
          </div>
          <div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '26px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1, textTransform: 'uppercase' }}>{t('kidsHub')}</h2>
            <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.9)', fontSize: '10px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase' }}>{t('playLearn')}</p>
          </div>
        </div>
        <ChevronRight color="white" size={28} strokeWidth={3} style={{ opacity: 0.8 }} />
        <span style={{ position: 'absolute', right: '10%', top: '50%', transform: 'translateY(-50%)', fontSize: '90px', opacity: 0.1, pointerEvents: 'none' }}>🎈</span>
      </motion.div>

      {/* 5. FUNCTIONAL CARDS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <ActivityCard 
          onClick={() => router.push('/fees')}
          icon={<ReceiptText size={24} />}
          title={t('feeDiary')}
          subtitle={t('paymentsDues')}
          gradient="linear-gradient(135deg, #10b981, #059669)"
          watermark="💳"
        />
        <ActivityCard 
          onClick={() => router.push('/learning-lab')}
          icon={<Calculator size={24} />}
          title={t('learningLab')}
          subtitle={t('smartTools')}
          gradient="linear-gradient(135deg, #06b6d4, #0284c7)"
          watermark="🔬"
        />
        <ActivityCard 
          onClick={() => router.push('/leaderboard')}
          icon={<Trophy size={24} />}
          title={`${t('rank')} #${rank}`}
          subtitle="CLASS PERFORMANCE"
          gradient="linear-gradient(135deg, #f59e0b, #d97706)"
          watermark="🥇"
        />
        <ActivityCard 
          onClick={() => router.push('/arcade')}
          icon={<Gamepad2 size={24} />}
          title={t('altumArcade')}
          subtitle={t('miniGames')}
          gradient="linear-gradient(135deg, #8b5cf6, #6d28d9)"
          watermark="👾"
        />
        <ActivityCard 
          onClick={() => router.push('/syllabus')}
          icon={<ListChecks size={24} />}
          title={t('trackProgress')}
          subtitle={t('syllabus')}
          gradient="linear-gradient(135deg, #f43f5e, #be123c)"
          watermark="📈"
        />
        <ActivityCard 
          onClick={() => window.open('https://chat.whatsapp.com/Fdahi7f77q15O7i2KNvAc3', '_blank')}
          icon={<MessageSquare size={24} fill="white" />}
          title={t('helpGroup')}
          subtitle={t('studentSupport')}
          gradient="linear-gradient(135deg, #22c55e, #16a34a)"
          watermark="💬"
          isExternal
        />
      </div>
    </div>
  );
}

// Compact Card Component
function ActivityCard({ onClick, icon, title, subtitle, gradient, watermark, isExternal }: any) {
  return (
    <motion.div 
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{ 
        background: gradient, borderRadius: '26px', padding: '16px 20px', 
        position: 'relative', overflow: 'hidden', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', zIndex: 1 }}>
        <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.25)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.2)' }}>
          {React.cloneElement(icon as React.ReactElement, { color: 'white' })}
        </div>
        <div>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1, textTransform: 'uppercase' }}>{title}</h3>
          <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '10px', fontWeight: 900, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{subtitle}</p>
        </div>
      </div>
      {isExternal ? <ArrowUpRight color="white" size={24} style={{ opacity: 0.7 }} /> : <ChevronRight color="white" size={24} style={{ opacity: 0.7 }} />}
      
      {/* Background Watermark */}
      <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', fontSize: '75px', opacity: 0.15, pointerEvents: 'none' }}>
        {watermark}
      </span>
    </motion.div>
  );
}
