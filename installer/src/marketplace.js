// Deep-merge ~/.claude/settings.json to register the ijfw marketplace + enable plugin.
// Atomic write via .tmp + rename. Never deletes unrelated keys.

import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

export function claudeSettingsPath() {
  return join(homedir(), '.claude', 'settings.json');
}

export function tolerantJsonParse(raw, filepath) {
  try { return JSON.parse(raw); } catch { /* fall through */ }
  // JSONC recovery: strip // line comments, /* block */ comments, and
  // trailing commas before } or ]. Best-effort for VS Code / Cursor users.
  const stripped = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/,(\s*[}\]])/g, '$1');
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
  const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  if (settings.extraKnownMarketplaces?.ijfw) delete settings.extraKnownMarketplaces.ijfw;
  if (settings.enabledPlugins && 'ijfw-core@ijfw' in settings.enabledPlugins) {
    delete settings.enabledPlugins['ijfw-core@ijfw'];
  }
  const tmp = settingsPath + '.tmp';
  writeFileSync(tmp, JSON.stringify(settings, null, 2) + '\n');
  renameSync(tmp, settingsPath);
  return settings;
}
