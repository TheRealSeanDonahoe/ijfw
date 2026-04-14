// --- Secret redactor (audit S5) ---
// Strips common credential patterns before any memory write. Conservative
// by design: pattern list is additive, never tries to classify "suspicious"
// strings. Better to miss a novel format than to corrupt legitimate prose.
//
// Wired into auto-memorize in Wave 3. Exported here so Wave 0 can land the
// library + tests ahead of the integration.

const PATTERNS = [
  { re: /sk-[A-Za-z0-9_-]{20,}/g,           label: 'openai'  },
  { re: /ghp_[A-Za-z0-9]{20,}/g,            label: 'github'  },
  { re: /github_pat_[A-Za-z0-9_]{20,}/g,    label: 'github'  },
  { re: /AKIA[0-9A-Z]{16}/g,                label: 'aws'     },
  { re: /Bearer\s+[A-Za-z0-9._~+/=-]{10,}/g, label: 'bearer' },
  { re: /xox[baprs]-[A-Za-z0-9-]{10,}/g,    label: 'slack'   },
];

const INLINE = [
  /(password\s*=\s*)\S+/gi,
  /(api[_-]?token\s*=\s*)\S+/gi,
  /(api[_-]?key\s*=\s*)\S+/gi,
  /(secret\s*=\s*)\S+/gi,
];

export function redactSecrets(s) {
  if (typeof s !== 'string' || !s) return '';
  let out = s;
  for (const { re, label } of PATTERNS) out = out.replace(re, `[REDACTED:${label}]`);
  for (const re of INLINE) out = out.replace(re, '$1[REDACTED]');
  return out;
}
