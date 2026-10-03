import { describe, it, expect } from 'vitest';
import { pvgaFactor, summarise, targetCorpus } from './engine.js';
import { simulate, constantReturns } from './simulate.js';
import { DEFAULTS } from '../state/defaults.js';
import { encodeState, decodeState } from '../state/url.js';

describe('growing annuity', () => {
  it('matches the ET Money example (10% return, 6% inflation, 40 years)', () => {
    expect(pvgaFactor(0.1, 0.06, 40)).toBeCloseTo(21.25, 2);
  });
  it('gives roughly 34x at 9% inflation', () => {
    expect(pvgaFactor(0.1, 0.09, 40)).toBeCloseTo(33.7, 1);
  });
});

describe('target corpus', () => {
  it('lasts exactly to life expectancy at average returns', () => {
    const t = targetCorpus(DEFAULTS);
    const ok = simulate(DEFAULTS, t.rows, t.needed, constantReturns(DEFAULTS));
    const short = simulate(DEFAULTS, t.rows, t.needed * 0.97, constantReturns(DEFAULTS));
    expect(ok.depletedAge).toBeNull();
    expect(short.depletedAge).not.toBeNull();
  });
  it('breakdown adds up to the total', () => {
    const t = targetCorpus(DEFAULTS);
    const sum = Object.values(t.parts).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - t.needed) / t.needed).toBeLessThan(0.001);
  });
  it('needs more when inflation is higher', () => {
    const s = summarise(DEFAULTS);
    const needs = s.scenarios.map((x) => x.fullNeed);
    expect([...needs].sort((a, b) => a - b)).toEqual(needs);
  });
});

describe('url state', () => {
  it('defaults produce an empty query string', () => {
    expect(encodeState(DEFAULTS)).toBe('');
  });
  it('round-trips changed values', () => {
    const s = { ...DEFAULTS, age: 33, strategy: 'guardrails', children: [], incomes: [{ name: 'Rent', monthly: 25000, from: 50, to: 85, growth: 5 }] };
    const back = decodeState('?' + encodeState(s));
    expect(back.age).toBe(33);
    expect(back.strategy).toBe('guardrails');
    expect(back.children).toEqual([]);
    expect(back.incomes[0].name).toBe('Rent');
  });
});
