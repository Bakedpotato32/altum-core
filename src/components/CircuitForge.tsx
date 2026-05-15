'use client';
import React, { useState } from 'react';
import { 
    Zap, Trash2, Battery, Activity, Lightbulb, 
    Fan, ToggleLeft, ToggleRight, Plus, AlertTriangle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type CompType = 'resistor' | 'bulb' | 'motor';

interface CircuitComponent {
    id: string;
    type: CompType;
    resistance: string; 
}

const Frac = ({ n, d }: { n: React.ReactNode, d: React.ReactNode }) => (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle', margin: '0 4px', position: 'relative', top: '-0.1em' }}>
        <span style={{ borderBottom: '2.5px solid currentColor', padding: '0 4px', paddingBottom: '2px', lineHeight: 1 }}>{n}</span>
        <span style={{ paddingTop: '2px', padding: '0 4px', lineHeight: 1 }}>{d}</span>
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
        <div style={{
            background: 'linear-gradient(135deg, #f97316, #ea580c)', // Vibrant Orange gradient
            borderRadius: '32px',
            padding: '24px',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 15px 35px rgba(249, 115, 22, 0.3)',
            maxWidth: '500px',
            margin: '0 auto'
        }}>
            
            <style>{`
                @keyframes spin-fast { 100% { transform: rotate(360deg); } }
                @keyframes dash-flow { to { stroke-dashoffset: -20; } }
                .wire-flow { stroke-dasharray: 6 6; animation: dash-flow 0.4s linear infinite; }
                .wire-flow-fast { stroke-dasharray: 6 6; animation: dash-flow 0.15s linear infinite; }
                .custom-scroll::-webkit-scrollbar { height: 4px; }
                .custom-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.1); border-radius: 10px; }
                .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.5); border-radius: 10px; }
            `}</style>

            {/* Background Watermark */}
            <span style={{ position: 'absolute', right: '-10px', top: '20px', fontSize: '140px', opacity: 0.15, pointerEvents: 'none', zIndex: 0 }}>
                💡
            </span>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.25)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                        <Zap color="#fff" size={26} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1.1, textTransform: 'uppercase' }}>CIRCUIT FORGE</h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '10px', fontWeight: 800, opacity: 0.8, letterSpacing: '1px', textTransform: 'uppercase' }}>LIVE SANDBOX</p>
                    </div>
                </div>
                <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={clearBoard} 
                    style={{ background: '#fff', border: 'none', color: '#ea580c', width: '45px', height: '45px', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                >
                    <Trash2 size={22} strokeWidth={2.5} />
                </motion.button>
            </div>

            {/* --- VISUAL SANDBOX AREA --- */}
            <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '24px', overflow: 'hidden', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
                
                {/* Header Control Panel */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.1)', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Battery color="#fbbf24" size={18} />
                        <input 
                            type="number" value={voltage} onChange={e => setVoltage(e.target.value)} 
                            style={{ width: '50px', background: 'transparent', color: '#fff', fontSize: '16px', fontWeight: 900, border: 'none', borderBottom: '2px solid rgba(255,255,255,0.5)', textAlign: 'center', outline: 'none' }} 
                            placeholder="0" 
                        />
                        <span style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Volts</span>
                    </div>
                    <button 
                        onClick={() => setIsClosed(!isClosed)} 
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '10px', border: `1px solid ${isClosed ? '#10b981' : 'rgba(255,255,255,0.3)'}`, background: isClosed ? '#10b981' : 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: isClosed ? '0 0 15px rgba(16,185,129,0.5)' : 'none' }}
                    >
                        {isClosed ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        {isClosed ? 'POWER ON' : 'POWER OFF'}
                    </button>
                </div>

                {/* Circuit Grid Canvas */}
                <div style={{ position: 'relative', padding: '32px 16px', minHeight: '220px', overflowX: 'auto', display: 'flex', alignItems: 'center' }} className="custom-scroll">
                    
                    {/* Background Series Wire */}
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.2)', transform: 'translateY(-50%)', zIndex: 0 }} />
                    
                    {/* Animated Flowing Electrons (Series) */}
                    {totalCurrent > 0 && !isShortCircuit && (
                        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '4px', transform: 'translateY(-50%)', zIndex: 0, overflow: 'hidden' }}>
                            <svg width="100%" height="4" style={{ position: 'absolute', top: 0 }}>
                                <line x1="0" y1="2" x2="2000" y2="2" stroke="#fbbf24" strokeWidth="4" className={totalCurrent > 5 ? "wire-flow-fast" : "wire-flow"} />
                            </svg>
                        </div>
                    )}

                    {/* Short Circuit Warning */}
                    <AnimatePresence>
                        {isShortCircuit && isClosed && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.4)', backdropFilter: 'blur(4px)', zIndex: 50 }}>
                                <div style={{ background: '#7f1d1d', padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '2px solid #ef4444', boxShadow: '0 0 50px rgba(239,68,68,0.8)' }}>
                                    <AlertTriangle color="#ef4444" size={40} style={{ marginBottom: '8px' }} />
                                    <h4 style={{ margin: 0, color: '#ef4444', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', fontSize: '18px' }}>Short Circuit</h4>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#fca5a5', fontWeight: 900, textTransform: 'uppercase' }}>Zero Resistance Route Detected.</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Dynamic Stages Mapping */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', width: 'max-content', minWidth: '100%', position: 'relative', zIndex: 10 }}>
                        {grid.length === 0 && !isShortCircuit && (
                            <div style={{ width: '100%', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase', fontStyle: 'italic', padding: '32px 0' }}>
                                Build a node to forge circuit.
                            </div>
                        )}

                        {grid.map((stage, sIdx) => {
                            const stageData = stageResults[sIdx];
                            const stageV = isShortCircuit ? 0 : totalCurrent * stageData.req;

                            return (
                                <div key={sIdx} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '80px' }}>
                                    
                                    {/* Parallel Vertical Bus Wire */}
                                    {stage.length > 1 && (
                                        <div style={{ position: 'absolute', top: '10%', bottom: '10%', left: '50%', width: '4px', transform: 'translateX(-50%)', background: totalCurrent > 0 && !isShortCircuit ? 'rgba(251, 191, 36, 0.6)' : 'rgba(255,255,255,0.2)', boxShadow: totalCurrent > 0 && !isShortCircuit ? '0 0 10px rgba(251, 191, 36, 0.5)' : 'none', zIndex: 0, borderRadius: '4px', transition: 'all 0.3s ease' }} />
                                    )}

                                    {/* Parallel Components */}
                                    {stage.map((comp, cIdx) => {
                                        const rNum = stageData.components[cIdx].rNum;
                                        const compI = (rNum === 0 || isShortCircuit || !isClosed) ? 0 : (stageV / rNum);
                                        const brightness = Math.min(1, 0.3 + (compI * 0.4));
                                        const spinSpeed = Math.max(0.1, 2 - (compI * 0.3));

                                        return (
                                            <div key={comp.id} className="group" style={{ position: 'relative', background: 'rgba(0,0,0,0.6)', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '16px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '80px', zIndex: 10, backdropFilter: 'blur(5px)', transition: 'border 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#fbbf24'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}>
                                                
                                                <button onClick={() => removeComponent(sIdx, comp.id)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: '#fff', border: 'none', padding: '4px', borderRadius: '50%', cursor: 'pointer', zIndex: 20, boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 size={12} />
                                                </button>

                                                {/* Physics Icon */}
                                                <div style={{ marginBottom: '8px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {comp.type === 'bulb' && <Lightbulb size={24} color={compI > 0 ? '#fde047' : 'rgba(255,255,255,0.3)'} style={{ opacity: compI > 0 ? brightness : 1, filter: compI > 0 ? `drop-shadow(0 0 ${brightness * 15}px #fef08a)` : 'none', transition: 'all 0.3s' }} />}
                                                    {comp.type === 'motor' && <Fan size={24} color={compI > 0 ? '#38bdf8' : 'rgba(255,255,255,0.3)'} style={{ animation: compI > 0 ? `spin-fast ${spinSpeed}s linear infinite` : 'none', filter: compI > 0 ? 'drop-shadow(0 0 10px rgba(56,189,248,0.5))' : 'none' }} />}
                                                    {comp.type === 'resistor' && <Activity size={24} color="rgba(255,255,255,0.5)" />}
                                                </div>

                                                {/* Resistance Input (Fixed Alignment) */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', background: 'rgba(255,255,255,0.1)', padding: '4px 6px', borderRadius: '8px', width: '100%' }}>
                                                    <input 
                                                        type="text" value={comp.resistance} onChange={e => updateResistance(sIdx, comp.id, e.target.value)} 
                                                        style={{ boxSizing: 'border-box', width: '100%', background: 'transparent', color: '#fff', fontSize: '12px', fontWeight: 900, textAlign: 'center', border: 'none', outline: 'none' }} 
                                                        placeholder="0" 
                                                    />
                                                    <span style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.5)' }}>Ω</span>
                                                </div>
                                                
                                                {/* Live Component Telemetry */}
                                                {isClosed && !isShortCircuit && (
                                                    <div style={{ position: 'absolute', bottom: '-20px', fontSize: '9px', fontWeight: 900, letterSpacing: '0.5px', color: '#10b981', background: 'rgba(0,0,0,0.8)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.5)', whiteSpace: 'nowrap', zIndex: 30 }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {Number(compI.toFixed(1))}A · {Number(stageV.toFixed(1))}V
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Inline Add Parallel Branch Menu */}
                                    {stage.length < 4 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', zIndex: 10 }}>
                                            <button onClick={() => addParallelBranch(sIdx, 'resistor')} style={{ padding: '4px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', borderRadius: '8px' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} title="Add Resistor"><Activity size={14} /></button>
                                            <button onClick={() => addParallelBranch(sIdx, 'bulb')} style={{ padding: '4px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', borderRadius: '8px' }} onMouseEnter={e => {e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fde047'}} onMouseLeave={e => {e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}} title="Add Bulb"><Lightbulb size={14} /></button>
                                            <button onClick={() => addParallelBranch(sIdx, 'motor')} style={{ padding: '4px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', borderRadius: '8px' }} onMouseEnter={e => {e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#38bdf8'}} onMouseLeave={e => {e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}} title="Add Motor"><Fan size={14} /></button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Add Series Node Button */}
                        <button 
                            onClick={addSeriesNode} 
                            style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '70px', height: '90px', borderRadius: '16px', border: '2px dashed rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', transition: 'all 0.2s ease', zIndex: 10 }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                        >
                            <Plus size={20} />
                            <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Node</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* --- LIVE TELEMETRY DASHBOARD --- */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', padding: '16px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backdropFilter: 'blur(5px)' }}>
                    <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>Total Load</p>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 900, fontStyle: 'italic' }}>{Number(totalReq.toFixed(2))} Ω</p>
                </div>
                <div style={{ background: !isClosed ? 'rgba(0,0,0,0.2)' : isShortCircuit ? 'rgba(239, 68, 68, 0.2)' : '#fff', padding: '16px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backdropFilter: 'blur(5px)', transition: 'all 0.3s ease' }}>
                    <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: !isClosed ? 'rgba(255,255,255,0.5)' : isShortCircuit ? '#ef4444' : '#ea580c' }}>Current</p>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 900, fontStyle: 'italic', color: !isClosed ? 'rgba(255,255,255,0.5)' : isShortCircuit ? '#ef4444' : '#ea580c' }}>{!isClosed ? '0' : isShortCircuit ? 'MAX' : Number(totalCurrent.toFixed(2))} A</p>
                </div>
            </div>

            {/* --- REAL-TIME MATH ENGINE LOG --- */}
            <div style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '24px', padding: '20px', backdropFilter: 'blur(5px)', position: 'relative', zIndex: 1 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={14} color="#fde047" /> Ohm's Law Log
                </h4>
                
                {grid.length === 0 ? (
                    <p style={{ fontSize: '12px', fontWeight: 900, fontStyle: 'italic', opacity: 0.5, textAlign: 'center', margin: '10px 0' }}>Build a circuit to analyze.</p>
                ) : isShortCircuit ? (
                    <p style={{ fontSize: '12px', fontWeight: 900, fontStyle: 'italic', color: '#fca5a5', textAlign: 'center', margin: '10px 0' }}>Resistance is near zero.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {stageResults.map((sData, i) => (
                            <div key={i} style={{ fontSize: '11px', fontWeight: 900, background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>Node {i + 1} {sData.components.length > 1 ? '(Parallel)' : '(Series)'}</span>
                                <span style={{ fontStyle: 'italic', color: '#fbbf24' }}>{Number(sData.req.toFixed(2))} Ω</span>
                            </div>
                        ))}
                        
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px 16px', borderRadius: '16px', color: '#ea580c', fontWeight: 900, fontStyle: 'italic' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                    <span>I = <Frac n={vNum} d={Number(totalReq.toFixed(2))} /></span>
                                </div>
                                <span style={{ fontSize: '16px' }}>I = {Number(totalCurrent.toFixed(2))} A</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
