import { useState } from 'react';
import Chart from './Chart.jsx';
import { inr, pct } from '../calc/format.js';

export default function Results({ s, sum, need, det, early, late, mc, busy }) {
  const [showTable, setShowTable] = useState(false);
  const projected = sum.proj.total;
  const ratio = need > 0 ? projected / need : 1;
  const onTrack = projected >= need;
  const parts = sum.target.parts;

  const breakdown = [
    ['Living & medical costs', parts.living],
    ['Children\u2019s goals after you retire', parts.children],
    ['Support to parents', parts.parents],
    ['Big recurring costs', parts.recurring],
    ['Less: income after retiring', parts.income],
    ['Less: EPF, PPF, NPS unlocking later', parts.accounts],
    ['Emergency buffer', parts.buffer],
  ].filter(([, v]) => Math.abs(v) >= 1);

  const confident = s.mcOn && s.confidence > 0;

  return (
    <div className="results">
      <section className="hero" aria-live="polite">
        <p className="hero__lead">
          {confident ? `To be ${s.confidence * 100}% safe at ${s.retAge}, you need` : `To retire at ${s.retAge}, you need`}
        </p>
        <p className="hero__num">{inr(need)}</p>
        <div className="meter" role="img" aria-label={`You are on course for ${Math.round(ratio * 100)}% of it`}>
          <div className="meter__fill" style={{ width: Math.min(100, ratio * 100) + '%' }} />
        </div>
        <p className={onTrack ? 'hero__status is-ok' : 'hero__status is-short'}>
          {onTrack
            ? `You're on course for ${inr(projected)}, ${inr(projected - need)} more than you need.`
            : `You're on course for ${inr(projected)}, short by ${inr(need - projected)}.`}
        </p>
        {confident && (
          <p className="hero__sub">With average returns every year it would be {inr(sum.target.needed)}.</p>
        )}
      </section>

      <section className="stats">
        <Stat label="Monthly SIP needed" value={inr(sum.sipNeededShown)} note={`You invest ${inr(s.sip)} now, rising ${s.stepUp}% a year`} />
        <Stat
          label="Earliest you could retire"
          value={sum.fireAge ? `Age ${sum.fireAge}` : 'Not by 75'}
          note="At average returns, keeping today's SIP"
        />
        <Stat label="Savings rate" value={pct(sum.savingsRate)} note={`${inr(sum.invested)} of ${inr(s.income)} a month, incl. EPF/PPF/NPS`} />
        {s.mcOn && (
          <Stat
            label="Chance your money lasts"
            value={mc ? pct(mc.successRate) : '…'}
            note={
              mc
                ? `${s.mcRuns.toLocaleString('en-IN')} simulated markets, starting with ${s.simBase === 'projected' ? 'what you\u2019ll have' : 'the target'}` +
                  (mc.medianDepletionAge ? `. When it fails, typically around ${mc.medianDepletionAge}` : '')
                : 'Simulating…'
            }
            dim={busy}
          />
        )}
        <Stat
          label="Coast FIRE number"
          value={inr(sum.coastNeeded)}
          note={sum.coastHit ? 'You have this already: you could stop investing and still get there' : `Invested today with no more SIPs, this grows to your need by ${s.retAge}`}
        />
        {sum.bridge && (
          <Stat
            label="Bridge corpus"
            value={inr(sum.bridge.amount)}
            note={`Covers ${sum.bridge.years} years from ${s.retAge} until EPF/NPS/PPF unlock at ${sum.bridge.until}`}
          />
        )}
      </section>

      <section className="panel">
        <h2>What makes up the need</h2>
        <p className="panel__lead">
          Year-one living and medical costs at {s.retAge}: {inr(sum.firstYear)}, which is {inr(sum.retireMonthlyToday)} a month in today's money.
        </p>
        <dl className="rows">
          {breakdown.map(([label, v]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd className={v < 0 ? 'neg' : ''}>{inr(v)}</dd>
            </div>
          ))}
          <div className="rows__total">
            <dt>Total at average returns</dt>
            <dd>{inr(sum.target.needed)}</dd>
          </div>
        </dl>
      </section>

      <section className="panel">
        <h2>Why 25x isn't enough</h2>
        <p className="panel__lead">
          Corpus for living and medical costs alone, as a multiple of year-one spending, over {sum.n} years of retirement.
        </p>
        <div className="compare">
          <div>
            <span>25x rule</span>
            <strong>{inr(sum.rule25)}</strong>
          </div>
          <div>
            <span>Growing annuity, {sum.factor.toFixed(1)}x</span>
            <strong>{inr(sum.annuityCorpus)}</strong>
          </div>
        </div>
        <p className="note">
          The multiple uses your bucket returns after tax, which work out to about {pct(sum.target.impliedReturn, 1)} a year overall.
        </p>
        <div className="table-wrap">
          <table>
            <caption>If inflation turns out higher</caption>
            <thead>
              <tr><th scope="col">Inflation</th><th scope="col">Multiple</th><th scope="col">Full need</th></tr>
            </thead>
            <tbody>
              {sum.scenarios.map((sc) => (
                <tr key={sc.inflation} className={sc.inflation === s.inflation ? 'is-current' : ''}>
                  <td>{sc.inflation}%</td>
                  <td>{sc.factor.toFixed(1)}x</td>
                  <td>{inr(sc.fullNeed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Your three buckets on day one</h2>
        <div className="buckets">
          {[
            ['Liquid', det.initial.b1, `${s.b1Years} yrs of spending`],
            ['Debt & hybrid', det.initial.b2, `next ${s.b2Years} yrs`],
            ['Equity', det.initial.b3, 'the rest, for growth'],
            ['Buffer', det.initial.buffer, 'emergencies only'],
          ].map(([label, v, note]) => (
            <div className="bucket" key={label}>
              <span className="bucket__label">{label}</span>
              <strong>{inr(v)}</strong>
              <span className="bucket__note">{note}</span>
            </div>
          ))}
        </div>
        <p className="note">Based on {s.simBase === 'projected' ? 'what you\u2019re on course to have' : 'the target'}.</p>
      </section>

      <section className="panel">
        <h2>How long the money lasts</h2>
        <p className="panel__lead">
          {det.depletedAge
            ? `With average returns, it runs out at ${det.depletedAge}.`
            : `With average returns, it lasts past ${s.lifeExp} with ${inr(det.finalReal)} left in today's money.`}
          {' '}A crash in the first two years {early.depletedAge ? `empties it at ${early.depletedAge}` : 'still leaves money at the end'};
          the same crash later {late.depletedAge ? `empties it at ${late.depletedAge}` : 'leaves money at the end'}.
        </p>
        <Chart base={det.years} early={early.years} late={late.years} bands={s.mcOn && mc ? mc.bands : null} />
        <button type="button" className="btn-text" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable}>
          {showTable ? 'Hide year-by-year table' : 'Show year-by-year table'}
        </button>
        {showTable && (
          <div className="table-wrap">
            <table className="yearly">
              <thead>
                <tr>
                  <th scope="col">Age</th><th scope="col">Spent</th><th scope="col">Liquid</th>
                  <th scope="col">Debt</th><th scope="col">Equity</th><th scope="col">Total</th><th scope="col">Today's money</th>
                </tr>
              </thead>
              <tbody>
                {det.years.map((y) => (
                  <tr key={y.age} className={y.shortfall > 0 ? 'is-short' : ''}>
                    <td>{y.age}</td><td>{inr(y.spend)}</td><td>{inr(y.b1)}</td><td>{inr(y.b2)}</td>
                    <td>{inr(y.b3)}</td><td>{inr(y.total)}</td><td>{inr(y.real)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="disclaimer">
        This is a planning aid, not financial advice. Returns, inflation and tax rules change; check your plan with a SEBI-registered adviser before acting on it.
      </p>
    </div>
  );
}

function Stat({ label, value, note, dim }) {
  return (
    <div className={dim ? 'stat is-dim' : 'stat'}>
      <span className="stat__label">{label}</span>
      <strong className="stat__value">{value}</strong>
      {note && <span className="stat__note">{note}</span>}
    </div>
  );
}
