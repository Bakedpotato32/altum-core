'use client';
import React, { useState } from 'react';
import { 
    Waves, RotateCcw, Activity, CheckCircle2, 
    BookOpen, Sparkles, Box, Droplet, ArrowDown, ArrowUp, Info
} from 'lucide-react';

const Frac = ({ n, d }: { n: React.ReactNode, d: React.ReactNode }) => (
    <span className="inline-flex flex-col items-center justify-center align-middle mx-1 font-black italic relative -top-[0.1em]">
        <span className="border-b-[2px] border-current px-1 pb-[1px] leading-none">{n}</span>
        <span className="pt-[1px] px-1 leading-none">{d}</span>
    </span>
);

interface Fluid {
    id: string; name: string; density: number; colorHex: string; desc: string; fact: string;
}

interface Solid {
    id: string; name: string; density: number; colorHex: string;
}

const FLUIDS: Fluid[] = [
    { id: 'water', name: 'Fresh Water', density: 1.0, colorHex: '#3b82f6', desc: 'Standard H₂O. Density is exactly 1 kg/L.', fact: 'Water is one of the only substances that expands when it freezes, which is why ice floats!' },
    { id: 'saltwater', name: 'Saltwater', density: 1.03, colorHex: '#0ea5e9', desc: 'Ocean water containing dissolved salts, making it denser than fresh water.', fact: 'The Dead Sea is so salty (density 1.24) that humans float effortlessly on the surface!' },
    { id: 'oil', name: 'Cooking Oil', density: 0.92, colorHex: '#eab308', desc: 'A lipid-based liquid. Less dense than water.', fact: 'Oil and water are immiscible (they don\'t mix). If you pour them together, the oil will always float on top.' },
    { id: 'honey', name: 'Pure Honey', density: 1.42, colorHex: '#d97706', desc: 'A thick, viscous, high-density sugar solution.', fact: 'Honey is so dense and low in moisture that bacteria cannot grow in it. Edible honey was found in ancient Egyptian tombs!' },
];

const SOLIDS: Solid[] = [
    { id: 'styrofoam', name: 'Styrofoam', density: 0.05, colorHex: '#f1f5f9' },
    { id: 'wood', name: 'Pine Wood', density: 0.50, colorHex: '#b45309' },
    { id: 'ice', name: 'Solid Ice', density: 0.92, colorHex: '#bae6fd' },
    { id: 'brick', name: 'Red Brick', density: 2.00, colorHex: '#b91c1c' },
    { id: 'iron', name: 'Iron Anvil', density: 7.80, colorHex: '#475569' },
];

