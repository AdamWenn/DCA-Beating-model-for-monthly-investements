# API_Usage2_0 – Deploying web_3 to GitHub Pages

This repository contains multiple demos. The `web_3` folder is a Vite + React app that renders the immersive NASDAQ evidence page. The project is configured to publish as a static site via GitHub Pages using a GitHub Actions workflow.

## Local Dev (web_3)

- Install deps: `npm install` (run inside `web_3`)
- Start dev server: `npm run dev` (inside `web_3`)
- Build: `npm run build` (outputs to `web_3/dist`)
- Preview the production build: `npm run preview`

Key files:
- `web_3/vite.config.ts` – uses `base: './'` to make assets work under a project Pages path
- `web_3/components/ImmersiveAurora.tsx` – fetches CSV via a relative path: `signals_with_equity.csv`
- `web_3/public/signals_with_equity.csv` – included in the build and served by Pages

## GitHub Pages Deployment

This repo already includes a workflow that builds `web_3` and deploys the `dist` folder to Pages.

- Workflow: `.github/workflows/deploy.yml`
  - Installs and builds from `web_3`
  - Uploads `web_3/dist` as the Pages artifact
  - Deploys to the `github-pages` environment

Steps to publish:
1. In your GitHub repository, go to Settings → Pages and set Source to “GitHub Actions”.
2. Commit and push changes to your default branch (`main` or `master`).
3. Open the Actions tab to watch the workflow. On success, Pages will expose the site URL.

Expected URL patterns:
- User/org site: `https://<user>.github.io/` (if this repo is named `<user>.github.io`)
- Project site: `https://<user>.github.io/<REPO_NAME>/` (most common). The `base: './'` and relative CSV path ensure assets resolve here.

## Notes & Limitations
- Static hosting only (no server-side code or secrets). All data loads via static assets.
- SPA routing: if you add routes, consider adding a `404.html` that mirrors `index.html` for client-side routing.
- Rate/size limits: Pages is intended for static content (roughly 1 GB site size, standard bandwidth limits). GitHub Actions minutes/storage apply for private repos.

## Troubleshooting
- Blank page or 404 on Pages: verify the workflow ran and Pages is enabled for “GitHub Actions”.
- Assets 404 under `/REPO_NAME/`: ensure Vite `base: './'` (see `web_3/vite.config.ts`) and fetch paths are relative (`signals_with_equity.csv`).
- Local file:// preview doesn’t load CSV: use `npm run preview` so relative paths serve correctly.

---
If you want the site to publish from a `docs/` folder instead, we can redirect the build output there and update Pages settings accordingly.
