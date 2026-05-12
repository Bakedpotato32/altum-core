'use client';
import React, { useState, useRef, useCallback } from 'react';
import { 
    Droplet, TestTube, RotateCcw, Activity, 
    Clock, Trash2, CheckCircle2, Info, BookOpen, Sparkles
} from 'lucide-react';

interface Liquid {
    id: string; 
    name: string; 
    ph: number; 
    colorHex: string; 
    liquidColorHex: string; 
    type: 'acid' | 'base' | 'neutral'; 
    strength: 'strong' | 'weak' | 'none';
    description: string;
    funFact: string;
}

const MYSTERY_LIQUIDS: Liquid[] = [
    { 
        id: '1', name: 'Gastric Acid', ph: 1, colorHex: '#ef4444', liquidColorHex: '#fef08a', type: 'acid', strength: 'strong',
        description: 'Hydrochloric acid (HCl) is naturally produced in our stomachs to break down food and destroy harmful bacteria.',
        funFact: 'It is strong enough to dissolve razor blades! Our stomach lining constantly regenerates a thick layer of mucus so it doesn’t digest itself.' 
    },
    { 
        id: '2', name: 'Lemon Juice', ph: 2, colorHex: '#f97316', liquidColorHex: '#fde047', type: 'acid', strength: 'strong',
        description: 'Lemons get their sour taste from high concentrations of Citric Acid and trace amounts of Ascorbic Acid (Vitamin C).',
        funFact: 'Lemon juice can generate a tiny amount of electricity. If you stick a copper and zinc nail into a lemon, you can build a "Lemon Battery" to power a small LED!' 
    },
    { 
        id: '3', name: 'Vinegar', ph: 3, colorHex: '#f59e0b', liquidColorHex: '#fef3c7', type: 'acid', strength: 'weak',
        description: 'Vinegar is essentially a dilute solution of Acetic Acid (CH₃COOH) created by fermenting alcohol.',
        funFact: 'Ancient Roman soldiers used to carry vinegar to mix with water. It killed bacteria and made stagnant drinking water safe during long marches!' 
    },
    { 
        id: '4', name: 'Tomato Juice', ph: 4, colorHex: '#eab308', liquidColorHex: '#b91c1c', type: 'acid', strength: 'weak',
        description: 'Tomatoes contain a mix of malic acid and citric acid, making them mildly acidic.',
        funFact: 'In the 1500s, wealthy Europeans thought tomatoes were poisonous. Why? The acid in the tomato juice would leach lead out of their fancy pewter plates, causing lead poisoning!' 
    },
    { 
        id: '5', name: 'Black Coffee', ph: 5, colorHex: '#fde047', liquidColorHex: '#451a03', type: 'acid', strength: 'weak',
        description: 'Coffee owes its slight acidity to chlorogenic acids released when the coffee beans are roasted.',
        funFact: 'Counter-intuitively, dark roast coffee actually has LESS acid than light roast coffee, because the longer roasting process breaks the acids down.' 
    },
    { 
        id: '6', name: 'Pure Water', ph: 7, colorHex: '#22c55e', liquidColorHex: '#cffafe', type: 'neutral', strength: 'none',
        description: 'Perfectly neutral. The concentration of Hydrogen ions [H⁺] is exactly equal to Hydroxide ions [OH⁻].',
        funFact: '100% pure water actually does NOT conduct electricity well! It is the dissolved minerals and salts in everyday tap water that make it dangerous near electronics.' 
    },
    { 
        id: '7', name: 'Baking Soda', ph: 9, colorHex: '#14b8a6', liquidColorHex: '#f1f5f9', type: 'base', strength: 'weak',
        description: 'Sodium bicarbonate (NaHCO₃) is a mild base widely used in baking and cleaning.',
        funFact: 'When you mix baking soda (a base) with vinegar (an acid), they rapidly neutralize each other, releasing a massive explosion of Carbon Dioxide gas. This is the classic volcano science fair trick!' 
    },
    { 
        id: '8', name: 'Soap Solution', ph: 10, colorHex: '#3b82f6', liquidColorHex: '#e2e8f0', type: 'base', strength: 'weak',
        description: 'Soap is created through "saponification"—mixing fats/oils with a strong alkaline base (like lye).',
        funFact: 'Have you ever noticed bleach or strong soap feels "slippery" on your fingers? That is the strong base reacting with the natural oils in your skin to literally turn your fingers into soap!' 
    },
    { 
        id: '9', name: 'Ammonia', ph: 12, colorHex: '#4338ca', liquidColorHex: '#f8fafc', type: 'base', strength: 'strong',
        description: 'Ammonia (NH₃) is a strong alkaline compound used in commercial glass cleaners and agricultural fertilizers.',
        funFact: 'Ammonia smells absolutely terrible to humans, but it is abundant in space! The atmospheres of gas giants like Jupiter and Saturn are packed with swirling clouds of ammonia crystals.' 
    },
    { 
        id: '10', name: 'Liquid Bleach', ph: 13, colorHex: '#6d28d9', liquidColorHex: '#ecfccb', type: 'base', strength: 'strong',
        description: 'Household bleach contains Sodium Hypochlorite (NaClO), a powerful oxidizer and strong base.',
        funFact: 'Bleach doesn\'t actually "remove" dirt. It breaks the chemical bonds of "chromophores" (the parts of a molecule that absorb light). The stain is technically still there, but it becomes completely invisible to human eyes!' 
    },
    { 
        id: '11', name: 'Drain Cleaner', ph: 14, colorHex: '#4c1d95', liquidColorHex: '#cbd5e1', type: 'base', strength: 'strong',
        description: 'The strongest base on the pH scale. Drain cleaners usually contain highly concentrated Sodium Hydroxide (NaOH).',
        funFact: 'It clears clogged pipes by generating immense heat and literally liquefying solid clumps of hair and grease so they can wash down the drain.' 
    },
];

