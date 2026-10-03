import { useState } from 'react';
import { inr } from '../calc/format.js';

const W = 640;
const H = 280;
const PAD = { l: 56, r: 12, t: 14, b: 30 };

export default function Chart({ base, early, late, bands }) {
  const [showCrash, setShowCrash] = useState(false);
  const [hover, setHover] = useState(null);
  if (!base.length) return null;

  const ages = base.map((d) => d.age + 1);
  const series = [base.map((d) => d.real)];
  if (showCrash) series.push(early.map((d) => d.real), late.map((d) => d.real));
  if (bands) series.push(bands.map((b) => b.p90));
  const maxY = Math.max(1, ...series.flat()) * 1.05;

  const x = (i) => PAD.l + (i / Math.max(1, ages.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - Math.max(0, v) / maxY) * (H - PAD.t - PAD.b);
  const line = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const area = bands
    ? line(bands.map((b) => b.p90)) +
      bands.map((b, i) => `L${x(bands.length - 1 - i).toFixed(1)},${y(bands[bands.length - 1 - i].p10).toFixed(1)}`).join('') + 'Z'
    : null;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY);
  const ageStep = ages.length > 30 ? 10 : 5;

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (ages.length - 1));
    setHover(i >= 0 && i < ages.length ? i : null);
  };

  return (
    <figure className="chart">
      <div className="chart__legend">
        <span className="key key--base">Average returns</span>
        {bands && <span className="key key--band">10th–90th percentile of simulations</span>}
        {showCrash && <span className="key key--early">Crash in first 2 years</span>}
        {showCrash && <span className="key key--late">Crash in years 4–5</span>}
      </div>
      <div className="chart__scroll">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Corpus value in today's money for each year of retirement"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="chart__grid" />
              <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" className="chart__tick">{inr(t)}</text>
            </g>
          ))}
          {ages.map((a, i) =>
            a % ageStep === 0 ? (
              <text key={a} x={x(i)} y={H - 8} textAnchor="middle" className="chart__tick">{a}</text>
            ) : null
          )}
          {area && <path d={area} className="chart__band" />}
          {bands && <path d={line(bands.map((b) => b.p50))} className="chart__median" />}
          {showCrash && <path d={line(early.map((d) => d.real))} className="chart__early" />}
          {showCrash && <path d={line(late.map((d) => d.real))} className="chart__late" />}
          <path d={line(base.map((d) => d.real))} className="chart__base" />
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} className="chart__cursor" />
              <circle cx={x(hover)} cy={y(base[hover].real)} r="4" className="chart__dot" />
            </g>
          )}
        </svg>
      </div>
      <figcaption>
        {hover !== null ? (
          <span>
            At {ages[hover]}: {inr(base[hover].real)} with average returns
            {bands ? `, ${inr(bands[hover].p10)} to ${inr(bands[hover].p90)} across simulations` : ''}
            {showCrash ? `, ${inr(early[hover].real)} if markets crash early` : ''}.
          </span>
        ) : (
          <span>Corpus left at the end of each year, in today's money. Touch or hover for values.</span>
        )}
      </figcaption>
      <button type="button" className="btn-text" onClick={() => setShowCrash((v) => !v)}>
        {showCrash ? 'Hide crash scenarios' : 'Show what a crash early vs late does'}
      </button>
    </figure>
  );
}
