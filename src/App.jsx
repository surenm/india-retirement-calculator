import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Inputs from './components/Inputs.jsx';
import Results from './components/Results.jsx';
import { summarise, confidentCorpus } from './calc/engine.js';
import { simulate, constantReturns, crashReturns, monteCarlo } from './calc/simulate.js';
import { inr } from './calc/format.js';
import { DEFAULTS } from './state/defaults.js';
import { sanitize } from './state/url.js';
import { loadInitialState, persistState, clearSaved, shareUrl } from './state/storage.js';

export default function App() {
  const [s, setS] = useState(loadInitialState);
  const [view, setView] = useState('inputs'); // mobile only
  const [toast, setToast] = useState(null);
  const [linkBox, setLinkBox] = useState(null);
  const [heavy, setHeavy] = useState({ key: null, mc: null, confident: null });

  const set = useCallback((patch) => setS((prev) => sanitize({ ...prev, ...patch })), []);

  // Save choices and keep the URL in sync.
  useEffect(() => {
    const t = setTimeout(() => persistState(s), 250);
    return () => clearTimeout(t);
  }, [s]);

  const sum = useMemo(() => summarise(s), [s]);
  const stateKey = useMemo(() => JSON.stringify(s), [s]);

  // Monte Carlo and the confidence target are slower, so run them after typing pauses.
  useEffect(() => {
    if (!s.mcOn) return;
    const t = setTimeout(() => {
      const rows = sum.target.rows;
      const confident = s.confidence > 0 ? confidentCorpus(s, rows, sum.target.needed, s.confidence) : null;
      const need = confident ?? sum.target.needed;
      const start = s.simBase === 'projected' ? sum.proj.total : need;
      const mc = monteCarlo(s, rows, start);
      setHeavy({ key: stateKey, mc, confident });
    }, 300);
    return () => clearTimeout(t);
  }, [stateKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const fresh = heavy.key === stateKey;
  const confident = s.mcOn && s.confidence > 0 ? heavy.confident : null;
  const need = confident ?? sum.target.needed;
  const sipNeededShown = Math.max(0, (need - sum.proj.corpusFV - sum.proj.unlockedAtRet) / Math.max(sum.proj.perRupeeSip, 1e-9));
  const shown = { ...sum, sipNeededShown };

  const start = s.simBase === 'projected' ? sum.proj.total : need;
  const rows = sum.target.rows;
  const det = useMemo(() => simulate(s, rows, start, constantReturns(s)), [s, rows, start]);
  const early = useMemo(() => simulate(s, rows, start, crashReturns(s, 'early')), [s, rows, start]);
  const late = useMemo(() => simulate(s, rows, start, crashReturns(s, 'late')), [s, rows, start]);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const copyLink = async () => {
    const url = shareUrl(s);
    try {
      await navigator.clipboard.writeText(url);
      flash('Link copied');
    } catch (e) {
      setLinkBox(url);
    }
  };

  const reset = () => {
    clearSaved();
    setS(sanitize(DEFAULTS));
    flash('Reset to defaults');
  };

  const onTrack = sum.proj.total >= need;
  const resultsRef = useRef(null);

  return (
    <div className="app" data-view={view}>
      <header className="top">
        <div className="top__title">
          <h1>Retirement corpus calculator</h1>
          <p>For India: real inflation, children, parents, EPF/NPS and a three-bucket plan.</p>
        </div>
        <div className="top__actions">
          <button type="button" className="btn" onClick={copyLink}>Copy share link</button>
          <button type="button" className="btn btn--quiet" onClick={reset}>Reset</button>
        </div>
      </header>

      {linkBox && (
        <div className="linkbox" role="dialog" aria-label="Share link">
          <p>Copy this link to share your plan:</p>
          <input readOnly value={linkBox} onFocus={(e) => e.target.select()} autoFocus />
          <button type="button" className="btn btn--quiet" onClick={() => setLinkBox(null)}>Done</button>
        </div>
      )}

      <main className="layout">
        <div className="col col--inputs">
          <Inputs s={s} set={set} sum={sum} />
        </div>
        <div className="col col--results" ref={resultsRef}>
          <Results s={s} sum={shown} need={need} det={det} early={early} late={late} mc={s.mcOn ? heavy.mc : null} busy={s.mcOn && !fresh} />
        </div>
      </main>

      <nav className="bar" aria-label="Summary">
        <div className="bar__sum">
          <span className="bar__need">Need {inr(need)}</span>
          <span className={onTrack ? 'bar__status is-ok' : 'bar__status is-short'}>
            {onTrack ? 'On track' : `Short ${inr(need - sum.proj.total)}`}
          </span>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setView((v) => (v === 'inputs' ? 'results' : 'inputs'));
            window.scrollTo({ top: 0 });
          }}
        >
          {view === 'inputs' ? 'See results' : 'Edit inputs'}
        </button>
      </nav>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
