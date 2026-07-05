import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LEGNICA_CENTER } from '../../utils/geo';
import { getMapStyle } from '../../config/mapStyles';
import useTheme from '../../hooks/useTheme';
import './GameMap.css';

const MAPLIBRE_SCRIPT_URL = 'https://unpkg.com/maplibre-gl@5.9.0/dist/maplibre-gl.js';
const MAPLIBRE_CSS_URL = 'https://unpkg.com/maplibre-gl@5.9.0/dist/maplibre-gl.css';

let maplibrePromise = null;

function loadMapLibre() {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (maplibrePromise) return maplibrePromise;

  maplibrePromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${MAPLIBRE_CSS_URL}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = MAPLIBRE_CSS_URL;
      document.head.appendChild(link);
    }

    const existingScript = document.querySelector(`script[src="${MAPLIBRE_SCRIPT_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.maplibregl), { once: true });
      existingScript.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = MAPLIBRE_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.maplibregl);
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return maplibrePromise;
}

const toLngLat = (point) => [point[1], point[0]];
const toLngLatLine = (line) => line.map(toLngLat);

function lineFeature(id, coordinates, properties = {}) {
  return {
    type: 'Feature',
    id,
    properties,
    geometry: {
      type: 'LineString',
      coordinates,
    },
  };
}

function makeLineCollection(features) {
  return {
    type: 'FeatureCollection',
    features,
  };
}

function makeBounds(bounds) {
  if (!bounds) return null;
  const [[south, west], [north, east]] = bounds;
  return [[west, south], [east, north]];
}

function normalizePadding(options) {
  if (!options) return 56;
  if (options.padding) return options.padding;
  if (options.paddingTopLeft || options.paddingBottomRight) {
    const [left = 40, top = 40] = options.paddingTopLeft || [];
    const [right = 40, bottom = 40] = options.paddingBottomRight || [];
    return { top, right, bottom, left };
  }
  return 56;
}

function applyGeoapifyOverrides(map) {
  const setPaint = (layer, property, value) => {
    if (map.getLayer(layer)) {
      map.setPaintProperty(layer, property, value);
    }
  };

  const setLayout = (layer, property, value) => {
    if (map.getLayer(layer)) {
      map.setLayoutProperty(layer, property, value);
    }
  };

  setPaint('highway_path', 'line-color', '#494949');
  setPaint('highway_minor', 'line-color', '#6d6d6d');
  setPaint('highway_major_casing', 'line-color', 'rgba(144,144,144,0.8)');
  setPaint('highway_major_inner', 'line-color', '#747474');
  setLayout('highway_name_other', 'visibility', 'none');
  setLayout('highway_name_motorway', 'visibility', 'none');
}

function upsertLineLayer(map, sourceId, layerId, data, paint) {
  if (map.getSource(sourceId)) {
    map.getSource(sourceId).setData(data);
  } else {
    map.addSource(sourceId, {
      type: 'geojson',
      data,
    });
  }

  if (!map.getLayer(layerId)) {
    map.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint,
    });
  }
}

function MapOverlayMarker({ point, className, children }) {
  if (!point) return null;
  return (
    <div
      className={`maplibre-overlay-marker ${className || ''}`}
      style={{ transform: `translate3d(${point.x}px, ${point.y}px, 0)` }}
    >
      {children}
    </div>
  );
}

function GameMap({
  onMapClick,
  pinPosition,
  streetSegments,
  showStreet = false,
  closestPoint,
  disabled = false,
  roundKey = 0,
  fitBounds,
  paddingOptions,
  enableZoom = true,

  playerAvatar,
  playerAvatarImg,
  playerBg,
  playerRoundScore,
  playerRoundDistance,
  playerIsPremium = false,

  botPinPosition,
  botRoundScore,
  botRoundDistance,
  opponentName = 'Legniczanin',
  opponentAvatar = 'AI',
  opponentAvatarImg,
  opponentBg = '#2A2A3E',
  opponentIsPremium = false,
  showResultDetails = false,
  summaryRounds = [],
  focusedSummaryRound = null,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const lastFitSignatureRef = useRef('');
  const disabledRef = useRef(disabled);
  const onMapClickRef = useRef(onMapClick);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [overlayPoints, setOverlayPoints] = useState({});
  const { theme } = useTheme();
  const mapStyle = getMapStyle(theme === 'light' ? 'mono-light' : 'mono-dark');

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  const focusedSummaryItem = useMemo(() => (
    summaryRounds.find(item => item.round === focusedSummaryRound) || null
  ), [summaryRounds, focusedSummaryRound]);

  const updateOverlayPoints = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const project = (point) => {
      if (!point) return null;
      const projected = map.project(toLngLat(point));
      return { x: projected.x, y: projected.y };
    };

    setOverlayPoints({
      pin: project(pinPosition),
      closest: project(closestPoint),
      bot: project(botPinPosition),
      summary: summaryRounds.map(item => ({
        round: item.round,
        point: project(item.labelPosition),
      })),
    });
  }, [pinPosition, closestPoint, botPinPosition, summaryRounds]);

  useEffect(() => {
    let cancelled = false;
    let map;

    loadMapLibre()
      .then((maplibregl) => {
        if (cancelled || !containerRef.current) return;

        map = new maplibregl.Map({
          container: containerRef.current,
          style: mapStyle.url,
          center: toLngLat(LEGNICA_CENTER),
          zoom: 13,
          attributionControl: false,
        });

        mapRef.current = map;

        if (enableZoom) {
          map.scrollZoom.enable();
          map.doubleClickZoom.enable();
          map.touchZoomRotate.enable();
        } else {
          map.scrollZoom.disable();
          map.doubleClickZoom.disable();
          map.touchZoomRotate.disable();
        }

        map.on('load', () => {
          applyGeoapifyOverrides(map);
          setMapReady(true);
          updateOverlayPoints();
        });

        map.on('styledata', () => {
          applyGeoapifyOverrides(map);
        });

        map.on('move', updateOverlayPoints);
        map.on('zoom', updateOverlayPoints);
        map.on('resize', updateOverlayPoints);
        map.on('click', (event) => {
          if (!disabledRef.current) {
            onMapClickRef.current?.([event.lngLat.lat, event.lngLat.lng]);
          }
        });
      })
      .catch((error) => {
        console.error('MapLibre load error:', error);
        setMapError('Nie udało się załadować mapy Geoapify.');
      });

    return () => {
      cancelled = true;
      setMapReady(false);
      if (map) {
        map.remove();
      }
      if (mapRef.current === map) {
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setMapReady(false);
    map.setStyle(mapStyle.url);
    map.once('styledata', () => {
      applyGeoapifyOverrides(map);
      setMapReady(true);
      updateOverlayPoints();
    });
  }, [mapStyle.url, updateOverlayPoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.easeTo({
      center: toLngLat(LEGNICA_CENTER),
      zoom: 13,
      duration: 500,
    });
  }, [roundKey, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !fitBounds || focusedSummaryItem) return;
    const fitSignature = JSON.stringify({
      fitBounds,
      padding: normalizePadding(paddingOptions),
      maxZoom: paddingOptions?.maxZoom || 16,
      roundKey,
    });
    if (lastFitSignatureRef.current === fitSignature) return;
    lastFitSignatureRef.current = fitSignature;

    map.fitBounds(makeBounds(fitBounds), {
      padding: normalizePadding(paddingOptions),
      maxZoom: paddingOptions?.maxZoom || 16,
      duration: (paddingOptions?.duration || 0.8) * 1000,
    });
  }, [fitBounds, paddingOptions, focusedSummaryItem, mapReady, roundKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !focusedSummaryItem?.labelPosition) return;
    map.jumpTo({
      center: toLngLat(focusedSummaryItem.labelPosition),
      zoom: 17,
    });
  }, [focusedSummaryItem, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const summaryFeatures = summaryRounds.flatMap((item) => (
      item.segments?.map((segment, segmentIndex) => (
        lineFeature(`summary-${item.round}-${segmentIndex}`, toLngLatLine(segment), {
          color: item.color || '#00E676',
        })
      )) || []
    ));

    upsertLineLayer(
      map,
      'summary-streets',
      'summary-streets-layer',
      makeLineCollection(summaryFeatures),
      {
        'line-color': ['coalesce', ['get', 'color'], '#00E676'],
        'line-width': 5,
        'line-opacity': 0.86,
      }
    );

    const highlightFeatures = showStreet && streetSegments
      ? streetSegments.map((segment, index) => lineFeature(`street-${index}`, toLngLatLine(segment)))
      : [];

    upsertLineLayer(
      map,
      'street-highlight',
      'street-highlight-layer',
      makeLineCollection(highlightFeatures),
      {
        'line-color': '#00E676',
        'line-width': 5,
        'line-opacity': 0.9,
      }
    );

    const helperFeatures = [];
    if (pinPosition && closestPoint) {
      helperFeatures.push(lineFeature('player-distance', [toLngLat(pinPosition), toLngLat(closestPoint)], { opacity: 0.75, width: 2.5 }));
    }
    if (showResultDetails && botPinPosition && closestPoint) {
      helperFeatures.push(lineFeature('bot-distance', [toLngLat(botPinPosition), toLngLat(closestPoint)], { opacity: 0.45, width: 1.5 }));
    }

    upsertLineLayer(
      map,
      'distance-lines',
      'distance-lines-layer',
      makeLineCollection(helperFeatures),
      {
        'line-color': '#ffffff',
        'line-width': ['coalesce', ['get', 'width'], 2],
        'line-opacity': ['coalesce', ['get', 'opacity'], 0.6],
        'line-dasharray': [2, 2],
      }
    );

    updateOverlayPoints();
  }, [
    mapReady,
    summaryRounds,
    showStreet,
    streetSegments,
    pinPosition,
    closestPoint,
    botPinPosition,
    showResultDetails,
    updateOverlayPoints,
  ]);

  const playerAvatarContent = playerAvatarImg
    ? <img src={playerAvatarImg} className="map-avatar-img" alt="" />
    : <span className="map-avatar-emoji">{playerAvatar || 'U'}</span>;

  const opponentAvatarContent = opponentAvatarImg
    ? <img src={opponentAvatarImg} className="map-avatar-img" alt="" />
    : <span className="map-avatar-emoji">{opponentAvatar || 'AI'}</span>;

  return (
    <div className={`game-map game-map--${mapStyle.id}`}>
      <div ref={containerRef} className="game-map__container" />

      {mapError && (
        <div className="game-map__error">
          {mapError}
        </div>
      )}

      <div className="game-map__overlay">
        {summaryRounds.map((item) => {
          const projected = overlayPoints.summary?.find(point => point.round === item.round)?.point;
          return (
            <MapOverlayMarker key={`summary-label-${item.round}`} point={projected}>
              <div className={`round-map-badge round-map-badge--${item.status || 'draw'}`}>{item.round}</div>
              <div className={`map-tooltip-unified map-tooltip-unified--round map-tooltip-unified--${item.status || 'draw'}`}>
                <div className="map-tooltip__score">Runda {item.round}: {item.statusLabel}</div>
                <div className="map-tooltip__distance">{item.name}</div>
              </div>
            </MapOverlayMarker>
          );
        })}

        {pinPosition && (
          <MapOverlayMarker point={overlayPoints.pin}>
            {showResultDetails ? (
              <>
                <div
                  className={`player-map-marker ${playerIsPremium ? 'premium-glow-avatar' : ''}`}
                  style={{ backgroundColor: playerBg || '#3b82f6' }}
                >
                  {playerAvatarContent}
                  <div className="player-map-marker__pulse" />
                </div>
                {playerRoundScore !== undefined && (
                  <div className="map-tooltip-unified">
                    <div className="map-tooltip__score">Zdobywasz {playerRoundScore} pkt</div>
                    {playerRoundDistance !== undefined && (
                      <div className="map-tooltip__distance">Pudło o {Math.round(playerRoundDistance)} metry</div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="pin-marker">
                <div className="pin-marker__ring" />
                <div className="pin-marker__dot" />
              </div>
            )}
          </MapOverlayMarker>
        )}

        {showResultDetails && botPinPosition && (
          <MapOverlayMarker point={overlayPoints.bot}>
            <div
              className={`player-map-marker player-map-marker--opponent ${opponentIsPremium ? 'premium-glow-avatar' : ''}`}
              style={{ backgroundColor: opponentBg || '#2A2A3E' }}
            >
              {opponentAvatarContent}
              <div className="player-map-marker__pulse" />
            </div>
            {botRoundScore !== undefined && (
              <div className="map-tooltip-unified map-tooltip-unified--bot map-tooltip-unified--bottom">
                <div className="map-tooltip__score">{opponentName}: {botRoundScore} pkt</div>
                {botRoundDistance !== undefined && (
                  <div className="map-tooltip__distance">Pudło o {Math.round(botRoundDistance)} metry</div>
                )}
              </div>
            )}
          </MapOverlayMarker>
        )}

        {closestPoint && (
          <MapOverlayMarker point={overlayPoints.closest}>
            <div className="target-marker" />
          </MapOverlayMarker>
        )}
      </div>
    </div>
  );
}

export default GameMap;
