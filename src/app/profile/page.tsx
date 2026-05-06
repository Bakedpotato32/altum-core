'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Calendar as CalIcon, BarChart3, User, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/lib/LanguageContext';
import { supabase } from '@/lib/supabase';

export default function Profile() {
  const { t } = useLanguage();
  const [student, setStudent] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const id = localStorage.getItem('studentId');
    if (!id) return;
    const fetchStudent = async () => {
      const { data } = await supabase.from('students').select('*').eq('id', id).single();
      if (data) setStudent(data);
    };
    fetchStudent();
  }, []);

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

  if (!mounted) return null;return (
    <div className="min-h-screen pb-32 font-sans" style={{ background: 'var(--background)', color: 'var(--text)' }}>
      <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} />

      {/* Ambient orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '-5%', left: '50%', transform: 'translateX(-50%)', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 120, paddingLeft: 20, paddingRight: 20 }}>

        {/* ── Avatar ── */}
        <div style={{ position: 'relative', marginBottom: 28, marginTop: 16 }}>
          {/* Outer glow ring */}
          <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(99,102,241,0.2))', filter: 'blur(12px)', zIndex: 0 }} />

          {/* Gradient border ring */}
          <div style={{ position: 'relative', zIndex: 1, width: 128, height: 128, borderRadius: '50%', padding: 3, background: 'linear-gradient(135deg, #3b82f6, #6366f1, #3b82f6)' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {uploading ? (
                <Loader2 className="animate-spin" size={30} style={{ color: '#3b82f6' }} />
              ) : student?.avatar_url ? (
                <img src={student.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 48, fontWeight: 900, fontStyle: 'italic', color: '#3b82f6' }}>
                  {student?.name?.[0] || <User size={48} style={{ color: '#3b82f6' }} />}
                </span>
              )}
            </div>
          </div>

          {/* Camera button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="active:scale-90 transition-transform"
            style={{ position: 'absolute', bottom: 2, right: 2, zIndex: 2, width: 34, height: 34, borderRadius: 12, background: 'linear-gradient(135deg, #2563eb, #3b82f6)', border: '3px solid var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(59,130,246,0.45)', cursor: 'pointer' }}
          >
            <Camera size={15} style={{ color: '#fff' }} />
          </button>
        </div>

        {/* ── Name & ID ── */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 34, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 0.95, color: 'var(--text)', marginBottom: 12 }}>
            {student?.name || '...'}
          </h2>

          {/* Class badge + ID badge row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            {student?.class && (
              <div style={{ padding: '5px 14px', borderRadius: 20, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6366f1' }}>
                  Class {student.class}
                </span>
              </div>
            )}
            <div style={{ padding: '5px 14px', borderRadius: 20, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#3b82f6' }}>
                {t('nodeId')}: {student?.id || '...'}
              </span>
            </div>
          </div>
        </div>{/* ── Divider ── */}
        <div style={{ width: '100%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.2), transparent)', marginBottom: 28 }} />

        {/* ── Profile Cards ── */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ProfileCard
            href="/profile/attendance"
            icon={<CalIcon size={22} style={{ color: '#f97316' }} />}
            iconBg="rgba(249,115,22,0.08)"
            iconBorder="rgba(249,115,22,0.2)"
            iconGlow="rgba(249,115,22,0.2)"
            accentColor="#f97316"
            title={t('attendance')}
            subtitle={t('consistencyPulse')}
            index={0}
          />
          <ProfileCard
            href="/profile/performance"
            icon={<BarChart3 size={22} style={{ color: '#3b82f6' }} />}
            iconBg="rgba(59,130,246,0.08)"
            iconBorder="rgba(59,130,246,0.2)"
            iconGlow="rgba(59,130,246,0.2)"
            accentColor="#3b82f6"
            title={t('performance')}
            subtitle={t('academicLedger')}
            index={1}
          />
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function ProfileCard({ href, icon, iconBg, iconBorder, iconGlow, accentColor, title, subtitle, index }: any) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block', animation: 'fadeSlideIn 0.35s ease both', animationDelay: `${index * 0.08}s` }} className="active:scale-[0.98] transition-transform">
      <div style={{ borderRadius: 26, background: 'var(--card)', border: '1px solid var(--border)', padding: '17px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, position: 'relative', overflow: 'hidden' }}>

        {/* Left accent bar */}
        <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: '0 3px 3px 0', background: accentColor, boxShadow: `0 0 10px ${iconGlow}` }} />

        {/* Subtle radial shimmer */}
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at left, ${iconBg} 0%, transparent 65%)`, pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1, flex: 1, paddingLeft: 8 }}>
          {/* Icon */}
          <div style={{ width: 50, height: 50, borderRadius: 17, background: iconBg, border: `1px solid ${iconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 14px ${iconGlow}` }}>
            {icon}
          </div>

          {/* Text */}
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--text)', lineHeight: 1.1, marginBottom: 4 }}>
              {title}
            </h4>
            <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: accentColor, opacity: 0.7 }}>
              {subtitle}
            </p>
          </div>
        </div>

        {/* Arrow */}
        <div style={{ width: 32, height: 32, borderRadius: 12, background: iconBg, border: `1px solid ${iconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: 1 }}>
          <ChevronRight size={15} style={{ color: accentColor }} />
        </div>
      </div>
    </Link>
  );
}