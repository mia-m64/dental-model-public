# Dental Anatomy 3D

Interactive 3D model of the mouth, jaws, nerves, vessels and muscles for dental assistants. Desktop browsers only.

**Live site:** https://mia-m64.github.io/dental-model-public/ Click any structure to read a short definition, practical notes for the dental assistant, and the sources behind them.

This is a personal educational project, made to be free and public so anyone can study from it.

**Educational use only. Not for clinical diagnosis.** The 3D models have no medical or dental approval and may contain errors.

## Pages
- **Home** (`index.html`): interactive dot background and links to the model and Learn.
- **3D Model** (`model.html`): the anatomy viewer.
- **Inside a Tooth** (`tooth.html`): a schematic lower molar built in code (`src/tooth-model.js`), shown cut in half, with enamel, dentin, pulp, cementum, PDL, bone and gingiva as layers.
- **Learn** (`learn.html`): dental assisting procedures, one tab per topic, from `src/data/learn.json`. Every topic states what it's for, which states it applies to, and its sources.
- **Sources** (`sources.html`): every source and credit, generated from the data files and `src/data/credits.json`.

## Features
- 3D head built from one anatomical dataset, so nerves and vessels line up with the bone
- Layers: teeth, bones & joints, gums & oral tissue, salivary glands, muscles, nerves, arteries, veins. Each layer can be shown, hidden or shown alone ("Only"), and has its own opacity slider
- Click a structure to see its definition in the bottom-right panel. Teeth use the US Universal Numbering System (1–32)
- Students who sign in can highlight text on Learn: select the words, click **Highlight**; click a highlight to remove it. Highlights are private, like notes
- Students sign in (email + password) and pin private yellow sticky notes to any point with **+ Add Note**, on the 3D Model and Inside a Tooth pages. Each note only shows on the page it was made on

## Run locally
```bash
npm install
supabase start                 # local sign-in + notes database (needs Docker)
cp .env.example .env.local     # fill in with the values from `supabase status`
npm run dev                    # http://localhost:5173
npm run test:notes             # checks privacy rules against the LOCAL Supabase
npm run build                  # validates data, then builds to dist/
```
Without `.env.local` the app still works, only sign-in and notes are disabled.

## Sign-in and notes (Supabase)
- Database schema and privacy rules: `supabase/migrations/`. Every note row belongs to one user, and row-level security only lets that user read, edit or delete it.
- To go live: create a project at supabase.com, run the migration (`supabase link` then `supabase db push`), and put the project URL and **publishable** key in `.env.local`. Never put the secret/service-role key in the app or the repo.

## Publishing (GitHub Pages)
`.github/workflows/pages.yml` builds the site and publishes it on every push to `main` of the public repo. It reads the Supabase URL and **publishable** key from repo variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) and refuses to build with any other kind of key.

## How the content gets into the app
| What | Where it comes from | File in this repo |
|---|---|---|
| 3D shapes | Z-Anatomy `Startup.blend` (CC BY-SA), exported with Blender; upper-jaw nerves and third molars added by the export script (marked approximate) | `public/models/head.glb` |
| Definitions | Written for this app from OpenStax (CC BY), with links to StatPearls (NCBI) | `src/data/structures.json` |
| Learn topics | Summarized from U.S. public-domain sources (CDC, OSHA regulations); DANB/ADA linked only | `src/data/learn.json` |

`structures.json` is the single list of structures. Each entry has its layer, the Blender object it comes from, a summary, optional notes for the assistant, and source keys. To add a structure, add an entry and re-export:

```bash
# Z-Anatomy source (≈300 MB, not committed): github.com/Z-Anatomy/Models-of-human-anatomy → Z-Anatomy.zip → Startup.blend
blender -b -Y --factory-startup vendor-src/z-anatomy/Startup.blend \
  --python tools/export_head.py -- src/data/structures.json public/models/head.glb
npm run validate
```
(`-Y` keeps scripts embedded in the downloaded .blend file from running.)

## Security
See [SECURITY.md](SECURITY.md). The app is a static site with no backend of its own. Supabase handles optional sign-in, private notes and highlights. There are no secret keys in the app and no tracking.

## Licenses & credits
The code and content written for this app are all rights reserved: see [LICENSE](LICENSE). Third-party material keeps its own license, listed in [SOURCES.md](SOURCES.md).
- 3D model: Z-Anatomy (CC BY-SA 4.0), based on BodyParts3D © The Database Center for Life Science (CC BY-SA 2.1 JP). Our modified `head.glb` is shared under CC BY-SA 4.0.
- Text adapted from OpenStax *Anatomy & Physiology 2e* (CC BY 4.0). StatPearls articles are linked, not copied.
