'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Rocket } from 'lucide-react';
import KinematicsEngine from '@/components/KinematicsEngine'; // Adjust import path if needed

export default function KinematicsPage() {
  const router = useRouter();

  return (
    <div style={{ 
      padding: '40px 20px 120px', 
      maxWidth: '500px', 
      margin: '0 auto', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '24px', 
      background: '#fff', 
      minHeight: '100svh' 
    }}>
      
      {/* Header (Clean & Modern Dashboard Style) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={() => router.back()}
          style={{
            width: '48px', 
            height: '48px', 
            borderRadius: '16px', 
            background: '#f8fafc',
            border: '2px solid #f1f5f9', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer', 
            flexShrink: 0,
            transition: 'all 0.2s ease'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <ChevronLeft size={26} color="#334155" strokeWidth={2.5} />
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <Rocket size={14} color="#f97316" strokeWidth={3} />
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 900, color: '#f97316', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Physics Engine
            </p>
          </div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#0f172a', lineHeight: 1 }}>
            Kinematics
          </h1>
        </div>
      </div>

      {/* Solver Component Wrapper */}
      <div>
        <KinematicsEngine />
      </div>
    </div>
  );
}
