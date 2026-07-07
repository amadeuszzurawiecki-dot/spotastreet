# Spotastreet Environment

This document describes local and deployment environment expectations.

## App Directory

Run app commands from:

```sh
app
```

## Scripts

Available scripts are defined in `app/package.json`.

Current scripts:

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run admin:grant`

There is currently no `lint` or `typecheck` script.

## Build Artifacts

`npm run build` runs `scripts/generate_build_info.js` and then Vite.

It can generate:

- `app/dist/`
- `app/public/build-info.json`

These are generated artifacts and should not be committed unless explicitly requested.

## Environment Variables

The example file is:

- `app/.env.example`

Firebase web app variables use the `VITE_FIREBASE_*` names.

Do not rename env variable names without an explicit migration.

## Firebase Project Identifiers

Some fallback identifiers in source still reference the existing Firebase project. These are technical backend targets, not product copy.

Do not change them unless the user explicitly asks to retarget Firebase.

## Vercel

Vercel deployment routing is configured in:

- `app/vercel.json`

The app is an SPA and expects rewrite-to-index behavior.

Do not change Vercel config during normal app edits.

## Google Sign-In

Google Identity Services is loaded in:

- `app/index.html`

Google client ID handling lives in:

- `app/src/utils/googleAuth.js`

Do not change Google Sign-In config unless the task is specifically about authentication.

## Firebase Admin Script

Admin claim assignment script:

- `app/scripts/grant_admin_claim.js`

It expects Firebase Admin credentials through Application Default Credentials or `FIREBASE_SERVICE_ACCOUNT`.

Do not commit service account JSON files.
