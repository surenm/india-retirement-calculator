import { NumField, TextField, Segmented, Toggle, Section } from './fields.jsx';
import { EXPENSE_ITEMS, LIFESTYLES, newChild, newRecurring, newIncome } from '../state/defaults.js';
import { inr } from '../calc/format.js';

export default function Inputs({ s, set, sum }) {
  const f = (field) => (v) => set({ [field]: v });

  const setItem = (listKey, i, patch) =>
    set({ [listKey]: s[listKey].map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const removeItem = (listKey, i) => set({ [listKey]: s[listKey].filter((_, j) => j !== i) });

  return (
    <div className="inputs">
      <Section title="About you" summary={`Retire at ${s.retAge}, plan to ${s.lifeExp}`} open>
        <div className="grid3">
          <NumField label="Your age" value={s.age} onChange={f('age')} unit="yrs" min={18} max={75} />
          <NumField label="Retire at" value={s.retAge} onChange={f('retAge')} unit="yrs" min={s.age + 1} max={80} />
          <NumField label="Plan until" value={s.lifeExp} onChange={f('lifeExp')} unit="yrs" min={s.retAge + 1} max={110} />
        </div>
        <Segmented
          label="Retirement lifestyle"
          value={s.lifestyle}
          onChange={f('lifestyle')}
          options={Object.entries(LIFESTYLES).map(([value, l]) => ({ value, label: l.label }))}
          hint={LIFESTYLES[s.lifestyle].hint}
        />
      </Section>

      <Section title="Income & savings" summary={`${inr(s.sip)}/mo SIP`}>
        <div className="grid2">
          <NumField label="Monthly take-home" value={s.income} onChange={f('income')} money step={1000} />
          <NumField label="Invested so far" value={s.corpus} onChange={f('corpus')} money step={10000} hint="Mutual funds, stocks, FDs. Not EPF/PPF/NPS." />
          <NumField label="Monthly SIP" value={s.sip} onChange={f('sip')} money step={1000} />
          <NumField label="SIP step-up each year" value={s.stepUp} onChange={f('stepUp')} unit="%" step={1} />
          <NumField label="Return until retirement" value={s.preRet} onChange={f('preRet')} unit="%" step={0.5} hint="After tax, on your corpus and SIPs" />
        </div>
      </Section>

      <Section title="Monthly expenses" summary={`${inr(sum.currentMonthly)} now, ${inr(sum.retireMonthlyToday)} in retirement`}>
        <p className="note">
          For each line, say what happens once you retire. Keep amounts in today's money; inflation is added later.
          Lean it towards higher spending rather than lower.
        </p>
        <div className="exp">
          {s.expenses.map((e, i) => {
            const item = EXPENSE_ITEMS[i];
            return (
              <div className="exp__row" key={item.id}>
                <NumField compact label={item.label} value={e.amt} onChange={(v) => setItem('expenses', i, { amt: v })} money step={500} />
                <Segmented
                  value={e.mode}
                  onChange={(v) => setItem('expenses', i, { mode: v, custom: v === 'custom' && !e.custom ? e.amt : e.custom })}
                  options={[
                    { value: 'same', label: 'Same' },
                    { value: 'gone', label: 'Gone' },
                    { value: 'custom', label: 'Change' },
                  ]}
                />
                {e.mode === 'custom' && (
                  <NumField compact label="In retirement" value={e.custom} onChange={(v) => setItem('expenses', i, { custom: v })} money step={500} hint={item.hint} />
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Health" summary={`Medical inflation ${s.medInf}%`}>
        <div className="grid3">
          <NumField label="Health insurance premium" value={s.healthPremium} onChange={f('healthPremium')} money unit="/yr" step={1000} />
          <NumField label="Out-of-pocket medical" value={s.medicalOOP} onChange={f('medicalOOP')} money unit="/yr" step={1000} />
          <NumField label="Medical inflation" value={s.medInf} onChange={f('medInf')} unit="%" step={0.5} hint="Usually well above general inflation" />
        </div>
      </Section>

      <Section title="Children" summary={s.children.length ? `${s.children.length} ${s.children.length === 1 ? 'child' : 'children'}` : 'None'}>
        <div className="stepper">
          <span>Number of children</span>
          <button type="button" aria-label="Remove a child" disabled={!s.children.length} onClick={() => set({ children: s.children.slice(0, -1) })}>−</button>
          <strong>{s.children.length}</strong>
          <button type="button" aria-label="Add a child" disabled={s.children.length >= 4} onClick={() => set({ children: [...s.children, newChild()] })}>+</button>
        </div>
        {s.children.map((c, i) => (
          <fieldset className="card" key={i}>
            <legend>Child {i + 1}</legend>
            <div className="grid3">
              <NumField compact label="Age now" value={c.age} onChange={(v) => setItem('children', i, { age: v })} unit="yrs" />
              <NumField compact label="Higher education cost" value={c.eduCost} onChange={(v) => setItem('children', i, { eduCost: v })} money step={50000} hint="Today's cost" />
              <NumField compact label="At age" value={c.eduAge} onChange={(v) => setItem('children', i, { eduAge: v })} unit="yrs" />
              <NumField compact label="Wedding cost" value={c.wedCost} onChange={(v) => setItem('children', i, { wedCost: v })} money step={50000} hint="Today's cost, 0 to skip" />
              <NumField compact label="At age" value={c.wedAge} onChange={(v) => setItem('children', i, { wedAge: v })} unit="yrs" />
            </div>
          </fieldset>
        ))}
        {s.children.length > 0 && (
          <>
            <div className="grid2">
              <NumField label="Education inflation" value={s.eduInf} onChange={f('eduInf')} unit="%" step={0.5} />
              <NumField label="Wedding inflation" value={s.wedInf} onChange={f('wedInf')} unit="%" step={0.5} />
            </div>
            <p className="note">Goals that fall before you retire are assumed to be paid from your salary, not the retirement corpus.</p>
          </>
        )}
      </Section>

      <Section title="Parents & emergencies" summary={`${inr(s.buffer)} buffer`}>
        <div className="grid3">
          <NumField label="Support to parents" value={s.parentMonthly} onChange={f('parentMonthly')} money unit="/mo" step={1000} />
          <NumField label="Their cost inflation" value={s.parentInf} onChange={f('parentInf')} unit="%" step={0.5} />
          <NumField label="For how many more years" value={s.parentYears} onChange={f('parentYears')} unit="yrs" />
        </div>
        <NumField label="Emergency buffer at retirement" value={s.buffer} onChange={f('buffer')} money step={100000} hint="Kept aside in savings, arbitrage or short-term debt funds; not used for regular spending" />
      </Section>

      <Section title="EPF, PPF & NPS" summary={sum.bridge ? `Unlocks from ${sum.bridge.until}` : 'Available at retirement'}>
        <p className="note">These are locked until their unlock age. If that's after you retire, you need a bridge corpus to cover the gap.</p>
        <fieldset className="card">
          <legend>EPF</legend>
          <div className="grid2">
            <NumField compact label="Balance" value={s.epfBal} onChange={f('epfBal')} money step={10000} />
            <NumField compact label="Monthly (you + employer)" value={s.epfMonthly} onChange={f('epfMonthly')} money step={500} />
            <NumField compact label="Interest" value={s.epfRate} onChange={f('epfRate')} unit="%" step={0.05} />
            <NumField compact label="Withdraw at" value={s.epfAge} onChange={f('epfAge')} unit="yrs" />
          </div>
        </fieldset>
        <fieldset className="card">
          <legend>PPF</legend>
          <div className="grid2">
            <NumField compact label="Balance" value={s.ppfBal} onChange={f('ppfBal')} money step={10000} />
            <NumField compact label="Yearly deposit" value={s.ppfYearly} onChange={f('ppfYearly')} money step={5000} hint="Max ₹1.5 L" />
            <NumField compact label="Interest" value={s.ppfRate} onChange={f('ppfRate')} unit="%" step={0.05} />
            <NumField compact label="Withdraw at" value={s.ppfAge} onChange={f('ppfAge')} unit="yrs" />
          </div>
        </fieldset>
        <fieldset className="card">
          <legend>NPS</legend>
          <div className="grid2">
            <NumField compact label="Balance" value={s.npsBal} onChange={f('npsBal')} money step={10000} />
            <NumField compact label="Monthly contribution" value={s.npsMonthly} onChange={f('npsMonthly')} money step={500} />
            <NumField compact label="Expected return" value={s.npsRate} onChange={f('npsRate')} unit="%" step={0.5} />
            <NumField compact label="Withdraw at" value={s.npsAge} onChange={f('npsAge')} unit="yrs" />
            <NumField compact label="Share used for annuity" value={s.npsAnnuityPct} onChange={f('npsAnnuityPct')} unit="%" />
            <NumField compact label="Annuity rate" value={s.annuityRate} onChange={f('annuityRate')} unit="%" step={0.25} />
          </div>
        </fieldset>
      </Section>

      <Section title="Big recurring costs" summary={`${s.recurring.length} ${s.recurring.length === 1 ? 'item' : 'items'}`}>
        <p className="note">Costs that come every few years, in today's money.</p>
        {s.recurring.map((r, i) => (
          <fieldset className="card" key={i}>
            <legend className="sr-only">{r.name}</legend>
            <div className="grid3">
              <TextField label="Name" value={r.name} onChange={(v) => setItem('recurring', i, { name: v })} />
              <NumField compact label="Cost" value={r.amt} onChange={(v) => setItem('recurring', i, { amt: v })} money step={10000} />
              <NumField compact label="Every" value={r.every} onChange={(v) => setItem('recurring', i, { every: Math.max(1, v) })} unit="yrs" min={1} />
              <NumField compact label="From age" value={r.from} onChange={(v) => setItem('recurring', i, { from: v })} unit="yrs" />
              <NumField compact label="Until age" value={r.to} onChange={(v) => setItem('recurring', i, { to: v })} unit="yrs" />
              <button type="button" className="btn-text" onClick={() => removeItem('recurring', i)}>Remove</button>
            </div>
          </fieldset>
        ))}
        <button type="button" className="btn-add" onClick={() => set({ recurring: [...s.recurring, newRecurring(s.retAge)] })}>Add a cost</button>
      </Section>

      <Section title="Income after retiring" summary={`${s.incomes.length} ${s.incomes.length === 1 ? 'source' : 'sources'}`}>
        <p className="note">Consulting, part-time work, rent, EPS pension. Amounts in today's money.</p>
        {s.incomes.map((r, i) => (
          <fieldset className="card" key={i}>
            <legend className="sr-only">{r.name}</legend>
            <div className="grid3">
              <TextField label="Name" value={r.name} onChange={(v) => setItem('incomes', i, { name: v })} />
              <NumField compact label="Monthly" value={r.monthly} onChange={(v) => setItem('incomes', i, { monthly: v })} money step={1000} />
              <NumField compact label="Grows by" value={r.growth} onChange={(v) => setItem('incomes', i, { growth: v })} unit="%/yr" step={0.5} />
              <NumField compact label="From age" value={r.from} onChange={(v) => setItem('incomes', i, { from: v })} unit="yrs" />
              <NumField compact label="Until age" value={r.to} onChange={(v) => setItem('incomes', i, { to: v })} unit="yrs" />
              <button type="button" className="btn-text" onClick={() => removeItem('incomes', i)}>Remove</button>
            </div>
          </fieldset>
        ))}
        <button type="button" className="btn-add" onClick={() => set({ incomes: [...s.incomes, newIncome(s.retAge)] })}>Add income</button>
      </Section>

      <Section title="Inflation & buckets" summary={`Inflation ${s.inflation}%`}>
        <NumField label="General inflation" value={s.inflation} onChange={f('inflation')} unit="%" step={0.5} hint="Retail inflation runs 4–6%; your own basket is often higher" />
        <p className="note">In retirement your money sits in three buckets. Bucket 1 pays your bills, bucket 2 refills it, bucket 3 grows and refills bucket 2 in good years.</p>
        <div className="buckets-in">
          <div className="buckets-in__head"><span /><span>Years held</span><span>Return</span><span>Lost to tax</span></div>
          {[
            ['Bucket 1: liquid', 'b1'],
            ['Bucket 2: debt & hybrid', 'b2'],
            ['Bucket 3: equity', 'b3'],
          ].map(([label, k]) => (
            <div className="buckets-in__row" key={k}>
              <span>{label}</span>
              {k !== 'b3' ? (
                <NumField compact label={`${label} years`} value={s[k + 'Years']} onChange={f(k + 'Years')} unit="yrs" />
              ) : (
                <span className="muted">The rest</span>
              )}
              <NumField compact label={`${label} return`} value={s[k + 'Ret']} onChange={f(k + 'Ret')} unit="%" step={0.5} />
              <NumField compact label={`${label} tax`} value={s[k + 'Tax']} onChange={f(k + 'Tax')} unit="%" step={1} />
            </div>
          ))}
        </div>
        <p className="note">"Lost to tax" is the share of each year's gains paid as tax. Equity long-term gains are taxed at 12.5% above ₹1.25 L a year; debt funds at your slab rate.</p>
      </Section>

      <Section title="Withdrawal strategy" summary={s.strategy === 'guardrails' ? 'Guardrails' : 'Fixed'}>
        <Segmented
          value={s.strategy}
          onChange={f('strategy')}
          options={[
            { value: 'fixed', label: 'Fixed, inflation-adjusted' },
            { value: 'guardrails', label: 'Guardrails' },
          ]}
          hint={
            s.strategy === 'guardrails'
              ? 'Spending is cut when markets fall hard and raised when they do well. Cuts stop in the last 15 years.'
              : 'You spend the same real amount every year.'
          }
        />
        {s.strategy === 'guardrails' ? (
          <div className="grid2">
            <NumField label="Guardrail band" value={s.guardBand} onChange={f('guardBand')} unit="%" hint="How far your withdrawal rate can drift before you adjust" />
            <NumField label="Adjust spending by" value={s.guardAdj} onChange={f('guardAdj')} unit="%" />
          </div>
        ) : (
          <NumField label="Cut spending after a bad year" value={s.downturnCut} onChange={f('downturnCut')} unit="%" hint="0 means you never cut back" />
        )}
      </Section>

      <Section title="Market simulation" summary={s.mcOn ? `${s.mcRuns.toLocaleString('en-IN')} runs` : 'Off'}>
        <Toggle label="Test the plan against random market returns" checked={s.mcOn} onChange={f('mcOn')} />
        {s.mcOn && (
          <>
            <div className="grid2">
              <NumField label="Number of runs" value={s.mcRuns} onChange={f('mcRuns')} step={500} min={200} max={10000} />
              <NumField label="Equity volatility" value={s.eqVol} onChange={f('eqVol')} unit="%" step={1} hint="Yearly ups and downs; Indian equity is roughly 16–20%" />
            </div>
            <Segmented
              label="Plan for"
              value={s.confidence}
              onChange={f('confidence')}
              options={[
                { value: 0, label: 'Average' },
                { value: 0.75, label: '75%' },
                { value: 0.85, label: '85%' },
                { value: 0.9, label: '90%' },
              ]}
              hint={s.confidence ? `Target is set so the money lasts in ${s.confidence * 100}% of simulated markets.` : 'Target assumes average returns every year.'}
            />
            <Segmented
              label="Simulate with"
              value={s.simBase}
              onChange={f('simBase')}
              options={[
                { value: 'projected', label: 'What I will have' },
                { value: 'target', label: 'The target' },
              ]}
            />
          </>
        )}
      </Section>
    </div>
  );
}
