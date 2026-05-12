'use client';
import React, { useState } from 'react';
import { 
    Globe, Moon, Sun, Circle, Target, Snowflake,
    RotateCcw, Activity, CheckCircle2, BookOpen, Sparkles, Box
} from 'lucide-react';

const Frac = ({ n, d }: { n: React.ReactNode, d: React.ReactNode }) => (
    <span className="inline-flex flex-col items-center justify-center align-middle mx-1 font-black italic relative -top-[0.1em]">
        <span className="border-b-[2px] border-current px-1 pb-[1px] leading-none">{n}</span>
        <span className="pt-[1px] px-1 leading-none">{d}</span>
    </span>
);

interface CelestialBody {
    id: string;
    name: string;
    g: number; // Acceleration due to gravity (m/s^2)
    icon: any;
    color: string;
    hex: string;
    desc: string;
    fact: string;
}

const BODIES: CelestialBody[] = [
    { id: 'earth', name: 'Earth', g: 9.8, icon: Globe, color: 'text-blue-500', hex: '#3b82f6', desc: 'Our home planet. This is the standard baseline for 1g.', fact: 'All standard weights and weighing scales are specifically calibrated to Earth\'s gravitational pull.' },
    { id: 'moon', name: 'Moon', g: 1.62, icon: Moon, color: 'text-slate-300', hex: '#cbd5e1', desc: 'Earth\'s only natural satellite.', fact: 'Gravity is so weak here that you could easily jump 6 times higher than you can on Earth!' },
    { id: 'mars', name: 'Mars', g: 3.71, icon: Circle, color: 'text-red-500', hex: '#ef4444', desc: 'The Red Planet, roughly half the size of Earth.', fact: 'Because of the lower gravity, a 100 kg person on Earth would feel like they only weigh 37.8 kg on Mars.' },
    { id: 'jupiter', name: 'Jupiter', g: 24.79, icon: Target, color: 'text-orange-500', hex: '#f97316', desc: 'The massive gas giant of our solar system.', fact: 'Jupiter has no solid surface to stand on, but if you floated in its clouds, the crushing gravity would make it almost impossible to move.' },
    { id: 'sun', name: 'Sun', g: 274.0, icon: Sun, color: 'text-yellow-500', hex: '#eab308', desc: 'The star at the center of the Solar System.', fact: 'The Sun accounts for 99.86% of the mass in the entire solar system. Its gravity is what keeps all the planets in orbit!' },
    { id: 'pluto', name: 'Pluto', g: 0.62, icon: Snowflake, color: 'text-indigo-400', hex: '#818cf8', desc: 'A tiny dwarf planet in the distant Kuiper belt.', fact: 'Gravity is so incredibly weak here that walking would feel more like slow-motion bouncing in a swimming pool.' }
];

