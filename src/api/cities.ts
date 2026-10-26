import { Lang } from '../i18n';
import { CityPin, MapRegion } from '../types';
import rawWorldCities from '../data/world-cities.json';
import rawJapanPlaces from '../data/japan-places.json';

/**
 * Pin dataset:
 * - Japan: Wikidata administrative units (区・市・町・村・都道府県)
 * - elsewhere: GeoNames cities (population >= 15,000)
 *
 * Japan names match Wikipedia "X出身の人物" categories (e.g. 渋谷区, not 渋谷).
 * GeoNames: https://download.geonames.org/export/dump/ (CC BY 4.0)
 */
type WorldTuple = [id: number, name: string, ja: string, lat: number, lng: number, population: number];
type JapanTuple = [id: number, name: string, ja: string, lat: number, lng: number, population: number, kind: number];

const KIND_WARD = 0;
const KIND_CITY = 1;
const KIND_TOWN = 2;
const KIND_PREF = 3;
const KIND_OTHER = 4;

const WIKIDATA_ID_OFFSET = 2_000_000_000;

const TOKYO_WARDS: JapanTuple[] = [
  [2000000001, 'Chiyoda', '千代田区', 35.6939, 139.7536, 66680, KIND_WARD],
  [2000000002, 'Chuo', '中央区', 35.6706, 139.772, 169179, KIND_WARD],
  [2000000003, 'Minato', '港区', 35.6581, 139.7515, 260486, KIND_WARD],
  [2000000004, 'Shinjuku', '新宿区', 35.6939, 139.7034, 349385, KIND_WARD],
  [2000000005, 'Bunkyo', '文京区', 35.708, 139.7523, 240069, KIND_WARD],
  [2000000006, 'Taito', '台東区', 35.7126, 139.78, 211444, KIND_WARD],
  [2000000007, 'Sumida', '墨田区', 35.7107, 139.8015, 287766, KIND_WARD],
  [2000000008, 'Koto', '江東区', 35.673, 139.8173, 520000, KIND_WARD],
  [2000000009, 'Shinagawa', '品川区', 35.6092, 139.7302, 400000, KIND_WARD],
  [2000000010, 'Meguro', '目黒区', 35.6415, 139.6983, 288088, KIND_WARD],
  [2000000011, 'Ota', '大田区', 35.5613, 139.716, 748081, KIND_WARD],
  [2000000012, 'Setagaya', '世田谷区', 35.6466, 139.6532, 940071, KIND_WARD],
  [2000000013, 'Shibuya', '渋谷区', 35.6637, 139.6977, 230609, KIND_WARD],
  [2000000014, 'Nakano', '中野区', 35.7073, 139.6638, 344880, KIND_WARD],
  [2000000015, 'Suginami', '杉並区', 35.6995, 139.6365, 588354, KIND_WARD],
  [2000000016, 'Toshima', '豊島区', 35.726, 139.7168, 301599, KIND_WARD],
  [2000000017, 'Kita', '北区', 35.7526, 139.7335, 332140, KIND_WARD],
  [2000000018, 'Arakawa', '荒川区', 35.7361, 139.7834, 216900, KIND_WARD],
  [2000000019, 'Itabashi', '板橋区', 35.7512, 139.7093, 584483, KIND_WARD],
  [2000000020, 'Nerima', '練馬区', 35.7355, 139.6517, 740000, KIND_WARD],
  [2000000021, 'Adachi', '足立区', 35.775, 139.8045, 695043, KIND_WARD],
  [2000000022, 'Katsushika', '葛飾区', 35.7433, 139.8472, 453093, KIND_WARD],
  [2000000023, 'Edogawa', '江戸川区', 35.7066, 139.8686, 697932, KIND_WARD],
];

const WORLD_CITIES = rawWorldCities as WorldTuple[];

