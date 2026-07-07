# Spotastreet Security Notes

This is not a complete security model. It is a working note for future changes.

## High-Level Model

Spotastreet currently uses Firebase Auth and Firestore directly from the client.

That means client-side writes must be treated carefully. Anything calculated only in the browser can potentially be manipulated.

## Sensitive Files

- `app/firestore.rules`
- `app/src/config/firebase.js`
- `app/src/utils/googleAuth.js`
- `app/src/hooks/useUserProfile.js`
- `app/src/pages/Multiplayer.jsx`
- `app/src/pages/AdminPage.jsx`

Do not change these casually.

## Firestore Rules

Do not edit Firestore rules without an explicit user request.

Rules changes should be handled as their own branch/PR and should include:

- what access changes,
- which collections are affected,
- how existing clients behave,
- rollback plan,
- verification plan.

## Known Risk Areas

User profile and stats are synced from the client.

Challenge attempts and leaderboard data depend on client-written profile fields.

Multiplayer match data is written from the client.

Admin access depends on Firebase Auth custom claim `admin=true`.

These areas should be hardened with server-side validation or Cloud Functions/API routes in a dedicated security task.

## Do Not Change Without Explicit Approval

- Firebase project IDs
- Firebase API config fallback values
- Firestore collection names
- Firestore document field names
- Auth claim names
- Google client ID
- Vercel rewrite behavior
- localStorage keys

## Secrets

Firebase web app config is public-client configuration, but still production-sensitive.

Actual secrets, such as service account JSON files, must never be committed.

The root `.gitignore` must continue to ignore Firebase service account JSON files.

## Generated And Local Files

Do not commit:

- `app/dist/`
- `app/public/build-info.json`
- `.DS_Store`
- `.vercel/`
- service account JSON files

## Security Refactor Rule

Security changes should be small, isolated, and reviewable.

Do not bundle security changes with UI changes.
