import fs from 'fs';
import path from 'path';

const streetsPath = path.join(process.cwd(), 'public', 'data', 'streets.json');
const streets = JSON.parse(fs.readFileSync(streetsPath, 'utf8'));

// Filter streets with sufficient segments
const validStreets = streets.filter(s => s.name && s.segments && s.segments.length > 0);

const addresses = [];
let idCounter = 1;

validStreets.forEach((street) => {
  // Take first 3-5 house numbers for prominent streets
  const segments = street.segments.flat();
  if (segments.length < 2) return;

  const houseNumbers = [2, 7, 14, 25, 42, 68, 89];
  const countToGen = Math.min(3, Math.floor(segments.length / 2));

  for (let i = 0; i < countToGen; i++) {
    const ptIdx = Math.floor((i + 1) * (segments.length / (countToGen + 1)));
    const pt = segments[ptIdx] || segments[0];
    const houseNum = houseNumbers[i % houseNumbers.length] + (i * 3);

    addresses.push({
      id: `addr-${idCounter++}`,
      streetName: street.name,
      houseNumber: `${houseNum}`,
      fullAddress: `ul. ${street.name} ${houseNum}`,
      lat: pt[0],
      lng: pt[1],
    });
  }
});

const outputPath = path.join(process.cwd(), 'public', 'data', 'addresses.json');
fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
console.log(`Successfully generated ${addresses.length} address points!`);