const NEIGHBORHOOD_NAME = /ヶ丘|が丘|林間|連雀|本町|学園|葉原/;
const TOKYO_WARD_STEMS = new Set(TOKYO_WARDS.map(([, , ja]) => ja.replace(/区$/, '')));

function extraAdminCandidates(ja: string, lat: number, lng: number): string[] {
  if (!ja.endsWith('区')) return [];
  const extras: string[] = [];
  if (lat >= 35.53 && lat <= 35.83 && lng >= 139.56 && lng <= 139.92) extras.push(`東京都${ja}`);
  if (lat >= 35.3 && lat <= 35.55 && lng >= 139.45 && lng <= 139.78) extras.push(`横浜市${ja}`, `川崎市${ja}`);
  if (lat >= 34.58 && lat <= 34.76 && lng >= 135.4 && lng <= 135.6) extras.push(`大阪市${ja}`, `大阪府${ja}`);
  if (lat >= 35.05 && lat <= 35.25 && lng >= 136.8 && lng <= 137.0) extras.push(`名古屋市${ja}`, `愛知県${ja}`);
  if (lat >= 35.82 && lat <= 35.96 && lng >= 139.55 && lng <= 139.75) extras.push(`さいたま市${ja}`, `埼玉県${ja}`);
  if (lat >= 33.52 && lat <= 33.72 && lng >= 130.3 && lng <= 130.5) extras.push(`福岡市${ja}`, `福岡県${ja}`);
  if (lat >= 34.33 && lat <= 34.45 && lng >= 132.38 && lng <= 132.52) extras.push(`広島市${ja}`, `広島県${ja}`);
  if (lat >= 43.0 && lat <= 43.15 && lng >= 141.25 && lng <= 141.45) extras.push(`札幌市${ja}`, `北海道${ja}`);
  if (lat >= 38.2 && lat <= 38.33 && lng >= 140.82 && lng <= 140.98) extras.push(`仙台市${ja}`, `宮城県${ja}`);
  return extras;
}

function loadJapanPlaces(): JapanTuple[] {
  const byId = new Map<number, JapanTuple>();
  const jaNames = new Set<string>();

  for (const [id, name, ja, lat, lng, population, kind] of rawJapanPlaces as JapanTuple[]) {
    const safeId = id < WIKIDATA_ID_OFFSET ? WIKIDATA_ID_OFFSET + id : id;
    byId.set(safeId, [safeId, name, ja, lat, lng, population, kind]);
    jaNames.add(ja);
  }
  for (const ward of TOKYO_WARDS) {
    byId.set(ward[0], ward);
    jaNames.add(ward[2]);
  }

  for (const [id, name, ja, lat, lng, population] of WORLD_CITIES) {
    if (!isInJapan(lat, lng) || !ja) continue;
    if (NEIGHBORHOOD_NAME.test(ja) && !/[市区]$/.test(ja)) continue;
    let adminName = ja;
    let kind = inferKind(ja, name);
    if (!/[市区町村都府県]$/.test(ja)) {
      if (TOKYO_WARD_STEMS.has(ja) || NEIGHBORHOOD_NAME.test(ja) || population < 80000) continue;
      adminName = `${ja}市`;
      kind = KIND_CITY;
    }
    if (jaNames.has(adminName)) continue;
    jaNames.add(adminName);
    byId.set(id, [id, name, adminName, lat, lng, population, kind]);
  }

  return [...byId.values()];
}

const JAPAN_PLACES = loadJapanPlaces();

const CLOSE_ZOOM_LIMIT = 80;
const FAR_ZOOM_LIMIT = 55;

function isInJapan(lat: number, lng: number): boolean {
  const mainland = lat >= 30.2 && lat <= 45.8 && lng >= 129.25 && lng <= 146.0;
  const okinawa = lat >= 24.0 && lat <= 28.6 && lng >= 122.9 && lng <= 132.0;
  return mainland || okinawa;
}

