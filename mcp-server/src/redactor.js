// --- Secret redactor (audit S5) ---
// Strips common credential patterns before any memory write. Conservative
// by design: pattern list is additive, never tries to classify "suspicious"
// strings. Better to miss a novel format than to corrupt legitimate prose.
//
// Wired into auto-memorize in Wave 3. Exported here so Wave 0 can land the
// library + tests ahead of the integration.

const PATTERNS = [
  // Anthropic — must come BEFORE the generic OpenAI rule so `sk-ant-...`
  // gets labeled correctly rather than captured as openai.
  { re: /sk-ant-[A-Za-z0-9_-]{20,}/g,              label: 'anthropic' },
  // OpenAI — `sk-proj-...` or `sk-...` with strong minimum length to avoid
  // eating prose references like "sk-learn" (scikit-learn).
  { re: /sk-(?:proj-)?[A-Za-z0-9_-]{32,}/g,       label: 'openai'    },
  // GitHub classic + fine-grained PATs.
  { re: /ghp_[A-Za-z0-9]{20,}/g,                   label: 'github'    },
  { re: /github_pat_[A-Za-z0-9_]{20,}/g,           label: 'github'    },
  // AWS access key ID.
  { re: /AKIA[0-9A-Z]{16}/g,                       label: 'aws'       },
  // Authorization: Bearer <token>.
  { re: /Bearer\s+[A-Za-z0-9._~+/=-]{10,}/g,       label: 'bearer'    },
  // Slack bot / user / legacy tokens.
  { re: /xox[baprs]-[A-Za-z0-9-]{10,}/g,           label: 'slack'     },
  // Stripe live + test secret keys.
  { re: /sk_live_[A-Za-z0-9]{24,}/g,               label: 'stripe'    },
  { re: /sk_test_[A-Za-z0-9]{24,}/g,               label: 'stripe'    },
  // npm access tokens.
  { re: /npm_[A-Za-z0-9]{36}/g,                    label: 'npm'       },
  // HuggingFace user tokens.
  { re: /hf_[A-Za-z0-9]{34,}/g,                    label: 'huggingface' },
  // Azure Storage connection-string AccountKey (base64, 88 chars with padding).
  { re: /AccountKey=[A-Za-z0-9+/]{86,88}={0,2}/g,  label: 'azure'     },
  // GCP service-account private key PEM block.
  { re: /-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA )?PRIVATE KEY-----/g, label: 'gcp' },
];

const INLINE = [
  /(password\s*=\s*)\S+/gi,
  /(api[_-]?token\s*=\s*)\S+/gi,
  /(api[_-]?key\s*=\s*)\S+/gi,
  /(secret\s*=\s*)\S+/gi,
  /(client[_-]?secret\s*=\s*)\S+/gi,
  // JSON-style "clientSecret": "value" and similar.
  /("(?:client_?secret|api_?key|password|access_?token)"\s*:\s*")[^"]+(")/gi,
];

export function redactSecrets(s) {
  if (typeof s !== 'string' || !s) return '';
  let out = s;
  for (const { re, label } of PATTERNS) out = out.replace(re, `[REDACTED:${label}]`);
  for (const re of INLINE) {
    if (re.source.startsWith('("')) {
      // JSON pattern: keep the opening and closing quotes/keys, redact value.
      out = out.replace(re, '$1[REDACTED]$2');
    } else {
      out = out.replace(re, '$1[REDACTED]');
    }
  }
  return out;
}
