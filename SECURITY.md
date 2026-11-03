# Security

## Design
- **Static site + Supabase.** No server code of our own. The only outside service is Supabase (sign-in and notes); there are no analytics, ads or other third-party requests.
- **Private notes and highlights.** Row-level security in `supabase/migrations/` lets each signed-in student read, create, edit and delete only their own notes; signed-out visitors have no access. Triggers stop a note from being moved to another user, limit each account to 500 notes, and the table limits note length. `npm run test:notes` checks all of this against the local database.
- **Keys.** The app uses only Supabase's *publishable* key, which is public by design; what it can do is limited by the policies above. The *secret* (service-role) key is never used in the app. `.env.local` holds the values and is gitignored; `.gitignore` also blocks `.env*`, key/certificate and credential files.
- **Passwords** are handled by Supabase Auth (hashed, never stored by the app). Minimum 8 characters with letters and digits.
- **Content-Security-Policy** (added at build time in `vite.config.js`): only same-origin scripts, styles, images and fonts, and connections only to the site itself and the configured Supabase project; no plugins (`object-src 'none'`), no `<base>` changes and no form submissions. `'wasm-unsafe-eval'` and `blob:` workers are allowed only for the Draco mesh decoder.
- **No HTML injection.** Data from `structures.json` is written with `textContent`, never `innerHTML`. Source links must be `https://`, open in a new tab with `rel="noopener noreferrer"`, and the page sends no referrer.
- **Secret blocker.** `.githooks/pre-commit` refuses commits that contain key files or secret-like values. Enable it once per clone: `git config core.hooksPath .githooks`. (GitHub secret scanning is not available for private repos on the free plan; enable it under Settings → Code security if the repo is made public.)
- **Pinned dependencies.** Exact versions in `package.json` and a committed `package-lock.json`; Dependabot checks weekly. Run `npm audit` before releases.
- **Untrusted downloads.** The Z-Anatomy `.blend` is opened with Blender's `-Y` flag so its embedded Python never runs, and it is never committed.

## Reporting a problem
Open a private security advisory on this repository (Security → Advisories → Report a vulnerability) instead of a public issue.
