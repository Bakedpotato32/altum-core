'use client';
import React, { useState, useMemo } from 'react';
import { 
    MoveHorizontal, RotateCcw, Activity, 
    Trash2, CheckCircle2, Info, BookOpen, Sparkles, 
    Play, Square, ArrowRight, ArrowLeft,
    ChevronsRight, ChevronsLeft
} from 'lucide-react';

// --- CUSTOM HUMAN SVGs (No more moonwalking!) ---
const PullerLeft = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="14" cy="5" r="3" />
        <path d="M14 8 L9 16" /> {/* Leans left (away) */}
        <path d="M9 16 L4 22 M9 16 L14 22" /> {/* Braced legs */}
        <path d="M14 8 L24 10" /> {/* Arms pulling rope to the right */}
    </svg>
);

const PusherLeft = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="8" cy="5" r="3" />
        <path d="M8 8 L14 16" /> {/* Leans right (towards cart) */}
        <path d="M14 16 L9 22 M14 16 L18 22" /> {/* Driving legs */}
        <path d="M8 8 L24 12" /> {/* Arms pushing down-right onto cart */}
    </svg>
);

const PullerRight = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="10" cy="5" r="3" />
        <path d="M10 8 L15 16" /> {/* Leans right (away) */}
        <path d="M15 16 L10 22 M15 16 L20 22" /> {/* Braced legs */}
        <path d="M10 8 L0 10" /> {/* Arms pulling rope to the left */}
    </svg>
);

const PusherRight = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="16" cy="5" r="3" />
        <path d="M16 8 L10 16" /> {/* Leans left (towards cart) */}
        <path d="M10 16 L6 22 M10 16 L15 22" /> {/* Driving legs */}
        <path d="M16 8 L0 12" /> {/* Arms pushing down-left onto cart */}
    </svg>
);

const Frac = ({ n, d }: { n: React.ReactNode, d: React.ReactNode }) => (
    <span className="inline-flex flex-col items-center justify-center align-middle mx-1 font-black italic relative -top-[0.1em]">
        <span className="border-b-[2.5px] border-current px-1 pb-[2px] leading-none">{n}</span>
        <span className="pt-[2px] px-1 leading-none">{d}</span>
    </span>
);

interface HumanEntity {
    id: string;
    force: number;
    side: 'left' | 'right';
    action: 'pull' | 'push';
}

