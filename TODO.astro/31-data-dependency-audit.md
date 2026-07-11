# 31 — Data Dependency Audit + Scrape Fix Plan

## The problem

Three dictionaries have incomplete scrapes — CLASS .xls files
contain data but PROPERTY/VALUELIST/VALUETERMS .xls files are
empty stubs (headers only, 0 data rows):

| Dictionary | Classes | Properties | Value Lists | Value Terms | Unresolved refs |
|------------|---------|------------|-------------|-------------|-----------------|
| iec61360 | 574 | **0** | **0** | **0** | 2,871 |
| iec63213 | 26 | **0** | **0** | **0** | 123 |
| iec61360-7 | 52 | **0** | **0** | **0** | 224 |

The other three dictionaries have complete scrapes:

| Dictionary | Classes | Properties | Value Lists | Value Terms | Unresolved refs |
|------------|---------|------------|-------------|-------------|-----------------|
| iec62683 | 374 | 760 | 139 | 582 | 86 |
| iec61987 | 2,696 | 5,533 | 574 | 3,028 | 1,111 |
| iec63508 | 23 | 33 | 9 | 86 | 69 |

The unresolved refs in the "complete" dictionaries are cross-
dictionary references (properties from other IEC standards).

## Root cause

The cdd.iec.ch export flow has multiple steps:
1. Click export → server returns a preview (headers only)
2. Wait for completion → server prepares the full export
3. Download → the actual data

The scraper for iec61360/iec63213/iec61360-7 captured the preview
(step 1) instead of the completed export (step 3). Evidence:
- File sizes: ~19KB for empty stubs vs ~35KB+ for populated files
- Row counts: 0 data rows in PROPERTY/VALUELIST/VALUETERMS files
- The scrape dates (Jun 22) predate the working scrape code (Jun 24)

## Verification

```bash
cd ~/src/opencdd/cdd-data
bundle exec rake data:verify_scrape[iec63213]
# Output: [FAIL] iec63213: 26/XX files have data (PROPERTY files empty)
```

## Fix

### Option A: Re-run the scraper (recommended)

```bash
cd ~/src/opencdd/cdd-data
# Re-run the scraper for the affected dictionaries
python harvest/download.py --dictionary iec61360 --include property,value_list,value_term
python harvest/download.py --dictionary iec63213 --include property,value_list,value_term
python harvest/download.py --dictionary iec61360-7 --include property,value_list,value_term

# Verify
bundle exec rake data:verify_scrape[iec61360]
bundle exec rake data:verify_scrape[iec63213]
bundle exec rake data:verify_scrape[iec61360-7]

# Rebuild
bundle exec rake browser:build_all

# Refresh browser
cd ../opencdd.github.io
npm run fetch-data
```

### Option B: Fix the scraper code

If the scraper code itself is broken (not just an old run), fix
`harvest/download.py` to properly wait for export completion before
downloading. The fix involves:
1. After triggering an export, poll the server until the export
   is marked complete
2. Download the completed export, not the preview

## Impact

After the fix, the "entities not in browser data" warnings will
disappear for iec61360/iec63213/iec61360-7. All property references
(like KEA336-KEA338 for KEA011) will resolve to full property records.

The cross-dictionary references (ACE808 from iec62683, ACC066 from
iec62683) will remain unresolved unless those dictionaries are also
loaded. This is expected — cross-dictionary references require
loading multiple CDDP packages.
