/**
 * Car brands, models, and white vector SVG logos for Bolt drivers
 */

export const CAR_BRANDS = [
  {
    id: 'toyota',
    name: 'Toyota',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="12" rx="10" ry="6.5"/><ellipse cx="12" cy="11.5" rx="4" ry="2.5"/><path d="M12 5.5v13"/><path d="M7 11.5c1 3 4 4 5 4s4-1 5-4"/></svg>`,
    models: ['Prius', 'Corolla', 'Yaris', 'Camry', 'C-HR', 'RAV4', 'Auris'],
  },
  {
    id: 'skoda',
    name: 'Škoda',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M7.5 13.5l4.5-4.5 4.5 4.5M12 9v7"/></svg>`,
    models: ['Octavia', 'Fabia', 'Superb', 'Rapid', 'Scalia', 'Kodiaq', 'Kamiq'],
  },
  {
    id: 'volkswagen',
    name: 'Volkswagen',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M6.5 7.5L12 17.5l5.5-10M8.5 7.5L12 14l3.5-6.5"/></svg>`,
    models: ['Golf', 'Passat', 'Polo', 'Arteon', 'Tiguan', 'Touran', 'ID.4'],
  },
  {
    id: 'ford',
    name: 'Ford',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="12" rx="10" ry="5.5"/><path d="M7.5 12h9M9.5 9.5c2.5 0 4.5 1 4.5 2.5s-2 2.5-4.5 2.5"/></svg>`,
    models: ['Focus', 'Fiesta', 'Mondeo', 'Kuga', 'C-Max'],
  },
  {
    id: 'opel',
    name: 'Opel',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M4.5 12h15L9.5 9.5l5 5"/></svg>`,
    models: ['Astra', 'Corsa', 'Insignia', 'Zafira', 'Mokka'],
  },
  {
    id: 'renault',
    name: 'Renault',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l6.5 8.5L12 20 5.5 11.5z"/><path d="M12 7l4 4.5-4 4.5-4-4.5z"/></svg>`,
    models: ['Clio', 'Megane', 'Talisman', 'Scenic', 'Arkana'],
  },
  {
    id: 'hyundai',
    name: 'Hyundai',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="12" rx="9.5" ry="6.5"/><path d="M8 6.5v11M16 6.5v11M8 12c4-2.5 4 2.5 8 0"/></svg>`,
    models: ['i30', 'i20', 'Tucson', 'Elantra', 'Ioniq'],
  },
  {
    id: 'kia',
    name: 'Kia',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="12" rx="10" ry="5"/><path d="M7 9.5v5M12 9.5v5M17 9.5v5M9.5 12h5"/></svg>`,
    models: ['Ceed', 'Rio', 'Sportage', 'Optima', 'Niro'],
  },
  {
    id: 'bmw',
    name: 'BMW',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 2.5v19M2.5 12h19"/><circle cx="12" cy="12" r="4.5"/></svg>`,
    models: ['Seria 3', 'Seria 5', 'Seria 1', 'X3', 'X5'],
  },
  {
    id: 'audi',
    name: 'Audi',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.5" cy="12" r="3.5"/><circle cx="10.2" cy="12" r="3.5"/><circle cx="13.8" cy="12" r="3.5"/><circle cx="17.5" cy="12" r="3.5"/></svg>`,
    models: ['A4', 'A6', 'A3', 'Q5', 'A5'],
  },
  {
    id: 'mercedes',
    name: 'Mercedes-Benz',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 2.5v9.5l-8.2 4.8M12 12l8.2 4.8"/></svg>`,
    models: ['Klasa C', 'Klasa E', 'Klasa A', 'CLA', 'GLC'],
  },
];

export const CAR_COLORS = [
  { id: 'white', name: 'Biały', hex: '#FFFFFF' },
  { id: 'black', name: 'Czarny', hex: '#111111' },
  { id: 'silver', name: 'Srebrny', hex: '#C0C0C0' },
  { id: 'grey', name: 'Szary', hex: '#708090' },
  { id: 'navy', name: 'Granatowy', hex: '#1A237E' },
  { id: 'blue', name: 'Niebieski', hex: '#1E88E5' },
  { id: 'cyan', name: 'Błękitny', hex: '#00BCD4' },
  { id: 'green', name: 'Zielony', hex: '#43A047' },
  { id: 'lime', name: 'Limonka', hex: '#CCFF00' },
  { id: 'yellow', name: 'Żółty', hex: '#FDD835' },
  { id: 'orange', name: 'Pomarańczowy', hex: '#FB8C00' },
  { id: 'red', name: 'Czerwony', hex: '#E53935' },
  { id: 'pink', name: 'Różowy', hex: '#E91E63' },
  { id: 'purple', name: 'Fioletowy', hex: '#8E24AA' },
];
