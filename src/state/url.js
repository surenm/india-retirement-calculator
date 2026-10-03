import { DEFAULTS, EXPENSE_ITEMS } from './defaults.js';

// Short query-param keys for scalar fields.
export const KEYS = {
  age: 'a', retAge: 'ra', lifeExp: 'le', lifestyle: 'ls',
  income: 'in', corpus: 'co', sip: 'sp', stepUp: 'su',
  epfBal: 'eb', epfMonthly: 'em', epfRate: 'er', epfAge: 'ea',
  ppfBal: 'pb', ppfYearly: 'py', ppfRate: 'pr', ppfAge: 'pa',
  npsBal: 'nb', npsMonthly: 'nm', npsRate: 'nr', npsAge: 'na', npsAnnuityPct: 'np', annuityRate: 'ar',
  healthPremium: 'hp', medicalOOP: 'ho', medInf: 'mi',
  eduInf: 'ei', wedInf: 'wi', parentMonthly: 'pm', parentInf: 'pi', parentYears: 'pyr',
  buffer: 'bf', inflation: 'if', preRet: 'rp',
  b1Years: 'b1y', b2Years: 'b2y', b1Ret: 'b1r', b2Ret: 'b2r', b3Ret: 'b3r',
  b1Tax: 'b1t', b2Tax: 'b2t', b3Tax: 'b3t',
  strategy: 'ws', guardBand: 'gb', guardAdj: 'ga', downturnCut: 'dc',
  mcOn: 'mc', mcRuns: 'mn', eqVol: 'ev', simBase: 'sb', confidence: 'cf',
};
const ARRAY_KEYS = { expenses: 'x', children: 'ch', recurring: 'rc', incomes: 'oi' };
const STRING_FIELDS = new Set(['lifestyle', 'strategy', 'simBase']);
const BOOL_FIELDS = new Set(['mcOn']);
const MODE_CODE = { same: 's', gone: 'g', custom: 'c' };
const CODE_MODE = { s: 'same', g: 'gone', c: 'custom' };

const cleanName = (s) => String(s).replace(/[_~]/g, ' ').trim().slice(0, 40) || 'Item';
const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

function encodeArray(name, arr) {
  switch (name) {
    case 'expenses':
      return arr
        .map((e) => [e.amt, MODE_CODE[e.mode] || 's'].concat(e.mode === 'custom' ? [e.custom] : []).join('_'))
        .join('~');
    case 'children':
      return arr.map((c) => [c.age, c.eduCost, c.eduAge, c.wedCost, c.wedAge].join('_')).join('~');
    case 'recurring':
      return arr.map((r) => [cleanName(r.name), r.amt, r.every, r.from, r.to].join('_')).join('~');
    case 'incomes':
      return arr.map((r) => [cleanName(r.name), r.monthly, r.from, r.to, r.growth].join('_')).join('~');
    default:
      return '';
  }
}

function decodeArray(name, str) {
  if (str === '') return [];
  const items = str.split('~').map((s) => s.split('_'));
  switch (name) {
    case 'expenses':
      return EXPENSE_ITEMS.map((item, i) => {
        const d = DEFAULTS.expenses[i];
        const f = items[i];
        if (!f) return { ...d };
        return {
          id: item.id,
          amt: num(f[0], d.amt),
          mode: CODE_MODE[f[1]] || d.mode,
          custom: num(f[2], 0),
        };
      });
    case 'children':
      return items.map((f) => ({
        age: num(f[0], 5), eduCost: num(f[1], 0), eduAge: num(f[2], 18), wedCost: num(f[3], 0), wedAge: num(f[4], 27),
      }));
    case 'recurring':
      return items.map((f) => ({
        name: f[0] || 'Item', amt: num(f[1], 0), every: Math.max(1, num(f[2], 1)), from: num(f[3], 45), to: num(f[4], 80),
      }));
    case 'incomes':
      return items.map((f) => ({
        name: f[0] || 'Income', monthly: num(f[1], 0), from: num(f[2], 45), to: num(f[3], 55), growth: num(f[4], 0),
      }));
    default:
      return [];
  }
}

// Only values that differ from defaults go into the URL.
export function encodeState(state) {
  const p = new URLSearchParams();
  for (const [field, key] of Object.entries(KEYS)) {
    const v = state[field];
    if (v === DEFAULTS[field]) continue;
    p.set(key, BOOL_FIELDS.has(field) ? (v ? '1' : '0') : String(v));
  }
  for (const [field, key] of Object.entries(ARRAY_KEYS)) {
    const enc = encodeArray(field, state[field]);
    if (enc !== encodeArray(field, DEFAULTS[field])) p.set(key, enc);
  }
  return p.toString();
}

export function hasStateParams(search) {
  const p = new URLSearchParams(search);
  return [...Object.values(KEYS), ...Object.values(ARRAY_KEYS)].some((k) => p.has(k));
}

export function decodeState(search, base = DEFAULTS) {
  const p = new URLSearchParams(search);
  const s = structuredCloneSafe(base);
  for (const [field, key] of Object.entries(KEYS)) {
    if (!p.has(key)) continue;
    const raw = p.get(key);
    if (BOOL_FIELDS.has(field)) s[field] = raw === '1';
    else if (STRING_FIELDS.has(field)) s[field] = raw;
    else s[field] = num(raw, base[field]);
  }
  for (const [field, key] of Object.entries(ARRAY_KEYS)) {
    if (p.has(key)) s[field] = decodeArray(field, p.get(key));
  }
  return sanitize(s);
}

// Guard against impossible combinations from hand-edited URLs or old storage.
export function sanitize(s) {
  const out = { ...DEFAULTS, ...s };
  out.age = clamp(out.age, 18, 75);
  out.retAge = clamp(out.retAge, out.age + 1, 80);
  out.lifeExp = clamp(out.lifeExp, out.retAge + 1, 110);
  if (!['lean', 'regular', 'fat'].includes(out.lifestyle)) out.lifestyle = 'regular';
  if (!['fixed', 'guardrails'].includes(out.strategy)) out.strategy = 'fixed';
  if (!['projected', 'target'].includes(out.simBase)) out.simBase = 'projected';
  if (![0, 0.75, 0.85, 0.9].includes(out.confidence)) out.confidence = 0;
  out.mcRuns = clamp(Math.round(out.mcRuns), 200, 10000);
  out.b1Years = clamp(Math.round(out.b1Years), 0, 10);
  out.b2Years = clamp(Math.round(out.b2Years), 0, 15);
  if (!Array.isArray(out.expenses) || out.expenses.length !== EXPENSE_ITEMS.length) out.expenses = DEFAULTS.expenses;
  for (const k of ['children', 'recurring', 'incomes']) if (!Array.isArray(out[k])) out[k] = DEFAULTS[k];
  out.children = out.children.slice(0, 4);
  return out;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const structuredCloneSafe = (o) => JSON.parse(JSON.stringify(o));
