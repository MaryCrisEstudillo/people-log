# Ministry Tracker

Personal records + ministry time tracker (PWA). All data is stored **only on the device** (IndexedDB via Dexie). No backend, works offline.

## Features
- People: name, status (New / RV / Study / Inactive), gender, contact number, date, availability, address, latest topic, publication, up to 4 photos
- Inactive records are locked until activated (activating sets status back to New)
- Home shows the 5 most recently updated people; **Show all records** opens the full list
- Search by name and/or address; show/hide inactive
- Ministry time: add as `hours.minutes` (`1.15` = 1h 15m), today / total / goal / remaining, editable total & goal, resets monthly
- Monthly report (this month or last month): hours, RVs, Studies
- Backup export/import (JSON, includes photos)

## Develop
```bash
npm install
npm run dev
npm test        # unit tests (Vitest)
npm run lint
```

## Project structure
```
src/
  App.tsx              page switcher
  nav.ts               page/navigation types
  db.ts                Dexie schema, types, constants
  lib/
    time.ts            dates, months, hours.minutes parsing/formatting
    records.ts         save / activate / delete person (one transaction each), monthly numbers
    backup.ts          export / import JSON
    images.ts          photo compression, data URL helpers
  components/          Ministry, MonthSummary, PeopleList, Photos, Segmented, InstallBanner
  pages/               HomePage, AllPage, DetailPage, FormPage
```

**Database changes:** never edit an existing `this.version(n)` in `db.ts` — add a new version so installed phones upgrade safely.

## Deploy (GitHub Pages)
Pushing to `main` runs `.github/workflows/deploy.yml`, which builds and deploys to
`https://<username>.github.io/<repo>/`. Repo → Settings → Pages → Source must be **GitHub Actions**.

## Install
Each person who installs it gets their **own private copy** — data lives only on their device.

- **iPhone:** open the URL in **Safari** → Share → **Add to Home Screen**. Always open it from the icon (the icon and a Safari tab have separate storage).
- **Android:** open the URL in **Chrome** → tap **Install** on the in-app banner (or ⋮ menu → *Install app*).

Open it once while online after installing; after that it works offline. Updates download the next time it's opened online.

### Optional: APK / Play Store for Android
Paste the URL into https://www.pwabuilder.com → Android → download the package (Trusted Web Activity wrapper of this same PWA).

## Backup
- **Export backup** opens the share sheet → *Save to Files* / iCloud Drive.
- **Import backup** replaces all current records with the file's contents.
- Deleting the home screen app deletes its data — export regularly.