const SciNotation = ({ base, exp }: { base: string, exp: number }) => (
    <span className="inline-flex items-baseline">
        {base} × 10<sup className="text-[0.7em] ml-[1px]">{exp}</sup>
    </span>
);

export default function PhColorLab() {
    const [selectedLiquid, setSelectedLiquid] = useState<Liquid | null>(null);
    const [paperColor, setPaperColor] = useState('#fef3c7'); 
    
    // --- DRAG-AND-DIP STATE ---
    const [paperPos, setPaperPos] = useState({ x: 0, y: 0 }); 
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const paperRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [soakStage, setSoakStage] = useState<'unsoaked' | 'soaking' | 'soaked'>('unsoaked');
    const soakTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [showResults, setShowResults] = useState(false);

    const INITIAL_X = 20; 
    const INITIAL_Y = 30; 

    const resetLab = () => {
        setSelectedLiquid(null);
        setPaperColor('#fef3c7');
        setPaperPos({ x: 0, y: 0 });
        setSoakStage('unsoaked');
        setShowResults(false);
        if (soakTimerRef.current) clearTimeout(soakTimerRef.current);
    };

    const fillTube = (liquid: Liquid) => {
        resetLab();
        setSelectedLiquid(liquid);
    };

    const checkCollision = useCallback((x: number, y: number) => {
        // BUG FIXED: Removed the `soakStage === 'soaked'` return block here so it keeps tracking!
        if (!selectedLiquid) return;

        const tubeSurfaceY = 160; 
        const tubeCenterX = 150; 
        const tubeWidth = 64; 

        const paperBottomY = INITIAL_Y + y + 140; 
        const paperCenterX = INITIAL_X + x + 16; 

        const isOverTube = paperCenterX > (tubeCenterX - tubeWidth/2) && paperCenterX < (tubeCenterX + tubeWidth/2);
        const isDipped = paperBottomY > tubeSurfaceY;

        if (isOverTube && isDipped) {
            if (soakStage === 'unsoaked') {
                setSoakStage('soaking');
                soakTimerRef.current = setTimeout(() => {
                    setPaperColor(selectedLiquid.colorHex);
                    setSoakStage('soaked');
                }, 1000); 
            }
        } else {
            if (soakStage === 'soaking') {
                if (soakTimerRef.current) clearTimeout(soakTimerRef.current);
                setSoakStage('unsoaked');
            }
            // Trigger results if they pull the soaked paper out of the liquid
            if (soakStage === 'soaked' && !showResults) {
                if (paperBottomY < tubeSurfaceY + 20) { // Pulled up above the liquid surface
                    setShowResults(true);
                }
            }
        }
    }, [selectedLiquid, soakStage, showResults]);

    const onPointerDown = (e: React.PointerEvent) => {
        if (!paperRef.current) return;
        paperRef.current.setPointerCapture(e.pointerId);
        setIsDragging(true);
        const rect = paperRef.current.getBoundingClientRect();
        setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        
        const newX = e.clientX - containerRect.left - INITIAL_X - dragOffset.x;
        const newY = e.clientY - containerRect.top - INITIAL_Y - dragOffset.y;

        // Expanded Y boundary so it's easier to pull the paper high up
        const constrainedX = Math.max(-50, Math.min(230, newX));
        const constrainedY = Math.max(-50, Math.min(130, newY)); 

        setPaperPos({ x: constrainedX, y: constrainedY });
        checkCollision(constrainedX, constrainedY);
    };

    const onPointerUp = (e: React.PointerEvent) => {
        if (!isDragging || !paperRef.current) return;
        paperRef.current.releasePointerCapture(e.pointerId);
        setIsDragging(false);
    };

    return (
        <div className="relative rounded-3xl bg-card border border-border p-4 overflow-hidden transition-all duration-300 group">
            
            <Droplet className="absolute -right-4 -top-4 w-24 h-24 text-violet-500/5 group-hover:rotate-12 transition-transform duration-700 pointer-events-none" />
            
            <div className="flex items-center gap-2 mb-4 relative z-10">
                <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
                <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-violet-500">Interactive Simulation</span>
            </div>

            <div className="flex justify-between items-start mb-4 relative z-10">
                <h3 className="text-xl font-black italic uppercase tracking-[-0.02em] text-text leading-none">
                    pH Color <span className="text-violet-500">Lab</span>
                </h3>
                <button onClick={resetLab} className="w-8 h-8 rounded-xl bg-background border border-border flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-colors active:scale-95 group/btn">
                    <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-500" />
                </button>
            </div>

            {/* --- VISUAL SIMULATION CANVAS --- */}
            <div ref={containerRef} className="bg-[#0a0a0c] border-2 border-border rounded-3xl mb-4 relative overflow-hidden flex flex-col shadow-inner min-h-[300px] z-10 touch-none">
                
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-zinc-900/50 border-t border-zinc-800 z-0" />
                
                <div className="absolute left-1/2 bottom-1 -translate-x-1/2 w-20 h-40 z-20 flex flex-col items-center justify-end">
                    <div className="w-16 h-40 border border-white/10 rounded-b-3xl absolute inset-0 z-30 bg-gradient-to-r from-white/5 to-white/0 backdrop-blur-[1px]">
                        <div className="w-16 h-3 rounded-[50%] border border-white/10 absolute -top-1.5 z-40 bg-zinc-950 shadow-inner" />
                    </div>
                    
                    {selectedLiquid && (
                        <div 
                            className="w-[58px] rounded-b-[21px] transition-all duration-1000 bottom-1 absolute z-10 overflow-hidden"
                            style={{ 
                                height: '70%', 
                                backgroundColor: selectedLiquid.liquidColorHex,
                                opacity: selectedLiquid.id === '5' || selectedLiquid.id === '4' ? 0.95 : 0.6,
                                boxShadow: `inset -5px -5px 20px rgba(0,0,0,0.4)`
                            }}
                        >
                            <div className="w-full h-3 rounded-[50%] absolute -top-1.5 opacity-50" style={{ backgroundColor: selectedLiquid.liquidColorHex, filter: 'brightness(1.8)' }} />
                            {soakStage === 'soaking' && (
                                <div className="absolute inset-0 flex items-center justify-center text-white text-3xl font-black italic tracking-wider animate-pulse opacity-20">???</div>
                            )}
                        </div>
                    )}
                </div>

                <div 
                    ref={paperRef}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    className="absolute w-8 rounded-sm shadow-xl border-zinc-900/20 z-40 cursor-grab active:cursor-grabbing border-4 border-dashed"
                    style={{ 
                        height: '140px',
                        backgroundColor: paperColor,
                        left: `${INITIAL_X + paperPos.x}px`,
                        top: `${INITIAL_Y + paperPos.y}px`,
                        transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: `inset 0 0 20px rgba(0,0,0,0.1), 0 0 ${showResults ? '30px' : '0'} ${paperColor}A0`,
                        borderColor: showResults ? paperColor : (soakStage === 'soaking' ? 'rgba(255,255,255,0.4)' : 'rgba(139,92,246,0.1)'),
                        borderStyle: showResults ? 'solid' : 'dashed',
                        borderWidth: showResults ? '6px' : (soakStage === 'soaking' ? '2px' : '4px'),
                    }}
                >
                    <div className="h-4 bg-zinc-900/50 rounded-t-sm flex items-center justify-center p-0.5">
                        <MoveHorizontal className="w-3 h-3 text-zinc-500" />
                    </div>
                    <div className="absolute inset-0 top-4 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '4px 4px' }} />
                </div>
                
                {!selectedLiquid && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-700 p-10 text-center text-xs font-bold uppercase tracking-wider leading-relaxed z-0">
                        <TestTube className="w-8 h-8 mb-3"/> Select a liquid below to fill the test tube, then drag the paper strip to dip it.
                    </div>
                )}
            </div>

            {/* --- LIQUID SELECTION MENU --- */}
            <div className="mb-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-text/40 mb-2 px-1">Select Liquid to Fill Test Tube</h4>
                <div className="flex gap-2 overflow-x-auto custom-scroll pb-2 px-1 snap-x">
                    {MYSTERY_LIQUIDS.map((liquid) => (
                        <button key={liquid.id} onClick={() => fillTube(liquid)} className={`shrink-0 snap-center flex flex-col items-center gap-2 p-2 rounded-xl border-2 transition-all w-20 ${selectedLiquid?.id === liquid.id ? 'bg-card border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.2)] scale-105' : 'bg-background border-border hover:border-zinc-500 disabled:opacity-50'}`}>
                            <div className="w-10 h-10 rounded-full border border-border/50 flex items-center justify-center shadow-inner" style={{ backgroundColor: liquid.liquidColorHex + '20' }}>
                                <Droplet className="w-5 h-5" style={{ color: liquid.liquidColorHex }} />
                            </div>
                            <span className="text-[8px] font-black uppercase text-center tracking-wider leading-tight h-6 flex items-center">{liquid.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* --- CHEMISTRY ENGINE OUTPUT & NOTES --- */}
            <div className={`transition-all duration-700 ${showResults ? 'opacity-100 max-h-[1000px]' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                <div className="space-y-3 relative z-10 bg-background border border-border rounded-3xl p-5 shadow-sm mt-4">
                    
                    {selectedLiquid && showResults && (
                        <>
                            {/* Analysis Header */}
                            <div className="flex items-center justify-center gap-2 text-sm font-black italic uppercase tracking-widest text-white animate-pulse" style={{ color: selectedLiquid.colorHex, textShadow: `0 0 10px ${selectedLiquid.colorHex}` }}>
                                <Clock size={16}/> Analysis Complete
                            </div>

                            <div className="flex items-center gap-2 my-4">
                                <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${selectedLiquid.type === 'acid' ? 'bg-red-500/10 text-red-500 border-red-500/30' : selectedLiquid.type === 'base' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' : 'bg-green-500/10 text-green-500 border-green-500/30'}`}>
                                    {selectedLiquid.strength !== 'none' ? `${selectedLiquid.strength} ` : ''}{selectedLiquid.type}
                                </span>
                            </div>

                            {/* Math Breakdown */}
                            <div className="space-y-2">
                                <div className="text-[11px] font-bold text-zinc-400 bg-card p-3 rounded-xl border border-border flex items-center justify-between shadow-sm">
                                    <span className="uppercase tracking-widest text-text">Recorded pH Value</span>
                                    <span className="font-black italic text-xl" style={{ color: selectedLiquid.colorHex }}>{selectedLiquid.ph}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-xl flex flex-col justify-center"><p className="text-[9px] font-bold text-red-500/70 uppercase tracking-widest mb-1 flex items-center gap-1">[H⁺] Concentration</p><p className="text-sm font-black italic text-red-500"><SciNotation base="1.0" exp={-selectedLiquid.ph} /> M</p></div>
                                    <div className="bg-blue-500/5 border border-blue-500/20 p-3 rounded-xl flex flex-col justify-center"><p className="text-[9px] font-bold text-blue-500/70 uppercase tracking-widest mb-1 flex items-center gap-1">[OH⁻] Concentration</p><p className="text-sm font-black italic text-blue-500"><SciNotation base="1.0" exp={-(14 - selectedLiquid.ph)} /> M</p></div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">NCERT Chemical Log:</span>
                                    <div className="flex flex-col gap-2 text-violet-500 text-xs font-black italic bg-violet-500/5 p-3 rounded-xl border border-violet-500/20 shadow-inner">
                                        <span className="flex items-center gap-2"><CheckCircle2 size={12}/> Dissociation Constraint: [H⁺] × [OH⁻] = 10⁻¹⁴</span>
                                        <span className="flex items-center gap-2"><CheckCircle2 size={12}/> Inverse Logarithmic: [H⁺] = 10⁻<sup className="text-[0.7em]">pH</sup></span>
                                    </div>
                                </div>
                            </div>

                            {/* --- LAB NOTES & FUN FACTS --- */}
                            <div className="mt-4 border-t border-border pt-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-text/40 mb-3 flex items-center gap-1.5">
                                    <BookOpen size={12} className="text-violet-500" /> Lab Notes
                                </h4>
                                
                                <div className="bg-background border border-border rounded-2xl p-4 shadow-sm mb-3">
                                    <p className="text-sm text-text/80 leading-relaxed font-medium">
                                        {selectedLiquid.description}
                                    </p>
                                </div>

                                <div className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/30 rounded-2xl p-4 shadow-sm">
                                    <h5 className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-2 flex items-center gap-1">
                                        <Sparkles size={12} /> Did You Know?
                                    </h5>
                                    <p className="text-xs text-text/90 italic font-bold leading-relaxed">
                                        "{selectedLiquid.funFact}"
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Instruction Footer */}
            {!showResults && selectedLiquid && (
                <div className="mt-4 p-3 rounded-xl bg-violet-500/5 border border-violet-500/20 relative z-10 flex gap-3 items-center">
                    <Info className="text-violet-500 shrink-0" size={14} />
                    <p className="text-[10px] font-bold text-zinc-500 leading-relaxed uppercase tracking-wide">
                        <span className="text-violet-400">Grab the top handle of the strip</span> and physically drag it into the test tube. <span className="text-violet-400">Hold it inside for 1 full second</span> to soak, then pull it out to trigger analysis.
                    </p>
                </div>
            )}
        </div>
    );
}

function MoveHorizontal({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m18 8 4 4-4 4"></path><path d="M2 12h20"></path><path d="m6 8-4 4 4 4"></path></svg>;
}
