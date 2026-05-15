'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, Sparkles, Video, Type, Hash, Palette, Star } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export default function KidsHub() {
  const router = useRouter();
  const { t, lang } = useLanguage();

  return (
    <div style={{ 
      minHeight: '100svh', 
      width: '100vw', 
      background: '#f8fafc', // Light mode background
      color: '#0f172a', 
      position: 'relative', 
      overflowX: 'hidden',
      paddingTop: '100px',
      paddingBottom: '40px',
      boxSizing: 'border-box',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      
      {/* --- PLAYFUL BACKGROUND --- */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
          style={{ position: 'absolute', top: '10%', left: '-10%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255, 65, 108, 0.15)', filter: 'blur(80px)' }} 
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, delay: 1 }}
          style={{ position: 'absolute', bottom: '10%', right: '-10%', width: '350px', height: '350px', borderRadius: '50%', background: 'rgba(54, 209, 220, 0.15)', filter: 'blur(100px)' }} 
        />
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '0 20px', maxWidth: '500px', margin: '0 auto' }}>
        
        {/* --- CHUNKY EXIT BUTTON --- */}
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/dashboard')} 
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px', 
            padding: '10px 20px', background: '#ffffff', border: '1px solid #e2e8f0', 
            borderRadius: '20px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', 
            letterSpacing: '1px', color: '#94a3b8', boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
            cursor: 'pointer'
          }}
        >
          <ChevronLeft size={18} strokeWidth={3} /> {t('exitZone')}
        </motion.button>

        {/* --- HEADER --- */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <h1 style={{ fontSize: '48px', fontWeight: 900, textTransform: 'uppercase', margin: 0, letterSpacing: '-2px', lineHeight: 1 }}>
              {lang === 'EN' ? (
                <>LET'S <span style={{ background: 'linear-gradient(to right, #FF416C, #8E2DE2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PLAY!</span></>
              ) : (
                <span style={{ background: 'linear-gradient(to right, #FF416C, #8E2DE2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('letsPlay')}</span>
              )} 🎈
            </h1>
            <motion.div 
              animate={{ y: [0, -10, 0], rotate: [0, 20, 0] }} 
              transition={{ repeat: Infinity, duration: 2 }}
              style={{ position: 'absolute', right: '-40px', top: '-10px' }}
            >
              <Sparkles size={32} color="#FFD200" fill="#FFD200" />
            </motion.div>
          </div>
          <p style={{ margin: '10px 0 0 0', fontSize: '12px', fontWeight: 900, opacity: 0.4, letterSpacing: '2px', textTransform: 'uppercase' }}>
            {t('pickAdventure')}
          </p>
        </div>

        {/* --- LIST OF ADVENTURES --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* A B C CARD */}
          <KidsCard 
            onClick={() => router.push('/kids/alphabet')}
            gradient="linear-gradient(135deg, #FF416C, #FF4B2B)"
            shadow="rgba(255, 65, 108, 0.4)"
            icon={<Type size={32} color="#fff" strokeWidth={3} />}
            emoji="🍎"
            title="A B C"
            subtitle={t('abcCards')}
          />

          {/* 1 2 3 CARD */}
          <KidsCard 
            onClick={() => router.push('/kids/numbers')}
            gradient="linear-gradient(135deg, #36D1DC, #5B86E5)"
            shadow="rgba(54, 209, 220, 0.4)"
            icon={<Hash size={32} color="#fff" strokeWidth={3} />}
            emoji="🚀"
            title="1 2 3"
            subtitle={t('countAnimals')}
          />

          {/* THEATER CARD */}
          <KidsCard 
            onClick={() => router.push('/kids/theater')}
            gradient="linear-gradient(135deg, #F7971E, #FFD200)"
            shadow="rgba(247, 151, 30, 0.4)"
            icon={<Video size={32} color="#fff" strokeWidth={3} />}
            emoji="📺"
            title="THEATER"
            subtitle={t('watchLearn')}
          />

          {/* COLORS CARD */}
          <KidsCard 
            onClick={() => router.push('/kids/colors')}
            gradient="linear-gradient(135deg, #8E2DE2, #4A00E0)"
            shadow="rgba(142, 45, 226, 0.4)"
            icon={<Palette size={32} color="#fff" strokeWidth={3} />}
            emoji="🎨"
            title={t('colors')}
            subtitle="TAP & SPLASH"
          />

        </div>
      </div>
    </div>
  );
}

// Reusable Vibrant Card Component
function KidsCard({ onClick, gradient, shadow, icon, emoji, title, subtitle }: any) {
  return (
    <motion.div 
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{ 
        cursor: 'pointer', borderRadius: '35px', background: gradient, 
        padding: '24px', display: 'flex', alignItems: 'center', 
        justifyContent: 'space-between', boxShadow: `0 15px 35px ${shadow}`,
        position: 'relative', overflow: 'hidden'
      }}
    >
      {/* Background Emoji */}
      <span style={{ 
        position: 'absolute', right: '-10px', top: '-10px', fontSize: '100px', 
        opacity: 0.15, transform: 'rotate(15deg)', pointerEvents: 'none' 
      }}>
        {emoji}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative', zIndex: 1 }}>
        <motion.div 
          whileTap={{ rotate: [-10, 10, -10, 10, 0] }}
          style={{ 
            width: '64px', height: '64px', background: 'rgba(255,255,255,0.25)', 
            borderRadius: '20px', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.4)', boxShadow: 'inset 0 2px 10px rgba(255,255,255,0.2)'
          }}
        >
          {icon}
        </motion.div>
        
        <div>
          <h2 style={{ margin: 0, fontSize: '32px', fontWeight: 900, color: '#fff', fontStyle: 'italic', letterSpacing: '-1px', lineHeight: 1, textTransform: 'uppercase' }}>
            {title}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.8)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {subtitle}
          </p>
        </div>
      </div>

      <motion.div 
        animate={{ scale: [1, 1.2, 1] }} 
        transition={{ repeat: Infinity, duration: 1.5 }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <Star size={24} color="#fff" fill="#fff" style={{ opacity: 0.5 }} />
      </motion.div>
    </motion.div>
  );
}