export default function ForceTugOfWar() {
    const [team, setTeam] = useState<HumanEntity[]>([]);
    const [mass, setMass] = useState<number>(50); 
    const [simState, setSimState] = useState<'idle' | 'running' | 'finished'>('idle');

    // --- PHYSICS CALCULATIONS ---
    const leftForce = useMemo(() => team.reduce((sum, b) => {
        if (b.side === 'left' && b.action === 'pull') return sum + b.force;
        if (b.side === 'right' && b.action === 'push') return sum + b.force;
        return sum;
    }, 0), [team]);

    const rightForce = useMemo(() => team.reduce((sum, b) => {
        if (b.side === 'right' && b.action === 'pull') return sum + b.force;
        if (b.side === 'left' && b.action === 'push') return sum + b.force;
        return sum;
    }, 0), [team]);
    
    const netForceRaw = rightForce - leftForce; 
    const netForce = Math.abs(netForceRaw);
    const winningSide = netForceRaw > 0 ? 'right' : netForceRaw < 0 ? 'left' : 'balanced';
    
    const acceleration = mass > 0 ? netForce / mass : 0;

    // --- HANDLERS ---
    const addHuman = (side: 'left' | 'right', force: number, action: 'pull' | 'push') => {
        if (simState !== 'idle') return;
        if (team.filter(p => p.side === side).length >= 4) return; // Max 4 people per side
        setTeam([...team, { id: Math.random().toString(), force, side, action }]);
    };

    const resetSim = () => setSimState('idle');
    const clearAll = () => { setTeam([]); setSimState('idle'); };

    const runSimulation = () => {
        if (team.length === 0) return;
        setSimState('running');
        setTimeout(() => setSimState('finished'), 1500);
    };

    const getCartOffset = () => {
        if (simState === 'idle') return '0px';
        if (winningSide === 'balanced') return '0px';
        return winningSide === 'right' ? '120px' : '-120px';
    };

    // Sort to place Pushers next to the crate, and Pullers further out on the rope
    const leftTeamHumans = team.filter(p => p.side === 'left').sort((a, b) => a.action === 'push' ? 1 : -1);
    const rightTeamHumans = team.filter(p => p.side === 'right').sort((a, b) => a.action === 'push' ? -1 : 1);

    const hasLeftPuller = leftTeamHumans.some(h => h.action === 'pull');
    const hasRightPuller = rightTeamHumans.some(h => h.action === 'pull');

    return (
        <div className="relative rounded-3xl bg-card border border-border p-4 overflow-hidden transition-all duration-300 group">
            
            <MoveHorizontal className="absolute -right-4 -top-4 w-24 h-24 text-orange-500/5 group-hover:-rotate-12 transition-transform duration-700 pointer-events-none" />
            
            <div className="flex items-center gap-2 mb-4 relative z-10">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-orange-500">Physics Sandbox</span>
            </div>

            <div className="flex justify-between items-start mb-4 relative z-10">
                <h3 className="text-xl font-black italic uppercase tracking-[-0.02em] text-text leading-none">
                    Force <span className="text-orange-500">Tug-of-War</span>
                </h3>
                <div className="flex gap-2">
                    <button onClick={resetSim} className="w-8 h-8 rounded-xl bg-background border border-border flex items-center justify-center hover:bg-orange-500/10 hover:text-orange-500 hover:border-orange-500/30 transition-colors active:scale-95 text-zinc-500 shadow-sm">
                        <RotateCcw className="w-4 h-4" />
                    </button>
                    <button onClick={clearAll} className="w-8 h-8 rounded-xl bg-background border border-border flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-colors active:scale-95 text-zinc-500 shadow-sm group/btn">
                        <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-500" />
                    </button>
                </div>
            </div>

            {/* --- VISUAL SIMULATION CANVAS --- */}
            <div className="bg-[#0a0a0c] border-2 border-border rounded-3xl mb-4 relative overflow-hidden flex flex-col shadow-inner h-[280px] z-10">
                
                {/* Ground Line */}
                <div className="absolute bottom-0 left-0 right-0 h-[25%] bg-zinc-900 border-t-4 border-zinc-800 z-0" />
                
                {/* Master Force Vectors (Top Arrows) */}
                <div className="absolute top-[10%] left-0 right-0 h-10 flex justify-between px-6 pointer-events-none z-20">
                    <div className="flex items-center text-cyan-400 font-black italic text-sm transition-all duration-500" style={{ opacity: leftForce > 0 ? 1 : 0, transform: `scale(${1 + (leftForce / 500)})` }}>
                        <ArrowLeft className="w-5 h-5 mr-1" /> {leftForce} N
                    </div>
                    <div className="flex items-center text-orange-400 font-black italic text-sm transition-all duration-500" style={{ opacity: rightForce > 0 ? 1 : 0, transform: `scale(${1 + (rightForce / 500)})` }}>
                        {rightForce} N <ArrowRight className="w-5 h-5 ml-1" />
                    </div>
                </div>

                {/* Animated Simulation Layer (Everything moves together!) */}
                <div 
                    className="absolute bottom-[25%] left-0 right-0 flex justify-center items-end pb-1.5 z-10"
                    style={{ 
                        transform: `translateX(${getCartOffset()})`,
                        transition: simState === 'running' ? `transform 1.5s cubic-bezier(0.5, 0, 0.2, 1)` : 'transform 0.5s ease-out'
                    }}
                >
                    {/* Left Team (Cyan) */}
                    <div className="absolute right-[calc(50%+45px)] flex items-end justify-end h-[60px] z-10">
                        {/* Physical Rope connected to Cart */}
                        {hasLeftPuller && <div className="absolute top-[42%] right-[-10px] left-[10px] h-[3px] bg-zinc-500 -z-10" />}
                        
                        {leftTeamHumans.map(p => (
                            <div key={p.id} className="relative flex flex-col items-center justify-end h-full px-1">
                                <div className="absolute -top-6 text-[8px] font-black uppercase text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/30 whitespace-nowrap">
                                    {p.force}N {p.action === 'pull' ? '←' : '→'}
                                </div>
                                {p.action === 'pull' 
                                    ? <PullerLeft className={`text-cyan-400 ${p.force > 50 ? 'w-16 h-16' : 'w-12 h-12'} drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]`} />
                                    : <PusherLeft className={`text-cyan-400 ${p.force > 50 ? 'w-16 h-16' : 'w-12 h-12'} drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]`} />
                                }
                            </div>
                        ))}
                    </div>

                    {/* The Cart (Center) */}
                    <div className="relative flex flex-col items-center z-20">
                        <div className="w-24 h-16 bg-zinc-800 border-2 border-zinc-600 rounded-xl flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative z-10 overflow-hidden">
                            {/* Crate details */}
                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.1) 50%)', backgroundSize: '8px 100%' }} />
                            
                            {/* Hook Rings for ropes */}
                            <div className="absolute left-[-4px] top-[40%] w-2 h-4 rounded-full border-2 border-zinc-500" />
                            <div className="absolute right-[-4px] top-[40%] w-2 h-4 rounded-full border-2 border-zinc-500" />

                            {simState === 'running' && winningSide === 'balanced' && (
                                <div className="absolute inset-0 border-4 border-red-500/50 rounded-xl animate-ping opacity-50" />
                            )}
                            <span className="text-sm font-black italic text-white z-10 drop-shadow-md">{mass} kg</span>
                        </div>
                        {/* Wheels resting precisely on the ground */}
                        <div className="flex justify-between w-16 -mt-2.5 z-20 relative">
                            <div className={`w-6 h-6 rounded-full bg-zinc-950 border-2 border-zinc-400 shadow-inner flex items-center justify-center ${simState === 'running' && winningSide !== 'balanced' ? 'animate-[spin_0.5s_linear_infinite]' : ''}`}>
                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                            </div>
                            <div className={`w-6 h-6 rounded-full bg-zinc-950 border-2 border-zinc-400 shadow-inner flex items-center justify-center ${simState === 'running' && winningSide !== 'balanced' ? 'animate-[spin_0.5s_linear_infinite]' : ''}`}>
                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                            </div>
                        </div>
                    </div>

                    {/* Right Team (Orange) */}
                    <div className="absolute left-[calc(50%+45px)] flex items-end justify-start h-[60px] z-10">
                        {/* Physical Rope connected to Cart */}
                        {hasRightPuller && <div className="absolute top-[42%] left-[-10px] right-[10px] h-[3px] bg-zinc-500 -z-10" />}

                        {rightTeamHumans.map(p => (
                            <div key={p.id} className="relative flex flex-col items-center justify-end h-full px-1">
                                <div className="absolute -top-6 text-[8px] font-black uppercase text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/30 whitespace-nowrap">
                                    {p.action === 'push' ? '←' : '→'} {p.force}N
                                </div>
                                {p.action === 'pull' 
                                    ? <PullerRight className={`text-orange-400 ${p.force > 50 ? 'w-16 h-16' : 'w-12 h-12'} drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]`} />
                                    : <PusherRight className={`text-orange-400 ${p.force > 50 ? 'w-16 h-16' : 'w-12 h-12'} drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]`} />
                                }
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- CONTROLS --- */}
            <div className="bg-background border border-border rounded-2xl p-3 mb-4 shadow-sm relative z-10">
                <div className="grid grid-cols-3 gap-3">
                    
                    {/* Left Controls */}
                    <div className="flex flex-col gap-2 border-r border-border pr-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-cyan-500 text-center">Left Team</span>
                        <div className="flex gap-1">
                            <button disabled={simState !== 'idle'} onClick={() => addHuman('left', 50, 'pull')} className="flex-1 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex flex-col items-center justify-center active:scale-95 disabled:opacity-50 text-[10px] font-black italic text-cyan-500" title="Pull Left">
                                <ChevronsLeft size={14}/> 50
                            </button>
                            <button disabled={simState !== 'idle'} onClick={() => addHuman('left', 50, 'push')} className="flex-1 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex flex-col items-center justify-center active:scale-95 disabled:opacity-50 text-[10px] font-black italic text-cyan-500" title="Push Right">
                                50 <ChevronsRight size={14}/>
                            </button>
                        </div>
                        <div className="flex gap-1">
                            <button disabled={simState !== 'idle'} onClick={() => addHuman('left', 20, 'pull')} className="flex-1 py-1.5 bg-cyan-500/5 border border-cyan-500/20 rounded-lg flex flex-col items-center justify-center active:scale-95 disabled:opacity-50 text-[10px] font-black italic text-cyan-500">
                                <ArrowLeft size={12}/> 20
                            </button>
                            <button disabled={simState !== 'idle'} onClick={() => addHuman('left', 20, 'push')} className="flex-1 py-1.5 bg-cyan-500/5 border border-cyan-500/20 rounded-lg flex flex-col items-center justify-center active:scale-95 disabled:opacity-50 text-[10px] font-black italic text-cyan-500">
                                20 <ArrowRight size={12}/>
                            </button>
                        </div>
                    </div>

                    {/* Mass Controls */}
                    <div className="flex flex-col gap-2 items-center justify-center">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 text-center">Crate Mass</span>
                        <input 
                            type="number" 
                            value={mass} 
                            onChange={(e) => setMass(Math.max(1, Number(e.target.value)))}
                            disabled={simState !== 'idle'}
                            className="w-16 bg-card border-2 border-border rounded-xl py-2 text-center text-sm font-black italic outline-none focus:border-orange-500 disabled:opacity-50 shadow-inner" 
                        />
                        <span className="text-[9px] font-bold text-zinc-500">KG</span>
                    </div>

                    {/* Right Controls */}
                    <div className="flex flex-col gap-2 border-l border-border pl-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-orange-500 text-center">Right Team</span>
                        <div className="flex gap-1">
                            <button disabled={simState !== 'idle'} onClick={() => addHuman('right', 50, 'push')} className="flex-1 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-lg flex flex-col items-center justify-center active:scale-95 disabled:opacity-50 text-[10px] font-black italic text-orange-500" title="Push Left">
                                <ChevronsLeft size={14}/> 50
                            </button>
                            <button disabled={simState !== 'idle'} onClick={() => addHuman('right', 50, 'pull')} className="flex-1 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-lg flex flex-col items-center justify-center active:scale-95 disabled:opacity-50 text-[10px] font-black italic text-orange-500" title="Pull Right">
                                50 <ChevronsRight size={14}/>
                            </button>
                        </div>
                        <div className="flex gap-1">
                            <button disabled={simState !== 'idle'} onClick={() => addHuman('right', 20, 'push')} className="flex-1 py-1.5 bg-orange-500/5 border border-orange-500/20 rounded-lg flex flex-col items-center justify-center active:scale-95 disabled:opacity-50 text-[10px] font-black italic text-orange-500">
                                <ArrowLeft size={12}/> 20
                            </button>
                            <button disabled={simState !== 'idle'} onClick={() => addHuman('right', 20, 'pull')} className="flex-1 py-1.5 bg-orange-500/5 border border-orange-500/20 rounded-lg flex flex-col items-center justify-center active:scale-95 disabled:opacity-50 text-[10px] font-black italic text-orange-500">
                                20 <ArrowRight size={12}/>
                            </button>
                        </div>
                    </div>

                </div>

                <button 
                    onClick={simState === 'idle' ? runSimulation : resetSim} 
                    disabled={team.length === 0 && simState === 'idle'}
                    className={`w-full mt-4 py-3 rounded-xl flex items-center justify-center gap-2 font-black italic uppercase tracking-wider text-sm transition-all active:scale-[0.98]
                    ${simState === 'idle' 
                        ? 'bg-emerald-500 text-white shadow-[0_4px_0_rgb(4,120,87)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none disabled:opacity-50 disabled:bg-zinc-700 disabled:shadow-none' 
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700 shadow-sm'}`}
                >
                    {simState === 'idle' ? <><Play size={16} fill="currentColor" /> Pull & Push!</> : <><Square size={16} fill="currentColor" /> Reset Simulation</>}
                </button>
            </div>

            {/* --- PHYSICS ENGINE OUTPUT --- */}
            <div className={`transition-all duration-700 ${simState === 'finished' ? 'opacity-100 max-h-[1000px]' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                <div className="space-y-3 relative z-10 bg-background border border-border rounded-3xl p-5 shadow-sm mt-4">
                    
                    <div className="flex items-center justify-center gap-2 text-sm font-black italic uppercase tracking-widest text-emerald-500">
                        <Activity size={16}/> Kinematics Resolved
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4">
                        <div className={`border p-3 rounded-xl flex flex-col justify-center shadow-sm ${winningSide === 'left' ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-card border-border'}`}>
                            <p className="text-[9px] font-bold text-cyan-500/70 uppercase tracking-widest mb-1 flex items-center gap-1">Force (Left)</p>
                            <p className="text-sm font-black italic text-cyan-500">{leftForce} N</p>
                        </div>
                        <div className={`border p-3 rounded-xl flex flex-col justify-center shadow-sm ${winningSide === 'right' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-card border-border'}`}>
                            <p className="text-[9px] font-bold text-orange-500/70 uppercase tracking-widest mb-1 flex items-center gap-1">Force (Right)</p>
                            <p className="text-sm font-black italic text-orange-500">{rightForce} N</p>
                        </div>
                    </div>

                    <div className="space-y-2 mt-3">
                        <div className="text-[11px] font-bold text-zinc-400 bg-card p-3 rounded-xl border border-border flex items-center justify-between shadow-sm">
                            <span className="uppercase tracking-widest text-text">Net Force (F<sub className="text-[8px]">net</sub>)</span>
                            <span className={`font-black italic text-xl ${winningSide === 'balanced' ? 'text-emerald-500' : 'text-rose-500'}`}>{netForce} N</span>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Newton's 2nd Law Log:</span>
                            <div className="flex flex-col gap-2 text-rose-500 text-xs font-black italic bg-rose-500/5 p-3 rounded-xl border border-rose-500/20 shadow-inner">
                                <span className="flex items-center gap-2"><CheckCircle2 size={12}/> a = <Frac n={<>F<sub className="text-[8px]">net</sub></>} d="m" /></span>
                                <span className="flex items-center gap-2"><CheckCircle2 size={12}/> a = <Frac n={netForce} d={mass} /></span>
                                <span className="flex items-center gap-2 mt-2 text-lg">➔ a = {Number(acceleration.toFixed(2))} m/s²</span>
                            </div>
                        </div>
                    </div>

                    {/* --- LAB NOTES --- */}
                    <div className="mt-4 border-t border-border pt-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-text/40 mb-3 flex items-center gap-1.5">
                            <BookOpen size={12} className="text-orange-500" /> Lab Notes
                        </h4>
                        
                        <div className="bg-background border border-border rounded-2xl p-4 shadow-sm mb-3">
                            <p className="text-sm text-text/80 leading-relaxed font-medium">
                                {winningSide === 'balanced' 
                                    ? "These forces are BALANCED. The net force is 0 N. Therefore, according to Newton's First Law, the object remains at rest and acceleration is 0 m/s²."
                                    : `These forces are UNBALANCED. Team ${winningSide.toUpperCase()} wins! According to Newton's Second Law, the net force causes the cart to accelerate in the direction of the stronger force.`
                                }
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-orange-500/10 to-rose-500/10 border border-orange-500/30 rounded-2xl p-4 shadow-sm">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-2 flex items-center gap-1">
                                <Sparkles size={12} /> Did You Know?
                            </h5>
                            <p className="text-xs text-text/90 italic font-bold leading-relaxed">
                                "Force vectors are additive! A person pushing from the left with 50N does the exact same mechanical work as a person pulling from the right with 50N."
                            </p>
                        </div>
                    </div>

                </div>
            </div>

            {/* Instruction Footer */}
            {simState === 'idle' && (
                <div className="mt-4 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 relative z-10 flex gap-3 items-center">
                    <Info className="text-orange-500 shrink-0" size={14} />
                    <p className="text-[10px] font-bold text-zinc-500 leading-relaxed uppercase tracking-wide">
                        <span className="text-orange-400">Add characters</span> using the controls. Select Push or Pull to stack force vectors. Adjust the crate mass, then hit <span className="text-orange-400">PULL & PUSH!</span>
                    </p>
                </div>
            )}
        </div>
    );
}
