# 02 — cdd-data Submodule and Codegen

## Goal

Embed `opencdd/cdd-models-ts` as a git submodule inside
`opencdd/cdd-data`, and update the Ruby `rake generate_ts` task so it
writes generated TS files directly into the submodule's working tree.

## Background

The Ruby gem has a `REGISTRY` of property IDs (`Cdd::PropertyIds`) and
meta-class IRDIs (`Cdd::MetaClasses`) that is the single source of
truth. Today `rake generate_ts` regenerates:

- `editor/src/models/PropertyIds.generated.ts`
- `editor/src/models/MetaClasses.generated.ts`

When the models move to `cdd-models-ts`, the codegen target must move
too. Per TODO.astro/00 decision 5, the approach is a **git submodule**:
`cdd-data/vendor/cdd-models-ts` (or similar path) points at the
`cdd-models-ts` repo, and the rake task writes into
`vendor/cdd-models-ts/src/PropertyIds.generated.ts`.

## Why submodule (not separate PR-per-codegen)

- Single atomic commit when the registry changes: gem code + generated
  TS in one cdd-data commit (submodule bump in the same commit).
- No round-trip PR workflow for routine codegen.
- Submodule pointer is the versioned source of truth; npm publish
  happens from the standalone `cdd-models-ts` checkout, not from
  inside cdd-data.

## Tasks

1. In `cdd-data`:
   - `git submodule add https://github.com/opencdd/cdd-models-ts.git
     vendor/cdd-models-ts`
   - Pin to the `v0.1.0` tag (or main, your call — tag is safer).
   - Commit `.gitmodules` + the submodule pointer.
2. Update `lib/cdd/tasks/codegen.rake` (or wherever `generate_ts`
   lives):
   - Change output paths from `editor/src/models/*.generated.ts` to
     `vendor/cdd-models-ts/src/*.generated.ts`.
   - Add a check that the submodule is initialized (`git submodule
     status` non-empty) before writing — fail loudly if not.
3. Update `rake generate_ts` flow:
   - Regenerate the files.
   - The change appears in the submodule's working tree.
   - Commit flow: from inside `vendor/cdd-models-ts`, commit + push
     the generated files; then in cdd-data root, `git add
     vendor/cdd-models-ts` to bump the pointer; commit the bump with
     the gem-side REGISTRY change in the same cdd-data commit.
4. Document the workflow in `cdd-data/CLAUDE.md` under a new
   "Codegen" section.
5. Add a CI check in cdd-data: `rake generate_ts` is idempotent (run,
   `git diff --exit-code` inside the submodule) so generated files
   never drift from the REGISTRY.

## Dependencies

- Blocks: 03 (cdd-data cleanup references the new path).
- Blocked by: 01 (the repo must exist before it can be submoduled).

## Acceptance criteria

- `git submodule update --init` from a fresh cdd-data clone yields the
  pinned cdd-models-ts checkout.
- `rake generate_ts` writes to the submodule; changes are visible in
  `git diff` inside `vendor/cdd-models-ts`.
- CI fails if generated TS is stale relative to the REGISTRY.
- Workflow documented in cdd-data CLAUDE.md.

## Open questions

- Whether to also publish a new `@opencdd/models` version automatically
  when codegen produces changes. Probably no — codegen changes are
  rare (registry additions) and a manual version bump + publish is
  fine.
