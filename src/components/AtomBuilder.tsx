'use client';
import React, { useState } from 'react';
import { Atom, RotateCcw, Sparkles, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SYMBOLS = "H,He,Li,Be,B,C,N,O,F,Ne,Na,Mg,Al,Si,P,S,Cl,Ar,K,Ca,Sc,Ti,V,Cr,Mn,Fe,Co,Ni,Cu,Zn,Ga,Ge,As,Se,Br,Kr,Rb,Sr,Y,Zr,Nb,Mo,Tc,Ru,Rh,Pd,Ag,Cd,In,Sn,Sb,Te,I,Xe,Cs,Ba,La,Ce,Pr,Nd,Pm,Sm,Eu,Gd,Tb,Dy,Ho,Er,Tm,Yb,Lu,Hf,Ta,W,Re,Os,Ir,Pt,Au,Hg,Tl,Pb,Bi,Po,At,Rn,Fr,Ra,Ac,Th,Pa,U,Np,Pu,Am,Cm,Bk,Cf,Es,Fm,Md,No,Lr,Rf,Db,Sg,Bh,Hs,Mt,Ds,Rg,Cn,Nh,Fl,Mc,Lv,Ts,Og".split(',');
const NAMES = "Hydrogen,Helium,Lithium,Beryllium,Boron,Carbon,Nitrogen,Oxygen,Fluorine,Neon,Sodium,Magnesium,Aluminium,Silicon,Phosphorus,Sulfur,Chlorine,Argon,Potassium,Calcium,Scandium,Titanium,Vanadium,Chromium,Manganese,Iron,Cobalt,Nickel,Copper,Zinc,Gallium,Germanium,Arsenic,Selenium,Bromine,Krypton,Rubidium,Strontium,Yttrium,Zirconium,Niobium,Molybdenum,Technetium,Ruthenium,Rhodium,Palladium,Silver,Cadmium,Indium,Tin,Antimony,Tellurium,Iodine,Xenon,Caesium,Barium,Lanthanum,Cerium,Praseodymium,Neodymium,Promethium,Samarium,Europium,Gadolinium,Terbium,Dysprosium,Holmium,Erbium,Thulium,Ytterbium,Lutetium,Hafnium,Tantalum,Tungsten,Rhenium,Osmium,Iridium,Platinum,Gold,Mercury,Thallium,Lead,Bismuth,Polonium,Astatine,Radon,Francium,Radium,Actinium,Thorium,Protactinium,Uranium,Neptunium,Plutonium,Americium,Curium,Berkelium,Californium,Einsteinium,Fermium,Mendelevium,Nobelium,Lawrencium,Rutherfordium,Dubnium,Seaborgium,Bohrium,Hassium,Meitnerium,Darmstadtium,Roentgenium,Copernicium,Nihonium,Flerovium,Moscovium,Livermorium,Tennessine,Oganesson".split(',');

// Approximates atomic mass for heavy elements, uses exact for first 20
const getMass = (z: number) => {
    const exact20 = [0,1,4,7,9,11,12,14,16,19,20,23,24,27,28,31,32,35,40,39,40];
    if (z <= 20) return exact20[z];
    return Math.round(z * 2.4 + (z > 60 ? z * 0.15 : 0));
};

// Aufbau Principle Engine (Calculates subshells 1s, 2s, 2p, etc. up to Z=118)
const getElectronConfig = (z: number) => {
    const subshells = [
        { s: 0, c: 2 }, { s: 1, c: 2 }, { s: 1, c: 6 }, { s: 2, c: 2 },
        { s: 2, c: 6 }, { s: 3, c: 2 }, { s: 2, c: 10 }, { s: 3, c: 6 },
        { s: 4, c: 2 }, { s: 3, c: 10 }, { s: 4, c: 6 }, { s: 5, c: 2 },
        { s: 3, c: 14 }, { s: 4, c: 10 }, { s: 5, c: 6 }, { s: 6, c: 2 },
        { s: 4, c: 14 }, { s: 5, c: 10 }, { s: 6, c: 6 }
    ];
    let shells = [0,0,0,0,0,0,0];
    let rem = z;
    for (let sub of subshells) {
        if (rem <= 0) break;
        let add = Math.min(rem, sub.c);
        shells[sub.s] += add;
        rem -= add;
    }
    // Handle the famous quantum exceptions!
    if (z === 24) { shells[3] = 1; shells[2] = 13; } // Chromium
    if (z === 29) { shells[3] = 1; shells[2] = 18; } // Copper
    if (z === 47) { shells[4] = 1; shells[3] = 18; } // Silver
    if (z === 79) { shells[5] = 1; shells[4] = 18; } // Gold
    return shells.filter(n => n > 0);
};

export default function AtomBuilder() {
  const [atomicNum, setAtomicNum] = useState('');
  const [activeElement, setActiveElement] = useState<{ z: number, sym: string, name: string, mass: number } | null>(null);
  const [steps, setSteps] = useState<{ title: string, desc: string }[]>([]);
  const [isCalculated, setIsCalculated] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [config, setConfig] = useState<number[]>([]);

  const reset = () => {
    setActiveElement(null);
    setSteps([]);
    setIsCalculated(false);
    setErrorMsg('');
    setConfig([]);
  };

  const buildAtom = () => {
    reset();
    let z = parseInt(atomicNum);

    if (isNaN(z) || z < 1 || z > 118) {
      setErrorMsg("QUANTUM LIMIT REACHED: Enter an Atomic Number between 1 and 118.");
      return;
    }

    let el = { z, sym: SYMBOLS[z - 1], name: NAMES[z - 1], mass: getMass(z) };
    let conf = getElectronConfig(z);
    
    let valenceE = conf[conf.length - 1];
    let valency: number | string = 0;
    let ionType = 'Neutral / Noble Gas';

    const nobleGases = [2, 10, 18, 36, 54, 86, 118];
    if (nobleGases.includes(z)) {
        valency = 0;
        ionType = 'Noble Gas (Stable)';
    } else if (z > 20 && !([31,32,33,34,35,49,50,51,52,53,81,82,83,84,85].includes(z))) {
        valency = 'Variable';
        ionType = 'Transition / Heavy Metal';
    } else if (valenceE <= 4) {
        valency = valenceE;
        ionType = `Cation (+${valency})`;
    } else {
        valency = 8 - valenceE;
        ionType = `Anion (-${valency})`;
    }

    let newSteps: { title: string, desc: string }[] = [];
    newSteps.push({ title: "Nucleus Forged", desc: `Protons: ${z} | Neutrons: ${el.mass - z}` });
    
    const shellNames = ['K (1)', 'L (2)', 'M (3)', 'N (4)', 'O (5)', 'P (6)', 'Q (7)'];
    
    if (z > 20) {
        newSteps.push({ title: "Aufbau Protocol Activated", desc: "Routing electrons into s, p, d, f subshells." });
    }

    conf.forEach((num, i) => {
        newSteps.push({ title: `Populating ${shellNames[i]} Shell`, desc: `${num} Electrons injected into orbit.` });
    });

    newSteps.push({ title: "Valency Analysis", desc: `Valence Electrons: ${valenceE} → Valency: ${valency} (${ionType})` });

    setActiveElement(el);
    setConfig(conf);
    setSteps(newSteps);
    setIsCalculated(true);
  };

  const renderElectrons = (count: number, radius: number) => {
    let dots = [];
    let angleStep = (2 * Math.PI) / count;
    for (let i = 0; i < count; i++) {
        let cx = 160 + radius * Math.cos(i * angleStep);
        let cy = 160 + radius * Math.sin(i * angleStep);
        dots.push(
            <circle key={i} cx={cx} cy={cy} r={count > 18 ? "3" : "4"} fill="#fff" style={{ filter: 'drop-shadow(0 0 6px #fff)' }} />
        );
    }
    return dots;
  };

  const getSpinStyle = (shellIndex: number) => {
      const name = (shellIndex + 1) % 2 === 0 ? 'atom-spin-reverse' : 'atom-spin';
      const duration = 10 + shellIndex * 4; 
      return {
          animation: `${name} ${duration}s linear infinite`,
          transformOrigin: '160px 160px' // Keep perfectly centered on the SVG
      };
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
      
      {/* Component-local style block for CSS keyframes */}
      <style>{`
          @keyframes atom-spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
          }
          @keyframes atom-spin-reverse {
              from { transform: rotate(0deg); }
              to { transform: rotate(-360deg); }
          }
      `}</style>
      
      {/* Background Watermark */}
      <span style={{ position: 'absolute', right: '-10px', top: '20px', fontSize: '140px', opacity: 0.15, pointerEvents: 'none', zIndex: 0 }}>
        ⚛️
      </span>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.25)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
            <Atom color="#fff" size={26} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1.1, textTransform: 'uppercase' }}>ATOM BUILDER</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '10px', fontWeight: 800, opacity: 0.8, letterSpacing: '1px', textTransform: 'uppercase' }}>QUANTUM ENGINE</p>
          </div>
        </div>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => { setAtomicNum(''); reset(); }} 
          style={{ background: '#fff', border: 'none', color: '#6d28d9', width: '45px', height: '45px', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
        >
          <RotateCcw size={22} strokeWidth={3} />
        </motion.button>
      </div>

      {/* Input Section */}
      <div style={{ marginBottom: '16px', position: 'relative', zIndex: 1 }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 900, fontStyle: 'italic', color: 'rgba(255,255,255,0.9)', zIndex: 2 }}>Atomic No. (Z)</span>
          <input 
              type="number" 
              placeholder="e.g. 79 (Gold)" 
              value={atomicNum} 
              onChange={(e) => { setAtomicNum(e.target.value); reset(); }} 
              style={{
                boxSizing: 'border-box',
                width: '100%', 
                background: 'rgba(255,255,255,0.15)', 
                border: '2px solid rgba(255,255,255,0.3)', 
                borderRadius: '18px', 
                padding: '14px 16px 14px 130px', 
                color: '#fff', 
                fontSize: '18px', 
                fontWeight: 900, 
                fontStyle: 'italic', 
                textAlign: 'left', 
                outline: 'none', 
                backdropFilter: 'blur(5px)'
              }}
          />
        </div>
        <p style={{ fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.6)', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', paddingLeft: '8px' }}>
          Supports Element 1 through 118
        </p>
      </div>

      <AnimatePresence>
        {errorMsg && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <p style={{ margin: '0 0 16px 0', padding: '12px', background: 'rgba(239, 68, 68, 0.4)', borderLeft: '4px solid #ef4444', borderRadius: '8px', fontSize: '10px', fontWeight: 900, color: '#fee2e2', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center', backdropFilter: 'blur(5px)' }}>
              {errorMsg}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button 
        whileTap={{ scale: 0.96 }}
        onClick={buildAtom} 
        style={{ width: '100%', background: '#fff', color: '#6d28d9', border: 'none', borderRadius: '20px', padding: '18px', fontSize: '16px', fontWeight: 900, fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', position: 'relative', zIndex: 1, boxShadow: '0 10px 20px rgba(0,0,0,0.15)', marginBottom: '24px' }}
      >
        SYNTHESIZE ATOM <Cpu size={20} color="#6d28d9" strokeWidth={3} />
      </motion.button>

      {/* Bohr Model SVG Visualizer */}
      <AnimatePresence>
        {isCalculated && activeElement && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '24px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: '24px', position: 'relative', zIndex: 1 }}
            >
              <div style={{ position: 'relative', width: '280px', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
                  <svg style={{ width: '100%', height: '100%', overflow: 'visible' }} viewBox="0 0 320 320">
                      
                      {/* Static Nucleus */}
                      <circle cx="160" cy="160" r="18" fill="rgba(255,255,255,0.2)" stroke="#fff" strokeWidth="2" />
                      <text x="160" y="164" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="900" fontStyle="italic">{activeElement.sym}</text>
                      
                      {/* Orbit Shells and Electrons */}
                      {config.map((count, i) => {
                          const radii = [40, 60, 80, 100, 120, 140, 160];
                          const r = radii[i];
                          const delay = (i + 1) * 0.3; // Staggered reveal
                          
                          return (
                              <motion.g 
                                key={`shell-${i}`} 
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: delay, type: 'spring', damping: 15 }}
                              >
                                  {/* The Orbit Line itself remains static */}
                                  <circle cx="160" cy="160" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="4 4" />
                                  
                                  {/* The group containing electrons rotates */}
                                  <g style={getSpinStyle(i)}>
                                      {renderElectrons(count, r)}
                                  </g>
                              </motion.g>
                          );
                      })}
                  </svg>
              </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Build Steps */}
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
                <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', opacity: 0.8, textAlign: 'center' }}>
                  {step.title}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.5px', textAlign: 'center' }}>
                  {step.desc}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Final Dashboard */}
      <AnimatePresence>
        {isCalculated && activeElement && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: steps.length * 0.3 + 0.2, type: 'spring' }}
                style={{ marginTop: '24px', padding: '20px', background: '#fff', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', position: 'relative', zIndex: 1 }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Sparkles size={16} color="#6d28d9" fill="#6d28d9" />
                    <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '1px', color: '#6d28d9' }}>{activeElement.name} Data</h4>
                    <Sparkles size={16} color="#6d28d9" fill="#6d28d9" />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', padding: '12px 4px', borderRadius: '16px', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 4px 0', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#8b5cf6' }}>Atomic (Z)</p>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 900, fontStyle: 'italic', color: '#6d28d9' }}>{activeElement.z}</p>
                    </div>
                    <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', padding: '12px 4px', borderRadius: '16px', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 4px 0', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#8b5cf6' }}>Mass (A)</p>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 900, fontStyle: 'italic', color: '#6d28d9' }}>{activeElement.mass}</p>
                    </div>
                    <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', padding: '12px 4px', borderRadius: '16px', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 4px 0', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#8b5cf6' }}>Electrons</p>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 900, fontStyle: 'italic', color: '#6d28d9' }}>{activeElement.z}</p>
                    </div>
                </div>
                
                <div style={{ background: 'rgba(109, 40, 217, 0.05)', border: '1px solid rgba(109, 40, 217, 0.2)', padding: '16px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontSize: '10px', fontWeight: 900, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '1px' }}>Configuration</p>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 900, fontStyle: 'italic', tracking: 'widest', color: '#4c1d95' }}>[{config.join(', ')}]</p>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
