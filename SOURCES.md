# Sources & Licenses

Every 3D asset and every piece of text in the app must be listed here with its license.
Status: ✅ verified · ⏳ to verify

## 3D models

### Main head model — Z-Anatomy (derived from BodyParts3D)
- Repo: https://github.com/Z-Anatomy/Models-of-human-anatomy (`Z-Anatomy.zip` → `Startup.blend`, Blender 3.5)
- License: ✅ CC BY-SA 4.0 (Z-Anatomy) · ✅ CC BY-SA 2.1 Japan (BodyParts3D, © The Database Center for Life Science, https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/)
- Includes a cranial nerves model credited to the University of Dundee (CAHID) — ⏳ license to verify (built on BodyParts3D, so likely CC BY-SA)
- Attribution required: "Z-Anatomy (CC BY-SA 4.0), based on BodyParts3D © DBCLS (CC BY-SA 2.1 JP)"
- ShareAlike: our modified `.glb` files must be published under CC BY-SA too.

Contents checked in `Startup.blend` (object names):
| Group | Available | Missing |
|---|---|---|
| Teeth | 28 permanent teeth (upper/lower: medial & lateral incisor, canine, 1st/2nd premolar, 1st/2nd molar, left & right) | Third molars (#1, 16, 17, 32: made for this app, see below), primary teeth, internal anatomy (see Inside a Tooth) |
| Bone | Mandible, Maxilla L/R, Mental foramen | (mandibular canal is not a separate object) |
| Soft tissue | Gingiva, Tongue, Upper lip | |
| Nerves | Trigeminal (V) + roots, Maxillary nerve (V2, its curve also runs on as the infraorbital nerve), Mandibular nerve (V3) + anterior/posterior divisions, Inferior alveolar, Lingual, Mental, Buccal, Chorda tympani (all L/R) | Superior alveolar nerves (PSA/MSA/ASA), Nasopalatine, Greater palatine (drawn for this app, see below) |
| Vessels | Inferior alveolar artery + mental & mylohyoid branches, Posterior superior alveolar artery, Maxillary artery, Facial artery, Transverse facial artery, Facial / common facial / maxillary veins | |

Shipped as `public/models/head.glb` (exported by `tools/export_head.py`, 211 meshes): our modified version is licensed **CC BY-SA 4.0**. Changes: head region extracted, curves converted to tube meshes, meshes renamed, materials removed.
Added 2026-10-27 (by `tools/export_head.py`, marked `"traced"` in `structures.json` and in the app): the infraorbital nerve split off the end of Z-Anatomy's maxillary nerve; PSA, greater palatine and nasopalatine nerves drawn along the PSA, descending/greater palatine and posterior septal arteries; MSA and ASA drawn from the infraorbital nerve to the upper root tips. Approximate paths, part of the same CC BY-SA 4.0 derivative. ⏳ Expert review.
Also added 2026-10-27: third molars #1, #16, #17, #32, each a copy of the second molar scaled to 90% and moved one tooth back (marked `"traced"`). ⏳ Expert review.

### Inside a Tooth — schematic molar (our own work)
- Built in code by this project (`src/tooth-model.js`): smooth shapes generated from math, simplified and not to scale. No outside 3D data, so no third-party license. ✅
- Text in `src/data/tooth.json` adapted from OpenStax *Anatomy & Physiology 2e* §23.3 (CC BY 4.0); gingiva tip reused from the head model data.
- ⏳ Expert review of shapes and text.

### Code libraries shipped
- three.js 0.186.1 (incl. Draco decoder in `public/draco/`) — MIT — https://github.com/mrdoob/three.js
- @supabase/supabase-js 2.117.3 — MIT
- Fonts: Instrument Sans and Instrument Serif (via @fontsource, bundled locally) — SIL Open Font License 1.1

### Detail views — NIH 3D (US government)
- 3DPX-003002 Upper dental tooth model — ✅ Public Domain (CC0), courtesy Michael D. Scherer, DMD, MS — https://3d.nih.gov/entries/3DPX-003002
- 3DPX-000281 Impacted Wisdom Teeth, 3D Model, by LeeDock (from CBCT) — ✅ Public Domain (CC0 1.0), confirmed on the entry page 2026-10-27 — https://3d.nih.gov/entries/3DPX-000281/2 — not shipped: page removed 2026-11-02.
- 3DPX-000902 Upper mandible with teeth — CC BY-NC (OK, since the app is non-commercial) — ⏳ confirm

### Reference only (not shipped)
- Harvard SPL Head & Neck Atlas (Open Anatomy Project) — 3D Slicer License B — https://openanatomy.org/atlas-pages/atlas-spl-head-and-neck.html
- Visible Human Project (NLM) — NLM Terms & Conditions, credit NLM — https://www.nlm.nih.gov/research/visible/getting_data.html

## Text / information (US)
| Source | License | Use |
|---|---|---|
| OpenStax *Anatomy & Physiology 2e* (Rice University) — https://openstax.org/books/anatomy-and-physiology-2e | ✅ CC BY 4.0 | Adapt with attribution |
| NIDCR — https://www.nidcr.nih.gov | US federal work (public domain) | Adapt |
| CDC Oral Health — https://www.cdc.gov/oral-health | US federal work (public domain) | Adapt |
| MedlinePlus — https://medlineplus.gov | Federal pages public domain; licensed third-party content (e.g. A.D.A.M.) excluded | Adapt federal pages only |
| StatPearls (NCBI Bookshelf) — *Anatomy, Permanent Dentition*; *Anatomy, Head and Neck, Primary Dentition* | ✅ CC BY-NC-ND 4.0 | Link / short quote only, never rewritten |
| ADA Universal Numbering System (1–32, A–T) | Standard | Tooth numbers |
| CDC — Summary of Infection Prevention Practices in Dental Settings (2016) — https://www.cdc.gov/dental-infection-control/hcp/summary/index.html | ✅ U.S. federal work (public domain) | Learn → Infection Control (summarized) |
| OSHA — Bloodborne Pathogens Standard 29 CFR 1910.1030, eCFR text as of 2026-10-23 (PDF kept in `vendor-src/osha/`, not committed) — https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XVII/part-1910/subpart-Z/section-1910.1030 | ✅ U.S. federal regulation (public domain) | Learn → OSHA & Bloodborne Pathogens (summarized) |
| OSHA State Plans — https://www.osha.gov/stateplans | U.S. federal work (public domain) | Linked from Learn |
| OSHA — Ionizing Radiation 29 CFR 1910.1096, eCFR text as of 2026-10-23 (PDF in `vendor-src/osha/`, not committed) — https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XVII/part-1910/subpart-Z/section-1910.1096 | ✅ U.S. federal regulation (public domain) | Learn → Radiation Safety (summarized) |
| OSHA standard interpretation 2009-04-03 (digital radiography) — https://www.osha.gov/laws-regs/standardinterpretations/2009-04-03-0 | U.S. federal work (public domain) | One sentence in Radiation Safety + link (osha.gov blocks automated reading) |
| ADA/FDA *Dental Radiographic Examinations: Recommendations for Patient Selection and Limiting Radiation Exposure* (2012) — https://www.fda.gov/radiation-emitting-products/medical-x-ray-imaging/selection-patients-dental-radiographic-examinations | Written by ADA councils with FDA | Link only |
| U.S. Navy *Dental Technician, Volume 1* (NAVEDTRA 14274), ch. 4 — "Distribution Statement A: approved for public release" (PDF saved by hand to `vendor-src/navy/`, not committed); online copy https://medical.tpub.com/14274/css/Universal-Numbering-System-66.htm | ✅ U.S. Navy work (public domain) | Learn → Tooth Numbering & Charting (summarized) |
| DANB — state requirements — https://www.danb.org/state-requirements | © DANB | Link only |

## Images
- `public/background.jpg` — recolored (navy) from `dots_1.jpg` by Magnific (formerly Freepik), free license — https://www.magnific.com. Free license requires the visible credit "Designed by Magnific" with a link to magnific.com: shown in the footer. ✅ Licensing guide: https://www.magnific.com/ai/docs/licenses-attribution
