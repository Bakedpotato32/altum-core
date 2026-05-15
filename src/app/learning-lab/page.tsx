'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, FlaskConical, Search, Calculator, 
  Scale, Box, Triangle, Zap, Rocket, Lightbulb, Beaker, Atom,
  Droplet, Star, ChevronRight
} from 'lucide-react';

export default function LearningLab() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const tools = [
    {
      id: 'bodmas',
      title: 'BODMAS Shrinker',
      description: 'STEP-BY-STEP SOLVER',
      icon: <Calculator />,
      gradient: 'linear-gradient(135deg, #00d2ff, #3a7bd5)',
      watermark: '🔢',
      status: 'active'
    },
    {
      id: 'algebra',
      title: 'Algebra Balancer',
      description: 'VISUAL EQUATION TOOLS',
      icon: <Scale />,
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
      watermark: '⚖️',
      status: 'active'
    },
    {
      id: 'mensuration',
      title: '3D Mensuration',
      description: 'AREA & VOLUME VISUALIZER',
      icon: <Box />,
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
      watermark: '🧊',
      status: 'active'
    },
    {
      id: 'trigonometry',
      title: 'Trig-Target Sniper',
      description: 'RATIOS & TRIANGLES',
      icon: <Triangle />,
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
      watermark: '📐',
      status: 'active'
    },
    {
      id: 'circuits',
      title: 'The Circuit Forge',
      description: 'OHM\'S LAW CALCULATOR',
      icon: <Zap />,
      gradient: 'linear-gradient(135deg, #f09819, #edde5d)',
      watermark: '⚡',
      status: 'active'
    },
    {
      id: 'kinematics',
      title: 'Kinematics Engine',
      description: 'MOTION EQUATION TOOLS',
      icon: <Rocket />,
      gradient: 'linear-gradient(135deg, #f09819, #edde5d)',
      watermark: '🚀',
      status: 'active'
    },
    {
      id: 'optics',
      title: 'Optics Ray Tracer',
      description: 'LENS & MIRROR SIMULATOR',
      icon: <Lightbulb />,
      gradient: 'linear-gradient(135deg, #f09819, #edde5d)',
      watermark: '🔦',
      status: 'active'
    },
    {
      id: 'ph-lab',
      title: 'pH Color Lab',
      description: 'ACID & BASE IDENTIFIER',
      icon: <Droplet />,
      gradient: 'linear-gradient(135deg, #8e2de2, #4a00e0)',
      watermark: '🧪',
      status: 'active'
    },
    {
      id: 'equations',
      title: 'Equation Balancer',
      description: 'CHEMICAL MATRIX TOOLS',
      icon: <Beaker />,
      gradient: 'linear-gradient(135deg, #8e2de2, #4a00e0)',
      watermark: '⚗️',
      status: 'active'
    },
    {
      id: 'atoms',
      title: 'Atom Builder',
      description: 'BOHR MODEL GENERATOR',
      icon: <Atom />,
      gradient: 'linear-gradient(135deg, #8e2de2, #4a00e0)',
      watermark: '⚛️',
      status: 'active'
    }
  ];

  const filteredTools = tools.filter(tool => 
    tool.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ 
      minHeight: '100svh', 
      background: '#fff', 
      padding: '40px 20px 120px', 
      maxWidth: '500px', 
      margin: '0 auto',
      overflowX: 'hidden' // <-- Safety net to prevent horizontal scroll
    }}>
      
      {/* Header matching Dashboard style */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
        <button 
          onClick={() => router.push('/dashboard')}
          style={{ 
            width: '45px', height: '45px', borderRadius: '15px', 
            background: '#fff', border: '1px solid #e2e8f0', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <ChevronLeft size={24} color="#1e293b" />
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FlaskConical size={12} color="#00d2ff" />
            <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, color: '#00d2ff', letterSpacing: '1.5px' }}>SMART TOOLS</p>
          </div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 900, fontStyle: 'italic', color: '#1e293b', textTransform: 'uppercase' }}>Learning Lab</h1>
        </div>
      </div>

      {/* Modern Search Bar */}
      <div style={{ position: 'relative', marginBottom: '30px' }}>
        <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search solvers... (e.g. Kinematics)"
          style={{
            boxSizing: 'border-box', // <-- FIXED OVERFLOW
            width: '100%', 
            padding: '14px 14px 14px 48px', 
            borderRadius: '20px',
            border: '1px solid #e2e8f0', 
            background: '#f8fafc',
            fontSize: '16px', // <-- INCREASED TO 16px TO PREVENT IOS ZOOM
            fontWeight: 700, 
            fontStyle: 'italic', 
            outline: 'none',
            color: '#1e293b'
          }}
        />
      </div>

      {/* Tool Grid using the Compact ActivityCard Design */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredTools.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', fontWeight: 700, marginTop: '40px' }}>
            No tools found for "{searchQuery}"
          </p>
        ) : (
          filteredTools.map((tool) => (
            <ActivityCard 
              key={tool.id}
              onClick={() => router.push(`/learning-lab/${tool.id}`)}
              icon={tool.icon}
              title={tool.title}
              subtitle={tool.description}
              gradient={tool.gradient}
              watermark={tool.watermark}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Re-usable Compact ActivityCard Component
function ActivityCard({ onClick, icon, title, subtitle, gradient, watermark }: any) {
  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{ 
        background: gradient, borderRadius: '25px', padding: '14px 18px', 
        position: 'relative', overflow: 'hidden', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1 }}>
        {/* Frosted Icon Box */}
        <div style={{ 
          width: '45px', height: '45px', background: 'rgba(255,255,255,0.25)', 
          borderRadius: '12px', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', backdropFilter: 'blur(4px)', flexShrink: 0
        }}>
          {React.cloneElement(icon as React.ReactElement, { color: 'white' })}
        </div>
        <div>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1 }}>{title}</h3>
          <p style={{ margin: '2px 0 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '9px', fontWeight: 800, letterSpacing: '0.5px' }}>{subtitle}</p>
        </div>
      </div>
      <ChevronRight color="white" size={20} style={{ opacity: 0.6, flexShrink: 0 }} />
      
      {/* Background Watermark Illustration */}
      <span style={{ 
        position: 'absolute', right: '15px', top: '50%', 
        transform: 'translateY(-50%)', fontSize: '70px', 
        opacity: 0.12, pointerEvents: 'none' 
      }}>
        {watermark}
      </span>
      
      {/* Detail Star Decoration */}
      <Star size={12} color="rgba(255,255,255,0.2)" fill="rgba(255,255,255,0.2)" style={{ position: 'absolute', right: '10px', bottom: '10px' }} />
    </motion.div>
  );
}
