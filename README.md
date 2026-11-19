# Leonida Legends — GTA VI Trophy Guide & Tracker

[![make.fun](https://img.shields.io/badge/make.fun-gta6--trophy--guide--01-ff2e88)](https://make.fun/bounty/gta6-trophy-guide-01)
[![owner](https://img.shields.io/badge/owner-nandorp28-2ee6c8)](https://github.com/nandorp28)
[![referral](https://img.shields.io/badge/referral-qyk2abaw-7fe7ff)](https://make.fun/bounty/gta6-trophy-guide-01)

An offline guide and checklist tracker for all **55 PlayStation 5 trophies** of Grand Theft Auto VI — every official name, description and grade, a guide in my own words with cited sources for each trophy, a roadmap to the platinum (~200h, difficulty 4/10), and a warning for the one possibly-missable trophy (Positive Mental Attitude, Chapter 1 balcony meditation).

The tracker saves earned ticks in `localStorage`, exports progress to a `.json` file and imports it back, filters by kind (story, missable, collectibles, activities, online — there are no online trophies, all 55 are single-player), by grade, and by text search. A spoiler toggle masks the names and descriptions of the 28 hidden trophies until they are earned.

No Rockstar logo or artwork is used, and the app makes no network requests at runtime — it is plain static files under `app/`.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in (make.fun)

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.
