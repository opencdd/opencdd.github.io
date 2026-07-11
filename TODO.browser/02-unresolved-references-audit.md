# 02 — Unresolved References Audit

## Current state (2026-07-11)

After the `_entities/` scan fix, total unresolved references:

| Category | Count | Action |
|----------|-------|--------|
| Cross-dictionary (exists in another loaded dict) | 130 | Will resolve when all dicts are loaded together |
| Truly missing (not in any dict) | 346 | Need scraping from IEC CDD |

### Truly missing breakdown

| Scheme | Count | Source dicts referencing them |
|--------|-------|-------------------------------|
| 0112/2///61987 | 308 | iec61987 (internal references not in _entities/) |
| 0112/2///61360_4 | 30 | iec61360 (cross-scheme refs to iec61360 base) |
| 0112/2///61360_7 | 2 | iec61360-7 |

The full list is at `src/content/data/unresolved-references.txt`.

### Scraping plan

1. Read `unresolved-references.txt` — 346 IRDIs that need scraping
2. For each IRDI, scrape from `cdd.iec.ch` using the entity detail page
3. Store in `downloads/<dict>/_entities/<CODE>/` (same layout as existing)
4. Rebuild: `rake browser:build_all`
5. Refresh: `npm run fetch-data`

### Verification

```bash
# After scraping + rebuilding
python3 -c "
import json, os
from collections import defaultdict
all_irdis = set()
for d in os.listdir('src/content/data'):
    dbpath = f'src/content/data/{d}/database.json'
    if not os.path.isfile(dbpath): continue
    with open(dbpath) as f:
        for n in json.load(f): all_irdis.add(n['irdi'])
unresolved = 0
for line in open('src/content/data/unresolved-references.txt'):
    if line.startswith('#') or not line.strip(): continue
    irdi = line.split('\t')[0].strip()
    if irdi not in all_irdis: unresolved += 1
print(f'Still missing: {unresolved}/346')
"
```
