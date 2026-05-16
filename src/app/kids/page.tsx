'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, Sparkles, Video, Type, Hash, Palette, Star, Puzzle, Brain, PenTool, Music, Paintbrush } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export default function KidsHub() {
  const router = useRouter();
  const { t, lang } = useLanguage();

  return (
    <div style={{ 
      minHeight: '100svh', 
      width: '100vw', 
      background: '#f8fafc', 
      color: '#0f172a', 
      position: 'relative', 
      overflowX: 'hidden',
      paddingTop: '100px',
      paddingBottom: '40px',
      boxSizing: 'border-box',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      
      {/* --- PLAYFUL BACKGROUND (Optimized for Smooth Scrolling) --- */}
      {/* We removed the framer-motion animation here because animating heavy blurs kills mobile GPUs. */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div 
          style={{ 
            position: 'absolute', top: '10%', left: '-10%', width: '300px', height: '300px', 
            borderRadius: '50%', background: 'rgba(255, 65, 108, 0.15)', 
            filter: 'blur(80px)', transform: 'translateZ(0)', willChange: 'transform'
          }} 
        />
        <div 
          style={{ 
            position: 'absolute', bottom: '10%', right: '-10%', width: '350px', height: '350px', 
            borderRadius: '50%', background: 'rgba(54, 209, 220, 0.15)', 
            filter: 'blur(100px)', transform: 'translateZ(0)', willChange: 'transform'
          }} 
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
            cursor: 'pointer', transform: 'translateZ(0)' // Hardware acceleration
          }}
        >
          <ChevronLeft size={18} strokeWidth={3} /> {t('exitZone') || 'EXIT ZONE'}
        </motion.button>

        {/* --- HEADER --- */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <h1 style={{ fontSize: '48px', fontWeight: 900, textTransform: 'uppercase', margin: 0, letterSpacing: '-2px', lineHeight: 1 }}>
              {lang === 'EN' ? (
                <>LET&apos;S <span style={{ background: 'linear-gradient(to right, #FF416C, #8E2DE2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PLAY!</span></>
              ) : (
                <span style={{ background: 'linear-gradient(to right, #FF416C, #8E2DE2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('letsPlay')}</span>
              )} 🎈
            </h1>
            <motion.div 
              animate={{ y: [0, -10, 0], rotate: [0, 20, 0] }} 
              transition={{ repeat: Infinity, duration: 2 }}
              style={{ position: 'absolute', right: '-40px', top: '-10px', willChange: 'transform' }}
            >
              <Sparkles size={32} color="#FFD200" fill="#FFD200" />
            </motion.div>
          </div>
          <p style={{ margin: '10px 0 0 0', fontSize: '12px', fontWeight: 900, opacity: 0.4, letterSpacing: '2px', textTransform: 'uppercase' }}>
            {t('pickAdventure') || 'PICK A LEARNING ADVENTURE'}
          </p>
        </div>

        {/* --- LIST OF ADVENTURES --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* TRACE IT CARD */}
          <KidsCard 
            onClick={() => router.push('/kids/trace-it')}
            gradient="linear-gradient(135deg, #0EA5E9, #2563EB)"
            shadow="rgba(14, 165, 233, 0.4)"
            icon={<PenTool size={32} color="#fff" strokeWidth={3} />}
            emoji="✍️"
            title="TRACE IT"
            subtitle="FOLLOW THE LINE"
          />

          {/* DRAW ANYTHING CARD */}
          <KidsCard 
            onClick={() => router.push('/kids/draw-anything')}
            gradient="linear-gradient(135deg, #F43F5E, #FB923C)"
            shadow="rgba(244, 63, 94, 0.4)"
            icon={<Paintbrush size={32} color="#fff" strokeWidth={3} />}
            emoji="🖍️"
            title="FREE DRAW"
            subtitle="COLOR & CREATE"
          />

          {/* A B C CARD */}
          <KidsCard 
            onClick={() => router.push('/kids/alphabet')}
            gradient="linear-gradient(135deg, #FF416C, #FF4B2B)"
            shadow="rgba(255, 65, 108, 0.4)"
            icon={<Type size={32} color="#fff" strokeWidth={3} />}
            emoji="🍎"
            title="A B C"
            subtitle={t('abcCards') || 'TALKING FLASHCARDS'}
          />

          {/* 1 2 3 CARD */}
          <KidsCard 
            onClick={() => router.push('/kids/numbers')}
            gradient="linear-gradient(135deg, #36D1DC, #5B86E5)"
            shadow="rgba(54, 209, 220, 0.4)"
            icon={<Hash size={32} color="#fff" strokeWidth={3} />}
            emoji="🚀"
            title="1 2 3"
            subtitle={t('countAnimals') || 'COUNT THE ANIMALS'}
          />

          {/* THEATER CARD */}
          <KidsCard 
            onClick={() => router.push('/kids/theater')}
            gradient="linear-gradient(135deg, #F7971E, #FFD200)"
            shadow="rgba(247, 151, 30, 0.4)"
            icon={<Video size={32} color="#fff" strokeWidth={3} />}
            emoji="📺"
            title="THEATER"
            subtitle={t('watchLearn') || 'WATCH & LEARN'}
          />

          {/* COLORS CARD */}
          <KidsCard 
            onClick={() => router.push('/kids/colors')}
            gradient="linear-gradient(135deg, #8E2DE2, #4A00E0)"
            shadow="rgba(142, 45, 226, 0.4)"
            icon={<Palette size={32} color="#fff" strokeWidth={3} />}
            emoji="🎨"
            title={t('colors') || 'COLORS'}
            subtitle="TAP & SPLASH"
          />

          {/* PUZZLE WORLD CARD */}
          <KidsCard 
            onClick={() => router.push('/kids/puzzle-world')}
            gradient="linear-gradient(135deg, #11998E, #38EF7D)"
            shadow="rgba(56, 239, 125, 0.4)"
            icon={<Puzzle size={32} color="#fff" strokeWidth={3} />}
            emoji="🧩"
            title="PUZZLES"
            subtitle="DRAG & MATCH"
          />

          {/* MEMORY MATCH CARD */}
          <KidsCard 
            onClick={() => router.push('/kids/memory-match')}
            gradient="linear-gradient(135deg, #EC008C, #FC6767)"
            shadow="rgba(236, 0, 140, 0.4)"
            icon={<Brain size={32} color="#fff" strokeWidth={3} />}
            emoji="🧠"
            title="MEMORY"
            subtitle="FIND THE PAIR"
          />

          {/* MUSIC BOX CARD */}
          <KidsCard 
            onClick={() => router.push('/kids/music-box')}
            gradient="linear-gradient(135deg, #D946EF, #9333EA)"
            shadow="rgba(217, 70, 239, 0.4)"
            icon={<Music size={32} color="#fff" strokeWidth={3} />}
            emoji="🎵"
            title="MUSIC BOX"
            subtitle="MAKE A BEAT"
          />

        </div>
      </div>
    </div>
  );
}

interface KidsCardProps {
  onClick: () => void;
  gradient: string;
  shadow: string;
  icon: React.ReactNode;
  emoji: string;
  title: string;
  subtitle: string;
}

function KidsCard({ onClick, gradient, shadow, icon, emoji, title, subtitle }: KidsCardProps) {
  return (
    <motion.div 
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{ 
        cursor: 'pointer', borderRadius: '35px', background: gradient, 
        padding: '24px', display: 'flex', alignItems: 'center', 
        justifyContent: 'space-between', boxShadow: `0 15px 35px ${shadow}`,
        position: 'relative', overflow: 'hidden',
        transform: 'translateZ(0)' // Prevents repainting issues during scroll
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
        transition={{ repeat: Infinity, duration: 2 }} // Slowed it down slightly for performance
        style={{ position: 'relative', zIndex: 1, willChange: 'transform' }} // Added hardware hint
      >
        <Star size={24} color="#fff" fill="#fff" style={{ opacity: 0.5 }} />
      </motion.div>
    </motion.div>
  );
}
