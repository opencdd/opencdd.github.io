# 03 — Property Table UX

## Shipped (2026-07-11)

### Collapsable inherited properties
- Inherited properties now render inside a `<details>` element
- Collapsed by default — click summary to expand
- Summary shows count: "Inherited properties (47) — click to expand"

### Row height reduction
- Changed `py-2` → `py-1.5` on all `<td>` and `<th>` elements
- Changed `align-top` → `align-baseline` (prevents multi-line content from stretching)
- Added `max-w-md` + `line-clamp-2` on definition column (truncates long definitions to 2 lines)

### Code duplication removed
- EntityLink in the Name column now uses `hideCode` (code is already in column 1)
- Same for the Unit column — no redundant code prefix

### ENUM_BOOLEAN_TYPE support
- Added `ENUM_BOOLEAN_TYPE` to the data type regex (was only `ENUM_STRING_TYPE` and `ENUM_REFERENCE_TYPE`)
- `parseDataType` now correctly parses `ENUM_BOOLEAN_TYPE(0112/2///62683#ACI008)` into `{ kind: "enum", enumKind: "ENUM_BOOLEAN_TYPE", valueList: "0112/2///62683#ACI008" }`
- DataTypeChip renders the value list as a link

## Remaining work

### Unresolved data type references
Some properties have data types referencing value lists that aren't in the
dictionary (cross-dictionary references). These show as unresolved IRDIs
in the DataTypeChip. This is expected until cross-dictionary loading
is implemented (CDDP multi-package support).

### Property table column options
Future: allow the table to show/hide columns based on available data.
Some properties have no unit, no definition, etc. — the columns still
render with "—" placeholders.
