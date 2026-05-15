'use client';
import React, { useState } from 'react';
import { Target, Crosshair, Zap, RotateCcw, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Custom Vertical Fraction Component (Inline Styles)
const Frac = ({ n, d }: { n: React.ReactNode, d: React.ReactNode }) => (
  <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle', margin: '0 4px', position: 'relative', top: '-0.1em' }}>
    <span style={{ borderBottom: '2.5px solid currentColor', padding: '0 4px', paddingBottom: '2px', lineHeight: 1 }}>{n}</span>
    <span style={{ paddingTop: '2px', padding: '0 4px', lineHeight: 1 }}>{d}</span>
  </span>
);

export default function TrigSniper() {
  const [p, setP] = useState('');
  const [b, setB] = useState('');
  const [h, setH] = useState('');
  const [theta, setTheta] = useState('');
  
  const [steps, setSteps] = useState<{ title: string, math: React.ReactNode }[]>([]);
  const [ratios, setRatios] = useState<any>(null);
  const [isCalculated, setIsCalculated] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const reset = () => {
    setP(''); setB(''); setH(''); setTheta('');
    setSteps([]); setRatios(null); setIsCalculated(false); setErrorMsg('');
  };

  const snipeTarget = () => {
    setErrorMsg(''); setSteps([]); setRatios(null); setIsCalculated(false);

    let valP = parseFloat(p), valB = parseFloat(b), valH = parseFloat(h), valT = parseFloat(theta);
    const isP = !isNaN(valP) && valP > 0, isB = !isNaN(valB) && valB > 0, isH = !isNaN(valH) && valH > 0;
    const isT = !isNaN(valT) && valT > 0 && valT < 90;
    const sideCount = [isP, isB, isH].filter(Boolean).length;

    if (sideCount === 0 || (sideCount === 1 && !isT) || sideCount === 3) {
      setErrorMsg("TARGET ERROR: Input 2 sides, OR 1 side + 1 angle (θ)."); return;
    }
    if (!isNaN(valT) && (valT <= 0 || valT >= 90)) {
        setErrorMsg("GEOMETRY ERROR: Angle θ must be between 1° and 89°."); return;
    }
    if ((isH && isP && valH <= valP) || (isH && isB && valH <= valB)) {
      setErrorMsg("PHYSICS ERROR: Hypotenuse must be the longest side!"); return;
    }

    let newSteps: { title: string, math: React.ReactNode }[] = [];
    let finalP = valP, finalB = valB, finalH = valH, finalT = valT;

    if (sideCount === 1 && isT) {
        let rad = valT * (Math.PI / 180);
        newSteps.push({ title: "SOH CAH TOA Activated", math: <>θ = {valT}°</> });

        if (isH) {
            finalP = valH * Math.sin(rad); finalB = valH * Math.cos(rad);
            newSteps.push({ title: "SOH: Find Perpendicular", math: <>sin({valT}°) = <Frac n="P" d={valH} /></> });
            newSteps.push({ title: "Solve for P", math: <>P = {valH} × {Math.sin(rad).toFixed(4)} = {finalP.toFixed(2)}</> });
            newSteps.push({ title: "CAH: Find Base", math: <>cos({valT}°) = <Frac n="B" d={valH} /></> });
            newSteps.push({ title: "Solve for B", math: <>B = {valH} × {Math.cos(rad).toFixed(4)} = {finalB.toFixed(2)}</> });
        } else if (isP) {
            finalH = valP / Math.sin(rad); finalB = valP / Math.tan(rad);
            newSteps.push({ title: "SOH: Find Hypotenuse", math: <>sin({valT}°) = <Frac n={valP} d="H" /></> });
            newSteps.push({ title: "Solve for H", math: <>H = <Frac n={valP} d={Math.sin(rad).toFixed(4)} /> = {finalH.toFixed(2)}</> });
            newSteps.push({ title: "TOA: Find Base", math: <>tan({valT}°) = <Frac n={valP} d="B" /></> });
            newSteps.push({ title: "Solve for B", math: <>B = <Frac n={valP} d={Math.tan(rad).toFixed(4)} /> = {finalB.toFixed(2)}</> });
        } else if (isB) {
            finalH = valB / Math.cos(rad); finalP = valB * Math.tan(rad);
            newSteps.push({ title: "CAH: Find Hypotenuse", math: <>cos({valT}°) = <Frac n={valB} d="H" /></> });
            newSteps.push({ title: "Solve for H", math: <>H = <Frac n={valB} d={Math.cos(rad).toFixed(4)} /> = {finalH.toFixed(2)}</> });
            newSteps.push({ title: "TOA: Find Perpendicular", math: <>tan({valT}°) = <Frac n="P" d={valB} /></> });
            newSteps.push({ title: "Solve for P", math: <>P = {valB} × {Math.tan(rad).toFixed(4)} = {finalP.toFixed(2)}</> });
        }
    } else if (sideCount === 2) {
        newSteps.push({ title: "Pythagoras Engine Activated", math: <>H² = P² + B²</> });
        if (!isH) {
            newSteps.push({ title: "Substitute Knowns", math: <>H² = ({valP})² + ({valB})²</> });
            finalH = Math.sqrt(valP * valP + valB * valB);
            newSteps.push({ title: "Target Locked (Hypotenuse)", math: <>H = {Number(finalH.toFixed(2))}</> });
        } else if (!isP) {
            newSteps.push({ title: "Rearrange for Perpendicular", math: <>P² = ({valH})² - ({valB})²</> });
            finalP = Math.sqrt(valH * valH - valB * valB);
            newSteps.push({ title: "Target Locked (Perpendicular)", math: <>P = {Number(finalP.toFixed(2))}</> });
        } else if (!isB) {
            newSteps.push({ title: "Rearrange for Base", math: <>B² = ({valH})² - ({valP})²</> });
            finalB = Math.sqrt(valH * valH - valP * valP);
            newSteps.push({ title: "Target Locked (Base)", math: <>B = {Number(finalB.toFixed(2))}</> });
        }
        finalT = Math.asin(finalP / finalH) * (180 / Math.PI);
        newSteps.push({ title: "Inverse Trig: Find Angle θ", math: <>θ = sin⁻¹(<Frac n={Number(finalP.toFixed(2))} d={Number(finalH.toFixed(2))} />)</> });
        newSteps.push({ title: "Target Locked (Angle)", math: <>θ &approx; {Number(finalT.toFixed(2))}°</> });
    }

    setP(Number(finalP.toFixed(2)).toString()); setB(Number(finalB.toFixed(2)).toString());
    setH(Number(finalH.toFixed(2)).toString()); setTheta(Number(finalT.toFixed(2)).toString());

    const safeFormat = (num: number, den: number) => `${Number((num / den).toFixed(4))}`;
    const generatedRatios = {
        sin: safeFormat(finalP, finalH), cos: safeFormat(finalB, finalH),
        tan: safeFormat(finalP, finalB), csc: safeFormat(finalH, finalP),
        sec: safeFormat(finalH, finalB), cot: safeFormat(finalB, finalP),
    };

    // Set everything instantly, let framer-motion handle the staggered animation
    setSteps(newSteps);
    setRatios(generatedRatios);
    setIsCalculated(true);
  };

  // Helper for the inputs
  const makeInput = (label: string, val: string, setter: any, placeholder: string, isAccent: boolean = false) => (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 900, fontStyle: 'italic', color: isAccent ? '#fbbf24' : 'rgba(255,255,255,0.9)', zIndex: 2 }}>{label}</span>
      <input 
        type="number" placeholder={placeholder} value={val} onChange={(e) => { setter(e.target.value); setIsCalculated(false); setSteps([]); }}
        style={{ 
          boxSizing: 'border-box', // Fixes overflow
          width: '100%', 
          background: isAccent ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255,255,255,0.15)', 
          border: `2px solid ${isAccent ? 'rgba(251, 191, 36, 0.4)' : 'rgba(255,255,255,0.3)'}`, 
          borderRadius: '18px', 
          padding: '14px 16px 14px 80px', // Left padding accounts for label
          color: isAccent ? '#fbbf24' : '#fff', 
          fontSize: '18px', 
          fontWeight: 900, 
          fontStyle: 'italic', 
          textAlign: 'left', 
          outline: 'none', 
          backdropFilter: 'blur(5px)' 
        }}
      />
    </div>
  );

  return (
    <div style={{
      background: 'linear-gradient(135deg, #10b981, #047857)',
      borderRadius: '32px',
      padding: '24px',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 15px 35px rgba(16, 185, 129, 0.3)',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      {/* Background Watermark */}
      <span style={{ position: 'absolute', right: '-10px', top: '20px', fontSize: '140px', opacity: 0.15, pointerEvents: 'none', zIndex: 0 }}>
        📐
      </span>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.25)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
            <Target color="#fff" size={26} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1.1, textTransform: 'uppercase' }}>TRIG SNIPER</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '10px', fontWeight: 800, opacity: 0.8, letterSpacing: '1px', textTransform: 'uppercase' }}>RATIO ENGINE</p>
          </div>
        </div>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={reset} 
          style={{ background: '#fff', border: 'none', color: '#10b981', width: '45px', height: '45px', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
        >
          <RotateCcw size={22} strokeWidth={3} />
        </motion.button>
      </div>

      {/* Triangle Visualization Graphic */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px 0', background: 'rgba(255,255,255,0.1)', borderRadius: '24px', marginBottom: '20px', position: 'relative', zIndex: 1, backdropFilter: 'blur(5px)' }}>
        <div style={{ position: 'relative', width: '120px', height: '120px' }}>
          <svg style={{ width: '100%', height: '100%', overflow: 'visible' }} viewBox="0 0 100 100">
            <polygon points="10,90 90,90 90,10" fill="rgba(255,255,255,0.15)" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
            <polyline points="80,90 80,80 90,80" fill="none" stroke="#fff" strokeWidth="2" />
            <path d="M 30 90 A 20 20 0 0 0 25 75" fill="none" stroke="#fff" strokeWidth="2" />
            <text x="35" y="85" fill="#fbbf24" fontSize="14" fontWeight="900" fontStyle="italic">{theta ? `${theta}°` : 'θ'}</text>
          </svg>
          <div style={{ position: 'absolute', top: '40%', right: '-35px', background: 'rgba(255,255,255,0.25)', padding: '4px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 900, backdropFilter: 'blur(5px)' }}>P</div>
          <div style={{ position: 'absolute', bottom: '-25px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.25)', padding: '4px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 900, backdropFilter: 'blur(5px)' }}>B</div>
          <div style={{ position: 'absolute', top: '30%', left: '-20px', background: 'rgba(255,255,255,0.25)', padding: '4px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 900, backdropFilter: 'blur(5px)' }}>H</div>
        </div>
      </div>

      {/* DYNAMIC INPUTS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
        {makeInput('Perp (P)', p, setP, '?')}
        {makeInput('Base (B)', b, setB, '?')}
        {makeInput('Hypo (H)', h, setH, '?')}
        {makeInput('Ang (θ°)', theta, setTheta, '?', true)}
      </div>

      <AnimatePresence>
        {errorMsg && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <p style={{ margin: '0 0 16px 0', padding: '12px', background: 'rgba(239, 68, 68, 0.2)', borderLeft: '4px solid #ef4444', borderRadius: '8px', fontSize: '10px', fontWeight: 900, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>
              {errorMsg}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button 
        whileTap={{ scale: 0.96 }}
        onClick={snipeTarget} 
        style={{ width: '100%', background: '#fff', color: '#047857', border: 'none', borderRadius: '20px', padding: '18px', fontSize: '16px', fontWeight: 900, fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', position: 'relative', zIndex: 1, boxShadow: '0 10px 20px rgba(0,0,0,0.15)', marginBottom: '20px' }}
      >
        SNIPE TARGETS <Crosshair size={20} color="#047857" strokeWidth={3} />
      </motion.button>

      {/* --- STEP-BY-STEP DISPLAY --- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', zIndex: 1 }}>
        <AnimatePresence>
          {isCalculated && steps.map((step, index) => {
            const isLast = index === steps.length - 1;
            return (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.3 }}
                style={{ 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', borderRadius: '20px', 
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', opacity: 0.8 }}>
                  {step.title}
                </span>
                <div style={{ fontSize: '20px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '1px' }}>
                  {step.math}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* --- 6 TRIG RATIOS RESULTS BOARD --- */}
      <AnimatePresence>
        {isCalculated && ratios && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: steps.length * 0.3 + 0.2, type: 'spring' }} // Appears perfectly after steps
            style={{ marginTop: '16px', padding: '20px', background: '#fff', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', position: 'relative', zIndex: 1 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
              <Sparkles size={16} color="#10b981" fill="#10b981" />
              <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '1px', color: '#047857' }}>ALL 6 TRIG RATIOS</h4>
              <Sparkles size={16} color="#10b981" fill="#10b981" />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { label: 'Sin θ', val: ratios.sin, accent: true },
                { label: 'Cos θ', val: ratios.cos, accent: true },
                { label: 'Tan θ', val: ratios.tan, accent: true },
                { label: 'Csc θ', val: ratios.csc, accent: false },
                { label: 'Sec θ', val: ratios.sec, accent: false },
                { label: 'Cot θ', val: ratios.cot, accent: false },
              ].map((r, i) => (
                <div key={i} style={{ background: r.accent ? 'rgba(16, 185, 129, 0.1)' : '#f8fafc', padding: '12px 8px', borderRadius: '16px', textAlign: 'center', border: `1px solid ${r.accent ? 'rgba(16, 185, 129, 0.2)' : '#e2e8f0'}` }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: r.accent ? '#10b981' : '#64748b' }}>{r.label}</p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 900, fontStyle: 'italic', color: r.accent ? '#047857' : '#0f172a' }}>{r.val}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
