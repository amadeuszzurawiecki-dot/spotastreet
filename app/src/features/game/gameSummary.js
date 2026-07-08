import { isTrainingVariant } from './gameBot';
import { getEffectiveTotalRounds } from './gameRound';

const CHALLENGE_SUMMARY_STORAGE_PREFIX = 'spotastreet:challenge-summary';

function getChallengeSummaryStorageKey(challengeId, gameMode) {
  if (!challengeId || !gameMode) return null;
  return `${CHALLENGE_SUMMARY_STORAGE_PREFIX}:${gameMode}:${challengeId}`;
}

export function readChallengeSummarySnapshot(challengeId, gameMode) {
  const key = getChallengeSummaryStorageKey(challengeId, gameMode);
  if (!key || typeof window === 'undefined') return null;

  try {
    const rawSummary = window.sessionStorage.getItem(key);
    if (!rawSummary) return null;

    const summary = JSON.parse(rawSummary);
    if (!summary || summary.challengeId !== challengeId || summary.gameMode !== gameMode) return null;
    return summary;
  } catch (err) {
    console.warn('Could not restore challenge summary snapshot.', err);
    return null;
  }
}

export function saveChallengeSummarySnapshot(challengeId, gameMode, summary) {
  const key = getChallengeSummaryStorageKey(challengeId, gameMode);
  if (!key || typeof window === 'undefined' || !summary) return;

  try {
    window.sessionStorage.setItem(key, JSON.stringify(summary));
  } catch (err) {
    console.warn('Could not save challenge summary snapshot.', err);
  }
}

export function clearChallengeSummarySnapshot(challengeId, gameMode) {
  const key = getChallengeSummaryStorageKey(challengeId, gameMode);
  if (!key || typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(key);
  } catch (err) {
    console.warn('Could not clear challenge summary snapshot.', err);
  }
}

export function getSummaryBotScore(gameVariant, botScore) {
  return isTrainingVariant(gameVariant) ? 0 : botScore;
}

export function getSummaryBotRounds(gameVariant, botRounds) {
  return isTrainingVariant(gameVariant) ? [] : botRounds;
}

export function getSummaryTotalRounds(playerRounds, totalRounds, itemCount) {
  return playerRounds.length || getEffectiveTotalRounds(totalRounds, itemCount);
}

export function resetSingleplayerSummary({
  setBotRounds,
  setBotScore,
  setCurrentRound,
  setGameVariant,
  setIsGameOver,
  setPlayerRounds,
  setPlayerScore,
  setSummaryData,
}) {
  setIsGameOver(false);
  setSummaryData?.(null);
  setCurrentRound(0);
  setPlayerScore(0);
  setBotScore(0);
  setPlayerRounds([]);
  setBotRounds([]);
  setGameVariant('select');
}
