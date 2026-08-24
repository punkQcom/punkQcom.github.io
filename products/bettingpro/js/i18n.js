/**
 * Lightweight i18n for the help-modal ("tooltip") content.
 *
 * Help bodies are authored as a single HTML string: English first, then a
 * uniform `<strong>Suomeksi:</strong>` marker, then the Finnish translation.
 * This module splits that at render time and tracks the visitor's language
 * choice (persisted in localStorage, default Finnish).
 */

export const LANGS = ['fi', 'en'];
export const DEFAULT_LANG = 'fi';

const STORAGE_KEY = 'bp-lang';
const FI_MARKER = '<strong>Suomeksi:</strong>';

let listeners = [];

/** localStorage may be absent (node tests, privacy modes) — access defensively. */
function storage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

/** Current language: a valid stored choice, else the default (fi). */
export function getLang() {
  const v = storage()?.getItem(STORAGE_KEY);
  return LANGS.includes(v) ? v : DEFAULT_LANG;
}

/** Set + persist the language and notify listeners. No-op for unsupported codes. */
export function setLang(lang) {
  if (!LANGS.includes(lang)) return;
  storage()?.setItem(STORAGE_KEY, lang);
  listeners.forEach((cb) => cb(lang));
}

/** Subscribe to language changes. Returns an unsubscribe function. */
export function onLangChange(cb) {
  listeners.push(cb);
  return () => { listeners = listeners.filter((x) => x !== cb); };
}

/**
 * Split a help body into { en, fi } on the Suomeksi marker, stripping the
 * `<hr>` / `<p>` wrapper around it. If no marker is present, both halves are
 * the full body (graceful fallback).
 */
export function splitHelpBody(body) {
  const i = body.indexOf(FI_MARKER);
  if (i === -1) {
    const trimmed = body.trim();
    return { en: trimmed, fi: trimmed };
  }
  const en = body.slice(0, i).replace(/<hr\s*\/?>\s*(?:<p>\s*)?$/i, '').trim();
  const fi = body.slice(i + FI_MARKER.length).replace(/^\s*<\/p>/i, '').trim();
  return { en, fi };
}

/**
 * Resolve a help entry for a language into { title, body }.
 * Falls back to the English title when a Finnish title is missing.
 */
export function pickHelp(entry, lang) {
  const { en, fi } = splitHelpBody(entry.body);
  const isFi = lang === 'fi';
  return {
    title: (isFi ? entry.titleFi : entry.title) || entry.title,
    body: isFi ? fi : en,
  };
}
