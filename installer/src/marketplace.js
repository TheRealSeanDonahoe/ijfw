// Deep-merge ~/.claude/settings.json to register the ijfw marketplace + enable plugin.
// Atomic write via .tmp + rename. Never deletes unrelated keys.

import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

export function claudeSettingsPath() {
  return join(homedir(), '.claude', 'settings.json');
}

// C3 (Phase-6 audit) — a naive `//` and `/* */` regex strip was corrupting
// JSON string values that legitimately contain those sequences (regex
// patterns, comment-style markers, URL fragments). Tokenize character-by-
// character so we ONLY strip comments outside string literals.
function stripJsoncComments(raw) {
  let out = '';
  let i = 0;
  const n = raw.length;
  while (i < n) {
    const c = raw[i];
    const c2 = raw[i + 1];
    // String literal — copy through verbatim including any escaped chars.
    if (c === '"') {
      out += c; i++;
      while (i < n) {
        const k = raw[i];
        out += k;
        if (k === '\\' && i + 1 < n) { out += raw[i + 1]; i += 2; continue; }
        i++;
        if (k === '"') break;
      }
      continue;
    }
    // Line comment.
    if (c === '/' && c2 === '/') {
      while (i < n && raw[i] !== '\n') i++;
      continue;
    }
    // Block comment.
    if (c === '/' && c2 === '*') {
      i += 2;
      while (i < n && !(raw[i] === '*' && raw[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    out += c; i++;
  }
  return out;
}

export function tolerantJsonParse(raw, filepath) {
  try { return JSON.parse(raw); } catch { /* fall through */ }
  // JSONC recovery: tokenizer-aware comment strip + trailing-comma fixup.
  // Strings are preserved verbatim so values containing //, /* */, or URL
  // fragments are not corrupted.
  const stripped = stripJsoncComments(raw).replace(/,(\s*[}\]])/g, '$1');
  try { return JSON.parse(stripped); }
  catch (e) {
    const err = new Error(`settings.json at ${filepath} is not valid JSON or recoverable JSONC: ${e.message}`);
    err.code = 'IJFW_SETTINGS_UNPARSEABLE';
    throw err;
  }
}

export function mergeMarketplace(settingsPath = claudeSettingsPath()) {
  let settings = {};
  if (existsSync(settingsPath)) {
    const raw = readFileSync(settingsPath, 'utf8');
    settings = tolerantJsonParse(raw, settingsPath);
  } else {
    mkdirSync(dirname(settingsPath), { recursive: true });
  }

  settings.extraKnownMarketplaces = settings.extraKnownMarketplaces || {};
  settings.extraKnownMarketplaces.ijfw = {
    source: { source: 'github', repo: 'TradeCanyon/ijfw' },
  };
  settings.enabledPlugins = settings.enabledPlugins || {};
  settings.enabledPlugins['ijfw-core@ijfw'] = true;

  const tmp = settingsPath + '.tmp';
  writeFileSync(tmp, JSON.stringify(settings, null, 2) + '\n');
  renameSync(tmp, settingsPath);
  return settings;
}

export function unmergeMarketplace(settingsPath = claudeSettingsPath()) {
  if (!existsSync(settingsPath)) return null;
  // Y1 — use tolerantJsonParse for symmetry with mergeMarketplace so uninstall
  // doesn't crash on JSONC-flavored settings.
  const settings = tolerantJsonParse(readFileSync(settingsPath, 'utf8'), settingsPath);
  if (settings.extraKnownMarketplaces?.ijfw) delete settings.extraKnownMarketplaces.ijfw;
  if (settings.enabledPlugins && 'ijfw-core@ijfw' in settings.enabledPlugins) {
    delete settings.enabledPlugins['ijfw-core@ijfw'];
  }
  const tmp = settingsPath + '.tmp';
  writeFileSync(tmp, JSON.stringify(settings, null, 2) + '\n');
  renameSync(tmp, settingsPath);
  return settings;
}
