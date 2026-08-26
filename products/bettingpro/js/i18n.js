/**
 * Lightweight i18n for the help-modal ("tooltip") content.
 *
 * Help bodies are authored as a single HTML string: English first, then a
 * uniform `<strong>Suomeksi:</strong>` marker, then the Finnish translation.
 * This module splits that at render time and tracks the visitor's language
 * choice (persisted in localStorage, default Finnish).
 */

import { TRANSLATIONS, COUNTRY_SUFFIX } from './translations.js?v=1787729102';

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
 * Translate a UI string key for the current language. Falls back to English,
 * then to the key itself. Supports `{var}` interpolation via `vars`.
 */
export function t(key, vars) {
  const entry = TRANSLATIONS[key];
  let str = entry ? (entry[getLang()] ?? entry.en) : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}

/**
 * Translate any element carrying `data-i18n` (sets textContent) and
 * `data-i18n-attr="attr:key,attr:key"` (sets attributes) within `root`.
 * Idempotent — safe to call on every language change.
 */
export function applyStaticTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.getAttribute('data-i18n-attr').split(',').forEach((pair) => {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });
}

/** Translate a league display name's trailing "(Country)" suffix. */
export function translateCountrySuffix(name) {
  return name.replace(/\(([^)]+)\)/g, (m, inner) => {
    const fi = COUNTRY_SUFFIX[inner.trim()];
    return fi && getLang() === 'fi' ? `(${fi})` : m;
  });
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
