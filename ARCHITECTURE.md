# Spotastreet Architecture

Spotastreet is a Vite + React single-page app deployed through Vercel.

## Runtime Shape

- Framework: Vite, React 19
- Router: `react-router-dom`
- State: Zustand stores in `app/src/hooks`
- Backend services: Firebase Auth and Firestore from the client
- Map rendering: MapLibre loaded dynamically in `GameMap`
- Deployment: Vercel SPA rewrite to `index.html`

## Main Entrypoints

- `app/index.html`
- `app/src/main.jsx`
- `app/src/App.jsx`

`App.jsx` owns the main route table and the auth/profile/onboarding gates.

## Main Directories

- `app/src/pages` - route-level screens
- `app/src/components` - reusable UI and app components
- `app/src/hooks` - Zustand stores and React hooks
- `app/src/utils` - scoring, geo, street loading, bot logic, auth helpers
- `app/src/config` - Firebase and map style config
- `app/src/data` - static app data
- `app/public/data` - static street and place datasets
- `app/scripts` - operational data/admin/build scripts

## Game Logic

Singleplayer screens:

- `app/src/pages/GameWhereIsStreet.jsx`
- `app/src/pages/GameWhatStreet.jsx`
- `app/src/pages/GameWhereIsPlace.jsx`

Shared helpers:

- `app/src/utils/scoring.js`
- `app/src/utils/geo.js`
- `app/src/utils/streets.js`
- `app/src/utils/bot.js`

Multiplayer:

- `app/src/pages/Multiplayer.jsx`

This file is high-risk because it combines UI, timers, matchmaking, Firestore writes, scoring, and bot simulation.

Trusted scoring is not implemented yet. Use `SERVER_SCORING_PLAN.md` before moving ranking, challenge, or multiplayer results to a backend-controlled write path.

## Admin

Admin panel:

- `app/src/pages/AdminPage.jsx`

Admin access depends on Firebase Auth custom claim:

- `admin=true`

Admin helper script:

- `app/scripts/grant_admin_claim.js`

## Auth And Profile

Firebase setup:

- `app/src/config/firebase.js`

Google Sign-In helper:

- `app/src/utils/googleAuth.js`

Profile/session store:

- `app/src/hooks/useUserProfile.js`

## Routing

Routes are declared in `app/src/App.jsx`.

Known app routes include:

- `/`
- `/profile`
- `/leaderboard`
- `/game/where-is-street`
- `/game/what-street`
- `/game/where-is-place`
- `/game/multiplayer`
- `/admin`

Do not rename routes without an explicit migration task.

## Deployment Routing

Vercel rewrites all requests to `index.html` through:

- `app/vercel.json`

Firebase Hosting config also exists:

- `app/firebase.json`

Do not change deployment routing during ordinary UI or copy edits.
