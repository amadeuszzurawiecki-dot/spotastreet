import { MapContainer, TileLayer } from 'react-leaflet';
import { LEGNICA_CENTER } from '../utils/geo';
import './LegnicaBackgroundMap.css';

const BACKGROUND_MAPS = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
};

function LegnicaBackgroundMap({ theme }) {
  const isLight = theme === 'light' || document.documentElement.dataset.theme === 'light';
  const tileUrl = isLight ? BACKGROUND_MAPS.light : BACKGROUND_MAPS.dark;

  return (
    <div className={`legnica-background-map legnica-background-map--${isLight ? 'light' : 'dark'}`} aria-hidden="true">
      <div className="legnica-background-map__drift">
        <MapContainer
          center={LEGNICA_CENTER}
          zoom={13}
          zoomControl={false}
          attributionControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          touchZoom={false}
          keyboard={false}
          className="legnica-background-map__container"
        >
          <TileLayer
            url={tileUrl}
            subdomains="abcd"
            maxZoom={19}
          />
        </MapContainer>
      </div>
    </div>
  );
}

export default LegnicaBackgroundMap;
