import { CAR_BRANDS } from '../data/cars';
import './CarBadge.css';

/**
 * Car Badge component showing white SVG brand logo + brand + model + color circle
 */
export function CarBadge({ car }) {
  if (!car) return null;

  const brandObj = CAR_BRANDS.find(b => b.id === car.brandId || b.name === car.brandName) || CAR_BRANDS[0];
  const svgContent = car.svg || brandObj?.svg;

  return (
    <div className="car-badge">
      {svgContent ? (
        <span 
          className="car-badge__svg-logo" 
          dangerouslySetInnerHTML={{ __html: svgContent }} 
        />
      ) : (
        <span className="car-badge__logo line-icon line-icon--settings" aria-hidden="true" />
      )}
      <span className="car-badge__name">{car.brandName || car.brandId}</span>
      <span className="car-badge__model">{car.model}</span>
      <div 
        className="car-badge__color-dot" 
        style={{ backgroundColor: car.colorHex || '#FFF' }}
        title={car.colorId}
      />
    </div>
  );
}

export default CarBadge;
