'use client';
import React, { useState } from 'react';
import { Atom, RotateCcw, Sparkles, Cpu, Info, TestTube2 } from 'lucide-react';

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
  const [isFinal, setIsFinal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [config, setConfig] = useState<number[]>([]);

  const reset = () => {
    setActiveElement(null);
    setSteps([]);
    setIsFinal(false);
    setErrorMsg('');
    setConfig([]);
  };

  const buildAtom = () => {
    reset();
    let z = parseInt(atomicNum);

    if (isNaN(z) || z < 1 || z > 118) {
      setErrorMsg("Quantum Limit Reached: Enter an Atomic Number between 1 and 118.");
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
    
    setSteps([]);
    newSteps.forEach((step, index) => {
      setTimeout(() => {
        setSteps(prev => [...prev, step]);
        if (index === newSteps.length - 1) setIsFinal(true);
      }, (index + 1) * (z > 20 ? 400 : 700)); 
    });
  };

  const renderElectrons = (count: number, radius: number) => {
    let dots = [];
    let angleStep = (2 * Math.PI) / count;
    for (let i = 0; i < count; i++) {
        let cx = 160 + radius * Math.cos(i * angleStep);
        let cy = 160 + radius * Math.sin(i * angleStep);
        dots.push(
            <circle key={i} cx={cx} cy={cy} r={count > 18 ? "3" : "4"} className="fill-violet-500 drop-shadow-[0_0_8px_rgba(139,92,246,0.9)]" />
        );
    }
    return dots;
  };

  // Helper function to return the correct inline style object for different spin directions and speeds
  const getSpinStyle = (shellIndex: number, isActive: boolean) => {
      if (!isActive) return {};
      // Alternating Directions and Different Speeds based on radius
      // Odd shells (1st, 3rd...) spin clockwise, Even shells (2nd, 4th...) spin reverse
      const name = (shellIndex + 1) % 2 === 0 ? 'atom-spin-reverse' : 'atom-spin';
      const duration = 10 + shellIndex * 4; // Faster spin for smaller radii
      return {
          animation: `${name} ${duration}s linear infinite`,
          transformOrigin: 'center center' // Ensure rotation around the nucleus
      }
  };

  return (
    <div className="relative rounded-3xl bg-card border border-border p-5 overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.1)] group">
      
      {/* Component-local style block for CSS keyframes. This ensures guaranteed execution. */}
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
      
      <Atom className="absolute -right-4 -top-4 w-24 h-24 text-violet-500/5 group-hover:scale-110 group-hover:rotate-[15deg] transition-all duration-700" />
      
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)] animate-pulse" />
        <span className="text-[10px] font-extrabold tracking-[0.2em] uppercase text-violet-500">Quantum Engine</span>
      </div>
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <h3 className="text-xl font-black italic uppercase tracking-[-0.02em] text-text">
          Atom <span className="text-violet-500">Builder</span>
        </h3>
        <button onClick={() => { setAtomicNum(''); reset(); }} className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center hover:bg-violet-500/10 hover:text-violet-500 transition-colors active:scale-95">
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-4 relative z-10">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-text/50 pl-1">Atomic Number (Z) : 1 to 118</label>
          <div className="relative">
            <input 
                type="number" 
                placeholder="e.g. 79 (for Gold)" 
                value={atomicNum} 
                onChange={(e) => { setAtomicNum(e.target.value); reset(); }} 
                className="w-full bg-background/50 border-2 border-border rounded-xl px-4 py-3 text-center font-black italic outline-none focus:border-violet-500 text-text transition-colors tracking-widest" 
            />
          </div>
        </div>
      </div>

      {errorMsg && (
        <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center mt-3 animate-bounce relative z-10">{errorMsg}</p>
      )}

      <button onClick={buildAtom} className="w-full mt-2 mb-6 group/btn relative rounded-2xl bg-violet-500 py-4 flex items-center justify-center gap-2 overflow-hidden transition-all active:scale-[0.98] shadow-[0_4px_0_rgb(109,40,217)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]">
        <span className="text-sm font-black italic uppercase tracking-wider text-white relative z-10 flex items-center gap-2">
           <Cpu className="w-5 h-5" /> Synthesize Atom
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
      </button>

      {/* Bohr Model SVG Visualizer */}
      {activeElement && (
        <div className="mb-6 relative z-10 bg-background/50 rounded-2xl border border-border p-4 flex justify-center items-center overflow-hidden animate-in zoom-in duration-500 shadow-inner">
           <div className="relative w-72 h-72 flex items-center justify-center overflow-visible">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 320 320">
                  {/* Static Nucleus */}
                  <circle cx="160" cy="160" r="18" className="fill-violet-500/20 stroke-violet-500" strokeWidth="2" />
                  <text x="160" y="164" textAnchor="middle" className="fill-violet-500 text-xs font-black italic">{activeElement.sym}</text>
                  
                  {/* Orbit Shells and Electrons */}
                  {config.map((count, i) => {
                      const radii = [40, 60, 80, 100, 120, 140, 160];
                      const r = radii[i];
                      const offsetCount = activeElement.z > 20 ? 2 : 1; // Offset for build animation sequence
                      const isBuildStepReached = steps.length > i + offsetCount;
                      
                      return (
                          <g key={`shell-wrapper-${i}`} className={isBuildStepReached ? 'animate-in zoom-in duration-700' : ''}>
                              {/* The Orbit Line itself remains static */}
                              {isBuildStepReached && (
                                <circle cx="160" cy="160" r={r} className="fill-none stroke-violet-500/20 stroke-[1.5] border-dashed" strokeDasharray="6 6" />
                              )}
                              {/* The group containing electrons rotates */}
                              <g 
                                style={getSpinStyle(i, isBuildStepReached && isFinal)} 
                                className="transform-gpu" // Hardware acceleration boost
                              >
                                  {isBuildStepReached && renderElectrons(count, r)}
                              </g>
                          </g>
                      );
                  })}
              </svg>
           </div>
        </div>
      )}

      {/* Dynamic Build Steps */}
      <div className="space-y-3 relative z-10 mb-6">
        {steps.map((step, index) => {
          const isCurrent = index === steps.length - 1;
          return (
            <div key={index} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-500 animate-in fade-in slide-in-from-top-4
                ${isCurrent && isFinal ? 'bg-violet-500/10 border-violet-500/40 shadow-[0_0_15px_rgba(139,92,246,0.15)]' : 'bg-background border-border'}`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 text-center ${isCurrent && isFinal ? 'text-violet-500' : 'text-text/40'}`}>
                {step.title}
              </span>
              <span className={`text-sm font-black italic tracking-tight text-center ${isCurrent && isFinal ? 'text-violet-500' : 'text-text'}`}>
                {step.desc}
              </span>
            </div>
          );
        })}
      </div>

      {/* Final Dashboard */}
      {isFinal && activeElement && (
        <div className="mt-4 p-5 rounded-2xl bg-card border-2 border-violet-500/50 shadow-[0_0_20px_rgba(139,92,246,0.15)] animate-in zoom-in duration-500 relative z-10">
            <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-violet-500" />
                <h4 className="text-sm font-black italic uppercase tracking-widest text-text">{activeElement.name} Data</h4>
                <Sparkles className="w-5 h-5 text-violet-500" />
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="bg-background border border-border p-2 rounded-xl text-center">
                    <p className="text-[9px] font-bold text-text/40 uppercase mb-1">Atomic (Z)</p>
                    <p className="text-sm font-black italic text-violet-500">{activeElement.z}</p>
                </div>
                <div className="bg-background border border-border p-2 rounded-xl text-center">
                    <p className="text-[9px] font-bold text-text/40 uppercase mb-1">Mass (A)</p>
                    <p className="text-sm font-black italic text-violet-500">{activeElement.mass}</p>
                </div>
                <div className="bg-background border border-border p-2 rounded-xl text-center">
                    <p className="text-[9px] font-bold text-text/40 uppercase mb-1">Electrons</p>
                    <p className="text-sm font-black italic text-violet-500">{activeElement.z}</p>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
                <div className="bg-violet-500/10 border border-violet-500/30 p-3 rounded-xl flex justify-between items-center">
                    <p className="text-[10px] font-bold text-violet-500 uppercase">Configuration</p>
                    <p className="text-lg font-black italic tracking-widest text-text">[{config.join(', ')}]</p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
