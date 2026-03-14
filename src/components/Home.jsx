import React, { useState, useMemo } from 'react';
import { Zap, TrendingUp, Trophy, X, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fmt } from '../math/format.js';
import { rN, r$N, getPhaseName, getPhase, riskSeverity } from '../math/risk.js';
import { E0, MILES } from '../math/constants.js';
import EquityCurve from './EquityCurve.jsx';

/* ───────────────────────────────────────────
   Constants & Trail Data
   ─────────────────────────────────────────── */

const MOUNTAIN_BG = import.meta.env.BASE_URL + 'mountain-bg.png';

// Camp names for milestones
const CAMP_NAMES = ['Base Camp', 'Camp I', 'Camp II', 'Camp III', 'High Camp', 'Summit'];

// SVG trail path — wide S-curve switchbacks up the mountain
// Route: center(start) → right($100K) → left($250K) → right($500K) → left($1M) → right($4M) → center($10M)
const TRAIL_PATH =
  'M 195 438 C 220 428, 280 412, 320 392 C 355 374, 360 358, 330 346 ' +
  'C 290 332, 170 322, 100 312 C 50 302, 40 290, 70 278 ' +
  'C 110 264, 220 252, 300 240 C 350 230, 350 218, 300 206 ' +
  'C 240 192, 130 182, 80 172 C 40 162, 50 150, 90 140 ' +
  'C 140 128, 230 118, 280 108 C 320 100, 310 88, 260 78 ' +
  'C 230 72, 210 68, 195 58';

// Trail milestones ($100K–$4M) — positioned on the trail switchbacks
const TRAIL_MILESTONES = [
  { label: '$100K', camp: 'Base Camp', value: 100000, x: 248, y: 338, labelSide: 'left' },
  { label: '$250K', camp: 'Camp I', value: 250000, x: 100, y: 290, labelSide: 'right' },
  { label: '$500K', camp: 'Camp II', value: 500000, x: 290, y: 234, labelSide: 'left' },
  { label: '$1M',   camp: 'Camp III', value: 1000000, x: 100, y: 172, labelSide: 'right' },
  { label: '$4M',   camp: 'High Camp', value: 4000000, x: 270, y: 108, labelSide: 'left' },
];

// $10M summit — floating above temple, NOT on trail
const SUMMIT = { label: '$10M', value: 10000000, x: 195, y: 42 };

const PHASE_INFO = {
  pre: 'Aggressive growth mode. High risk compounds your account toward the $87.5K anchor. This is by design.',
  anchor: 'Balanced zone. Risk is at the Kelly-optimal 33% level.',
  model: 'Decay active. Risk shrinks as portfolio grows, protecting gains.',
};

/* ───────────────────────────────────────────
   Player position interpolation on trail
   ─────────────────────────────────────────── */

function getPlayerPosition(eq) {
  // Map equity to 0–1 progress along the trail
  // Milestones: $20K(start)=0, $100K=0.17, $250K=0.33, $500K=0.5, $1M=0.67, $4M=0.83, $10M=1
  const stops = [
    { val: 20000,    t: 0 },
    { val: 100000,   t: 0.17 },
    { val: 250000,   t: 0.33 },
    { val: 500000,   t: 0.50 },
    { val: 1000000,  t: 0.67 },
    { val: 4000000,  t: 0.83 },
    { val: 10000000, t: 1.0 },
  ];
  if (eq <= stops[0].val) return { t: 0 };
  if (eq >= stops[stops.length - 1].val) return { t: 1 };
  for (let i = 0; i < stops.length - 1; i++) {
    if (eq >= stops[i].val && eq <= stops[i + 1].val) {
      const frac = (eq - stops[i].val) / (stops[i + 1].val - stops[i].val);
      return { t: stops[i].t + frac * (stops[i + 1].t - stops[i].t) };
    }
  }
  return { t: 1 };
}

