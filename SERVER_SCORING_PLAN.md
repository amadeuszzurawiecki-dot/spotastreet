# Spotastreet Server-Authoritative Scoring Plan

This document describes the target architecture for trusted game scoring.

It is a plan, not implemented behavior.

## Problem

Spotastreet currently calculates and stores important score data in the browser.

That is acceptable for local play, but it is not enough for trusted rankings because a client can be modified to send arbitrary results.

The core rule:

- the frontend may submit a player answer,
- the frontend must not be trusted as the source of final score.

## Target Flow

```text
Frontend sends player answer
↓
Backend verifies auth, game state, round, time, answer, and scoring
↓
Backend writes the trusted result to Firestore
↓
Frontend listens to Firestore or receives the saved result
↓
Frontend only displays the trusted result
```

## Recommended Backend

Prefer Firebase Cloud Functions for the first trusted scoring implementation.

Reasons:

- the app already uses Firebase Auth and Firestore,
- functions can verify Firebase ID tokens naturally,
- functions can write to Firestore through Firebase Admin,
- scoring stays close to the data it protects,
- Firestore rules can block direct client writes to trusted fields.

Vercel Serverless Functions are also possible, but they require careful Firebase Admin credential handling in Vercel environment variables.

## Trusted And Untrusted Data

### Frontend Can Submit

- game mode,
- match id or challenge id,
- round id/index,
- selected coordinates,
- typed street guess,
- client-observed submit time,
- local UI context needed for rendering.

### Backend Must Decide

- whether the user is authenticated,
- whether the user may submit for this game/match/challenge,
- whether the round is currently active,
- whether the answer was already submitted,
- whether the answer is within time,
- the authoritative distance,
- the authoritative score,
- the saved round result,
- aggregate match/user/challenge stats.

### Frontend Must Not Decide

- final score,
- final distance,
- leaderboard totals,
- challenge completion result,
- multiplayer winner,
- premium/admin-controlled profile fields.

## First Implementation Target

Start with the lowest-risk server-scoring slice before multiplayer.

Recommended first target:

1. Daily challenge or singleplayer challenge result submission.
2. Backend validates the score from a deterministic payload.
3. Backend writes `challengeAttempts` or a future `challengeResults` document.
4. Existing UI reads the result as before.

Avoid starting with multiplayer. Multiplayer combines matchmaking, timers, status transitions, bot simulation, answers, score updates, and summary UI.

## Possible API Shape

For Cloud Functions callable HTTPS endpoint:

```json
{
  "gameMode": "where-is-street",
  "challengeId": "2026-07-07",
  "roundIndex": 0,
  "answer": {
    "type": "coordinates",
    "lat": 51.207,
    "lng": 16.155
  },
  "clientSubmittedAt": "2026-07-07T12:00:00.000Z"
}
```

For `what-street`:

```json
{
  "gameMode": "what-street",
  "challengeId": "2026-07-07",
  "roundIndex": 0,
  "answer": {
    "type": "streetName",
    "value": "Najswietszej Marii Panny"
  },
  "clientSubmittedAt": "2026-07-07T12:00:00.000Z"
}
```

The backend response should include only what the UI needs:

```json
{
  "roundIndex": 0,
  "score": 87,
  "distance": 42,
  "correct": true,
  "timedOut": false,
  "saved": true
}
```

## Data Model Direction

Prefer new trusted result documents over expanding the already overloaded `users` document.

Possible future collections:

- `challengeResults/{resultId}`
- `users/{userId}/challengeResults/{challengeId}`
- `matches/{matchId}/roundResults/{roundIndex}`

Keep existing collection names until a migration is explicitly planned.

## Firestore Rules Direction

Once backend scoring exists:

- clients should not write trusted score fields,
- clients should not update aggregate leaderboard counters directly,
- clients may create limited answer-intent documents if needed,
- backend writes trusted result documents through Admin SDK,
- Firestore rules should allow reads needed by UI but block direct trusted writes.

This should be coordinated with `FIRESTORE_RULES_MODEL.md`.

## Migration Strategy

1. Add backend scoring for one non-multiplayer result type.
2. Keep existing client scoring for immediate UI feedback only.
3. Compare client score and backend score in development logs.
4. Switch persistence to backend score.
5. Tighten Firestore rules around the protected fields.
6. Repeat for other singleplayer modes.
7. Only then design multiplayer server authority.

## Testing Requirements

Before trusting backend scores:

- unit-test scoring helpers with representative distances and street guesses,
- integration-test backend auth rejection,
- integration-test duplicate submission rejection,
- integration-test out-of-window submission rejection,
- integration-test Firestore writes,
- rules-test that clients cannot write protected score fields directly.

## Open Decisions

- Cloud Functions or Vercel Serverless Functions.
- Whether challenge results remain embedded in `users.challengeAttempts`.
- Whether to introduce immutable per-round result documents.
- Whether timers use server timestamps, challenge start records, or match round start records.
- How much immediate client feedback remains before backend response.
