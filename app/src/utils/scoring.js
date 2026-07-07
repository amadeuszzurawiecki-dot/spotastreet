/**
 * Scoring utility for Spotastreet
 * Uses exponential decay formula: max(0, 100 × e^(-0.003 × max(0, distance - 10)))
 */

/**
 * Calculate score based on distance in meters
 * @param {number} distanceMeters - Distance from pin to nearest point on street curve
 * @returns {number} Score 0-100
 */
export function calculateScore(distanceMeters) {
  if (distanceMeters <= 10) return 100;
  const score = 100 * Math.exp(-0.003 * (distanceMeters - 10));
  return Math.max(0, Math.round(score));
}

/**
 * Calculate score for place-guessing mode (Gdzie jest to miejsce?)
 * Uses a gentler exponential decay — landmarks are points, not lines,
 * so a wider tolerance zone is fair. Full 100 pts within 30m, still 50 pts at ~500m.
 * @param {number} distanceMeters
 * @returns {number} Score 0-100
 */
export function calculatePlaceScore(distanceMeters) {
  if (distanceMeters <= 30) return 100;
  const score = 100 * Math.exp(-0.0015 * (distanceMeters - 30));
  return Math.max(0, Math.round(score));
}

/**
 * Get feedback tier based on distance
 * @param {number} distanceMeters
 * @returns {{ tier: string, color: string, icon: string, label: string }}
 */
export function getDistanceFeedback(distanceMeters) {
  if (distanceMeters <= 10) {
    return { tier: 'perfect', color: '#00E676', icon: 'target', label: 'Strzał w dziesiątkę!' };
  }
  if (distanceMeters <= 50) {
    return { tier: 'excellent', color: '#00E676', icon: 'target', label: 'Świetnie!' };
  }
  if (distanceMeters <= 200) {
    return { tier: 'good', color: '#FFEB3B', icon: 'pin', label: 'Nieźle!' };
  }
  if (distanceMeters <= 500) {
    return { tier: 'medium', color: '#FF9800', icon: 'scan', label: 'Może być' };
  }
  return { tier: 'bad', color: '#F44336', icon: 'alert', label: 'Pudło!' };
}

/**
 * Format distance for display
 * @param {number} meters
 * @returns {string}
 */
export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}
