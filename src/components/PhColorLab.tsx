'use client';
import React, { useState, useRef, useCallback } from 'react';
import { 
    Droplet, TestTube, RotateCcw, Clock, Trash2, 
    CheckCircle2, Info, BookOpen, Sparkles, GripHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
        funFact: 'In the 1500s, wealthy Europeans thought tomatoes were poisonous. The acid in the tomato juice would leach lead out of their fancy pewter plates!' 
    },
    { 
        id: '5', name: 'Black Coffee', ph: 5, colorHex: '#fde047', liquidColorHex: '#451a03', type: 'acid', strength: 'weak',
        description: 'Coffee owes its slight acidity to chlorogenic acids released when the coffee beans are roasted.',
        funFact: 'Counter-intuitively, dark roast coffee actually has LESS acid than light roast coffee, because the longer roasting breaks the acids down.' 
    },
    { 
        id: '6', name: 'Pure Water', ph: 7, colorHex: '#22c55e', liquidColorHex: '#cffafe', type: 'neutral', strength: 'none',
        description: 'Perfectly neutral. The concentration of Hydrogen ions [H⁺] is exactly equal to Hydroxide ions [OH⁻].',
        funFact: '100% pure water actually does NOT conduct electricity well! It is the dissolved minerals and salts in tap water that make it dangerous.' 
    },
    { 
        id: '7', name: 'Baking Soda', ph: 9, colorHex: '#14b8a6', liquidColorHex: '#f1f5f9', type: 'base', strength: 'weak',
        description: 'Sodium bicarbonate (NaHCO₃) is a mild base widely used in baking and cleaning.',
        funFact: 'When you mix baking soda with vinegar, they rapidly neutralize each other, releasing a massive explosion of Carbon Dioxide gas.' 
    },
    { 
        id: '8', name: 'Soap Solution', ph: 10, colorHex: '#3b82f6', liquidColorHex: '#e2e8f0', type: 'base', strength: 'weak',
        description: 'Soap is created through "saponification"—mixing fats/oils with a strong alkaline base (like lye).',
        funFact: 'Have you ever noticed bleach or strong soap feels "slippery"? That is the strong base reacting with the natural oils in your skin to turn your fingers into soap!' 
    },
    { 
        id: '9', name: 'Ammonia', ph: 12, colorHex: '#4338ca', liquidColorHex: '#f8fafc', type: 'base', strength: 'strong',
        description: 'Ammonia (NH₃) is a strong alkaline compound used in commercial glass cleaners and fertilizers.',
        funFact: 'Ammonia smells terrible to humans, but it is abundant in space! The atmospheres of gas giants like Jupiter are packed with ammonia crystals.' 
    },
    { 
        id: '10', name: 'Liquid Bleach', ph: 13, colorHex: '#6d28d9', liquidColorHex: '#ecfccb', type: 'base', strength: 'strong',
        description: 'Household bleach contains Sodium Hypochlorite (NaClO), a powerful oxidizer and strong base.',
        funFact: 'Bleach doesn\'t actually "remove" dirt. It breaks the chemical bonds that absorb light. The stain is still there, but it becomes completely invisible!' 
    },
    { 
        id: '11', name: 'Drain Cleaner', ph: 14, colorHex: '#4c1d95', liquidColorHex: '#cbd5e1', type: 'base', strength: 'strong',
        description: 'The strongest base on the pH scale. Drain cleaners usually contain concentrated Sodium Hydroxide (NaOH).',
        funFact: 'It clears clogged pipes by generating immense heat and literally liquefying solid clumps of hair and grease.' 
    },
];

