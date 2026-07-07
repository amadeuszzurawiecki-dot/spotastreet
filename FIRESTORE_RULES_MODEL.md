# Spotastreet Firestore Rules Model

This document prepares a future Firestore rules tightening PR.

It describes the current client data model and the rules changes that should be tested before touching production rules.

Do not treat this as implemented security.

## Current Collections

### `users/{userId}`

Document id is a sanitized email:

- lowercase,
- non-alphanumeric characters replaced with `_`.

Known fields:

- `email`
- `name`
- `town`
- `avatarId`
- `car`
- `stats`
- `challengeAttempts`
- `hasCompletedProfile`
- `hasCompletedOnboarding`
- `hideEmail`
- `isPremium`
- `customAvatar`
- `dailyGamesPlayed`
- `onlineWins`
- `onlineLosses`
- `onlineDraws`
- `mapStyle`
- `updatedAt`

Current risk:

- the owner can update their own document,
- trusted fields and editable profile fields live in the same document,
- client code writes `isPremium`, `stats`, `challengeAttempts`, and online match counters as part of profile sync.

Future rules target:

- owners can edit only clearly user-controlled profile fields,
- admin-only fields must be protected by `admin()`,
- stats and challenge results need either server validation or a separate trusted write path.

Likely owner-editable fields:

- `name`
- `town`
- `avatarId`
- `car`
- `hasCompletedProfile`
- `hasCompletedOnboarding`
- `hideEmail`
- `customAvatar`
- `dailyGamesPlayed`
- `mapStyle`
- `updatedAt`

Likely admin-only or server-owned fields:

- `isPremium`
- `stats`
- `challengeAttempts`
- `onlineWins`
- `onlineLosses`
- `onlineDraws`

### `matches/{matchId}`

Documents are created and updated directly by `Multiplayer.jsx`.

Known top-level fields:

- `gameMode`
- `status`
- `player1`
- `player2`
- `currentRound`
- `roundAnswers`
- `questions`
- `player1Ready`
- `player2Ready`
- `player1NextRoundReady`
- `player2NextRoundReady`
- `createdAt`

Known player fields:

- `email`
- `name`
- `avatarId`
- `customAvatar`
- `isPremium`
- `isBot`
- `score`
- `rounds`

Known answer fields:

- `score`
- `distance`
- `pinPosition`
- `guessText`
- `timedOut`

Current risk:

- every signed-in user can read and write every match,
- clients can write scores and round history,
- clients can advance match state,
- bot matches are simulated by client-side writes.

Future rules target:

- only participants can read a match,
- only participants can update their own answer and ready flags,
- player 1 can create a waiting match for themselves,
- player 2 can join a waiting match as themselves,
- participants cannot overwrite the other player's profile, score, rounds, or answer,
- status/current round changes should be tightly constrained,
- scoring should eventually move to a trusted backend path.

### `challenges/{challengeId}`

Current intended model:

- signed-in users can read,
- only admin can write.

Keep this model unless challenge creation moves to a backend service.

### `settings/{docId}`

Current intended model:

- anyone can read,
- only admin can write.

Keep this model unless public settings include sensitive data.

## Rules Test Matrix

These tests should exist before changing production rules.

### Users

- unauthenticated user cannot read users.
- signed-in user can read users if leaderboard still requires it.
- signed-in user can create their own user document with matching email.
- signed-in user cannot create another user's document.
- signed-in user can update allowed profile fields on their own document.
- signed-in user cannot change `isPremium`.
- signed-in user cannot change `stats`.
- signed-in user cannot change `challengeAttempts`.
- signed-in user cannot change online counters.
- signed-in user cannot update another user's document.
- admin can update any user document.
- only admin can delete a user document.

### Matches

- unauthenticated user cannot read or write matches.
- signed-in user can create a waiting match where `player1.email` matches their token email.
- signed-in user cannot create a match for another player.
- signed-in user can join a waiting match as `player2` when not already a participant.
- signed-in user cannot join a match as another email.
- participant can read their match.
- non-participant cannot read a match.
- participant can set only their own ready flag.
- participant can submit only their own answer for the current round.
- participant cannot overwrite opponent answer.
- participant cannot overwrite opponent profile.
- participant cannot directly inflate opponent or own score beyond allowed transition.
- participant cannot set arbitrary `status` values.
- participant cannot advance `currentRound` before both next-round flags are ready.

### Admin Data

- signed-in non-admin cannot create, update, or delete challenges.
- admin can create, update, and delete challenges.
- signed-in non-admin cannot write settings.
- admin can write settings.

## Recommended PR Sequence

1. Add rules test tooling with a clear package justification.
2. Add current-behavior tests that document the existing permissive `matches` access.
3. Tighten `matches` read access to participants only.
4. Split `matches` write rules by create, join, ready, answer, and round transition.
5. Add user field allow-lists for owner updates.
6. Move trusted scoring and premium/stat writes to a backend-controlled path.

## Open Decisions

- Whether leaderboard still requires every signed-in user to read all user documents.
- Whether challenge attempts are allowed to remain client-written before backend validation exists.
- Whether multiplayer score can be trusted enough for rules-only validation.
- Whether bot matches should remain client simulated.
