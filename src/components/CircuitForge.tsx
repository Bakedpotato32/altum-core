'use client';
import React, { useState } from 'react';
import { 
    Zap, Trash2, Battery, Activity, Lightbulb, 
    Fan, ToggleLeft, ToggleRight, Plus, AlertTriangle, ArrowRight
} from 'lucide-react';

type CompType = 'resistor' | 'bulb' | 'motor';

interface CircuitComponent {
    id: string;
    type: CompType;
    resistance: string; 
}

const Frac = ({ n, d }: { n: React.ReactNode, d: React.ReactNode }) => (
    <span className="inline-flex flex-col items-center justify-center align-middle mx-1 font-black italic relative -top-[0.1em]">
        <span className="border-b-[2px] border-current px-1 pb-[1px] leading-none">{n}</span>
        <span className="pt-[1px] px-1 leading-none">{d}</span>
    </span>
);

export default function CircuitForgeSandbox() {
    const [voltage, setVoltage] = useState<string>('12');
    const [isClosed, setIsClosed] = useState<boolean>(true);
    const [grid, setGrid] = useState<CircuitComponent[][]>([
        [{ id: '1', type: 'bulb', resistance: '10' }]
    ]);

    const addSeriesNode = () => setGrid([...grid, []]);

    const addParallelBranch = (stageIndex: number, type: CompType) => {
        if (grid[stageIndex].length >= 4) return; 
        const newGrid = [...grid];
        const defaultR = type === 'bulb' ? '10' : type === 'motor' ? '5' : '2';
        newGrid[stageIndex].push({ id: Math.random().toString(), type, resistance: defaultR });
        setGrid(newGrid);
    };

    const removeComponent = (stageIndex: number, compId: string) => {
        const newGrid = [...grid];
        newGrid[stageIndex] = newGrid[stageIndex].filter(c => c.id !== compId);
        if (newGrid[stageIndex].length === 0) newGrid.splice(stageIndex, 1);
        setGrid(newGrid);
    };

    const updateResistance = (stageIndex: number, compId: string, val: string) => {
        const newGrid = [...grid];
        const comp = newGrid[stageIndex].find(c => c.id === compId);
        if (comp) comp.resistance = val;
        setGrid(newGrid);
    };

    const clearBoard = () => { setGrid([]); setVoltage('12'); setIsClosed(false); };

    // --- PHYSICS ENGINE ---
    let totalReq = 0;
    let isShortCircuit = false;
    let vNum = parseFloat(voltage) || 0;

    const stageResults = grid.map((stage) => {
        let rVals = stage.map(c => Math.abs(parseFloat(c.resistance)) || 0); 
        let stageReq = 0;

        if (rVals.length === 0) {
            stageReq = 0;
        } else if (rVals.some(r => r === 0)) {
            stageReq = 0; 
        } else if (rVals.length === 1) {
            stageReq = rVals[0];
        } else {
            let invSum = rVals.reduce((sum, r) => sum + (1 / r), 0);
            stageReq = 1 / invSum;
        }

        totalReq += stageReq;
        return { req: stageReq, components: stage.map((c, i) => ({ ...c, rNum: rVals[i] })) };
    });

    if (totalReq <= 0.001 && grid.length > 0 && grid.some(s => s.length > 0)) isShortCircuit = true;
    let totalCurrent = (!isClosed || grid.every(s => s.length === 0)) ? 0 : (isShortCircuit ? 999 : vNum / totalReq);

    return (
        <div className="relative rounded-3xl bg-card border border-border p-4 overflow-hidden transition-all duration-300 group">
            
            <style>{`
                @keyframes spin-fast { 100% { transform: rotate(360deg); } }
                @keyframes dash-flow { to { stroke-dashoffset: -20; } }
                .wire-flow { stroke-dasharray: 6 6; animation: dash-flow 0.4s linear infinite; }
                .wire-flow-fast { stroke-dasharray: 6 6; animation: dash-flow 0.15s linear infinite; }
                .custom-scroll::-webkit-scrollbar { height: 4px; }
                .custom-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 10px; }
                .custom-scroll::-webkit-scrollbar-thumb { background: rgba(249,115,22,0.3); border-radius: 10px; }
            `}</style>

            <Zap className="absolute -right-4 -top-4 w-24 h-24 text-orange-500/5 group-hover:rotate-12 transition-transform duration-700 pointer-events-none" />
            
            <div className="flex items-center gap-2 mb-4 relative z-10">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-orange-500">Live Sandbox</span>
            </div>

            <div className="flex justify-between items-start mb-4 relative z-10">
                <h3 className="text-xl font-black italic uppercase tracking-[-0.02em] text-text leading-none">
                    Circuit <span className="text-orange-500">Forge</span>
                </h3>
                <button onClick={clearBoard} className="w-8 h-8 rounded-xl bg-background border border-border flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-colors active:scale-95 group/btn">
                    <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                </button>
            </div>

            {/* --- VISUAL SANDBOX AREA --- */}
            <div className="bg-[#0a0a0c] border-2 border-border rounded-3xl mb-4 relative overflow-hidden flex flex-col shadow-inner">
                
                {/* Header Control Panel */}
                <div className="flex justify-between items-center bg-background/80 backdrop-blur-md p-2 border-b border-border z-20 relative">
                    <div className="flex items-center gap-2 px-2">
                        <Battery className="text-orange-500" size={16} />
                        <input type="number" value={voltage} onChange={e => setVoltage(e.target.value)} className="w-12 bg-transparent text-white font-black text-sm outline-none border-b-2 border-orange-500/30 focus:border-orange-500 text-center transition-colors" placeholder="0" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">V</span>
                    </div>
                    <button onClick={() => setIsClosed(!isClosed)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 ${isClosed ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                        {isClosed ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {isClosed ? 'ON' : 'OFF'}
                    </button>
                </div>

                {/* Circuit Grid Canvas (Compact Edition) */}
                <div className="relative py-8 px-4 min-h-[220px] overflow-x-auto custom-scroll flex items-center z-10">
                    
                    {/* Background Series Wire */}
                    <div className="absolute top-1/2 left-0 right-0 h-[3px] bg-zinc-800 -translate-y-1/2 z-0" />
                    
                    {/* Animated Flowing Electrons (Series) */}
                    {totalCurrent > 0 && !isShortCircuit && (
                        <div className="absolute top-1/2 left-0 right-0 h-[3px] -translate-y-1/2 z-0 overflow-hidden">
                            <svg width="100%" height="4" className="absolute top-0">
                                <line x1="0" y1="1.5" x2="2000" y2="1.5" stroke="#f97316" strokeWidth="3" className={totalCurrent > 5 ? "wire-flow-fast" : "wire-flow"} />
                            </svg>
                        </div>
                    )}

                    {/* Short Circuit Warning */}
                    {isShortCircuit && isClosed && (
                        <div className="absolute inset-0 flex items-center justify-center z-50 bg-red-500/10 backdrop-blur-sm">
                            <div className="bg-red-950 px-6 py-4 rounded-3xl flex flex-col items-center border-2 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.6)] animate-pulse">
                                <AlertTriangle className="text-red-500 w-10 h-10 mb-2 animate-bounce" />
                                <h4 className="text-red-500 font-black italic uppercase tracking-widest text-lg">Short Circuit</h4>
                                <p className="text-[9px] text-red-400 font-bold uppercase mt-1">Zero Resistance Route.</p>
                            </div>
                        </div>
                    )}

                    {/* Dynamic Stages Mapping */}
                    <div className="flex gap-4 items-center w-max min-w-full px-4 relative z-10">
                        {grid.length === 0 && !isShortCircuit && (
                            <div className="w-full text-center text-zinc-600 font-bold text-[10px] uppercase tracking-widest italic py-8">
                                Add a node to forge circuit.
                            </div>
                        )}

                        {grid.map((stage, sIdx) => {
                            const stageData = stageResults[sIdx];
                            const stageV = isShortCircuit ? 0 : totalCurrent * stageData.req;

                            return (
                                <div key={sIdx} className="relative flex flex-col items-center gap-2 min-w-[70px]">
                                    
                                    {/* Parallel Vertical Bus Wire */}
                                    {stage.length > 1 && (
                                        <div className={`absolute top-[10%] bottom-[10%] left-1/2 w-[3px] -translate-x-1/2 z-0 rounded-full transition-colors ${totalCurrent > 0 && !isShortCircuit ? 'bg-orange-500/50 shadow-[0_0_8px_rgba(249,115,22,0.3)]' : 'bg-zinc-800'}`} />
                                    )}

                                    {/* Parallel Components */}
                                    {stage.map((comp, cIdx) => {
                                        const rNum = stageData.components[cIdx].rNum;
                                        const compI = (rNum === 0 || isShortCircuit || !isClosed) ? 0 : (stageV / rNum);
                                        const brightness = Math.min(1, 0.3 + (compI * 0.4));
                                        const spinSpeed = Math.max(0.1, 2 - (compI * 0.3));

                                        return (
                                            <div key={comp.id} className="relative group/comp bg-[#16181d] border-2 border-zinc-700 rounded-xl p-2 flex flex-col items-center justify-center shadow-lg transition-all hover:border-orange-500 w-[72px] z-10">
                                                
                                                <button onClick={() => removeComponent(sIdx, comp.id)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover/comp:opacity-100 transition-all z-20 hover:scale-110 shadow-lg">
                                                    <Trash2 size={10} />
                                                </button>

                                                {/* Physics Icon */}
                                                <div className="mb-2 h-6 flex items-center justify-center relative">
                                                    {comp.type === 'bulb' && <Lightbulb size={22} color={compI > 0 ? '#fbbf24' : '#52525b'} style={{ opacity: compI > 0 ? brightness : 1, filter: compI > 0 ? `drop-shadow(0 0 ${brightness * 15}px #fbbf24)` : 'none' }} className="transition-all duration-300" />}
                                                    {comp.type === 'motor' && <Fan size={22} color={compI > 0 ? '#38bdf8' : '#52525b'} style={{ animation: compI > 0 ? `spin-fast ${spinSpeed}s linear infinite` : 'none' }} className={compI > 0 ? "drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]" : ""} />}
                                                    {comp.type === 'resistor' && <Activity size={22} className="text-zinc-500" />}
                                                </div>

                                                {/* Resistance Input (Compact) */}
                                                <div className="flex items-center justify-center gap-0.5 bg-black/80 px-1 py-1 rounded-md border border-zinc-800 w-full">
                                                    <input type="text" value={comp.resistance} onChange={e => updateResistance(sIdx, comp.id, e.target.value)} className="w-full bg-transparent text-white text-[10px] font-black text-center outline-none" placeholder="0" />
                                                    <span className="text-[8px] font-bold text-zinc-500 pr-0.5">Ω</span>
                                                </div>
                                                
                                                {/* Live Component Telemetry (Hidden till hover for cleaner UI) */}
                                                {isClosed && !isShortCircuit && (
                                                    <div className="absolute -bottom-5 text-[8px] font-black tracking-widest text-emerald-400 bg-black px-2 py-0.5 rounded border border-emerald-500/30 z-30 whitespace-nowrap shadow-lg opacity-0 group-hover/comp:opacity-100 transition-opacity">
                                                        {Number(compI.toFixed(1))}A · {Number(stageV.toFixed(1))}V
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Inline Add Parallel Branch Menu */}
                                    {stage.length < 4 && (
                                        <div className="flex items-center gap-1 mt-1 bg-zinc-900/80 backdrop-blur-sm p-1 rounded-lg border border-zinc-800 z-10">
                                            <button onClick={() => addParallelBranch(sIdx, 'resistor')} className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors" title="Add Resistor"><Activity size={12} /></button>
                                            <button onClick={() => addParallelBranch(sIdx, 'bulb')} className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-yellow-400 transition-colors" title="Add Bulb"><Lightbulb size={12} /></button>
                                            <button onClick={() => addParallelBranch(sIdx, 'motor')} className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-cyan-400 transition-colors" title="Add Motor"><Fan size={12} /></button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Add Series Node Button */}
                        <button onClick={addSeriesNode} className="shrink-0 flex flex-col items-center justify-center gap-1 w-16 h-20 rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-800/20 text-zinc-500 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-500/5 transition-all active:scale-95 z-10 bg-[#0a0a0c]">
                            <Plus size={16} />
                            <span className="text-[8px] font-black uppercase tracking-widest text-center px-1">Node</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* --- LIVE TELEMETRY DASHBOARD --- */}
            <div className="grid grid-cols-2 gap-2 mb-4 relative z-10">
                <div className="bg-orange-500/10 border border-orange-500/30 p-3 rounded-2xl flex justify-between items-center shadow-inner">
                    <p className="text-[9px] font-bold text-orange-500 uppercase tracking-widest">Total Load</p>
                    <p className="text-sm font-black italic text-text">{Number(totalReq.toFixed(2))} Ω</p>
                </div>
                <div className={`p-3 rounded-2xl flex justify-between items-center shadow-inner border transition-colors ${!isClosed ? 'bg-zinc-500/10 border-zinc-500/30 text-zinc-500' : isShortCircuit ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'}`}>
                    <p className="text-[9px] font-bold uppercase tracking-widest">Current</p>
                    <p className="text-sm font-black italic">{!isClosed ? '0' : isShortCircuit ? 'MAX' : Number(totalCurrent.toFixed(2))} A</p>
                </div>
            </div>

            {/* --- REAL-TIME MATH ENGINE LOG --- */}
            <div className="space-y-2 relative z-10 bg-background border border-border rounded-2xl p-4 shadow-sm">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-text/40 mb-3 flex items-center gap-1.5">
                    <Zap size={10} className="text-orange-500" /> Ohm's Law Log
                </h4>
                
                {grid.length === 0 ? (
                    <p className="text-[10px] font-bold text-zinc-500 italic text-center py-1">Build a circuit to analyze.</p>
                ) : isShortCircuit ? (
                    <p className="text-[10px] font-bold text-red-500 italic text-center py-1">Resistance is near zero.</p>
                ) : (
                    <div className="space-y-2">
                        {stageResults.map((sData, i) => (
                            <div key={i} className="text-[10px] font-bold text-zinc-400 bg-card p-2 rounded-lg border border-border flex items-center justify-between shadow-sm">
                                <span className="uppercase tracking-widest text-text">Node {i + 1} {sData.components.length > 1 ? '(Parallel)' : '(Series)'}</span>
                                <span className="font-black italic text-orange-400">{Number(sData.req.toFixed(2))} Ω</span>
                            </div>
                        ))}
                        
                        <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
                            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-emerald-500 text-xs font-black italic bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/20 shadow-inner">
                                <div className="flex items-center gap-2">
                                    <span>I = <Frac n={vNum} d={Number(totalReq.toFixed(2))} /></span>
                                    <span>➔</span>
                                </div>
                                <span className="text-sm">I = {Number(totalCurrent.toFixed(2))} A</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