const SciNotation = ({ base, exp }: { base: string, exp: number }) => (
    <span style={{ display: 'inline-flex', alignItems: 'baseline' }}>
        {base} × 10<sup style={{ fontSize: '0.7em', marginLeft: '2px' }}>{exp}</sup>
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
        if (!selectedLiquid) return;

        const containerWidth = containerRef.current?.clientWidth || 300;
        const tubeCenterX = containerWidth / 2; 
        const tubeWidth = 64; 
        const tubeSurfaceY = 160; 

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
            if (soakStage === 'soaked' && !showResults) {
                if (paperBottomY < tubeSurfaceY + 20) { 
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

        const constrainedX = Math.max(-50, Math.min(containerRect.width - 20, newX));
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
        <div style={{
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            borderRadius: '32px',
            padding: '24px',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 15px 35px rgba(139, 92, 246, 0.3)',
            maxWidth: '500px',
            margin: '0 auto'
        }}>
            
            {/* Background Watermark */}
            <span style={{ position: 'absolute', right: '-10px', top: '20px', fontSize: '140px', opacity: 0.15, pointerEvents: 'none', zIndex: 0 }}>
                🧪
            </span>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.25)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                        <TestTube color="#fff" size={26} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1.1, textTransform: 'uppercase' }}>PH COLOR LAB</h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '10px', fontWeight: 800, opacity: 0.8, letterSpacing: '1px', textTransform: 'uppercase' }}>CHEMISTRY ENGINE</p>
                    </div>
                </div>
                <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={resetLab} 
                    style={{ background: '#fff', border: 'none', color: '#6d28d9', width: '45px', height: '45px', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                >
                    <Trash2 size={22} strokeWidth={2.5} />
                </motion.button>
            </div>

            {/* --- VISUAL SIMULATION CANVAS --- */}
            <div 
                ref={containerRef} 
                style={{ 
                    background: 'rgba(0,0,0,0.2)', 
                    border: '1px solid rgba(255,255,255,0.3)', 
                    borderRadius: '24px', 
                    overflow: 'hidden', 
                    marginBottom: '20px', 
                    position: 'relative', 
                    zIndex: 1, 
                    minHeight: '300px', 
                    touchAction: 'none' // Prevent scrolling while dragging on mobile
                }}
            >
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '48px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.1)', zIndex: 0 }} />
                
                {/* FIXED: 64px exact width container centered perfectly on the table */}
                <div style={{ position: 'absolute', left: '50%', bottom: '4px', transform: 'translateX(-50%)', width: '64px', height: '160px', zIndex: 20 }}>
                    
                    {/* Glass Body */}
                    <div style={{ width: '100%', height: '100%', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '0 0 32px 32px', position: 'absolute', top: 0, left: 0, zIndex: 30, background: 'linear-gradient(to right, rgba(255,255,255,0.1), transparent)', backdropFilter: 'blur(1px)' }}>
                        {/* Glass Rim */}
                        <div style={{ width: '64px', height: '12px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', position: 'absolute', top: '-6px', left: '-2px', zIndex: 40, background: 'rgba(0,0,0,0.5)', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)' }} />
                    </div>
                    
                    {/* Liquid properly centered using left: 50% and transform */}
                    {selectedLiquid && (
                        <div 
                            style={{ 
                                width: '56px', height: '70%', borderRadius: '0 0 28px 28px', position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, overflow: 'hidden', transition: 'all 1s ease',
                                backgroundColor: selectedLiquid.liquidColorHex,
                                opacity: selectedLiquid.id === '5' || selectedLiquid.id === '4' ? 0.95 : 0.6,
                                boxShadow: `inset -5px -5px 20px rgba(0,0,0,0.4)`
                            }}
                        >
                            {/* Liquid Surface */}
                            <div style={{ width: '100%', height: '12px', borderRadius: '50%', position: 'absolute', top: '-6px', left: 0, opacity: 0.8, backgroundColor: selectedLiquid.liquidColorHex, filter: 'brightness(1.5)' }} />
                            
                            {soakStage === 'soaking' && (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '30px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '2px', opacity: 0.3 }} className="animate-pulse">???</div>
                            )}
                        </div>
                    )}
                </div>

                <div 
                    ref={paperRef}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ 
                        position: 'absolute',
                        width: '32px',
                        height: '140px',
                        backgroundColor: paperColor,
                        left: `${INITIAL_X + paperPos.x}px`,
                        top: `${INITIAL_Y + paperPos.y}px`,
                        transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: `inset 0 0 20px rgba(0,0,0,0.1), 0 0 ${showResults ? '30px' : '0'} ${paperColor}A0`,
                        borderColor: showResults ? paperColor : (soakStage === 'soaking' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)'),
                        borderStyle: showResults ? 'solid' : 'dashed',
                        borderWidth: showResults ? '6px' : (soakStage === 'soaking' ? '2px' : '4px'),
                        borderRadius: '4px',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        zIndex: 40
                    }}
                >
                    <div style={{ height: '24px', background: 'rgba(0,0,0,0.4)', borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <GripHorizontal size={14} color="rgba(255,255,255,0.5)" />
                    </div>
                    <div style={{ position: 'absolute', inset: '24px 0 0 0', opacity: 0.1, backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '4px 4px' }} />
                </div>
                
                {!selectedLiquid && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', padding: '40px', textAlign: 'center', zIndex: 0 }}>
                        <TestTube size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                        <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', lineHeight: 1.5 }}>
                            Select a liquid below to fill the tube,<br/>then drag the strip to dip it.
                        </span>
                    </div>
                )}
            </div>

            {/* --- LIQUID SELECTION MENU --- */}
            <div style={{ marginBottom: '20px', position: 'relative', zIndex: 1 }}>
                <h4 style={{ margin: '0 0 8px 4px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>Select Liquid to Fill</h4>
                
                {/* Horizontal Scroll Menu */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', scrollSnapType: 'x mandatory' }} className="scrollbar-hide">
                    {MYSTERY_LIQUIDS.map((liquid) => (
                        <button 
                            key={liquid.id} 
                            onClick={() => fillTube(liquid)} 
                            style={{ 
                                flexShrink: 0, scrollSnapAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '16px', width: '80px', cursor: 'pointer', transition: 'all 0.2s ease',
                                background: selectedLiquid?.id === liquid.id ? '#fff' : 'rgba(255,255,255,0.15)',
                                border: '1px solid',
                                borderColor: selectedLiquid?.id === liquid.id ? '#fff' : 'rgba(255,255,255,0.2)',
                                boxShadow: selectedLiquid?.id === liquid.id ? '0 8px 20px rgba(0,0,0,0.2)' : 'none',
                                transform: selectedLiquid?.id === liquid.id ? 'scale(1.05)' : 'scale(1)'
                            }}
                        >
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: liquid.liquidColorHex + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,0,0,0.1)' }}>
                                <Droplet size={20} color={liquid.liquidColorHex} fill={liquid.liquidColorHex} />
                            </div>
                            <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.1, color: selectedLiquid?.id === liquid.id ? '#6d28d9' : '#fff' }}>
                                {liquid.name}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Instruction Footer (Visible before result) */}
            <AnimatePresence>
                {!showResults && selectedLiquid && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} style={{ background: 'rgba(255,255,255,0.15)', padding: '12px 16px', borderRadius: '16px', display: 'flex', gap: '12px', alignItems: 'center', backdropFilter: 'blur(5px)' }}>
                        <Info size={20} color="#fde047" style={{ flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: '10px', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.4 }}>
                            Grab the top handle of the strip and physically <strong style={{ color: '#fde047' }}>drag it into the test tube</strong>. Hold it inside to soak, then pull it out to trigger analysis.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- CHEMISTRY ENGINE OUTPUT & NOTES --- */}
            <AnimatePresence>
                {selectedLiquid && showResults && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        style={{ background: '#fff', borderRadius: '24px', padding: '20px', marginTop: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', position: 'relative', zIndex: 1, overflow: 'hidden' }}
                    >
                        {/* Analysis Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: selectedLiquid.colorHex, textShadow: `0 0 10px ${selectedLiquid.colorHex}50` }} className="animate-pulse">
                            <Clock size={16}/> 
                            <span style={{ fontSize: '14px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '1px' }}>Analysis Complete</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
                            <span style={{ 
                                padding: '6px 12px', borderRadius: '12px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', border: '1px solid',
                                background: selectedLiquid.type === 'acid' ? 'rgba(239, 68, 68, 0.1)' : selectedLiquid.type === 'base' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                color: selectedLiquid.type === 'acid' ? '#ef4444' : selectedLiquid.type === 'base' ? '#3b82f6' : '#22c55e',
                                borderColor: selectedLiquid.type === 'acid' ? 'rgba(239, 68, 68, 0.3)' : selectedLiquid.type === 'base' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.3)'
                            }}>
                                {selectedLiquid.strength !== 'none' ? `${selectedLiquid.strength} ` : ''}{selectedLiquid.type}
                            </span>
                        </div>

                        {/* Math Breakdown */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Recorded pH Value</span>
                                <span style={{ fontSize: '24px', fontWeight: 900, fontStyle: 'italic', color: selectedLiquid.colorHex }}>{selectedLiquid.ph}</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                                <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <p style={{ margin: '0 0 4px 0', fontSize: '9px', fontWeight: 900, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '1px' }}>[H⁺] Concentration</p>
                                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 900, fontStyle: 'italic', color: '#dc2626' }}><SciNotation base="1.0" exp={-selectedLiquid.ph} /> M</p>
                                </div>
                                <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '12px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <p style={{ margin: '0 0 4px 0', fontSize: '9px', fontWeight: 900, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px' }}>[OH⁻] Concentration</p>
                                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 900, fontStyle: 'italic', color: '#2563eb' }}><SciNotation base="1.0" exp={-(14 - selectedLiquid.ph)} /> M</p>
                                </div>
                            </div>

                            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>NCERT Chemical Log:</span>
                                <div style={{ background: 'rgba(139, 92, 246, 0.05)', padding: '12px', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.2)', display: 'flex', flexDirection: 'column', gap: '8px', color: '#6d28d9', fontSize: '12px', fontWeight: 900, fontStyle: 'italic' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={14}/> Dissociation: [H⁺] × [OH⁻] = 10⁻¹⁴</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={14}/> Inverse Logarithmic: [H⁺] = 10⁻<sup style={{ fontSize: '0.7em' }}>pH</sup></span>
                                </div>
                            </div>
                        </div>

                        {/* --- LAB NOTES & FUN FACTS --- */}
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <BookOpen size={14} /> Lab Notes
                            </h4>
                            
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
                                <p style={{ margin: 0, fontSize: '12px', color: '#334155', lineHeight: 1.6, fontWeight: 700 }}>
                                    {selectedLiquid.description}
                                </p>
                            </div>

                            <div style={{ background: 'linear-gradient(to bottom right, rgba(139, 92, 246, 0.1), rgba(217, 70, 239, 0.1))', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '16px', padding: '16px' }}>
                                <h5 style={{ margin: '0 0 8px 0', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Sparkles size={14} /> Did You Know?
                                </h5>
                                <p style={{ margin: 0, fontSize: '12px', color: '#4c1d95', fontStyle: 'italic', fontWeight: 900, lineHeight: 1.5 }}>
                                    "{selectedLiquid.funFact}"
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
