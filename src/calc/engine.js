import { LIFESTYLES } from '../state/defaults.js';
import { simulate, constantReturns, monteCarlo } from './simulate.js';

const P = (x) => x / 100;

// Present value factor of a growing annuity paid at the START of each year
// (annuity-due). r = return, g = growth (inflation), n = years.
export function pvgaFactor(r, g, n) {
  if (n <= 0) return 0;
  if (Math.abs(r - g) < 1e-9) return n;
  return ((1 - Math.pow((1 + g) / (1 + r), n)) / (r - g)) * (1 + r);
}

// Monthly retirement budget in today's money after normalising each line.
export function normalisedMonthly(s) {
  const base = s.expenses.reduce((sum, e) => {
    if (e.mode === 'gone') return sum;
    if (e.mode === 'custom') return sum + (Number(e.custom) || 0);
    return sum + (Number(e.amt) || 0);
  }, 0);
  return base * (LIFESTYLES[s.lifestyle]?.mult ?? 1);
}

export function currentMonthly(s) {
  return s.expenses.reduce((sum, e) => sum + (Number(e.amt) || 0), 0);
}

// Future value of a balance with yearly contributions until `contribYears`,
// then growing without contributions until `totalYears`.
export function accountFV(balance, yearly, rate, contribYears, totalYears) {
  const r = P(rate);
  let v = balance;
  for (let y = 0; y < totalYears; y++) {
    v = v * (1 + r) + (y < contribYears ? yearly * (1 + r / 2) : 0);
  }
  return v;
}

// Values of EPF / PPF / NPS at their unlock ages (or at retirement if they
// unlock earlier). Contributions stop at retirement.
export function retirementAccounts(s, retAge = s.retAge) {
  const contribYears = Math.max(0, retAge - s.age);
  const list = [
    { key: 'epf', label: 'EPF', bal: s.epfBal, yearly: s.epfMonthly * 12, rate: s.epfRate, unlock: s.epfAge },
    { key: 'ppf', label: 'PPF', bal: s.ppfBal, yearly: s.ppfYearly, rate: s.ppfRate, unlock: s.ppfAge },
    { key: 'nps', label: 'NPS', bal: s.npsBal, yearly: s.npsMonthly * 12, rate: s.npsRate, unlock: s.npsAge },
  ];
  return list
    .filter((a) => a.bal > 0 || a.yearly > 0)
    .map((a) => {
      const at = Math.max(a.unlock, retAge);
      const value = accountFV(a.bal, a.yearly, a.rate, contribYears, at - s.age);
      let lump = value;
      let annuityIncome = 0;
      if (a.key === 'nps') {
        const ann = value * P(s.npsAnnuityPct);
        lump = value - ann;
        annuityIncome = ann * P(s.annuityRate);
      }
      return { ...a, at, value, lump, annuityIncome, locked: a.unlock > retAge };
    });
}

// Year-by-year nominal cash flows for every year of retirement.
// Outflows are positive; income and unlocked accounts are negative (inflows).
export function buildCashflows(s, retAge = s.retAge, inflation = s.inflation) {
  const inf = P(inflation);
  const n = Math.max(0, s.lifeExp - retAge);
  const livingToday = normalisedMonthly(s) * 12;
  const medicalToday = s.healthPremium + s.medicalOOP;
  const accounts = retirementAccounts(s, retAge);

  const rows = [];
  for (let t = 0; t < n; t++) {
    const age = retAge + t;
    const y = age - s.age; // years from today
    const living = livingToday * Math.pow(1 + inf, y);
    const medical = medicalToday * Math.pow(1 + P(s.medInf), y);

    const parents = y < s.parentYears ? s.parentMonthly * 12 * Math.pow(1 + P(s.parentInf), y) : 0;

    let recurring = 0;
    for (const r of s.recurring) {
      if (age >= r.from && age <= r.to && (age - r.from) % Math.max(1, r.every) === 0) {
        recurring += r.amt * Math.pow(1 + inf, y);
      }
    }

    let goals = 0;
    for (const c of s.children) {
      const childAge = c.age + y;
      if (childAge === c.eduAge) goals += c.eduCost * Math.pow(1 + P(s.eduInf), y);
      if (childAge === c.wedAge) goals += c.wedCost * Math.pow(1 + P(s.wedInf), y);
    }

    let income = 0;
    for (const r of s.incomes) {
      if (age >= r.from && age <= r.to) income += r.monthly * 12 * Math.pow(1 + P(r.growth), y);
    }

    let annuity = 0;
    let unlocks = 0;
    for (const a of accounts) {
      if (a.annuityIncome && age >= a.at) annuity += a.annuityIncome;
      if (a.locked && age === a.at) unlocks += a.lump;
    }

    const outflow = living + medical + parents + recurring + goals;
    rows.push({
      t, age, living, medical, parents, recurring, goals, income, annuity, unlocks,
      other: medical + parents + recurring + goals - income - annuity - unlocks,
      net: outflow - income - annuity - unlocks,
    });
  }
  return rows;
}

const pvOf = (rows, field, r) => rows.reduce((s, row) => s + row[field] / Math.pow(1 + r, row.t), 0);

// Smallest starting corpus that lasts to life expectancy when run through
// the three-bucket plan at the expected bucket returns.
export function solveCorpus(s, rows, survives) {
  const outflows = rows.reduce((a, r) => a + Math.max(0, r.net), 0);
  let lo = 0;
  let hi = Math.max(1e5, outflows * 1.5 + s.buffer);
  if (!survives(hi)) return hi;
  for (let i = 0; i < 40 && hi - lo > 1000; i++) {
    const mid = (lo + hi) / 2;
    if (survives(mid)) hi = mid; else lo = mid;
  }
  return hi;
}