// Get SVG point at parameter t along a cubic bezier path
// We use the TRAIL_PATH segments to compute position
function getPointOnTrail(t) {
  // Parse the trail path into bezier segments
  // The path has 6 C commands = 6 cubic bezier segments
  const segments = [
    { p0: [195,438], p1: [220,428], p2: [280,412], p3: [320,392] },
    { p0: [320,392], p1: [355,374], p2: [360,358], p3: [330,346] },
    { p0: [330,346], p1: [290,332], p2: [170,322], p3: [100,312] },
    { p0: [100,312], p1: [50,302],  p2: [40,290],  p3: [70,278]  },
    { p0: [70,278],  p1: [110,264], p2: [220,252], p3: [300,240] },
    { p0: [300,240], p1: [350,230], p2: [350,218], p3: [300,206] },
    { p0: [300,206], p1: [240,192], p2: [130,182], p3: [80,172]  },
    { p0: [80,172],  p1: [40,162],  p2: [50,150],  p3: [90,140]  },
    { p0: [90,140],  p1: [140,128], p2: [230,118], p3: [280,108] },
    { p0: [280,108], p1: [320,100], p2: [310,88],  p3: [260,78]  },
    { p0: [260,78],  p1: [230,72],  p2: [210,68],  p3: [195,58]  },
  ];
  const n = segments.length;
  const seg = Math.min(Math.floor(t * n), n - 1);
  const u = (t * n) - seg;
  const s = segments[seg];
  const b = (p0, p1, p2, p3, u) =>
    (1-u)**3*p0 + 3*(1-u)**2*u*p1 + 3*(1-u)*u**2*p2 + u**3*p3;
  return [
    b(s.p0[0], s.p1[0], s.p2[0], s.p3[0], u),
    b(s.p0[1], s.p1[1], s.p2[1], s.p3[1], u),
  ];
}

/* ───────────────────────────────────────────
   Equity Formatters (compact)
   ─────────────────────────────────────────── */

function fmtEq(v) {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(v % 1e3 === 0 ? 0 : 1)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtEqShort(v) {
  if (v >= 1e6) return `$${+(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${+(v / 1e3).toFixed(1)}K`;
  return `$${v}`;
}

/* ───────────────────────────────────────────
   Sub-Components
   ─────────────────────────────────────────── */

function StatBox({ label, value, sub, highlight }) {
  return (
    <div className={`rounded-lg p-3 text-center ${
      highlight ? 'bg-emerald-900/40 border border-emerald-500/40' : 'bg-white/5 border border-white/10'
    }`}>
      <div className="text-xs text-white/50 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-bold font-mono ${
        highlight ? 'text-emerald-400' : 'text-white'
      }`}>{value}</div>
      {sub && <div className="text-xs text-white/40 mt-0.5">{sub}</div>}
    </div>
  );
}

function PhaseChip({ phase }) {
  const colors = {
    pre: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    anchor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    model: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  };
  const labels = { pre: 'Pre-Anchor', anchor: 'At Anchor', model: 'Model Phase' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[phase]}`}>
      {labels[phase]}
    </span>
  );
}

/* ───────────────────────────────────────────
   Mountain Trail Map Component
   ─────────────────────────────────────────── */

function MountainMap({ equity }) {
  const { t } = getPlayerPosition(equity);
  const [px, py] = getPointOnTrail(t);

  return (
    <div className="relative w-full" style={{ maxWidth: 390, margin: '0 auto' }}>
      {/* Mountain background image */}
      <img
        src={MOUNTAIN_BG}
        alt="Mountain"
        className="w-full rounded-2xl"
        style={{ display: 'block' }}
      />

      {/* SVG overlay */}
      <svg
        viewBox="0 0 390 460"
        className="absolute inset-0 w-full h-full"
        style={{ top: 0, left: 0 }}
      >
        {/* Glow filter */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="playerGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Trail path */}
        <path
          d={TRAIL_PATH}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Trail milestone dots + labels */}
        {TRAIL_MILESTONES.map((m) => {
          const reached = equity >= m.value;
          return (
            <g key={m.label}>
              <circle
                cx={m.x} cy={m.y} r={6}
                fill={reached ? '#10b981' : 'rgba(255,255,255,0.15)'}
                stroke={reached ? '#34d399' : 'rgba(255,255,255,0.3)'}
                strokeWidth={1.5}
                filter={reached ? 'url(#glow)' : undefined}
              />
              <text
                x={m.labelSide === 'left' ? m.x - 10 : m.x + 10}
                y={m.y + 1}
                textAnchor={m.labelSide === 'left' ? 'end' : 'start'}
                fill={reached ? '#10b981' : 'rgba(255,255,255,0.55)'}
                fontSize="10"
                fontWeight="600"
                fontFamily="JetBrains Mono, monospace"
              >
                {m.label}
              </text>
            </g>
          );
        })}

        {/* Summit marker */}
        {(() => {
          const reached = equity >= SUMMIT.value;
          return (
            <g>
              <polygon
                points={`${SUMMIT.x},${SUMMIT.y - 8} ${SUMMIT.x - 7},${SUMMIT.y + 4} ${SUMMIT.x + 7},${SUMMIT.y + 4}`}
                fill={reached ? '#f59e0b' : 'rgba(255,255,255,0.15)'}
                stroke={reached ? '#fbbf24' : 'rgba(255,255,255,0.3)'}
                strokeWidth={1.5}
                filter={reached ? 'url(#glow)' : undefined}
              />
              <text
                x={SUMMIT.x + 12}
                y={SUMMIT.y + 2}
                fill={reached ? '#f59e0b' : 'rgba(255,255,255,0.55)'}
                fontSize="10"
                fontWeight="700"
                fontFamily="JetBrains Mono, monospace"
              >
                {SUMMIT.label}
              </text>
            </g>
          );
        })()}

        {/* Player marker */}
        <g filter="url(#playerGlow)">
          <circle
            cx={px} cy={py} r={9}
            fill="#3b82f6"
            stroke="white"
            strokeWidth={2}
            opacity={0.95}
          />
          <text
            x={px} y={py + 4}
            textAnchor="middle"
            fontSize="9"
            fill="white"
            fontWeight="700"
          >YOU</text>
        </g>
      </svg>
    </div>
  );
}

