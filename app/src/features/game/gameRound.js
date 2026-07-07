export function getEffectiveTotalRounds(totalRounds, itemCount) {
  return Math.max(1, Math.min(Number(totalRounds) || 1, itemCount || Number(totalRounds) || 1));
}

export function shouldStartInitialRound({
  currentRound,
  isGameOver,
  isRoundActive,
  playerRounds,
  primaryItemsReady,
  secondaryItemsReady = true,
  showResult,
}) {
  return primaryItemsReady
    && secondaryItemsReady
    && !isRoundActive
    && !showResult
    && !isGameOver
    && currentRound === 0
    && playerRounds.length === 0;
}

export function advanceSingleplayerRound({
  currentRound,
  finishGame,
  itemCount,
  setCurrentRound,
  startRound,
  totalRounds,
}) {
  const nextRound = currentRound + 1;
  const roundsLimit = getEffectiveTotalRounds(totalRounds, itemCount);
  if (nextRound >= roundsLimit) {
    finishGame();
    return;
  }

  setCurrentRound(nextRound);
  startRound(nextRound);
}

export function createDistanceRoundResult({
  botDistance,
  botScore,
  playerDistance,
  playerScore,
  timedOut,
}) {
  return {
    type: 'distance',
    playerScore,
    playerDistance,
    timedOut,
    botScore,
    botDistance,
  };
}

export function createStreetGuessRoundResult({
  botCorrect,
  botDistance,
  botScore,
  playerCorrect,
  playerDistance,
  playerScore,
  timedOut,
}) {
  return {
    type: 'street-guess',
    playerScore,
    playerCorrect,
    playerDistance,
    timedOut,
    botScore,
    botCorrect,
    botDistance,
  };
}