// The single return that makes the simple present-value maths match the
// bucket plan. Used to split the need into parts and for the multiplier.
function impliedReturn(rows, pvTarget) {
  const pv = (r) => rows.reduce((a, row) => a + row.net / Math.pow(1 + r, row.t), 0);
  let lo = -0.05, hi = 0.4;
  if (pv(hi) > pvTarget) return hi;
  if (pv(lo) < pvTarget) return lo;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (pv(mid) > pvTarget) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// Liquid corpus needed on the first day of retirement, with a breakdown.
export function targetCorpus(s, retAge = s.retAge, inflation = s.inflation) {
  const ss = inflation === s.inflation ? s : { ...s, inflation };
  const rows = buildCashflows(ss, retAge, inflation);
  const ret = constantReturns(ss);
  const needed = solveCorpus(ss, rows, (c) => simulate(ss, rows, c, ret).depletedAge === null);
  const r = impliedReturn(rows, Math.max(0, needed - Math.min(s.buffer, needed)));
  const parts = {
    living: pvOf(rows, 'living', r) + pvOf(rows, 'medical', r),
    children: pvOf(rows, 'goals', r),
    parents: pvOf(rows, 'parents', r),
    recurring: pvOf(rows, 'recurring', r),
    income: -(pvOf(rows, 'income', r) + pvOf(rows, 'annuity', r)),
    accounts: -pvOf(rows, 'unlocks', r),
    buffer: Math.min(s.buffer, needed),
  };
  return { rows, parts, needed, impliedReturn: r };
}

// Corpus needed to succeed in a given share of simulated markets.
export function confidentCorpus(s, rows, baseNeed, confidence) {
  const runs = Math.min(600, s.mcRuns);
  const ss = { ...s, mcRuns: runs };
  const ok = (c) => monteCarlo(ss, rows, c, 777).successRate >= confidence;
  let lo = baseNeed * 0.8;
  let hi = baseNeed * 1.4 + 1e5;
  let guard = 0;
  while (!ok(hi) && guard++ < 6) { lo = hi; hi *= 1.6; }
  if (!ok(hi)) return null;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) hi = mid; else lo = mid;
  }
  return hi;
}

// What today's savings grow to by retirement.
export function projectSavings(s, retAge = s.retAge) {
  const years = Math.max(0, retAge - s.age);
  const rm = Math.pow(1 + P(s.preRet), 1 / 12) - 1;
  let corpus = s.corpus;
  let perRupeeSip = 0; // FV of a ₹1/month SIP with step-up
  let monthlyUnit = 1;
  for (let m = 0; m < years * 12; m++) {
    if (m > 0 && m % 12 === 0) monthlyUnit *= 1 + P(s.stepUp);
    corpus *= 1 + rm;
    perRupeeSip = perRupeeSip * (1 + rm) + monthlyUnit;
  }
  const accounts = retirementAccounts(s, retAge);
  const unlockedAtRet = accounts.filter((a) => !a.locked).reduce((sum, a) => sum + a.lump, 0);
  const sipFV = s.sip * perRupeeSip;
  return { corpusFV: corpus, sipFV, perRupeeSip, unlockedAtRet, total: corpus + sipFV + unlockedAtRet };
}

export function summarise(s) {
  const years = s.retAge - s.age;
  const target = targetCorpus(s);
  const proj = projectSavings(s);
  const inf = P(s.inflation);
  const r = target.impliedReturn;
  const n = s.lifeExp - s.retAge;

  const firstYear = target.rows[0] ? target.rows[0].living + target.rows[0].medical : 0;
  const factor = pvgaFactor(r, inf, n);

  const sipNeeded = Math.max(0, (target.needed - proj.corpusFV - proj.unlockedAtRet) / Math.max(proj.perRupeeSip, 1e-9));

  // Earliest age at which projected savings meet the need.
  let fireAge = null;
  for (let ra = s.age + 1; ra <= Math.min(s.lifeExp - 1, 75); ra++) {
    if (projectSavings(s, ra).total >= targetCorpus(s, ra).needed) { fireAge = ra; break; }
  }

  const invested = s.sip + s.epfMonthly + s.ppfYearly / 12 + s.npsMonthly;
  const savingsRate = s.income > 0 ? invested / s.income : 0;

  const coastNeeded = Math.max(0, target.needed - proj.unlockedAtRet) / Math.pow(1 + P(s.preRet), years);

  const scenarios = [6, 7, 8, 9].map((i) => {
    const t = targetCorpus(s, s.retAge, i);
    const fy = t.rows[0] ? t.rows[0].living + t.rows[0].medical : 0;
    const f = pvgaFactor(t.impliedReturn, P(i), n);
    return { inflation: i, firstYear: fy, factor: f, livingCorpus: fy * f, fullNeed: t.needed };
  });

  const accounts = retirementAccounts(s);
  const lockedAges = accounts.filter((a) => a.locked).map((a) => a.at);
  let bridge = null;
  if (lockedAges.length) {
    const until = Math.min(...lockedAges);
    const rows = target.rows.filter((row) => row.age < until);
    const pv = rows.reduce((sum, row) => sum + (row.net + row.unlocks) / Math.pow(1 + r, row.t), 0);
    bridge = { until, years: until - s.retAge, amount: Math.max(0, pv) };
  }

  return {
    years, n, target, proj, firstYear, factor,
    rule25: firstYear * 25,
    annuityCorpus: firstYear * factor,
    sipNeeded, fireAge, savingsRate, invested,
    coastNeeded, coastHit: s.corpus >= coastNeeded,
    scenarios, bridge, accounts,
    gap: proj.total - target.needed,
    currentMonthly: currentMonthly(s),
    retireMonthlyToday: normalisedMonthly(s),
  };
}
