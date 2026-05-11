'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, FlaskConical, Search, Calculator, 
  Scale, Box, Triangle, Zap, Rocket, Lightbulb, Beaker, Atom 
} from 'lucide-react';

export default function LearningLab() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // The Ultimate STEM Arsenal (Classes 5 to 10)
  const tools = [
    // --- GENERAL MATH ---
    {
      id: 'bodmas',
      title: 'BODMAS Shrinker',
      description: 'Interactive step-by-step order of operations solver.',
      icon: Calculator,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      status: 'active'
    },
    // --- HIGH SCHOOL MATH ---
    {
      id: 'algebra',
      title: 'Algebra Balancer',
      description: 'Visually balance linear equations side-by-side.',
      icon: Scale,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      status: 'active'
    },
    {
      id: 'mensuration',
      title: '3D Mensuration',
      description: 'Unravel 3D shapes to calculate area and volume.',
      icon: Box,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      status: 'active'
    },
    {
      id: 'trigonometry',
      title: 'Trig-Target Sniper',
      description: 'Dynamic right-angled triangles and ratios.',
      icon: Triangle,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      status: 'active'
    },
    // --- PHYSICS ---
    {
      id: 'circuits',
      title: 'The Circuit Forge',
      description: 'Build circuits and calculate Ohm\'s Law instantly.',
      icon: Zap,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      status: 'active'
    },
    {
      id: 'kinematics',
      title: 'Kinematics Engine',
      description: 'Solve equations of motion with animated visualizers.',
      icon: Rocket,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      status: 'active'
    },
    {
      id: 'optics',
      title: 'Optics Ray Tracer',
      description: 'Drag objects to see real-time lens and mirror reflections.',
      icon: Lightbulb,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      status: 'active'
    },
    // --- CHEMISTRY ---
    {
      id: 'equations',
      title: 'Equation Balancer',
      description: 'Matrix-powered chemical equation balancer.',
      icon: Beaker,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/30',
      status: 'active'
    },
    {
      id: 'atoms',
      title: 'Atom Builder',
      description: 'Generate Bohr models and check valency states.',
      icon: Atom,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/30',
      status: 'active'
    }
  ];

  // Filter logic based on the search bar
  const filteredTools = tools.filter(tool => 
    tool.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-32 font-sans bg-background text-text">
      {/* Ambient background orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] -right-[10%] w-[300px] h-[300px] rounded-full bg-cyan-500/5 blur-[80px]" />
        <div className="absolute bottom-[20%] -left-[10%] w-[250px] h-[250px] rounded-full bg-blue-500/5 blur-[80px]" />
      </div>

      {/* Header */}
      <div className="px-5 pt-16 pb-6 sticky top-0 bg-background/80 backdrop-blur-md z-50 border-b border-border">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => router.push('/dashboard')}
            className="w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center shadow-sm active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-6 h-6 text-text" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FlaskConical className="w-3 h-3 text-cyan-500" />
              <p className="text-[10px] font-extrabold tracking-[0.22em] uppercase text-cyan-500">
                Smart Tools
              </p>
            </div>
            <h1 className="text-2xl font-black italic uppercase tracking-[-0.02em] leading-none text-text">
              Learning Lab
            </h1>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-text/40 group-focus-within:text-cyan-500 transition-colors" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold italic placeholder:text-text/30 shadow-sm outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all text-text"
            placeholder="Search solvers... (e.g. Kinematics)"
          />
        </div>
      </div>

      {/* Tool Cards Grid */}
      <div className="px-5 pt-6 space-y-4">
        {filteredTools.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-bold italic uppercase text-text/40">No tools found for "{searchQuery}"</p>
          </div>
        ) : (
          filteredTools.map((tool) => (
            <div
              key={tool.id}
              onClick={() => {
                if (tool.status === 'active') {
                  router.push(`/learning-lab/${tool.id}`);
                }
              }}
              className={`relative rounded-3xl bg-card border border-border p-5 overflow-hidden transition-all duration-300 
                ${tool.status === 'active' 
                  ? 'cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-text/10 active:scale-[0.98] group' 
                  : 'opacity-60 grayscale-[0.5] cursor-not-allowed shadow-none'
                }`}
            >
              {/* Background Accent Icon */}
              <tool.icon className={`absolute -right-4 -top-4 w-24 h-24 opacity-5 ${tool.color} group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500`} />
              
              <div className="flex gap-4 relative z-10">
                <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center shadow-sm ${tool.bg} ${tool.border} border`}>
                  <tool.icon className={`w-6 h-6 ${tool.color}`} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-black italic uppercase tracking-tight text-text">
                      {tool.title}
                    </h3>
                    {/* Only show SOON if the tool is explicitly NOT active */}
                    {tool.status !== 'active' && (
                      <span className="text-[8px] font-black tracking-widest uppercase px-2 py-1 bg-text/10 rounded-md text-text/60">
                        Soon
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-text/50 leading-relaxed">
                    {tool.description}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
