const P = (x) => x / 100;

// Seeded RNG so a shared link always shows the same simulation result.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rng) {
  let u = 0;
  while (u === 0) u = rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const afterTax = (r, tax) => (r > 0 ? r * (1 - P(tax)) : r);

// Run retirement year by year with three buckets.
// rows: cash flows from buildCashflows. returnsAt(t) -> { r1, r2, r3 } as decimals.
export function simulate(s, rows, startCorpus, returnsAt) {
  const n = rows.length;
  const inf = P(s.inflation);
  const buffer = Math.min(s.buffer, Math.max(0, startCorpus));
  let invest = Math.max(0, startCorpus - buffer);

  const sumNet = (from, count, mult) => {
    let sum = 0;
    for (let i = from; i < Math.min(n, from + count); i++) {
      sum += Math.max(0, rows[i].living * mult + rows[i].other);
    }
    return sum;
  };

  let b1 = Math.min(invest, sumNet(0, s.b1Years, 1));
  invest -= b1;
  let b2 = Math.min(invest, sumNet(s.b1Years, s.b2Years, 1));
  invest -= b2;
  let b3 = invest;
  const initial = { b1, b2, b3, buffer };

  let mult = 1;
  let wr0 = null;
  let prevEq = 0;
  let depletedAge = null;
  const out = [];

  for (let t = 0; t < n; t++) {
    const row = rows[t];
    const total = b1 + b2 + b3;

    // Decide this year's spending on living costs.
    let yearMult = 1;
    if (s.strategy === 'guardrails') {
      if (wr0 === null) wr0 = total > 0 ? row.living / total : 0;
      else if (total > 0 && wr0 > 0) {
        const wr = (row.living * mult) / total;
        if (wr > wr0 * (1 + P(s.guardBand)) && n - t > 15) mult *= 1 - P(s.guardAdj);
        else if (wr < wr0 * (1 - P(s.guardBand))) mult *= 1 + P(s.guardAdj);
      }
      yearMult = mult;
    } else if (prevEq < 0 && s.downturnCut > 0) {
      yearMult = 1 - P(s.downturnCut);
    }

    const spend = row.living * yearMult + row.other;
    let shortfall = 0;
    if (spend >= 0) {
      let need = spend;
      const take = (b) => { const x = Math.min(b, need); need -= x; return b - x; };
      b1 = take(b1); b2 = take(b2); b3 = take(b3);
      shortfall = need;
    } else {
      b3 += -spend;
    }
    if (shortfall > 0 && depletedAge === null) depletedAge = row.age;

    const { r1, r2, r3 } = returnsAt(t);
    b1 *= 1 + afterTax(r1, s.b1Tax);
    b2 *= 1 + afterTax(r2, s.b2Tax);
    b3 *= 1 + afterTax(r3, s.b3Tax);
    prevEq = r3;

    // Refill: bucket 2 tops up bucket 1; bucket 3 tops up bucket 2 in good years.
    const want1 = sumNet(t + 1, s.b1Years, yearMult);
    if (b1 < want1) { const x = Math.min(b2, want1 - b1); b2 -= x; b1 += x; }
    const nextYear = sumNet(t + 1, 1, yearMult);
    if (b1 < nextYear) { const x = Math.min(b3, nextYear - b1); b3 -= x; b1 += x; }
    if (r3 >= 0) {
      const want2 = sumNet(t + 1 + s.b1Years, s.b2Years, yearMult);
      if (b2 < want2) { const x = Math.min(b3, want2 - b2); b3 -= x; b2 += x; }
    }

    const end = b1 + b2 + b3;
    const deflator = Math.pow(1 + inf, row.age + 1 - s.age);
    out.push({
      age: row.age, spend, spendReal: spend / Math.pow(1 + inf, row.age - s.age),
      b1, b2, b3, total: end, real: end / deflator, mult: yearMult, shortfall,
    });
  }
  return { years: out, initial, depletedAge, finalReal: out.length ? out[out.length - 1].real : 0 };
}

export const constantReturns = (s) => () => ({ r1: P(s.b1Ret), r2: P(s.b2Ret), r3: P(s.b3Ret) });

// Same 5-year average equity return, crash early vs crash late.
export function crashReturns(s, when) {
  const avg = s.b3Ret;
  const crash = [-20, -10];
  const rally = (5 * avg - crash[0] - crash[1]) / 3;
  const seq = when === 'early' ? [...crash, rally, rally, rally] : [rally, rally, rally, ...crash];
  return (t) => ({ r1: P(s.b1Ret), r2: P(s.b2Ret), r3: P(t < 5 ? seq[t] : avg) });
}

export function monteCarlo(s, rows, startCorpus, seed = 12345) {
  const rng = mulberry32(seed);
  const runs = s.mcRuns;
  const n = rows.length;
  const vol3 = P(s.eqVol);
  const vol2 = Math.max(0.02, vol3 * 0.25);
  const reals = Array.from({ length: n }, () => new Float64Array(runs));
  let success = 0;
  const depletionAges = [];

  for (let k = 0; k < runs; k++) {
    const draws = [];
    for (let t = 0; t < n; t++) {
      draws.push({
        r1: P(s.b1Ret) + 0.01 * normal(rng),
        r2: P(s.b2Ret) + vol2 * normal(rng),
        r3: Math.max(-0.6, P(s.b3Ret) + vol3 * normal(rng)),
      });
    }
    const res = simulate(s, rows, startCorpus, (t) => draws[t]);
    if (res.depletedAge === null) success++;
    else depletionAges.push(res.depletedAge);
    res.years.forEach((y, t) => { reals[t][k] = y.real; });
  }

  const pctl = (arr, q) => {
    const sorted = Array.from(arr).sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  };
  const bands = reals.map((arr, t) => ({
    age: rows[t].age, p10: pctl(arr, 0.1), p50: pctl(arr, 0.5), p90: pctl(arr, 0.9),
  }));
  depletionAges.sort((a, b) => a - b);
  return {
    successRate: runs ? success / runs : 0,
    bands,
    medianDepletionAge: depletionAges.length ? depletionAges[Math.floor(depletionAges.length / 2)] : null,
  };
}
