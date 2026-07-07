#!/usr/bin/env node

/**
 * Fetch street geometry data for Legnica, Poland from OpenStreetMap Overpass API.
 *
 * Outputs:
 *   public/data/streets.json      – array of { name, segments } objects
 *   public/data/street_names.json – sorted array of unique street name strings
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, "..", "public", "data");

// ---------------------------------------------------------------------------
// Overpass QL query
// ---------------------------------------------------------------------------
const OVERPASS_QUERY = `
[out:json][timeout:120];
/* 1. Find the admin boundary for Legnica */
area["name"="Legnica"]["boundary"="administrative"]["admin_level"="6"]->.legnica;

/* 2. All named highways inside that area */
way["highway"]["name"](area.legnica);

/* 3. Output with full geometry */
out geom;
`;

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function fetchOverpass(query) {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    console.log(`  → Trying endpoint: ${endpoint}`);
    for (let attempt = 1; attempt <= 2; attempt++) {
      console.log(`    Attempt ${attempt}/2 …`);
      try {
        const url = `${endpoint}?data=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "Spotastreet/1.0 (street data fetch)",
          },
          signal: AbortSignal.timeout(180_000), // 3 min timeout
        });

        if (res.status === 429 || res.status === 504) {
          const wait = attempt * 15_000;
          console.warn(`    ⚠ Got HTTP ${res.status}. Waiting ${wait / 1000}s before retry …`);
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }

        if (!res.ok) {
          const body = await res.text().catch(() => "(no body)");
          console.warn(`    ⚠ HTTP ${res.status} from ${endpoint}. Moving on …`);
          break; // try next endpoint
        }

        const json = await res.json();
        return json;
      } catch (err) {
        console.warn(`    ⚠ ${err.message}`);
        if (attempt < 2) {
          const wait = attempt * 10_000;
          console.warn(`    Retrying in ${wait / 1000}s …`);
          await new Promise((r) => setTimeout(r, wait));
        }
      }
    }
  }
  throw new Error("All Overpass API endpoints failed.");
}

function buildStreets(elements) {
  /** Map<streetName, [[lat,lng][], …]> */
  const map = new Map();

  for (const el of elements) {
    if (el.type !== "way" || !el.tags?.name || !el.geometry?.length) continue;

    const name = el.tags.name.trim();
    const segment = el.geometry.map((pt) => [pt.lat, pt.lon]);

    if (!map.has(name)) {
      map.set(name, []);
    }
    map.get(name).push(segment);
  }

  // Sort alphabetically by street name
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "pl"))
    .map(([name, segments]) => ({ name, segments }));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("🏙  Fetching street data for Legnica, Poland …\n");

  // 1. Query Overpass
  console.log("[1/4] Querying Overpass API …");
  const data = await fetchOverpass(OVERPASS_QUERY);

  if (!data?.elements?.length) {
    throw new Error("Overpass returned no elements – check the query.");
  }
  console.log(`  ✓ Received ${data.elements.length} raw way elements.\n`);

  // 2. Build streets
  console.log("[2/4] Merging ways into streets …");
  const streets = buildStreets(data.elements);
  console.log(`  ✓ ${streets.length} unique streets found.\n`);

  if (streets.length < 100) {
    throw new Error(
      `Only ${streets.length} streets found – expected at least 100. ` +
        `Something may be wrong with the query or the API response.`
    );
  }

  // 3. Build name list
  const streetNames = streets.map((s) => s.name);

  // 4. Write files
  console.log("[3/4] Writing output files …");
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const streetsPath = resolve(OUTPUT_DIR, "streets.json");
  const namesPath = resolve(OUTPUT_DIR, "street_names.json");

  writeFileSync(streetsPath, JSON.stringify(streets, null, 2), "utf-8");
  console.log(`  ✓ ${streetsPath}`);

  writeFileSync(namesPath, JSON.stringify(streetNames, null, 2), "utf-8");
  console.log(`  ✓ ${namesPath}`);

  // 5. Summary
  const totalSegments = streets.reduce((s, st) => s + st.segments.length, 0);
  const totalCoords = streets.reduce(
    (s, st) => s + st.segments.reduce((ss, seg) => ss + seg.length, 0),
    0
  );

  console.log("\n[4/4] Summary");
  console.log("─".repeat(40));
  console.log(`  Streets:    ${streets.length}`);
  console.log(`  Segments:   ${totalSegments}`);
  console.log(`  Coordinates: ${totalCoords}`);
  console.log(`  streets.json size: ${(Buffer.byteLength(JSON.stringify(streets)) / 1024).toFixed(1)} KB`);
  console.log("─".repeat(40));
  console.log("\n✅ Done!");
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err.message);
  process.exit(1);
});
