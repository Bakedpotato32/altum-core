'use client';
import React, { useState } from 'react';
import { Box, Cylinder, Cone, Globe, Square, RectangleHorizontal, Circle, Triangle, Sparkles, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Shape3D = 'cube' | 'cylinder' | 'cone' | 'sphere';
type Shape2D = 'square' | 'rectangle' | 'circle' | 'triangle';
type Shape = Shape3D | Shape2D;
type CalcType = 'vol' | 'csa' | 'tsa' | 'area' | 'perimeter';
type UnitType = 'mm' | 'cm' | 'm' | 'km' | 'in' | 'ft';

export default function MensurationSolver() {
  const [shape, setShape] = useState<Shape>('cylinder');
  const [calcType, setCalcType] = useState<CalcType>('vol');
  const [selectedUnit, setSelectedUnit] = useState<UnitType>('cm');
  const [inputs, setInputs] = useState({ r: '', h: '', l: '', w: '', a: '', b: '', c: '' });
  const [steps, setSteps] = useState<{ title: string, math: string }[]>([]);
  const [isCalculated, setIsCalculated] = useState(false);

  const is3D = ['cube', 'cylinder', 'cone', 'sphere'].includes(shape);

  const reset = () => {
    setSteps([]);
    setIsCalculated(false);
  };

  const handleShapeChange = (s: Shape) => {
    setShape(s);
    setInputs({ r: '', h: '', l: '', w: '', a: '', b: '', c: '' });
    
    if (['cube', 'cylinder', 'cone', 'sphere'].includes(s)) {
      setCalcType('vol');
    } else {
      setCalcType('area');
    }
    reset();
  };

  const generateSteps = () => {
    reset();
    let r = parseFloat(inputs.r) || 0;
    let h = parseFloat(inputs.h) || 0;
    let l = parseFloat(inputs.l) || 0;
    let w = parseFloat(inputs.w) || 0;
    let a = parseFloat(inputs.a) || 0;
    let b = parseFloat(inputs.b) || 0;
    let c = parseFloat(inputs.c) || 0;

    let newSteps: { title: string, math: string }[] = [];
    let ans = 0;
    
    let unitStr = selectedUnit;
    if (calcType === 'vol') unitStr = `${selectedUnit}³`;
    else if (calcType === 'area' || calcType === 'csa' || calcType === 'tsa') unitStr = `${selectedUnit}²`;

    // --- 3D SHAPES ---
    if (shape === 'cube') {
      if (a <= 0) return alert("Enter a valid side length (a).");
      if (calcType === 'vol') {
        newSteps.push({ title: "Volume of a Cube", math: `V = a³` });
        newSteps.push({ title: "Substitute", math: `V = (${a})³` });
        ans = a * a * a;
      } else if (calcType === 'csa') {
        newSteps.push({ title: "Lateral Surface Area", math: `LSA = 4a²` });
        newSteps.push({ title: "Substitute", math: `LSA = 4 × (${a})²` });
        ans = 4 * a * a;
      } else {
        newSteps.push({ title: "Total Surface Area", math: `TSA = 6a²` });
        newSteps.push({ title: "Substitute", math: `TSA = 6 × (${a})²` });
        ans = 6 * a * a;
      }
    } 
    else if (shape === 'cylinder') {
      if (r <= 0 || h <= 0) return alert("Enter valid radius and height.");
      if (calcType === 'vol') {
        newSteps.push({ title: "Volume of a Cylinder", math: `V = πr²h` });
        newSteps.push({ title: "Substitute (π ≈ 3.14)", math: `V = 3.14 × (${r})² × (${h})` });
        ans = Math.PI * r * r * h;
      } else if (calcType === 'csa') {
        newSteps.push({ title: "Curved Surface Area", math: `CSA = 2πrh` });
        newSteps.push({ title: "Substitute", math: `CSA = 2 × 3.14 × ${r} × ${h}` });
        ans = 2 * Math.PI * r * h;
      } else {
        newSteps.push({ title: "Total Surface Area", math: `TSA = 2πr(r + h)` });
        newSteps.push({ title: "Substitute", math: `TSA = 2 × 3.14 × ${r}(${r} + ${h})` });
        ans = 2 * Math.PI * r * (r + h);
      }
    }
    else if (shape === 'sphere') {
      if (r <= 0) return alert("Enter a valid radius.");
      if (calcType === 'vol') {
        newSteps.push({ title: "Volume of a Sphere", math: `V = 4/3 πr³` });
        newSteps.push({ title: "Substitute", math: `V = (4/3) × 3.14 × (${r})³` });
        ans = (4 / 3) * Math.PI * Math.pow(r, 3);
      } else {
        newSteps.push({ title: "Surface Area", math: `SA = 4πr²` });
        newSteps.push({ title: "Substitute", math: `SA = 4 × 3.14 × (${r})²` });
        ans = 4 * Math.PI * r * r;
      }
    }
    else if (shape === 'cone') {
      if (r <= 0 || h <= 0) return alert("Enter valid radius and vertical height.");
      if (l <= 0) {
        l = Math.sqrt((r * r) + (h * h));
        newSteps.push({ title: "Find Slant Height (l) via Pythagoras", math: `l = √(${r}² + ${h}²)` });
        newSteps.push({ title: "Slant Height", math: `l ≈ ${l.toFixed(2)}` });
      }
      if (calcType === 'vol') {
        newSteps.push({ title: "Volume of a Cone", math: `V = 1/3 πr²h` });
        newSteps.push({ title: "Substitute", math: `V = (1/3) × 3.14 × (${r})² × ${h}` });
        ans = (1 / 3) * Math.PI * r * r * h;
      } else if (calcType === 'csa') {
        newSteps.push({ title: "Curved Surface Area", math: `CSA = πrl` });
        newSteps.push({ title: "Substitute", math: `CSA = 3.14 × ${r} × ${Number(l.toFixed(2))}` });
        ans = Math.PI * r * l;
      } else {
        newSteps.push({ title: "Total Surface Area", math: `TSA = πr(r + l)` });
        newSteps.push({ title: "Substitute", math: `TSA = 3.14 × ${r}(${r} + ${Number(l.toFixed(2))})` });
        ans = Math.PI * r * (r + l);
      }
    }
    // --- 2D SHAPES ---
    else if (shape === 'square') {
      if (a <= 0) return alert("Enter a valid side length.");
      if (calcType === 'area') {
        newSteps.push({ title: "Area of a Square", math: `A = a²` });
        newSteps.push({ title: "Substitute", math: `A = (${a})²` });
        ans = a * a;
      } else {
        newSteps.push({ title: "Perimeter of a Square", math: `P = 4a` });
        newSteps.push({ title: "Substitute", math: `P = 4 × ${a}` });
        ans = 4 * a;
      }
    }
    else if (shape === 'rectangle') {
      if (l <= 0 || w <= 0) return alert("Enter valid length and width.");
      if (calcType === 'area') {
        newSteps.push({ title: "Area of a Rectangle", math: `A = l × w` });
        newSteps.push({ title: "Substitute", math: `A = ${l} × ${w}` });
        ans = l * w;
      } else {
        newSteps.push({ title: "Perimeter of a Rectangle", math: `P = 2(l + w)` });
        newSteps.push({ title: "Substitute", math: `P = 2(${l} + ${w})` });
        ans = 2 * (l + w);
      }
    }
    else if (shape === 'circle') {
      if (r <= 0) return alert("Enter a valid radius.");
      if (calcType === 'area') {
        newSteps.push({ title: "Area of a Circle", math: `A = πr²` });
        newSteps.push({ title: "Substitute", math: `A = 3.14 × (${r})²` });
        ans = Math.PI * r * r;
      } else {
        newSteps.push({ title: "Circumference of a Circle", math: `C = 2πr` });
        newSteps.push({ title: "Substitute", math: `C = 2 × 3.14 × ${r}` });
        ans = 2 * Math.PI * r;
      }
    }
    else if (shape === 'triangle') {
      if (calcType === 'area') {
        if (b <= 0 || h <= 0) return alert("Enter valid base and height.");
        newSteps.push({ title: "Area of a Triangle", math: `A = 1/2 × b × h` });
        newSteps.push({ title: "Substitute", math: `A = 0.5 × ${b} × ${h}` });
        ans = 0.5 * b * h;
      } else {
        if (a <= 0 || b <= 0 || c <= 0) return alert("Enter all 3 sides (a, b, c).");
        newSteps.push({ title: "Perimeter of a Triangle", math: `P = a + b + c` });
        newSteps.push({ title: "Substitute", math: `P = ${a} + ${b} + ${c}` });
        ans = a + b + c;
      }
    }

    newSteps.push({ title: "Final Result", math: `Ans ≈ ${ans.toFixed(2)} ${unitStr}` });
    
    setSteps(newSteps);
    setIsCalculated(true);
  };

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
      <span style={{ position: 'absolute', right: '-10px', top: '20px', fontSize: '140px', opacity: 0.15, pointerEvents: 'none', zIndex: 0 }}>
        🧊
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.25)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
          <Box color="#fff" size={26} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1.1, textTransform: 'uppercase' }}>SHAPE MENSURATION</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '10px', fontWeight: 800, opacity: 0.8, letterSpacing: '1px', textTransform: 'uppercase' }}>GEOMETRY ENGINE</p>
        </div>
      </div>

      {/* --- SHAPE SELECTORS --- */}
      <div style={{ marginBottom: '20px', position: 'relative', zIndex: 1 }}>
        <p style={{ margin: '0 0 8px 4px', fontSize: '10px', fontWeight: 900, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>3D Shapes (Volume, SA)</p>
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.15)', padding: '6px', borderRadius: '20px', marginBottom: '16px', backdropFilter: 'blur(5px)' }}>
          {(['cube', 'cylinder', 'cone', 'sphere'] as const).map(s => (
            <button 
              key={s} onClick={() => handleShapeChange(s)}
              style={{
                flex: 1, padding: '10px 0', border: 'none', borderRadius: '14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                background: shape === s ? '#fff' : 'transparent',
                color: shape === s ? '#047857' : '#fff',
                opacity: shape === s ? 1 : 0.7,
                boxShadow: shape === s ? '0 4px 10px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {s === 'cube' && <Box size={18} />}
              {s === 'cylinder' && <Cylinder size={18} />}
              {s === 'cone' && <Cone size={18} />}
              {s === 'sphere' && <Globe size={18} />}
              <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>{s}</span>
            </button>
          ))}
        </div>

        <p style={{ margin: '0 0 8px 4px', fontSize: '10px', fontWeight: 900, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>2D Shapes (Area, Perim)</p>
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.15)', padding: '6px', borderRadius: '20px', backdropFilter: 'blur(5px)' }}>
          {(['square', 'rectangle', 'circle', 'triangle'] as const).map(s => (
            <button 
              key={s} onClick={() => handleShapeChange(s)}
              style={{
                flex: 1, padding: '10px 0', border: 'none', borderRadius: '14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                background: shape === s ? '#fff' : 'transparent',
                color: shape === s ? '#047857' : '#fff',
                opacity: shape === s ? 1 : 0.7,
                boxShadow: shape === s ? '0 4px 10px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {s === 'square' && <Square size={18} />}
              {s === 'rectangle' && <RectangleHorizontal size={18} />}
              {s === 'circle' && <Circle size={18} />}
              {s === 'triangle' && <Triangle size={18} />}
              <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>{s.slice(0, 4)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* --- CALC TYPE SELECTOR --- */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
        {(is3D ? ['vol', 'csa', 'tsa'] : ['area', 'perimeter']).map(c => (
          <button 
            key={c} onClick={() => { setCalcType(c as CalcType); reset(); }}
            style={{
              flex: 1, padding: '12px 0', border: 'none', borderRadius: '16px', cursor: 'pointer',
              background: calcType === c ? '#fff' : 'rgba(255,255,255,0.15)',
              color: calcType === c ? '#047857' : '#fff',
              fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px',
              transition: 'all 0.2s ease', backdropFilter: 'blur(5px)'
            }}
          >
            {c === 'vol' ? 'Volume' : c === 'csa' ? (shape === 'cube' ? 'LSA' : 'Curved SA') : c === 'tsa' ? 'Total SA' : c === 'area' ? 'Area' : (shape === 'circle' ? 'Circumference' : 'Perimeter')}
          </button>
        ))}
      </div>

      {/* --- UNIT SELECTOR --- */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', position: 'relative', zIndex: 1, overflowX: 'auto', paddingBottom: '4px' }} className="scrollbar-hide">
        {(['mm', 'cm', 'm', 'km', 'in', 'ft'] as const).map(u => (
          <button 
            key={u} onClick={() => { setSelectedUnit(u); reset(); }}
            style={{
              flexShrink: 0, padding: '8px 16px', border: '1px solid', borderRadius: '14px', cursor: 'pointer',
              background: selectedUnit === u ? 'rgba(255,255,255,0.25)' : 'transparent',
              borderColor: selectedUnit === u ? '#fff' : 'rgba(255,255,255,0.3)',
              color: '#fff', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase',
              transition: 'all 0.2s ease'
            }}
          >
            {u}
          </button>
        ))}
      </div>

      {/* --- DYNAMIC INPUTS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
        {(() => {
          const makeInput = (label: string, key: keyof typeof inputs, placeholder: string = "0", spanAll: boolean = false) => (
            <div style={{ position: 'relative', gridColumn: spanAll ? '1 / -1' : 'span 1' }} key={key}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 900, fontStyle: 'italic', color: 'rgba(255,255,255,0.9)', zIndex: 2 }}>{label}</span>
              <input 
                type="number" placeholder={placeholder} value={inputs[key]} onChange={e => { setInputs({...inputs, [key]: e.target.value}); reset(); }}
                style={{ 
                  boxSizing: 'border-box', // <-- FIXED OVERFLOW HERE
                  width: '100%', 
                  background: 'rgba(255,255,255,0.15)', 
                  border: '2px solid rgba(255,255,255,0.3)', 
                  borderRadius: '18px', 
                  padding: '14px 45px 14px 90px', 
                  color: '#fff', 
                  fontSize: '18px', 
                  fontWeight: 900, 
                  fontStyle: 'italic', 
                  textAlign: 'left', 
                  outline: 'none', 
                  backdropFilter: 'blur(5px)' 
                }}
              />
              <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 900, opacity: 0.6, zIndex: 2 }}>{selectedUnit}</span>
            </div>
          );

          return (
            <>
              {(shape === 'cube' || shape === 'square') && makeInput('Side (a)', 'a', '0', true)}
              {['cylinder', 'cone', 'sphere', 'circle'].includes(shape) && makeInput('Rad (r)', 'r', '0', true)}
              {(shape === 'cylinder' || shape === 'cone' || (shape === 'triangle' && calcType === 'area')) && makeInput('Height (h)', 'h', '0', true)}
              
              {shape === 'rectangle' && (
                <>
                  {makeInput('Len (l)', 'l')}
                  {makeInput('Wid (w)', 'w')}
                </>
              )}

              {shape === 'triangle' && (
                <>
                  {makeInput('Base (b)', 'b', '0', calcType !== 'perimeter')}
                  {calcType === 'perimeter' && (
                    <>
                      {makeInput('Side (a)', 'a')}
                      {makeInput('Side (c)', 'c')}
                    </>
                  )}
                </>
              )}

              {shape === 'cone' && makeInput('Slant (l)', 'l', 'Auto', true)}
            </>
          );
        })()}
      </div>

      <motion.button 
        whileTap={{ scale: 0.96 }}
        onClick={generateSteps} 
        style={{
          width: '100%', background: '#fff', color: '#047857', border: 'none', borderRadius: '20px', padding: '18px', fontSize: '16px', fontWeight: 900, fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', position: 'relative', zIndex: 1, boxShadow: '0 10px 20px rgba(0,0,0,0.15)', marginBottom: '20px'
        }}
      >
        UNRAVEL FORMULA <Zap size={20} fill="#047857" />
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
                  background: isLast ? '#fff' : 'rgba(255,255,255,0.15)',
                  color: isLast ? '#047857' : '#fff',
                  boxShadow: isLast ? '0 8px 20px rgba(0,0,0,0.1)' : 'none',
                  border: isLast ? 'none' : '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', opacity: isLast ? 0.6 : 0.8 }}>
                  {step.title}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: isLast ? '24px' : '20px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '1px' }}>
                    {step.math}
                  </span>
                  {isLast && (
                    <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: (index * 0.3) + 0.2, type: "spring" }}>
                      <Sparkles size={24} color="#f09819" fill="#f09819" />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