/* ───────────────────────────────────────────
   Info Drawer Component
   ─────────────────────────────────────────── */

function InfoDrawer({ open, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f1923] rounded-t-2xl border-t border-white/10 p-5 pb-8"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/40 hover:text-white/80"
            >
              <X size={20} />
            </button>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ───────────────────────────────────────────
   Trade Entry Drawer
   ─────────────────────────────────────────── */

function TradeDrawer({ open, onClose, equity, onAddTrade }) {
  const [pnl, setPnl] = useState('');
  const [rMode, setRMode] = useState(false);
  const riskDol = useMemo(() => {
    // Current risk dollar from equity
    const risk = rN(equity);
    return risk * equity;
  }, [equity]);

  const handleAdd = () => {
    const val = parseFloat(pnl);
    if (!isFinite(val)) return;
    let dollarPnl = val;
    if (rMode) dollarPnl = val * riskDol;
    onAddTrade(dollarPnl);
    setPnl('');
    onClose();
  };

  return (
    <InfoDrawer open={open} onClose={onClose}>
      <h3 className="text-white font-bold text-lg mb-4">Log Trade</h3>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setRMode(false)}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            !rMode ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/60'
          }`}
        >$ Dollar</button>
        <button
          onClick={() => setRMode(true)}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            rMode ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/60'
          }`}
        >R Multiple</button>
      </div>
      <div className="mb-4">
        <label className="text-white/50 text-xs uppercase tracking-wider block mb-2">
          {rMode ? 'P&L in R (e.g. 2.1 or -1)' : 'P&L in dollars (e.g. 500 or -200)'}
        </label>
        <input
          type="number"
          value={pnl}
          onChange={e => setPnl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-lg font-mono focus:outline-none focus:border-blue-500"
          placeholder={rMode ? '+2.1' : '+500'}
          autoFocus
        />
        {rMode && (
          <p className="text-white/40 text-xs mt-1">
            1R = {r$N(equity)} at current equity
          </p>
        )}
      </div>
      <button
        onClick={handleAdd}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors"
      >
        Add Trade
      </button>
    </InfoDrawer>
  );
}

/* ───────────────────────────────────────────
   Phase Explainer Drawer
   ─────────────────────────────────────────── */

function PhaseDrawer({ open, onClose, phase }) {
  return (
    <InfoDrawer open={open} onClose={onClose}>
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle size={20} className="text-amber-400" />
        <h3 className="text-white font-bold text-lg">Phase Info</h3>
      </div>
      <PhaseChip phase={phase} />
      <p className="text-white/70 text-sm mt-3 leading-relaxed">
        {PHASE_INFO[phase]}
      </p>
      <div className="mt-4 space-y-2">
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-white/50 text-xs uppercase tracking-wider mb-1">Pre-Anchor</div>
          <div className="text-white/70 text-sm">{PHASE_INFO.pre}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-white/50 text-xs uppercase tracking-wider mb-1">At Anchor</div>
          <div className="text-white/70 text-sm">{PHASE_INFO.anchor}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-white/50 text-xs uppercase tracking-wider mb-1">Model Phase</div>
          <div className="text-white/70 text-sm">{PHASE_INFO.model}</div>
        </div>
      </div>
    </InfoDrawer>
  );
}

/* ───────────────────────────────────────────
   Main Home Component
   ─────────────────────────────────────────── */

