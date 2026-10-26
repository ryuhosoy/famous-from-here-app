/**
 * Builds src/data/japan-places.json from Wikidata administrative units in Japan
 * (prefectures, cities, wards, towns, villages) that have coordinates.
 *
 * Run: node scripts/build-japan-places.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const UA = 'FamousFromHere/1.0 (hometown-celebrities-app; japan-place-pins)';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/japan-places.json');

const QUERY = `
SELECT DISTINCT ?id ?ja ?en ?lat ?lon ?pop ?typeId WHERE {
  VALUES ?type {
    wd:Q137773   # ward of Japan (特別区・行政区)
    wd:Q494721   # city of Japan
    wd:Q4174776  # village of Japan
    wd:Q50337    # prefecture of Japan
    wd:Q1059478  # town of Japan (if used)
    wd:Q532713   # special ward
  }
  ?place wdt:P31 ?type ;
         wdt:P17 wd:Q17 ;
         wdt:P625 ?coord .
  BIND(xsd:integer(STRAFTER(STR(?place), "entity/Q")) AS ?id)
  BIND(xsd:integer(STRAFTER(STR(?type), "entity/Q")) AS ?typeId)
  BIND(geof:latitude(?coord) AS ?lat)
  BIND(geof:longitude(?coord) AS ?lon)
  OPTIONAL { ?place wdt:P1082 ?pop }
  OPTIONAL { ?place rdfs:label ?ja FILTER(LANG(?ja) = "ja") }
  OPTIONAL { ?place rdfs:label ?en FILTER(LANG(?en) = "en") }
}
`.trim();

function kindFromJaAndType(ja, typeId) {
  if (/区$/.test(ja) || typeId === 137773 || typeId === 532713) return 0;
  if (/市$/.test(ja) || typeId === 494721) return 1;
  if (/[町村]$/.test(ja) || typeId === 1059478 || typeId === 4174776) return 2;
  if (/[都府県]$/.test(ja) || typeId === 50337) return 3;
  return 4;
}

const res = await fetch(`https://query.wikidata.org/sparql?${new URLSearchParams({ query: QUERY })}`, {
  headers: {
    Accept: 'application/sparql-results+json',
    'User-Agent': UA,
  },
});
if (!res.ok) {
  throw new Error(`SPARQL ${res.status} ${await res.text()}`);
}
const data = await res.json();
const rows = data?.results?.bindings ?? [];

const byId = new Map();
for (const row of rows) {
  const id = Number(row.id?.value);
  const ja = row.ja?.value ?? '';
  const en = row.en?.value ?? ja;
  const lat = Number(row.lat?.value);
  const lng = Number(row.lon?.value);
  const pop = Number(row.pop?.value) || 0;
  const typeId = Number(row.typeId?.value) || 0;
  if (!id || !ja || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
  const prev = byId.get(id);
  if (prev && prev[5] >= pop) continue;
  byId.set(id, [id, en, ja, lat, lng, pop, kindFromJaAndType(ja, typeId)]);
}

const tuples = [...byId.values()].sort((a, b) => b[5] - a[5]);
writeFileSync(OUT, JSON.stringify(tuples));
const kinds = [0, 1, 2, 3, 4].map((k) => tuples.filter((t) => t[6] === k).length);
process.stderr.write(
  `wrote ${tuples.length} Japan places (ward=${kinds[0]} city=${kinds[1]} town=${kinds[2]} pref=${kinds[3]} other=${kinds[4]})\n`
);
