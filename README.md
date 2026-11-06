# People Log

Personal records app (PWA). All data is stored **only on your phone** (IndexedDB via Dexie). No backend.

## Run locally
```bash
npm install
npm run dev
```

## Deploy free on GitHub Pages
1. Create a GitHub repo (e.g. `people-log`) and push this project to `main`.
2. Repo → **Settings → Pages → Source: GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) builds and deploys on every push.
4. Your app will be at `https://<username>.github.io/people-log/`.

## Install (share the URL with anyone)
Each person who installs it gets their **own private copy** — data lives only on their device.

- **iPhone:** open the URL in **Safari** → Share → **Add to Home Screen**. Always open it from the icon (the icon and a Safari tab have separate storage).
- **Android:** open the URL in **Chrome** → tap **Install** on the in-app banner (or ⋮ menu → *Install app*).

An install banner in the app shows the right instructions per device.

### Optional: real APK / Play Store for Android
Paste your URL into https://www.pwabuilder.com → Android → download the package. It wraps this same PWA as an installable APK/AAB (Trusted Web Activity).

## Backup
- **Export backup** (bottom of the list page) opens the share sheet → *Save to Files* / iCloud Drive.
- **Import backup** replaces all current records with the file's contents.
- Deleting the home screen app deletes its data — export regularly.

## Customize
- Availability options: `AVAILABILITY` in `src/db.ts`.
- Adding a new field: add it to `Person` in `src/db.ts` and to the form/details in `src/App.tsx`.
  Only bump `this.version(...)` if you need a new **indexed** field.