export default function Home() {
  // Equity state (persisted to localStorage)
  const [equity, setEquity] = useState(() => {
    try {
      const s = localStorage.getItem('tv_equity');
      return s ? parseFloat(s) : 20000;
    } catch { return 20000; }
  });

  // Trade history
  const [trades, setTrades] = useState(() => {
    try {
      const s = localStorage.getItem('tv_trades');
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });

  // UI state
  const [showTradeDrawer, setShowTradeDrawer] = useState(false);
  const [showPhaseDrawer, setShowPhaseDrawer] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Risk calculations
  const phase = useMemo(() => getPhase(equity), [equity]);
  const riskPct = useMemo(() => rN(equity), [equity]);
  const riskDol = useMemo(() => r$N(equity), [equity]);
  const phaseName = useMemo(() => getPhaseName(equity), [equity]);
  const severity = useMemo(() => riskSeverity(riskPct), [riskPct]);

  // Persist equity
  const updateEquity = (val) => {
    const clamped = Math.max(1, Math.min(val, 99999999));
    setEquity(clamped);
    try { localStorage.setItem('tv_equity', String(clamped)); } catch {}
  };

  // Add trade
  const handleAddTrade = (pnl) => {
    const newEq = Math.max(1, equity + pnl);
    const trade = {
      id: Date.now(),
      pnl,
      equity: newEq,
      ts: Date.now(),
    };
    const newTrades = [...trades, trade];
    setTrades(newTrades);
    updateEquity(newEq);
    try { localStorage.setItem('tv_trades', JSON.stringify(newTrades)); } catch {}
  };

  // Reset
  const handleReset = () => {
    updateEquity(20000);
    setTrades([]);
    try {
      localStorage.removeItem('tv_equity');
      localStorage.removeItem('tv_trades');
    } catch {}
    setShowResetConfirm(false);
  };

  const recentTrades = trades.slice(-5).reverse();

  return (
    <div className="min-h-screen bg-[#0a1218] text-white">
      {/* ── Header ── */}
      <div className="px-4 pt-safe-top pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={20} className="text-blue-400" />
          <span className="font-bold text-base tracking-tight">TradeVault</span>
        </div>
        <button
          onClick={() => setShowResetConfirm(true)}
          className="text-white/30 hover:text-white/60 text-xs transition-colors"
        >
          Reset
        </button>
      </div>

      {/* ── Mountain Map ── */}
      <div className="px-4 py-3">
        <MountainMap equity={equity} />
      </div>

      {/* ── Equity Display ── */}
      <div className="px-4 text-center mb-4">
        <div className="text-3xl font-bold font-mono text-white">
          {fmtEq(equity)}
        </div>
        <div className="text-white/40 text-sm mt-0.5">Current Equity</div>
      </div>

      {/* ── Stats Row ── */}
      <div className="px-4 mb-4 grid grid-cols-3 gap-2">
        <StatBox
          label="Risk %"
          value={`${(riskPct * 100).toFixed(1)}%`}
          highlight={severity === 'high'}
        />
        <StatBox
          label="Risk $"
          value={riskDol}
        />
        <StatBox
          label="Phase"
          value={phaseName}
        />
      </div>

      {/* ── Phase chip + info button ── */}
      <div className="px-4 mb-4 flex items-center gap-2">
        <PhaseChip phase={phase} />
        <button
          onClick={() => setShowPhaseDrawer(true)}
          className="text-white/30 hover:text-white/60 transition-colors"
        >
          <Info size={16} />
        </button>
      </div>

      {/* ── Equity Curve ── */}
      {trades.length > 0 && (
        <div className="px-4 mb-4">
          <div className="text-white/40 text-xs uppercase tracking-wider mb-2">Equity Curve</div>
          <EquityCurve trades={trades} startEquity={20000} />
        </div>
      )}

      {/* ── Recent Trades ── */}
      {recentTrades.length > 0 && (
        <div className="px-4 mb-4">
          <div className="text-white/40 text-xs uppercase tracking-wider mb-2">Recent Trades</div>
          <div className="space-y-1.5">
            {recentTrades.map(t => (
              <div key={t.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                <span className={`font-mono text-sm font-medium ${
                  t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {t.pnl >= 0 ? '+' : ''}{fmt(Math.abs(t.pnl))}
                </span>
                <span className="text-white/40 text-xs font-mono">{fmtEqShort(t.equity)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CTA Button ── */}
      <div className="px-4 pb-safe-bottom pb-8">
        <button
          onClick={() => setShowTradeDrawer(true)}
          className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold py-4 rounded-2xl text-lg transition-colors flex items-center justify-center gap-2"
        >
          <TrendingUp size={22} />
          Log Trade
        </button>
      </div>

      {/* ── Reset Confirm ── */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-[#0f1923] rounded-2xl border border-white/10 p-6 w-full max-w-sm"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Trophy size={20} className="text-amber-400" />
                <h3 className="text-white font-bold text-lg">Reset Progress?</h3>
              </div>
              <p className="text-white/60 text-sm mb-5">
                This will reset your equity to $20K and clear all trade history.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  Reset
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Drawers ── */}
      <TradeDrawer
        open={showTradeDrawer}
        onClose={() => setShowTradeDrawer(false)}
        equity={equity}
        onAddTrade={handleAddTrade}
      />
      <PhaseDrawer
        open={showPhaseDrawer}
        onClose={() => setShowPhaseDrawer(false)}
        phase={phase}
      />
    </div>
  );
}