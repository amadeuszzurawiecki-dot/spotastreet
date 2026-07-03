import { MapContainer, TileLayer, useMapEvents, Polyline, Marker, Tooltip, useMap } from 'react-leaflet';
import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { LEGNICA_CENTER } from '../../utils/geo';
import './GameMap.css';

// Default placement pin icon
const createPinIcon = () => L.divIcon({
  className: 'custom-pin',
  html: `
    <div class="pin-marker">
      <div class="pin-marker__ring"></div>
      <div class="pin-marker__dot"></div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// Closest point marker
const createTargetIcon = () => L.divIcon({
  className: 'target-point',
  html: `<div class="target-marker"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const createRoundBadgeIcon = (round) => L.divIcon({
  className: 'round-map-badge-icon',
  html: `<div class="round-map-badge">${round}</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

// Create Player Avatar marker on round end
const createPlayerPinIcon = (avatarChar, avatarImg, bg, isPremium) => {
  const htmlContent = avatarImg 
    ? `<img src="${avatarImg}" class="map-avatar-img" />`
    : `<span class="map-avatar-emoji">${avatarChar || '👤'}</span>`;
    
  return L.divIcon({
    className: 'custom-player-pin',
    html: `
      <div class="player-map-marker ${isPremium ? 'premium-glow-avatar' : ''}" style="background-color: ${bg || '#3b82f6'};">
        ${htmlContent}
        <div class="player-map-marker__pulse"></div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
};

// Create Opponent Avatar marker on round end
const createOpponentPinIcon = (avatarChar, avatarImg, bg, isPremium) => {
  const htmlContent = avatarImg 
    ? `<img src="${avatarImg}" class="map-avatar-img" />`
    : `<span class="map-avatar-emoji">${avatarChar || '🤖'}</span>`;
    
  return L.divIcon({
    className: 'custom-opponent-pin',
    html: `
      <div class="player-map-marker player-map-marker--opponent ${isPremium ? 'premium-glow-avatar' : ''}" style="background-color: ${bg || '#2A2A3E'};">
        ${htmlContent}
        <div class="player-map-marker__pulse"></div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
};

/**
 * Click handler component for placing pins
 */
function MapClickHandler({ onMapClick, disabled }) {
  useMapEvents({
    click: (e) => {
      if (!disabled) {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

/**
 * Auto-fit map to bounds
 */
function FitBounds({ bounds, paddingOptions }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      const options = paddingOptions || { padding: [50, 50], maxZoom: 16, animate: true, duration: 0.8 };
      map.fitBounds(bounds, options);
    }
  }, [bounds, map]);
  return null;
}

/**
 * Reset map view on round change
 */
function ResetView({ center, zoom, trigger }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 0.5 });
  }, [trigger, center, zoom, map]);
  return null;
}

/**
 * GameMap component
 */
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
  
  // Results details for Figma styling
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
  opponentAvatar = '🤖',
  opponentAvatarImg,
  opponentBg = '#2A2A3E',
  opponentIsPremium = false,
  showResultDetails = false,
  summaryRounds = []
}) {
  const pinIcon = useMemo(() => createPinIcon(), []);
  const targetIcon = useMemo(() => createTargetIcon(), []);
  
  const playerResultIcon = useMemo(() => {
    return createPlayerPinIcon(playerAvatar, playerAvatarImg, playerBg, playerIsPremium);
  }, [playerAvatar, playerAvatarImg, playerBg, playerIsPremium]);

  const opponentResultIcon = useMemo(() => {
    return createOpponentPinIcon(opponentAvatar, opponentAvatarImg, opponentBg, opponentIsPremium);
  }, [opponentAvatar, opponentAvatarImg, opponentBg, opponentIsPremium]);

  return (
    <div className="game-map">
      <MapContainer
        center={LEGNICA_CENTER}
        zoom={13}
        className="game-map__container"
        zoomControl={false}
        attributionControl={false}
        doubleClickZoom={enableZoom}
        scrollWheelZoom={enableZoom}
        dragging={true}
        touchZoom={enableZoom}
      >
        <TileLayer
          url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_nolabels/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={19}
          subdomains="abcd"
        />
        
        <MapClickHandler onMapClick={onMapClick} disabled={disabled} />
        
        <ResetView center={LEGNICA_CENTER} zoom={13} trigger={roundKey} />
        
        {fitBounds && <FitBounds bounds={fitBounds} paddingOptions={paddingOptions} />}

        {summaryRounds.map((item) => (
          item.segments?.map((segment, segmentIndex) => (
            <Polyline
              key={`summary-street-${item.round}-${segmentIndex}`}
              positions={segment}
              pathOptions={{
                color: item.color || '#00E676',
                weight: 5,
                opacity: 0.86,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          ))
        ))}

        {summaryRounds.map((item) => (
          item.labelPosition && (
            <Marker
              key={`summary-label-${item.round}`}
              position={item.labelPosition}
              icon={createRoundBadgeIcon(item.round)}
            >
              <Tooltip permanent direction="top" className="map-tooltip-unified map-tooltip-unified--round">
                <div className="map-tooltip__score">Runda {item.round}</div>
                <div className="map-tooltip__distance">{item.name}</div>
              </Tooltip>
            </Marker>
          )
        ))}
        
        {/* Street highlight */}
        {showStreet && streetSegments && streetSegments.map((segment, i) => (
          <Polyline
            key={`street-${i}`}
            positions={segment}
            pathOptions={{
              color: '#00E676',
              weight: 5,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        ))}
        
        {/* Pin marker (User placement OR User result with Avatar) */}
        {pinPosition && (
          <Marker 
            position={pinPosition} 
            icon={showResultDetails ? playerResultIcon : pinIcon}
          >
            {showResultDetails && playerRoundScore !== undefined && (
              <Tooltip permanent direction="top" className="map-tooltip-unified">
                <div className="map-tooltip__score">Zdobywasz {playerRoundScore} pkt</div>
                {playerRoundDistance !== undefined && (
                  <div className="map-tooltip__distance">Pudło o {Math.round(playerRoundDistance)} metry</div>
                )}
              </Tooltip>
            )}
          </Marker>
        )}
        
        {/* Bot / Opponent guess marker */}
        {showResultDetails && botPinPosition && (
          <Marker position={botPinPosition} icon={opponentResultIcon}>
            {botRoundScore !== undefined && (
              <Tooltip permanent direction="bottom" className="map-tooltip-unified map-tooltip-unified--bot">
                <div className="map-tooltip__score">{opponentName}: {botRoundScore} pkt</div>
                {botRoundDistance !== undefined && (
                  <div className="map-tooltip__distance">Pudło o {Math.round(botRoundDistance)} metry</div>
                )}
              </Tooltip>
            )}
          </Marker>
        )}
        
        {/* Closest point on street */}
        {closestPoint && (
          <Marker position={closestPoint} icon={targetIcon} />
        )}
        
        {/* Dashed line from player pin to closest point */}
        {pinPosition && closestPoint && (
          <Polyline
            positions={[pinPosition, closestPoint]}
            pathOptions={{
              color: '#ffffff',
              weight: 2.5,
              opacity: 0.75,
              dashArray: '8, 8',
            }}
          />
        )}

        {/* Dashed line from bot pin to closest point */}
        {showResultDetails && botPinPosition && closestPoint && (
          <Polyline
            positions={[botPinPosition, closestPoint]}
            pathOptions={{
              color: '#ffffff',
              weight: 1.5,
              opacity: 0.45,
              dashArray: '6, 6',
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

export default GameMap;