function longitudeInRange(lng: number, minLng: number, maxLng: number): boolean {
  if (minLng <= maxLng) {
    return lng >= minLng && lng <= maxLng;
  }
  return lng >= minLng || lng <= maxLng;
}

function inferKind(ja: string, name: string): number {
  const label = ja || name;
  if (/区$/.test(label) || /[- ]ku$/i.test(name)) return KIND_WARD;
  if (/市$/.test(label) || /[- ]shi$/i.test(name)) return KIND_CITY;
  if (/[町村]$/.test(label)) return KIND_TOWN;
  if (/[都府県州省]$/.test(label)) return KIND_PREF;
  return KIND_OTHER;
}

function toCityPin(
  id: number,
  name: string,
  ja: string,
  lat: number,
  lng: number,
  population: number,
  kind: number,
  lang: Lang
): CityPin {
  const displayName = lang === 'ja' && ja ? ja : name;
  const candidates = [...extraAdminCandidates(ja, lat, lng), displayName, ja, name].filter(
    (value, index, all): value is string => Boolean(value) && all.indexOf(value) === index
  );
  return {
    id,
    name: displayName,
    candidates,
    coordinates: { latitude: lat, longitude: lng },
    population,
    kind,
  };
}

function kindsForZoom(latitudeDelta: number): Set<number> | null {
  if (latitudeDelta < 0.9) {
    return new Set([KIND_WARD, KIND_CITY, KIND_TOWN, KIND_OTHER]);
  }
  if (latitudeDelta < 3.5) {
    return new Set([KIND_CITY, KIND_PREF, KIND_OTHER]);
  }
  return new Set([KIND_CITY, KIND_PREF, KIND_OTHER]);
}

const ALL_PLACES: JapanTuple[] = [
  ...JAPAN_PLACES,
  ...WORLD_CITIES.filter(([, , , lat, lng]) => !isInJapan(lat, lng)).map(
    ([id, name, ja, lat, lng, population]) =>
      [id, name, ja, lat, lng, population, inferKind(ja, name)] as JapanTuple
  ),
].sort((a, b) => b[5] - a[5]);

export function citiesInRegion(region: MapRegion, lang: Lang): CityPin[] {
  const minLat = region.latitude - region.latitudeDelta / 2;
  const maxLat = region.latitude + region.latitudeDelta / 2;
  const minLng = region.longitude - region.longitudeDelta / 2;
  const maxLng = region.longitude + region.longitudeDelta / 2;
  const limit = region.latitudeDelta < 1.2 ? CLOSE_ZOOM_LIMIT : FAR_ZOOM_LIMIT;
  const allowed = kindsForZoom(region.latitudeDelta);

  const pins: CityPin[] = [];
  for (const [id, name, ja, lat, lng, population, kind] of ALL_PLACES) {
    if (allowed && !allowed.has(kind)) continue;
    if (lat < minLat || lat > maxLat) continue;
    if (!longitudeInRange(lng, minLng, maxLng)) continue;
    pins.push(toCityPin(id, name, ja, lat, lng, population, kind, lang));
    if (pins.length >= limit) break;
  }

  return pins;
}

export function findCityByQuery(query: string, lang: Lang): CityPin | null {
  const needle = query.trim().toLowerCase();
  if (!needle) return null;

  let best: CityPin | null = null;
  let bestScore = 0;

  for (const [id, name, ja, lat, lng, population, kind] of ALL_PLACES) {
    const names = [name, ja].filter(Boolean).map((value) => value.toLowerCase());
    let score = 0;
    if (names.some((value) => value === needle)) score = 3;
    else if (names.some((value) => value.startsWith(needle) || needle.startsWith(value))) score = 2;
    else if (names.some((value) => value.includes(needle))) score = 1;
    if (score === 0) continue;

    const pin = toCityPin(id, name, ja, lat, lng, population, kind, lang);
    if (score > bestScore || (score === bestScore && pin.population > (best?.population ?? 0))) {
      best = pin;
      bestScore = score;
    }
  }

  return best;
}
