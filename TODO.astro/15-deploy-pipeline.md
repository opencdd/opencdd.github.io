# 15 — Deploy Pipeline

## Goal

Establish the GitHub Actions workflow that builds the Astro browser
and deploys to GitHub Pages at `https://opencdd.github.io/`. Includes
the cross-repo data fetch (latest cdd-data release) and Pagefind
indexing.

## Background

The existing `cdd-data/.github/workflows/deploy-editor.yml` is the
template — `actions/upload-pages-artifact` + `actions/deploy-pages`
with `permissions: pages: write, id-token: write`. This workflow
mirrors that pattern for the Astro browser.

Key differences from the editor deploy:

- The browser consumes **data** from another private repo's public
  Release artifact. The fetch must work without privileged access.
- The build runs **Pagefind** after `astro build` to produce the
  search index.
- The Pages Source for `opencdd.github.io` must be set to "GitHub
  Actions" (manual setting in repo settings — outside CI).

## Tasks

1. **`.github/workflows/deploy.yml`** in `opencdd/opencdd.github.io`:
   ```yaml
   name: Deploy
   on:
     push:
       branches: [main]
     workflow_dispatch:
     schedule:
       - cron: "0 6 * * *"   # nightly rebuild to pick up data updates
     repository_dispatch:
       types: [cdd-data-released]   # cross-repo trigger from cdd-data

   permissions:
     contents: read
     pages: write
     id-token: write

   concurrency:
     group: pages
     cancel-in-progress: true

   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 20
             cache: npm
         - run: npm ci
         - name: Fetch latest data release
           run: npm run fetch-data
         - name: Type check
           run: npm run typecheck
         - name: Lint
           run: npm run lint
         - name: Test
           run: npm test
         - name: Build
           run: npm run build   # astro build && pagefind
         - uses: actions/upload-pages-artifact@v3
           with:
             path: dist

     deploy:
       needs: build
       runs-on: ubuntu-latest
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       steps:
         - id: deployment
           uses: actions/deploy-pages@v4
   ```

2. **`npm run fetch-data` script** (TODO.astro/07):
   - Queries `GET /repos/opencdd/cdd-data/releases/latest`.
   - Downloads the zip asset.
   - Verifies SHA256.
   - Unzips to `src/content/data/`.
   - Caches via `actions/cache` keyed on the release tag.

3. **`npm run build`** (TODO.astro/05 + 11):
   - `astro build && pagefind`.
   - Output: `dist/` with HTML + Pagefind index.

4. **GitHub Pages settings (manual, outside CI):**
   - Repo Settings → Pages → Source: **GitHub Actions**.
   - Custom domain (none — using the default
     `https://opencdd.github.io/`).

5. **`base` config:**
   - `astro.config.mjs`: `site: "https://opencdd.github.io"`,
     `base: "/"`.

6. **Cross-repo trigger from cdd-data (TODO.astro/04 companion):**
   - When cdd-data publishes a release, it sends
     `repository_dispatch` with event type `cdd-data-released` to
     `opencdd/opencdd.github.io`.
   - Requires a PAT or the default `GITHUB_TOKEN` with dispatch
     permission to the browser repo. Document in cdd-data CLAUDE.md.

7. **Manual redeploy:**
   - `workflow_dispatch` trigger lets you run the deploy on demand.

8. **Failure handling:**
   - Build failure → GitHub Actions shows red ✗; Pages retains the
     last successful deploy (no broken update).
   - Deploy failure → same.
   - Notification: configure GitHub Actions to email / Slack on
     failure (out of scope for this TODO — user configures).

## Dependencies

- Blocks: nothing (deploy is terminal).
- Blocked by: 04 (data release exists), 05–14 (browser builds), 11
  (Pagefind step in build).

## Acceptance criteria

- Push to `main` triggers the workflow.
- Workflow fetches the latest cdd-data release successfully.
- Build + Pagefind complete without errors.
- Deploy succeeds; `https://opencdd.github.io/` shows the new build.
- Nightly schedule fires and redeploys.
- Cross-repo `repository_dispatch` from cdd-data triggers the
  workflow.
- A failed build does not affect the live site.
- Workflow completes in under 10 minutes for the current 14k pages.

## Open questions

- Whether to deploy on every push to `main` or only on tags. Every
  push is simpler and matches the editor's pattern. Recommend every
  push.
- Whether to add a staging environment (e.g., deploy preview on PRs
  via Pages preview or a separate repo). Useful but not blocking —
  defer until PR traffic justifies it.
- Whether to add Lighthouse CI to the workflow for perf budgets.
  Recommend yes once the site is live; add as a follow-up.
- Concurrency: `cancel-in-progress: true` cancels superseded runs.
  Confirm this is desired (it is — avoids stacking deploys).
