/**
 * Street data loading and management for Spotastreet
 */

let streetsCache = null;
let streetNamesCache = null;

/**
 * Normalize street names for answer comparison.
 * Handles common prefixes, case and Polish diacritics.
 */
export function normalizeStreetName(name = '') {
  return String(name)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(ul\.?|ulica)\s+/, '')
    .replace(/\s+/g, ' ');
}

/**
 * Load street geometries from static JSON
 * @returns {Promise<Array<{ name: string, segments: Array<Array<[number, number]>> }>>}
 */
export async function loadStreets() {
  if (streetsCache) return streetsCache;
  
  try {
    const response = await fetch('/data/streets.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    streetsCache = await response.json();
    return streetsCache;
  } catch (error) {
    console.error('Failed to load streets:', error);
    return [];
  }
}

/**
 * Load street names for autocomplete
 * @returns {Promise<string[]>}
 */
export async function loadStreetNames() {
  if (streetNamesCache) return streetNamesCache;
  
  try {
    const response = await fetch('/data/street_names.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    streetNamesCache = await response.json();
    return streetNamesCache;
  } catch (error) {
    console.error('Failed to load street names:', error);
    // Fallback: extract from streets
    const streets = await loadStreets();
    streetNamesCache = [...new Set(streets.map(s => s.name))].sort();
    return streetNamesCache;
  }
}

/**
 * Fisher-Yates shuffle
 * @param {Array} array
 * @returns {Array} Shuffled copy
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Select N random streets for a quiz round (no repeats)
 * @param {number} count - Number of streets to select
 * @returns {Promise<Array<{ name: string, segments: Array<Array<[number, number]>> }>>}
 */
export async function selectRandomStreets(count = 10) {
  const streets = await loadStreets();
  
  // Filter out streets with very few points (too small to be interesting)
  const validStreets = streets.filter(s => {
    const totalPoints = s.segments.reduce((sum, seg) => sum + seg.length, 0);
    return totalPoints >= 3;
  });
  
  const shuffled = shuffle(validStreets);
  return shuffled.slice(0, count);
}

/**
 * Fuzzy search street names
 * @param {string} query
 * @param {string[]} names
 * @param {number} limit
 * @returns {string[]}
 */
export function fuzzySearchStreets(query, names, limit = 8) {
  if (!query || query.length === 0) return [];
  
  const normalizedQuery = normalizeStreetName(query);
  
  const scored = names.map(name => {
    const normalizedName = normalizeStreetName(name);
    
    // Exact prefix match (highest priority)
    if (normalizedName.startsWith(normalizedQuery)) {
      return { name, score: 3 };
    }
    
    // Contains match
    if (normalizedName.includes(normalizedQuery)) {
      return { name, score: 2 };
    }
    
    // Fuzzy: check if all query chars appear in order
    let qi = 0;
    for (let i = 0; i < normalizedName.length && qi < normalizedQuery.length; i++) {
      if (normalizedName[i] === normalizedQuery[qi]) qi++;
    }
    if (qi === normalizedQuery.length) {
      return { name, score: 1 };
    }
    
    return { name, score: 0 };
  });
  
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'pl'))
    .slice(0, limit)
    .map(s => s.name);
}
