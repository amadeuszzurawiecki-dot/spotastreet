# Spotastreet Codex Guide

This repository is a live web app. GitHub is the source of truth and Vercel deploys from it.

This file is the operating manual for future Codex work. Treat it as a constraint, not a suggestion.

## Hard Rules

- Do not make broad changes.
- Do not rewrite architecture because one screen needs a small fix.
- Do not change Firebase rules unless the user explicitly asks for it.
- Do not change Firebase config unless the user explicitly asks for it.
- Do not change Vercel, Google Cloud, or Google Sign-In config unless the user explicitly asks for it.
- Do not refactor multiplayer while making UI changes.
- Do not add packages without a clear reason and user-visible justification.
- Do not rename Firestore collections, document fields, route paths, localStorage keys, env variable names, or Firebase project identifiers unless the user explicitly asks for a migration.
- Do not commit generated build output.
- Do not treat old naming in technical IDs as product copy.

## Required Workflow

Before changing files, write a short file plan:

- files to read,
- files likely to edit,
- files that must not be touched,
- expected risk.

Then make the smallest useful change.

After changing files:

- run `npm run lint` if it exists,
- run `npm run typecheck` if it exists,
- run `npm run build`,
- if build generates `app/dist/` or `app/public/build-info.json`, remove those artifacts unless the user explicitly asks to keep them.

## Scope Discipline

Prefer one focused branch/PR per concern.

Good scopes:

- change one UI text group,
- fix one route,
- extract one helper,
- update one documentation file,
- tighten one clearly described validation rule.

Bad scopes:

- "clean up the app" while fixing a button,
- "modernize auth" while changing copy,
- "simplify multiplayer" while touching navigation,
- "rename everything" without a migration plan.

## App Boundaries

Frontend app code lives under `app/src`.

Primary entrypoints:

- `app/index.html`
- `app/src/main.jsx`
- `app/src/App.jsx`

Important sensitive areas:

- Firebase client setup: `app/src/config/firebase.js`
- Firestore rules: `app/firestore.rules`
- Vercel routing: `app/vercel.json`
- Google Sign-In helper: `app/src/utils/googleAuth.js`
- Multiplayer: `app/src/pages/Multiplayer.jsx`

Touch these only when the task is specifically about them.

## Multiplayer Warning

`app/src/pages/Multiplayer.jsx` is large and stateful. It combines matchmaking, Firestore writes, timers, scoring, bot simulation, and UI.

Do not refactor it during unrelated work.

For UI-only tasks inside multiplayer:

- change only the visible JSX/CSS needed,
- avoid touching Firestore writes,
- avoid touching round progression,
- avoid touching scoring,
- avoid touching matchmaking.

## Firebase Warning

Firebase config contains public web-app identifiers. They are not server secrets, but they are production-sensitive because changing them changes the backend target.

Do not change:

- `VITE_FIREBASE_*` variable names,
- fallback Firebase project identifiers,
- collection names,
- auth claim names,
- document shapes,
- Firestore rules.

Only change these with an explicit user request and a rollback plan.

## Naming

The product name is `Spotastreet`.

Some technical remnants may still use older names, for compatibility:

- `zgadulica` Firebase project identifiers,
- `bolters_*` localStorage keys,
- bot fixture email values.

Do not rename these casually.

`Legnica` is usually domain data, not an app name. Keep it when it means the city, default town, map bounds, street data, or place names.

## Dependencies

Do not install packages just because a task is easier with one.

A new package needs:

- why existing code cannot reasonably handle it,
- expected bundle/runtime impact,
- whether it affects Vercel build,
- whether it affects Firebase or auth.

## Generated Files

The build may generate:

- `app/dist/`
- `app/public/build-info.json`

These are artifacts, not source.

Do not commit them unless the user explicitly says so.

## Final Response Checklist

Always report:

- files changed,
- what was intentionally not changed,
- verification commands and results,
- generated artifacts removed,
- risks or follow-up concerns.
