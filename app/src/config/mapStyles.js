export const DEFAULT_MAP_STYLE_ID = 'mono-dark';

export const MAP_STYLES = [
  {
    id: 'mono-dark',
    name: 'Mono Dark',
    description: 'Czarna mapa z białymi konturami ulic',
    url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
  },
  {
    id: 'mono-light',
    name: 'Mono Light',
    description: 'Biała mapa z czarnymi konturami ulic',
    url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Ciemna mapa bez nazw ulic',
    url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
  },
  {
    id: 'light',
    name: 'Light',
    description: 'Jasna mapa bez nazw ulic',
    url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
  },
  {
    id: 'voyager',
    name: 'Voyager',
    description: 'Czytelna mapa terenowa bez nazw ulic',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Bardziej kontrastowy tryb nocny bez nazw ulic',
    url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
  },
];

export function getMapStyle(styleId) {
  return MAP_STYLES.find(style => style.id === styleId) || MAP_STYLES[0];
}
