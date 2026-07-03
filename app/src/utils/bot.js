/**
 * Bot logic for singleplayer mode
 * Simulates an opponent with randomized accuracy using Beta distribution
 */

import { calculateScore } from './scoring';
import { haversineDistance, LEGNICA_CENTER } from './geo';
import { normalizeStreetName } from './streets';

/**
 * Simple Beta distribution approximation using Box-Muller
 * Returns a value between 0 and 1 skewed towards lower values
 */
function randomBeta(alpha, beta) {
  // Use the Jöhnk's algorithm for beta distribution
  let u, v, x, y;
  do {
    u = Math.random();
    v = Math.random();
    x = Math.pow(u, 1 / alpha);
    y = Math.pow(v, 1 / beta);
  } while (x + y > 1);
  
  return x / (x + y);
}

/**
 * Generate bot's distance for a round
 * Uses Beta(2, 5) distribution: bot tends to be mediocre (200-600m range)
 * @returns {number} Distance in meters
 */
export function generateBotDistance() {
  const maxRange = 1500; // max distance the bot can be off
  const beta = randomBeta(2, 5);
  return beta * maxRange;
}

/**
 * Generate bot's score for a round
 * @returns {{ distance: number, score: number }}
 */
export function generateBotRound() {
  const distance = generateBotDistance();
  const score = calculateScore(distance);
  return { distance: Math.round(distance), score };
}

/**
 * Generate bot's answer for "Co to za ulica?" mode
 * Bot has ~40% chance of guessing correctly
 * @param {string} correctStreet - The correct street name
 * @param {string[]} allStreets - All available street names
 * @returns {{ correct: boolean, score: number, guess: string }}
 */
export function generateBotStreetGuess(correctStreet, allStreets) {
  const chance = Math.random();
  
  if (chance < 0.4) {
    // Bot guesses correctly
    return { correct: true, score: 100, guess: correctStreet };
  }
  
  // Bot guesses wrong — pick a random wrong street
  const wrongStreets = allStreets.filter(s => normalizeStreetName(s) !== normalizeStreetName(correctStreet));
  const guess = wrongStreets[Math.floor(Math.random() * wrongStreets.length)];
  return { correct: false, score: 0, guess };
}

/**
 * Bot profile info
 */
export const BOT_PROFILE = {
  name: 'Legniczanin',
  avatar: 'AI',
  tagline: 'Znam te ulice jak własną kieszeń... prawie.',
};

/**
 * Generate bot's coordinate guess given a target [lat, lng] and distance in meters
 */
export function generateBotCoordinates(targetLatLng, distanceInMeters) {
  if (!targetLatLng) return null;
  const earthRadius = 6378137; // in meters
  const [lat, lng] = targetLatLng;
  
  // Random direction
  const angle = Math.random() * 2 * Math.PI;
  
  // Displacement in radians
  const dLat = (distanceInMeters * Math.cos(angle)) / earthRadius;
  const dLng = (distanceInMeters * Math.sin(angle)) / (earthRadius * Math.cos((lat * Math.PI) / 180));
  
  // New coordinates in degrees
  const botLat = lat + (dLat * 180) / Math.PI;
  const botLng = lng + (dLng * 180) / Math.PI;
  
  return [botLat, botLng];
}