export default function GravityScale() {
    // Storing as string to fix the input deletion bug!
    const [massInput, setMassInput] = useState<string>('50'); 
    const [activeBody, setActiveBody] = useState<CelestialBody>(BODIES[0]); 

    // --- PHYSICS CALCULATIONS ---
    // Parse the string safely. If empty, treat as 0.
    const mass = Math.abs(parseFloat(massInput)) || 0;
    
    // Weight (N) = mass (kg) * gravity (m/s^2)
    const weightNewtons = mass * activeBody.g;
    
    // For visual flair: Weight in "kg-force" (what standard scales show)
    const weightKgf = weightNewtons / 9.8; 

    // Dynamic Compression: Now based on TOTAL WEIGHT, not just gravity!
    // We normalize against 50kg on Jupiter (approx 1250 N).
    const springCompression = Math.min(50, Math.max(0, (weightNewtons / 1250) * 40));

    return (
        <div className="relative rounded-3xl bg-card border border-border p-4 overflow-hidden transition-all duration-300 group">
            
            <activeBody.icon className={`absolute -right-4 -top-4 w-32 h-32 opacity-5 ${activeBody.color} group-hover:-rotate-12 transition-transform duration-700 pointer-events-none`} />
            
            <div className="flex items-center gap-2 mb-4 relative z-10">
                <div className="w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(currentColor)]" style={{ backgroundColor: activeBody.hex, color: activeBody.hex }} />
                <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: activeBody.hex }}>Astro-Physics Lab</span>
            </div>

            <div className="flex justify-between items-start mb-4 relative z-10">
                <h3 className="text-xl font-black italic uppercase tracking-[-0.02em] text-text leading-none">
                    Gravity <span style={{ color: activeBody.hex }}>Scale</span>
                </h3>
                <button onClick={() => {setMassInput('50'); setActiveBody(BODIES[0]);}} className="w-8 h-8 rounded-xl bg-background border border-border flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-colors active:scale-95 text-zinc-500 shadow-sm">
                    <RotateCcw className="w-4 h-4" />
                </button>
            </div>

            {/* --- PLANET SELECTOR --- */}
            <div className="flex gap-2 overflow-x-auto custom-scroll pb-4 mb-2 snap-x">
                {BODIES.map(body => {
                    const isSelected = activeBody.id === body.id;
                    return (
                        <button 
                            key={body.id} 
                            onClick={() => setActiveBody(body)}
                            className={`shrink-0 snap-center flex flex-col items-center gap-2 p-2.5 rounded-2xl border-2 transition-all w-[72px] ${isSelected ? 'bg-card shadow-[0_0_15px_rgba(0,0,0,0.2)] scale-105' : 'bg-background border-border hover:border-zinc-500'}`}
                            style={{ borderColor: isSelected ? body.hex : undefined }}
                        >
                            <div className="w-10 h-10 rounded-full border border-border/50 flex items-center justify-center shadow-inner" style={{ backgroundColor: `${body.hex}20` }}>
                                <body.icon className="w-5 h-5" style={{ color: body.hex }} />
                            </div>
                            <span className="text-[8.5px] font-black uppercase tracking-wider">{body.name}</span>
                        </button>
                    );
                })}
            </div>

            {/* --- VISUAL SIMULATION CANVAS --- */}
            <div className="bg-[#0a0a0c] border-2 border-border rounded-3xl mb-4 relative overflow-hidden flex flex-col items-center justify-end shadow-inner h-[280px] z-10">
                
                {/* Dynamic Space Background based on selection */}
                <div className="absolute inset-0 opacity-10 transition-colors duration-1000" style={{ backgroundColor: activeBody.hex }} />
                
                {/* The Mass/Object */}
                <div 
                    className="relative flex flex-col items-center transition-all duration-700 ease-out z-20"
                    style={{ transform: `translateY(${springCompression}px)` }}
                >
                    <div className="w-20 h-20 bg-zinc-800 border-[3px] rounded-xl flex flex-col items-center justify-center shadow-2xl relative" style={{ borderColor: activeBody.hex }}>
                        <Box className="absolute opacity-10 w-full h-full p-2" />
                        <span className="text-xl font-black italic text-white drop-shadow-md z-10">{massInput === '' ? '0' : massInput}</span>
                        <span className="text-[10px] font-black uppercase text-zinc-400 z-10">KG MASS</span>
                    </div>
                </div>

                {/* The Weighing Scale */}
                <div className="w-40 flex flex-col items-center z-10 relative">
                    {/* Scale Platform */}
                    <div 
                        className="w-full h-4 bg-zinc-700 border-2 border-zinc-600 rounded-t-lg shadow-inner transition-all duration-700 ease-out z-20"
                        style={{ transform: `translateY(${springCompression}px)` }}
                    />
                    
                    {/* Scale Spring/Piston */}
                    <div className="w-8 flex flex-col items-center relative z-10 transition-all duration-700 ease-out" style={{ height: `${60 - springCompression}px` }}>
                        <div className="w-full h-full border-x-4 border-zinc-600" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 4px, #52525b 4px, #52525b 8px)' }} />
                    </div>

                    {/* Scale Base & Readout */}
                    <div className="w-32 h-14 bg-zinc-900 border-2 border-zinc-700 rounded-t-2xl flex flex-col items-center justify-center shadow-[0_-5px_15px_rgba(0,0,0,0.5)] z-20">
                        <div className="bg-black border-2 border-zinc-800 px-3 py-1 rounded-lg min-w-[80%] text-center shadow-inner">
                            <span className="text-lg font-black italic" style={{ color: activeBody.hex, textShadow: `0 0 10px ${activeBody.hex}80` }}>
                                {weightNewtons > 9999 ? '> 9999' : Number(weightNewtons.toFixed(1))} N
                            </span>
                        </div>
                    </div>
                </div>

                {/* Ground */}
                <div className="absolute bottom-0 left-0 right-0 h-4 bg-zinc-950 border-t-2 border-zinc-800 z-0" />
            </div>

            {/* --- MASS INPUT --- */}
            <div className="bg-background border border-border rounded-2xl p-4 mb-4 shadow-sm relative z-10 flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Object Mass (Constant)</span>
                    <span className="text-[10px] font-bold text-zinc-400 mt-0.5">Mass never changes across planets!</span>
                </div>
                <div className="flex items-center gap-2">
                    <input 
                        type="number" 
                        value={massInput} 
                        onChange={(e) => setMassInput(e.target.value)}
                        className="w-20 bg-card border-2 border-border rounded-xl py-2 text-center text-lg font-black italic outline-none transition-colors" 
                        style={{ outlineColor: activeBody.hex }}
                    />
                    <span className="text-sm font-black text-zinc-500">KG</span>
                </div>
            </div>

            {/* --- PHYSICS ENGINE OUTPUT --- */}
            <div className="space-y-3 relative z-10 bg-background border border-border rounded-3xl p-5 shadow-sm mt-4">
                
                <div className="flex items-center justify-center gap-2 text-sm font-black italic uppercase tracking-widest" style={{ color: activeBody.hex }}>
                    <Activity size={16}/> Gravity Resolved
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="bg-card border border-border p-3 rounded-xl flex flex-col justify-center shadow-sm">
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">Mass (m)</p>
                        <p className="text-sm font-black italic text-zinc-300">{mass} kg</p>
                    </div>
                    <div className="bg-card border p-3 rounded-xl flex flex-col justify-center shadow-sm" style={{ borderColor: `${activeBody.hex}50`, backgroundColor: `${activeBody.hex}10` }}>
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1" style={{ color: activeBody.hex }}>Gravity (g)</p>
                        <p className="text-sm font-black italic" style={{ color: activeBody.hex }}>{activeBody.g} m/s²</p>
                    </div>
                </div>

                <div className="space-y-2 mt-3">
                    <div className="text-[11px] font-bold text-zinc-400 bg-card p-3 rounded-xl border border-border flex items-center justify-between shadow-sm">
                        <span className="uppercase tracking-widest text-text">Total Weight (W)</span>
                        <span className="font-black italic text-xl" style={{ color: activeBody.hex }}>{Number(weightNewtons.toFixed(1))} N</span>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Weight Formula Log:</span>
                        <div className="flex flex-col gap-2 text-xs font-black italic p-3 rounded-xl border shadow-inner" style={{ color: activeBody.hex, backgroundColor: `${activeBody.hex}10`, borderColor: `${activeBody.hex}30` }}>
                            <span className="flex items-center gap-2"><CheckCircle2 size={12}/> W = m × g</span>
                            <span className="flex items-center gap-2"><CheckCircle2 size={12}/> W = {mass} × {activeBody.g}</span>
                            <span className="flex items-center gap-2 mt-2 text-lg">➔ W = {Number(weightNewtons.toFixed(1))} N</span>
                        </div>
                    </div>
                </div>

                {/* --- LAB NOTES --- */}
                <div className="mt-4 border-t border-border pt-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-text/40 mb-3 flex items-center gap-1.5">
                        <BookOpen size={12} style={{ color: activeBody.hex }} /> System Database
                    </h4>
                    
                    <div className="bg-background border border-border rounded-2xl p-4 shadow-sm mb-3">
                        <p className="text-sm text-text/80 leading-relaxed font-medium">
                            {activeBody.desc}
                        </p>
                    </div>

                    <div className="rounded-2xl p-4 shadow-sm border" style={{ backgroundImage: `linear-gradient(to bottom right, ${activeBody.hex}15, transparent)`, borderColor: `${activeBody.hex}40` }}>
                        <h5 className="text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1" style={{ color: activeBody.hex }}>
                            <Sparkles size={12} /> Astronomical Fact
                        </h5>
                        <p className="text-xs text-text/90 italic font-bold leading-relaxed">
                            "{activeBody.fact}"
                        </p>
                    </div>
                    
                    {/* Perspective Note */}
                    <div className="mt-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">
                        Equivalent Earth Feeling: {Number(weightKgf.toFixed(1))} kg
                    </div>
                </div>

            </div>
        </div>
    );
}
