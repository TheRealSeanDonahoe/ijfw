# Publish checklist -- @ijfw/install

Self-contained. Run every gate top to bottom before `npm publish`.
P10-era additions are marked `[P10]`.

---

## Gate 1 -- CI / health

```bash
# [P10] Run full check suite; expect exit 0
bash scripts/check-all.sh

# [P10] MCP server unit tests; expect 83/83 (or current passing count)
cd mcp-server && npm test
```

---

## Gate 2 -- Binary + package integrity

```bash
# [P10] Verify bin/ijfw is executable
test -x bin/ijfw && echo "OK" || echo "FAIL -- chmod +x bin/ijfw"

# [P10] Verify package.json files array includes what should ship
#       Expect: fixtures/, bin/, dist/, README.md, CHANGELOG.md
#       Must NOT include: .env, node_modules/, .planning/, *.test.*
cat installer/package.json | jq .files

# [P10] Verify fixtures/ dir is present (required by package.json files array)
ls fixtures/
```

---

## Gate 3 -- Dry-run publish

```bash
# [P10] Dry-run from installer/ -- review tarball contents before real publish
cd installer && npm publish --access public --dry-run
```

Expected: tarball lists only dist/, bin/, fixtures/, package.json, README, CHANGELOG.
Red flag: .planning/, .env, test files, node_modules in tarball.

---

## Gate 4 -- npm auth + org

```bash
# [P10] Confirm logged in as correct publisher
npm whoami
# Expected output: seandonahoe

# [P10] Confirm @ijfw org exists and you are a member
npm org ls ijfw
```

---

## Gate 5 -- Audit closure

```bash
# [P10] Principle audit: zero unresolved HIGH items
grep "HIGH" .planning/phase10/CROSS-AUDIT-PRINCIPLES.md
# Expected: no output (or only resolved/closed lines)

# [P10] Dogfood receipts archived
ls .planning/phase10/DOGFOOD-CRITIQUE-P10.md
```

---

## Publish day procedure

Run these in order after all gates above pass.

```bash
# 1. Log in (web flow handles 2FA)
npm login
npm whoami                        # confirm: seandonahoe

# 2. Build dist/ (gitignored; must be fresh)
cd /Users/seandonahoe/dev/ijfw/installer
npm run build

# 3. Final dry-run (last sanity check on tarball)
npm publish --access public --dry-run

# 4. Real publish
npm publish --access public

# 5. Verify on registry
npm view @ijfw/install version
npm view @ijfw/install dist-tags

# 6. Tag release in git
git tag v$(node -p "require('./package.json').version")
git push origin --tags

# 7. Announce
#    - GitHub release notes from CHANGELOG.md latest section
#    - Community post / social if applicable
```

---

## Common errors

| Error | Meaning | Fix |
|-------|---------|-----|
| `402 Payment Required` | Scoped package defaulting to private | Add `--access public` |
| `403 Forbidden` | Not org member or wrong 2FA OTP | Re-enter 2FA, verify org membership |
| `409 Conflict` | Version already published | Bump version; npm versions are immutable |
| `E404` on `npm view` | Package not published yet | Expected before first publish |
| `ENEEDAUTH` | Not logged in | `npm login` |
| `captcha failed` | Flaky network | Retry on stable connection |

---

## Pre-P10 notes (archived)

Phase 4 Wave 1 context: rc.1 publish flow, 0.4.0-rc.1, dist/ rebuild note.
Superseded by Gate 3 dry-run procedure above. Kept here for history only.
