import { E0, SMIN, FM, MILES } from './constants.js';
import { lg } from './format.js';
import { rN, rO, rF, geoGrowth, lossesToWipe, calcStreak } from './risk.js';

// Mulberry32 PRNG (deterministic, seedable)
export const mb32 = seed => {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Percentile from sorted array
export const ptile = (arr, p) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const i = (s.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return lo === hi ? s[lo] : s[lo] + (i - lo) * (s[hi] - s[lo]);
};

// Run heavy metrics simulation (500 paths x 100 trades x 3 models)
export const computeHeavyMetrics = (dEq, dWr, dRr) => {
  const b = dRr, w = dWr / 100, NP = 500, NT = 100;

  const sim = fn => {
    const rand = mb32(42);
    return Array.from({ length: NP }, () => {
      let e = dEq;
      const ea = [e];
      for (let t = 0; t < NT; t++) {
        const f = fn(e);
        e = rand() < w ? e * (1 + f * b) : e * (1 - f);
        e = Math.min(Math.max(e, 1), 1e15);
        ea.push(e);
      }
      return ea;
    });
  };

  const fp = sim(rF), op = sim(rO), np = sim(rN);

  // Trajectory chart with confidence bands (sampled every 2 trades)
  const chart = [];
  for (let t = 0; t <= NT; t += 2) {
    const nVals = np.map(p => p[t]);
    const np10 = lg(ptile(nVals, 0.1)), np25v = lg(ptile(nVals, 0.25));
    const np75v = lg(ptile(nVals, 0.75)), np90 = lg(ptile(nVals, 0.9));
    chart.push({
      t,
      fl: lg(ptile(fp.map(p => p[t]), 0.5)),
      ol: lg(ptile(op.map(p => p[t]), 0.5)),
      nl: lg(ptile(nVals, 0.5)),
      bandBase: np10,
      band1090: np90 - np10,
      bandBase25: np25v,
      band2575: np75v - np25v,
    });
  }

  // Terminal wealth
  const fT = fp.map(p => p[NT]), nT = np.map(p => p[NT]), oT = op.map(p => p[NT]);

  // Max drawdown per path
  const mdd = paths =>
    paths.map(ea => {
      let pk = ea[0], mx = 0;
      for (const e of ea) {
        if (e > pk) pk = e;
        mx = Math.max(mx, (pk - e) / pk);
      }
      return mx;
    });

  // Full map data
  const fMap = FM.map(m => {
    const r = rN(m.v), drd = r * m.v;
    const e1l = Math.max(1, m.v * (1 - r));
    const e3l = calcStreak(m.v, 3, false, dRr);
    const e3w = calcStreak(m.v, 3, true, dRr);
    return {
      ...m, r, rd: drd, gd: drd * dRr, e1l,
      dd3: ((m.v - e3l) / m.v) * 100,
      dd1: ((m.v - e1l) / m.v) * 100,
      gu3: ((e3w - m.v) / m.v) * 100,
      e3l, e3w,
      g: geoGrowth(r, w, dRr),
      ltw: lossesToWipe(m.v),
    };
  });

  // Survival simulation (2000 paths from $20K to anchor)
  const SP = 2000, sr = mb32(777);
  let reached = 0;
  for (let i = 0; i < SP; i++) {
    let ce = SMIN, alive = true;
    for (let t = 0; t < 200 && alive; t++) {
      const cr = rN(ce);
      ce = sr() < w ? ce * (1 + cr * b) : ce * (1 - cr);
      ce = Math.max(ce, 1);
      if (ce >= E0) { reached++; alive = false; }
      if (ce <= 1) alive = false;
    }
  }

  // Recovery analysis
  const rC = (nL, fn) => {
    let e = dEq;
    for (let i = 0; i < nL; i++) e *= 1 - fn(e);
    const tr = e, dd = ((dEq - tr) / dEq) * 100;
    let rw = 0, eq2 = tr;
    while (eq2 < dEq * 0.999 && rw < 500) { eq2 *= 1 + fn(eq2) * b; rw++; }
    return { dd, w: rw };
  };

  return {
    chart,
    term: {
      f: { m: ptile(fT, 0.5), p25: ptile(fT, 0.25), p75: ptile(fT, 0.75) },
      n: { m: ptile(nT, 0.5), p25: ptile(nT, 0.25), p75: ptile(nT, 0.75) },
      o: { m: ptile(oT, 0.5), p25: ptile(oT, 0.25), p75: ptile(oT, 0.75) },
    },
    mdd: {
      f: { m: ptile(mdd(fp), 0.5), p90: ptile(mdd(fp), 0.9) },
      n: { m: ptile(mdd(np), 0.5), p90: ptile(mdd(np), 0.9) },
    },
    fMap,
    surv: (reached / SP) * 100,
    rec: {
      f3: rC(3, rF), o3: rC(3, rO), n3: rC(3, rN),
      f5: rC(5, rF), o5: rC(5, rO), n5: rC(5, rN),
    },
  };
};

// Milestone projection simulation (500 paths x 400 trades)
export const computeMilestones = (dEq, dWr, dRr, simSeed) => {
  const w = dWr / 100, b = dRr;

  const bestWins = (fn, target) => {
    if (dEq >= target) return 0;
    let e = dEq, t = 0;
    while (e < target && t < 9999) { e *= 1 + fn(e) * b; t++; }
    return t;
  };

  const NP = 500, MT = 400;

  const runMC = (fn, seed) => {
    const rng = mb32(seed);
    const paths = Array.from({ length: NP }, () => {
      let e = dEq;
      const cross = {};
      MILES.forEach(m => { if (e >= m.v) cross[m.v] = 0; });
      for (let t = 1; t <= MT; t++) {
        const r = fn(e);
        e = rng() < w ? e * (1 + r * b) : e * (1 - r);
        e = Math.max(e, 1);
        MILES.forEach(m => { if (!(m.v in cross) && e >= m.v) cross[m.v] = t; });
        if (e <= 1) break;
      }
      return cross;
    });

    return target => {
      if (dEq >= target) return { reached: 100, median: 0, p25: 0, p75: 0 };
      const times = paths.map(p => p[target]).filter(t => t !== undefined);
      return {
        reached: (times.length / NP) * 100,
        median: times.length > 3 ? Math.round(ptile(times, 0.5)) : null,
        p25: times.length > 3 ? Math.round(ptile(times, 0.25)) : null,
        p75: times.length > 3 ? Math.round(ptile(times, 0.75)) : null,
      };
    };
  };

  const mcN = runMC(rN, simSeed), mcF = runMC(rF, simSeed + 111);

  return MILES.map(m => ({
    ...m,
    achieved: dEq >= m.v,
    progress: Math.min(100, (dEq / m.v) * 100),
    bestN: bestWins(rN, m.v),
    bestF: bestWins(rF, m.v),
    mcN: mcN(m.v),
    mcF: mcF(m.v),
  }));
};
