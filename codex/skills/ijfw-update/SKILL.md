---
name: ijfw-update
description: "Update IJFW to the latest version. Trigger: 'update ijfw', 'upgrade', 'latest version', /update"
---

## Execution

1. Check the current version:
   ```bash
   ijfw --version 2>/dev/null || cat ~/.ijfw/version 2>/dev/null || echo "unknown"
   ```

2. Fetch the latest available version:
   ```bash
   npm show @ijfw/install version 2>/dev/null
   ```

3. If already at latest, report and stop:
   > `IJFW is up to date (v<version>). Nothing to do.`

4. If an update is available, show what will change and confirm:
   ```
   UPDATE AVAILABLE
     Current: v<X>
     Latest:  v<Y>
     Changes: <one-line summary from CHANGELOG if available>
   ```
   > `Run update now? (y/n)`

5. On confirmation, run:
   ```bash
   npx @ijfw/install --upgrade
   ```
   Or if installed via clone:
   ```bash
   bash ~/.ijfw/scripts/install.sh --upgrade
   ```

6. After update completes, report:
   ```
   UPDATE COMPLETE
     IJFW v<Y> installed
     Platforms updated: <list>
     Restart your AI session to load the new skills.
   ```

7. Store result: `ijfw_memory_store: updated IJFW from v<X> to v<Y> on <date>`