export default function BuoyancyEngine() {
    const [fluid, setFluid] = useState<Fluid>(FLUIDS[0]);
    const [solid, setSolid] = useState<Solid>(SOLIDS[1]); // Default to Wood
    const [simState, setSimState] = useState<'idle' | 'dropping' | 'settled'>('idle');

    // --- PHYSICS ENGINE (Assuming block volume = 1 Liter = 0.001 m^3) ---
    const volumeLiters = 1; 
    const gravity = 9.8; 
    
    // Mass = Density * Volume
    const massKg = solid.density * volumeLiters; 
    // Weight = Mass * Gravity
    const weightN = massKg * gravity; 
    
    // Buoyancy rules
    const sinks = solid.density > fluid.density;
    const submergedRatio = sinks ? 1 : solid.density / fluid.density; // 1 = 100% submerged
    
    // F_b = volume_submerged * fluid_density * gravity
    const buoyantForceN = (submergedRatio * volumeLiters) * fluid.density * gravity;
    const netForceN = weightN - buoyantForceN; 

    // --- VISUAL CALCULATIONS ---
    // Canvas is 280px tall. Water surface is at 140px. Block is 64px tall.
    const startY = 20; // Hovering in air
    const sinkY = 280 - 64 - 10; // Hits the bottom
    const floatY = 140 - 64 + (64 * submergedRatio); // Bobbing in water

    const getBlockY = () => {
        if (simState === 'idle') return startY;
        return sinks ? sinkY : floatY;
    };

    const runSimulation = () => {
        setSimState('dropping');
        setTimeout(() => setSimState('settled'), 1000);
    };

    const resetSim = () => setSimState('idle');

    return (
        <div className="relative rounded-3xl bg-card border border-border p-4 overflow-hidden transition-all duration-300 group">
            
            <Waves className={`absolute -right-4 -top-4 w-24 h-24 opacity-5 transition-transform duration-700 pointer-events-none group-hover:-rotate-12`} style={{ color: fluid.colorHex }} />
            
            <div className="flex items-center gap-2 mb-4 relative z-10">
                <div className="w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(currentColor)]" style={{ backgroundColor: fluid.colorHex, color: fluid.colorHex }} />
                <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase" style={{ color: fluid.colorHex }}>Fluid Mechanics</span>
            </div>

            <div className="flex justify-between items-start mb-4 relative z-10">
                <h3 className="text-xl font-black italic uppercase tracking-[-0.02em] text-text leading-none">
                    Buoyancy <span style={{ color: fluid.colorHex }}>Engine</span>
                </h3>
                <button onClick={resetSim} className="w-8 h-8 rounded-xl bg-background border border-border flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-colors active:scale-95 text-zinc-500 shadow-sm">
                    <RotateCcw className="w-4 h-4" />
                </button>
            </div>

            {/* --- VISUAL SIMULATION CANVAS --- */}
            <div className="bg-[#0a0a0c] border-2 border-border rounded-3xl mb-4 relative overflow-hidden flex flex-col shadow-inner h-[280px] z-10">
                
                {/* The Tank Background */}
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 to-zinc-950/50 z-0" />
                
                {/* The Fluid */}
                <div 
                    className="absolute bottom-0 left-0 right-0 h-[140px] z-20 backdrop-blur-[2px] transition-colors duration-700 border-t border-white/20"
                    style={{ backgroundColor: `${fluid.colorHex}60` }}
                >
                    {/* Liquid Surface Line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
                </div>

                {/* The Solid Block */}
                <div 
                    className="absolute left-1/2 -translate-x-1/2 w-16 h-16 rounded-xl border-2 shadow-2xl flex flex-col items-center justify-center z-30"
                    style={{ 
                        backgroundColor: solid.colorHex, 
                        borderColor: 'rgba(0,0,0,0.3)',
                        transform: `translateY(${getBlockY()}px)`,
                        // Give it a bouncy transition if it floats, or a heavy thud if it sinks
                        transition: simState === 'dropping' 
                            ? (sinks ? 'transform 0.8s cubic-bezier(0.5, 0, 1, 1)' : 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)')
                            : 'transform 0.5s ease-out'
                    }}
                >
                    <Box className="absolute opacity-20 w-full h-full p-2 text-black" />
                    <span className="text-xs font-black italic text-black/60 z-10 leading-none">{solid.density}</span>
                    <span className="text-[7px] font-black uppercase text-black/50 z-10 leading-none">kg/L</span>

                    {/* Force Vectors (Rendered when settled) */}
                    <div className={`absolute inset-0 transition-opacity duration-500 ${simState === 'settled' ? 'opacity-100' : 'opacity-0'}`}>
                        {/* Gravity Arrow (Down) */}
                        <div className="absolute top-[110%] left-1/2 -translate-x-1/2 flex flex-col items-center">
                            <div className="w-1 bg-rose-500 rounded-t-full" style={{ height: `${Math.min(60, weightN * 2)}px` }} />
                            <ArrowDown size={14} className="text-rose-500 -mt-1" />
                            <span className="text-[8px] font-black text-rose-400 absolute top-full mt-1 bg-black/80 px-1 rounded">W</span>
                        </div>
                        {/* Buoyancy Arrow (Up) */}
                        <div className="absolute bottom-[110%] left-1/2 -translate-x-1/2 flex flex-col items-center">
                            <span className="text-[8px] font-black text-cyan-400 absolute bottom-full mb-1 bg-black/80 px-1 rounded">Fb</span>
                            <ArrowUp size={14} className="text-cyan-500 -mb-1" />
                            <div className="w-1 bg-cyan-500 rounded-b-full" style={{ height: `${Math.min(60, buoyantForceN * 2)}px` }} />
                        </div>
                    </div>
                </div>

                {/* Ground */}
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-zinc-950 border-t-2 border-zinc-800 z-10" />
            </div>

            {/* --- CONTROLS --- */}
            <div className="bg-background border border-border rounded-2xl p-3 mb-4 shadow-sm relative z-10 space-y-3">
                
                {/* Fluid Selection */}
                <div>
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-text/40 mb-1.5 px-1 flex items-center gap-1"><Droplet size={10}/> Select Fluid</h4>
                    <div className="flex gap-2 overflow-x-auto custom-scroll pb-1 snap-x">
                        {FLUIDS.map(f => (
                            <button 
                                key={f.id} onClick={() => {setFluid(f); resetSim();}} 
                                disabled={simState !== 'idle'}
                                className={`shrink-0 snap-center px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 ${fluid.id === f.id ? 'shadow-sm bg-card scale-[1.02]' : 'bg-background hover:bg-zinc-800/5'}`}
                                style={{ borderColor: fluid.id === f.id ? f.colorHex : 'var(--border)', color: fluid.id === f.id ? f.colorHex : 'var(--text)' }}
                            >
                                {f.name} ({f.density})
                            </button>
                        ))}
                    </div>
                </div>

                {/* Solid Selection */}
                <div>
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-text/40 mb-1.5 px-1 flex items-center gap-1"><Box size={10}/> Select Solid Object (Volume = 1L)</h4>
                    <div className="flex gap-2 overflow-x-auto custom-scroll pb-1 snap-x">
                        {SOLIDS.map(s => (
                            <button 
                                key={s.id} onClick={() => {setSolid(s); resetSim();}} 
                                disabled={simState !== 'idle'}
                                className={`shrink-0 snap-center px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 ${solid.id === s.id ? 'shadow-sm bg-card border-orange-500 text-orange-500 scale-[1.02]' : 'bg-background border-border hover:bg-zinc-800/5 text-text/60'}`}
                            >
                                {s.name} ({s.density})
                            </button>
                        ))}
                    </div>
                </div>

                <button 
                    onClick={simState === 'idle' ? runSimulation : resetSim} 
                    className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-black italic uppercase tracking-wider text-sm transition-all active:scale-[0.98]
                    ${simState === 'idle' 
                        ? 'bg-emerald-500 text-white shadow-[0_4px_0_rgb(4,120,87)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none' 
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700 shadow-sm'}`}
                >
                    {simState === 'idle' ? <><ArrowDown size={16} /> Drop Object!</> : <><RotateCcw size={16} /> Reset Test</>}
                </button>
            </div>

            {/* --- PHYSICS ENGINE OUTPUT --- */}
            <div className={`transition-all duration-700 ${simState === 'settled' ? 'opacity-100 max-h-[1000px]' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                <div className="space-y-3 relative z-10 bg-background border border-border rounded-3xl p-5 shadow-sm mt-4">
                    
                    <div className="flex items-center justify-center gap-2 text-sm font-black italic uppercase tracking-widest text-emerald-500">
                        <Activity size={16}/> Hydrodynamics Resolved
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4">
                        <div className="bg-card border p-3 rounded-xl flex flex-col justify-center shadow-sm">
                            <p className="text-[9px] font-bold text-orange-500/70 uppercase tracking-widest mb-1 flex items-center gap-1">Object Density (d<sub className="text-[6px]">o</sub>)</p>
                            <p className="text-sm font-black italic text-orange-500">{solid.density.toFixed(2)} kg/L</p>
                        </div>
                        <div className="bg-card border p-3 rounded-xl flex flex-col justify-center shadow-sm" style={{ borderColor: `${fluid.colorHex}50`, backgroundColor: `${fluid.colorHex}10` }}>
                            <p className="text-[9px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1" style={{ color: fluid.colorHex }}>Fluid Density (d<sub className="text-[6px]">f</sub>)</p>
                            <p className="text-sm font-black italic" style={{ color: fluid.colorHex }}>{fluid.density.toFixed(2)} kg/L</p>
                        </div>
                    </div>

                    <div className="space-y-2 mt-3">
                        <div className="text-[11px] font-bold text-zinc-400 bg-card p-3 rounded-xl border border-border flex items-center justify-between shadow-sm">
                            <span className="uppercase tracking-widest text-text">Submerged Ratio</span>
                            <span className="font-black italic text-xl text-emerald-500">{(submergedRatio * 100).toFixed(0)}%</span>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Archimedes Principle Log:</span>
                            <div className="flex flex-col gap-2 text-cyan-500 text-xs font-black italic bg-cyan-500/5 p-3 rounded-xl border border-cyan-500/20 shadow-inner">
                                <span className="flex items-center gap-2"><CheckCircle2 size={12}/> Weight (W) = {Number(weightN.toFixed(2))} N Down</span>
                                <span className="flex items-center gap-2"><CheckCircle2 size={12}/> Buoyancy (F<sub className="-mb-2 text-[8px]">b</sub>) = {Number(buoyantForceN.toFixed(2))} N Up</span>
                                <span className="flex items-center gap-2 mt-2 text-lg text-emerald-500">➔ Block {sinks ? 'Sinks' : 'Floats'}</span>
                            </div>
                        </div>
                    </div>

                    {/* --- LAB NOTES --- */}
                    <div className="mt-4 border-t border-border pt-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-text/40 mb-3 flex items-center gap-1.5">
                            <BookOpen size={12} style={{ color: fluid.colorHex }} /> Fluid Database
                        </h4>
                        
                        <div className="bg-background border border-border rounded-2xl p-4 shadow-sm mb-3">
                            <p className="text-sm text-text/80 leading-relaxed font-medium">
                                {sinks 
                                    ? `Because the density of ${solid.name} (${solid.density}) is GREATER than the density of ${fluid.name} (${fluid.density}), the buoyant force cannot support its weight. It sinks to the bottom.`
                                    : `Because the density of ${solid.name} (${solid.density}) is LESS than the density of ${fluid.name} (${fluid.density}), it floats! It displaces exactly enough fluid to balance its own weight.`
                                }
                            </p>
                        </div>

                        <div className="rounded-2xl p-4 shadow-sm border" style={{ backgroundImage: `linear-gradient(to bottom right, ${fluid.colorHex}15, transparent)`, borderColor: `${fluid.colorHex}40` }}>
                            <h5 className="text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1" style={{ color: fluid.colorHex }}>
                                <Sparkles size={12} /> Did You Know?
                            </h5>
                            <p className="text-xs text-text/90 italic font-bold leading-relaxed">
                                "{fluid.fact}"
                            </p>
                        </div>
                    </div>

                </div>
            </div>

            {/* Instruction Footer */}
            {simState === 'idle' && (
                <div className="mt-4 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 relative z-10 flex gap-3 items-center">
                    <Info className="text-cyan-500 shrink-0" size={14} />
                    <p className="text-[10px] font-bold text-zinc-500 leading-relaxed uppercase tracking-wide">
                        Select a fluid and a solid block from the menus above, then hit <span className="text-cyan-400">Drop Object</span> to test its buoyancy.
                    </p>
                </div>
            )}
        </div>
    );
}
