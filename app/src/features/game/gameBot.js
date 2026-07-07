import { generateBotRound, generateBotStreetGuess } from '../../utils/bot';

export function isTrainingVariant(gameVariant) {
  return gameVariant === 'training';
}

export function createDistanceBotRound(gameVariant) {
  const botResult = generateBotRound();
  return {
    botResult,
    botScoreDelta: isTrainingVariant(gameVariant) ? 0 : botResult.score,
    botRound: isTrainingVariant(gameVariant) ? { score: 0, distance: 0 } : botResult,
  };
}

export function createStreetGuessBotRound(gameVariant, correctStreet, streetNames) {
  const botResult = generateBotStreetGuess(correctStreet, streetNames);
  return {
    botResult,
    botScoreDelta: isTrainingVariant(gameVariant) ? 0 : botResult.score,
    botRound: isTrainingVariant(gameVariant) ? { score: 0, correct: false } : botResult,
  };
}
