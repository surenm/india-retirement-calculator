import { DEFAULTS } from './defaults.js';
import { decodeState, encodeState, hasStateParams, sanitize } from './url.js';

const STORAGE_KEY = 'retire-calc-v1';

// A shared link wins, then saved choices, then defaults.
export function loadInitialState() {
  try {
    if (typeof window !== 'undefined' && hasStateParams(window.location.search)) {
      return decodeState(window.location.search);
    }
  } catch (e) { /* fall through */ }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return sanitize(JSON.parse(raw));
  } catch (e) { /* storage unavailable or corrupt */ }
  return sanitize(DEFAULTS);
}

export function persistState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) { /* ignore */ }
  try {
    const qs = encodeState(state);
    const url = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
    window.history.replaceState(null, '', url);
  } catch (e) { /* sandboxed frames may block this */ }
}

export function clearSaved() {
  try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
}

export function shareUrl(state) {
  const qs = encodeState(state);
  const base = window.location.origin + window.location.pathname;
  return base + (qs ? '?' + qs : '');
}
