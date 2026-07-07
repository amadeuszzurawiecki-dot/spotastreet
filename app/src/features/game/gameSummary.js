import { isTrainingVariant } from './gameBot';
import { getEffectiveTotalRounds } from './gameRound';

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
