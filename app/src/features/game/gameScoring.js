import { calculatePlaceScore, calculateScore } from '../../utils/scoring';

export function scoreStreetDistance(distanceMeters) {
  return calculateScore(distanceMeters);
}

export function scorePlaceDistance(distanceMeters) {
  return calculatePlaceScore(distanceMeters);
}

export function scoreStreetGuess(guess, answer) {
  return guess === answer ? 100 : 0;
}
