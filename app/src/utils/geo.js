/**
 * Geo utility functions for Spotastreet
 * Calculates distances between points and polylines using Haversine formula
 */

const EARTH_RADIUS = 6371000; // meters

/**
 * Convert degrees to radians
 */
function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Haversine distance between two [lat, lng] points in meters
 */
export function haversineDistance(point1, point2) {
  const [lat1, lng1] = point1;
  const [lat2, lng2] = point2;
  
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  
  return EARTH_RADIUS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Find the closest point on a line segment [A, B] to point P
 * Works in lat/lng coordinates (good enough for city-scale)
 * @param {[number, number]} p - Point [lat, lng]
 * @param {[number, number]} a - Segment start [lat, lng]
 * @param {[number, number]} b - Segment end [lat, lng]
 * @returns {[number, number]} Closest point on segment
 */
function closestPointOnSegment(p, a, b) {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  
  const dx = bx - ax;
  const dy = by - ay;
  
  if (dx === 0 && dy === 0) return a;
  
  // Project p onto line ab, clamped to [0, 1]
  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  
  return [ax + t * dx, ay + t * dy];
}

/**
 * Find the minimum distance from a point to a polyline (array of segments)
 * @param {[number, number]} point - [lat, lng]
 * @param {Array<[number, number]>} polyline - Array of [lat, lng] coordinate pairs
 * @returns {{ distance: number, closestPoint: [number, number] }}
 */
export function distanceToPolyline(point, polyline) {
  let minDistance = Infinity;
  let closestPoint = polyline[0];
  
  for (let i = 0; i < polyline.length - 1; i++) {
    const segmentClosest = closestPointOnSegment(point, polyline[i], polyline[i + 1]);
    const dist = haversineDistance(point, segmentClosest);
    
    if (dist < minDistance) {
      minDistance = dist;
      closestPoint = segmentClosest;
    }
  }
  
  return { distance: minDistance, closestPoint };
}

/**
 * Find the minimum distance from a point to a street (which may have multiple segments)
 * @param {[number, number]} point - [lat, lng]
 * @param {Array<Array<[number, number]>>} segments - Array of polylines
 * @returns {{ distance: number, closestPoint: [number, number] }}
 */
export function distanceToStreet(point, segments) {
  let minDistance = Infinity;
  let closestPoint = null;
  
  for (const segment of segments) {
    if (segment.length < 2) continue;
    const result = distanceToPolyline(point, segment);
    if (result.distance < minDistance) {
      minDistance = result.distance;
      closestPoint = result.closestPoint;
    }
  }
  
  return { distance: minDistance, closestPoint: closestPoint || [0, 0] };
}

/**
 * Get the bounding box of a street's segments
 * @param {Array<Array<[number, number]>>} segments
 * @returns {[[number, number], [number, number]]} [[minLat, minLng], [maxLat, maxLng]]
 */
export function getStreetBounds(segments) {
  let minLat = Infinity, minLng = Infinity;
  let maxLat = -Infinity, maxLng = -Infinity;
  
  for (const segment of segments) {
    for (const [lat, lng] of segment) {
      minLat = Math.min(minLat, lat);
      minLng = Math.min(minLng, lng);
      maxLat = Math.max(maxLat, lat);
      maxLng = Math.max(maxLng, lng);
    }
  }
  
  return [[minLat, minLng], [maxLat, maxLng]];
}

/**
 * Get bounding box combining street segments, user pin position, and closest point
 */
export function getCombinedBounds(segments, pinPosition, closestPoint) {
  let minLat = Infinity, minLng = Infinity;
  let maxLat = -Infinity, maxLng = -Infinity;
  
  if (segments) {
    for (const segment of segments) {
      for (const [lat, lng] of segment) {
        minLat = Math.min(minLat, lat);
        minLng = Math.min(minLng, lng);
        maxLat = Math.max(maxLat, lat);
        maxLng = Math.max(maxLng, lng);
      }
    }
  }
  
  if (pinPosition) {
    minLat = Math.min(minLat, pinPosition[0]);
    minLng = Math.min(minLng, pinPosition[1]);
    maxLat = Math.max(maxLat, pinPosition[0]);
    maxLng = Math.max(maxLng, pinPosition[1]);
  }
  
  if (closestPoint) {
    minLat = Math.min(minLat, closestPoint[0]);
    minLng = Math.min(minLng, closestPoint[1]);
    maxLat = Math.max(maxLat, closestPoint[0]);
    maxLng = Math.max(maxLng, closestPoint[1]);
  }

  if (minLat === Infinity) return null;
  
  return [[minLat, minLng], [maxLat, maxLng]];
}

/**
 * Find distance from user pin to a single target point
 */
export function distanceToPoint(point, target) {
  const dist = haversineDistance(point, target);
  return { distance: dist, closestPoint: target };
}

/**
 * Get bounding box combining multiple points (e.g. user pin and target location)
 */
export function getPointsCombinedBounds(points) {
  let minLat = Infinity, minLng = Infinity;
  let maxLat = -Infinity, maxLng = -Infinity;

  for (const pt of points) {
    if (!pt) continue;
    minLat = Math.min(minLat, pt[0]);
    minLng = Math.min(minLng, pt[1]);
    maxLat = Math.max(maxLat, pt[0]);
    maxLng = Math.max(maxLng, pt[1]);
  }

  if (minLat === Infinity) return null;
  return [[minLat, minLng], [maxLat, maxLng]];
}

/**
 * Legnica city center coordinates
 */
export const LEGNICA_CENTER = [51.2070, 16.1619];

/**
 * Legnica default bounds for the map
 */
export const LEGNICA_BOUNDS = [[51.155, 16.09], [51.255, 16.24]];

