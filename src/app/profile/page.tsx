'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Calendar as CalIcon, BarChart3, User, ChevronRight, Loader2, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/LanguageContext';
import { supabase } from '@/lib/supabase';

export default function Profile() {
  const router = useRouter();
  const { t } = useLanguage();
  const [student, setStudent] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const id = localStorage.getItem('studentId');
    if (!id) {
      router.push('/login');
      return;
    }
    const fetchStudent = async () => {
      const { data } = await supabase.from('students').select('*').eq('id', id).single();
      if (data) setStudent(data);
    };
    fetchStudent();
  }, [router]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !student?.id) return;
    setUploading(true);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = Math.min(img.width, img.height);
      const startX = (img.width - size) / 2;
      const startY = (img.height - size) / 2;
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, startX, startY, size, size, 0, 0, 400, 400);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const fileName = `${student.id}_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) {
          alert('Upload failed: ' + uploadError.message);
          setUploading(false);
          return;
        }
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        const publicUrl = urlData.publicUrl;
        await supabase.from('students').update({ avatar_url: publicUrl }).eq('id', student.id);
        setStudent((prev: any) => ({ ...prev, avatar_url: publicUrl }));
        setUploading(false);
      }, 'image/jpeg', 0.8);
    };
    img.src = URL.createObjectURL(file);
  };

  if (!mounted || !student) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <Loader2 className="animate-spin" color="#3b82f6" size={32} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--background)', color: 'var(--text)', padding: '40px 20px 120px', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <input type="file" style={{ display: 'none' }} ref={fileInputRef} accept="image/*" onChange={handleImageUpload} />

      {/* Ambient Orbs */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -10, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-5%', left: '50%', transform: 'translateX(-50%)', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: '260px', height: '260px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.04) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '16px' }}>
        <button 
          onClick={() => router.push('/dashboard')}
          style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: 'transform 0.2s' }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <ChevronLeft size={26} strokeWidth={2.5} />
        </button>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--text)', letterSpacing: '1px' }}>
          {t('profile') || 'STUDENT ID'}
        </h1>
        <div style={{ width: '48px' }} /> {/* Spacer to center the title */}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        
        {/* Modern Avatar Section */}
        <div style={{ position: 'relative', marginBottom: '24px', marginTop: '16px' }}>
          
          <div style={{ width: '140px', height: '140px', borderRadius: '42px', padding: '6px', background: '#fff', border: '1px solid var(--border)', boxShadow: '0 15px 40px rgba(0,0,0,0.06)', position: 'relative', zIndex: 10 }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '36px', overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {uploading ? (
                <Loader2 className="animate-spin" size={36} color="#3b82f6" />
              ) : student?.avatar_url ? (
                <img src={student.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '56px', fontWeight: 900, fontStyle: 'italic', color: '#cbd5e1' }}>
                  {student?.name?.[0] || <User size={56} color="#cbd5e1" />}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ position: 'absolute', bottom: '-4px', right: '-4px', zIndex: 20, width: '48px', height: '48px', borderRadius: '16px', background: '#3b82f6', border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 6px 16px rgba(59,130,246,0.3)', transition: 'transform 0.2s' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Camera size={20} color="#fff" />
          </button>
        </div>

        {/* Name & Badges */}
        <div style={{ textAlign: 'center', marginBottom: '40px', width: '100%' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '34px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: 'var(--text)', lineHeight: 1, letterSpacing: '-1px' }}>
            {student?.name}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {student?.class && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '8px 16px', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>
                  CLASS {student.class}
                </span>
              </div>
            )}
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '16px', padding: '8px 16px' }}>
              <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#3b82f6' }}>
                {t('nodeId') || 'NODE ID'}: {student?.id}
              </span>
            </div>
          </div>
        </div>

        {/* Dashboard-Style Menu Cards */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <ProfileCard
            onClick={() => router.push('/profile/attendance')}
            icon={<CalIcon size={26} color="white" />}
            gradient="linear-gradient(135deg, #f97316, #f59e0b)"
            title={t('attendance') || 'ATTENDANCE'}
            subtitle={t('consistencyPulse') || 'CONSISTENCY TRACKER'}
            watermark="📅"
            index={0}
          />
          <ProfileCard
            onClick={() => router.push('/profile/performance')}
            icon={<BarChart3 size={26} color="white" />}
            gradient="linear-gradient(135deg, #3b82f6, #06b6d4)"
            title={t('performance') || 'PERFORMANCE'}
            subtitle={t('academicLedger') || 'ACADEMIC LEDGER'}
            watermark="📊"
            index={1}
          />
        </div>
      </div>
    </div>
  );
}

// Reusable Solid Gradient Card Component (Matches Dashboard)
function ProfileCard({ onClick, icon, gradient, title, subtitle, watermark, index }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{ 
        background: gradient, borderRadius: '30px', padding: '20px 24px', 
        position: 'relative', overflow: 'hidden', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 12px 30px rgba(0,0,0,0.1)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', zIndex: 1 }}>
        <div style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.25)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '22px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1 }}>{title}</h3>
          <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '11px', fontWeight: 900, letterSpacing: '0.5px' }}>{subtitle}</p>
        </div>
      </div>
      <ChevronRight color="white" size={28} style={{ opacity: 0.7 }} />
      
      {/* Background Watermark */}
      <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', fontSize: '85px', opacity: 0.15, pointerEvents: 'none' }}>
        {watermark}
      </span>
    </motion.div>
  );
}
