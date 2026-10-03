# Retirement corpus calculator (India)

Single-page React app, no backend. Every input is stored in the URL (shareable) and in localStorage.

## Run

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests for the maths
npm run build      # static build in dist/, deploy anywhere (Netlify, Vercel, GitHub Pages)
node build-standalone.mjs   # optional: one self-contained HTML file (needs `npm i -D esbuild`)
```

## Structure

- `src/calc/engine.js` – cash flows, target corpus, projections, multipliers, bridge corpus
- `src/calc/simulate.js` – three-bucket year-by-year simulation, crash scenarios, Monte Carlo (seeded)
- `src/calc/format.js` – ₹ formatting in lakh / crore
- `src/state/` – defaults, URL encoding (short keys, only non-default values), localStorage
- `src/components/` – inputs, results, chart

## How the target is worked out

1. Each expense line is normalised to what it will be in retirement (same / gone / changed), in today's money, then scaled by lifestyle (lean 0.75x, fat 1.5x).
2. For every year of retirement: living costs grow at general inflation, medical at medical inflation, plus parent support, children's goals, recurring costs. Income after retiring, the NPS annuity, and EPF/PPF/NPS lump sums that unlock after retirement reduce the need.
3. The target is the smallest starting corpus that lasts to life expectancy when run through the three-bucket plan at the expected bucket returns (after tax drag), plus the emergency buffer.
4. Optionally, the target is raised until the plan succeeds in 75/85/90% of Monte Carlo runs.

Returns are applied yearly; tax is modelled as a share of positive returns per bucket. It's a planning aid, not advice.
