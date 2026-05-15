'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Calculator, Sparkles, Hash } from 'lucide-react';
import BodmasSolver from '@/components/BodmasSolver';
import { motion } from 'framer-motion';

export default function BodmasPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100svh', background: '#fff', position: 'relative', overflowX: 'hidden' }}>
      
      {/* 1. STICKY HEADER */}
      <div style={{ 
        padding: '60px 20px 15px', 
        position: 'sticky', 
        top: 0, 
        background: 'rgba(255,255,255,0.8)', 
        backdropFilter: 'blur(12px)', 
        zIndex: 100, 
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}>
        <button 
          onClick={() => router.back()}
          style={{ 
            width: '45px', 
            height: '45px', 
            borderRadius: '15px', 
            background: '#fff', 
            border: '1px solid rgba(0,0,0,0.08)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
          }}
        >
          <ChevronLeft size={24} color="#1e293b" />
        </button>
        
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calculator size={12} color="#3b82f6" />
            <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, color: '#3b82f6', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              Learning Lab
            </p>
          </div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#1e293b', lineHeight: 1 }}>
            BODMAS Shrinker
          </h1>
        </div>
      </div>

      <div style={{ padding: '25px 20px 120px', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* 2. TOOL INTRO BANNER (Kids Hub Style but for Math) */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ 
            background: 'linear-gradient(135deg, #00d2ff, #3a7bd5)', 
            borderRadius: '28px', 
            padding: '20px', 
            position: 'relative', 
            overflow: 'hidden',
            display: 'flex', 
            alignItems: 'center', 
            gap: '15px',
            boxShadow: '0 10px 25px rgba(58, 123, 213, 0.2)'
          }}
        >
          <div style={{ 
            width: '50px', 
            height: '50px', 
            background: 'rgba(255,255,255,0.25)', 
            borderRadius: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            backdropFilter: 'blur(5px)',
            zIndex: 1
          }}>
            <Sparkles color="white" fill="white" size={24} />
          </div>
          <div style={{ zIndex: 1 }}>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '22px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1 }}>STEP-BY-STEP</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px' }}>SOLVE COMPLEX EQUATIONS EASILY</p>
          </div>
          
          {/* Watermark for the Banner */}
          <span style={{ position: 'absolute', right: '-10px', bottom: '-20px', fontSize: '100px', opacity: 0.15, pointerEvents: 'none', fontWeight: 900, color: '#fff' }}>
            ÷
          </span>
        </motion.div>

        {/* 3. THE SOLVER CONTAINER (Notice Card Style) */}
        <div style={{ 
          background: '#fff', 
          borderRadius: '28px', 
          padding: '24px', 
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
          borderLeft: '6px solid #3b82f6',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Hash size={18} color="#3b82f6" />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#3b82f6', letterSpacing: '0.5px' }}>EQUATION SOLVER</span>
          </div>
          
          <BodmasSolver />
        </div>

        {/* Bottom Decorative Hint */}
        <p style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#94a3b8', opacity: 0.6, marginTop: '10px' }}>
          Tip: Use ( ) for brackets and ^ for powers
        </p>

      </div>

      {/* Global Background Watermark */}
      <div style={{ 
        position: 'fixed', 
        bottom: '10%', 
        right: '-5%', 
        fontSize: '200px', 
        fontWeight: 900, 
        color: '#f1f5f9', 
        zIndex: -1, 
        userSelect: 'none',
        pointerEvents: 'none' 
      }}>
        +
      </div>
    </div>
  );
}
