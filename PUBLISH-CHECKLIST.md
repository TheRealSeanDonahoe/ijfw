# Publish checklist — `@ijfw/install`

Self-contained. Pick this up any time. Current state: **Wave 1 merged to main, build verified, awaiting publish.**

## Current state (2026-04-14)

- Version in `installer/package.json`: **0.4.0-rc.1**
- `dist/install.js` + `dist/uninstall.js`: rebuild from `npm run build` before publish (dist/ is gitignored by design)
- `npm pack --dry-run` → 4.2 KB, 4 files
- Scope check: `npm view @ijfw/install` → 404 at last check → scope is **open**
- npm auth on this machine: **not logged in** (blocker)

## Prerequisites (one-time setup)

1. **npm account.** https://www.npmjs.com/signup — username, email, password, verify email.
2. **Enable 2FA.** Profile → Account Settings → Two-Factor Authentication → "Authorization and publishing" (safest). Scan QR with authenticator app. **Save recovery codes in a password manager.**
3. **Create `ijfw` organization.** Profile → Add Organization → name `ijfw`, plan **Free**. This gives you the `@ijfw` scope.

If `ijfw` org name is taken, fall back to one of: `@tradecanyon/ijfw`, `@donahoe/ijfw`, `@ijfw-ai/install`. Tell me which and I bump `installer/package.json` + README references.

## Publish (rc.1)

```bash
cd /Users/seandonahoe/dev/ijfw/installer

npm login                                   # web or CLI 2FA flow
npm whoami                                  # sanity check

npm run build                               # regenerates dist/ (~4.2KB)
npm pack --dry-run                          # confirm 4 files, ~4.2KB

npm publish --access public --tag next      # <-- the publish
                                            # `--access public` is required
                                            # for scoped free-plan packages
                                            # `--tag next` keeps default
                                            # npx users from pulling the RC
```

You'll be prompted for a 6-digit 2FA code during publish.

## Verify

```bash
npm view @ijfw/install versions     # expect: [ '0.4.0-rc.1' ]
npm view @ijfw/install dist-tags    # expect: { next: '0.4.0-rc.1' }

# Test install (optional)
npx @ijfw/install@next --help       # should print the installer help
```

Browser: https://www.npmjs.com/package/@ijfw/install

## Promote to latest (after 24h soak)

```bash
cd /Users/seandonahoe/dev/ijfw/installer

# Edit package.json: "version": "0.4.0"  (drop -rc.1)
npm run build
npm publish --access public                 # default tag = 'latest'

npm dist-tag rm @ijfw/install next          # optional: clean up rc tag
```

Verify default install works:

```bash
npx @ijfw/install --help
```

## Common errors

| Error | Meaning | Fix |
|-------|---------|-----|
| `402 Payment Required` | Scoped package defaulting to private | Add `--access public` |
| `403 Forbidden` | Not a member of the `ijfw` org, or 2FA OTP wrong | Re-enter 2FA, verify org membership |
| `409 Conflict` | Version already published | Bump version; npm versions are immutable |
| `E404` on `npm view` | Package not found (also what we want before first publish) | — |
| `ENEEDAUTH` | Not logged in | `npm login` |
| `captcha failed` | Flaky network | Try later on a stable connection |

## When this lands

Reply **"rc published"** to resume Wave 2 (intent router, `/mode brutal`, lazy prelude, output trimmer, prompt rewrite — the "brainstorm auto-fires" feature).

After 24h + no reported issues, reply **"publish latest"** to promote 0.4.0 + close Phase 4 Wave 1.
