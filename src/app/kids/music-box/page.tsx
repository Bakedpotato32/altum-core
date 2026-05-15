'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, Music, Sparkles } from 'lucide-react';

// Musical notes, frequencies, and vibrant colors for our Xylophone
const XYLOPHONE_KEYS = [
  { id: 1, note: 'C', freq: 261.63, color: '#FF416C', label: 'Do', width: '100%' },
  { id: 2, note: 'D', freq: 293.66, color: '#F7971E', label: 'Re', width: '95%' },
  { id: 3, note: 'E', freq: 329.63, color: '#FFD200', label: 'Mi', width: '90%' },
  { id: 4, note: 'F', freq: 349.23, color: '#38EF7D', label: 'Fa', width: '85%' },
  { id: 5, note: 'G', freq: 392.00, color: '#0EA5E9', label: 'Sol', width: '80%' },
  { id: 6, note: 'A', freq: 440.00, color: '#8E2DE2', label: 'La', width: '75%' },
  { id: 7, note: 'B', freq: 493.88, color: '#EC008C', label: 'Ti', width: '70%' },
  { id: 8, note: 'C5', freq: 523.25, color: '#FF4B2B', label: 'Do', width: '65%' },
];

export default function MusicBox() {
  const router = useRouter();
  const [activeKey, setActiveKey] = useState<number | null>(null);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

  // Initialize Audio Context on client side to avoid SSR issues
  useEffect(() => {
    const Context = window.AudioContext || (window as any).webkitAudioContext;
    if (Context) {
      setAudioCtx(new Context());
    }
  }, []);

  const playNote = (id: number, frequency: number) => {
    setActiveKey(id);
    setTimeout(() => setActiveKey(null), 300); // Remove visual highlight after 300ms

    if (!audioCtx) return;

    // Resume context if it's suspended (browsers block audio until first user interaction)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // Synthesize the sound!
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    // 'sine' sounds smooth and pleasant, 'triangle' sounds more like an 8-bit game
    oscillator.type = 'sine'; 
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    // Fade the sound out so it doesn't click or ring forever
    gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 1.5);
  };

  return (
    <div style={{ 
      minHeight: '100svh', 
      width: '100vw', 
      background: '#f8fafc', 
      color: '#0f172a', 
      position: 'relative', 
      overflowX: 'hidden',
      paddingTop: '80px',
      paddingBottom: '40px',
      boxSizing: 'border-box',
    }}>
      {/* Background Glow */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(217, 70, 239, 0.1)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(147, 51, 234, 0.1)', filter: 'blur(80px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '0 20px', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100svh - 120px)' }}>
        
        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/kids')} 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              padding: '10px 20px', background: '#ffffff', border: '1px solid #e2e8f0', 
              borderRadius: '20px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', 
              color: '#94a3b8', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', cursor: 'pointer'
            }}
          >
            <ChevronLeft size={18} strokeWidth={3} /> BACK
          </motion.button>

          <div style={{ background: '#f3e8ff', padding: '10px', borderRadius: '50%', color: '#a855f7' }}>
            <Music size={24} />
          </div>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '40px', fontWeight: 900, textTransform: 'uppercase', margin: 0, letterSpacing: '-1px', lineHeight: 1, background: 'linear-gradient(135deg, #D946EF, #9333EA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            MUSIC BOX
          </h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '12px', fontWeight: 900, opacity: 0.4, letterSpacing: '2px' }}>
            TAP TO PLAY A MELODY
          </p>
        </div>

        {/* The Xylophone */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', paddingBottom: '20px' }}>
          {XYLOPHONE_KEYS.map((key) => {
            const isActive = activeKey === key.id;
            
            return (
              <motion.button
                key={key.id}
                whileTap={{ scale: 0.95, y: 5 }} // Feels like pressing a real key down
                onPointerDown={(e) => {
                  e.preventDefault(); // Prevents double-firing on some mobile touch screens
                  playNote(key.id, key.freq);
                }}
                style={{
                  width: key.width,
                  height: '60px',
                  background: isActive ? '#ffffff' : `linear-gradient(90deg, ${key.color}, ${key.color}DD)`,
                  border: 'none',
                  borderRadius: '30px',
                  boxShadow: isActive 
                    ? `0 0 20px ${key.color}` 
                    : `0 8px 0 ${key.color}99, 0 15px 20px rgba(0,0,0,0.1)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 30px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.1s ease, box-shadow 0.1s ease'
                }}
              >
                {/* Fasteners (The little dots on a xylophone) */}
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: isActive ? key.color : 'rgba(255,255,255,0.4)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }} />
                
                <span style={{ fontSize: '20px', fontWeight: 900, color: isActive ? key.color : '#ffffff', letterSpacing: '2px' }}>
                  {key.label}
                </span>

                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: isActive ? key.color : 'rgba(255,255,255,0.4)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }} />

                {/* Sparkles when hit */}
                {isActive && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 1.5, opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}
                  >
                    <Sparkles size={32} color={key.color} fill={key.color} />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

      </div>
    </div>
  );
}
