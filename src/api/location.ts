import { Platform } from 'react-native';
import * as Location from 'expo-location';

import { Coordinates } from '../types';

export type LocationErrorCode = 'PERMISSION_DENIED' | 'REVERSE_GEOCODE_FAILED' | 'PLACE_NOT_IDENTIFIED';

export class LocationError extends Error {
  code: LocationErrorCode;
  constructor(code: LocationErrorCode) {
    super(code);
    this.code = code;
  }
}

async function ensureAndroidGeocodingPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new LocationError('PERMISSION_DENIED');
  }
}

function candidatesFromAddress(address: Location.LocationGeocodedAddress): string[] {
  return [address.city, address.subregion, address.region, address.district].filter(
    (value): value is string => Boolean(value && value.trim())
  );
}

/**
 * Reverse-geocodes a coordinate into place-name candidates to try, in order.
 *
 * `city` is tried first rather than the finer `district`. In practice,
 * reverse-geocoded `district` values are often an obscure sub-area (a
 * chōme/neighborhood-level name) that rarely has its own Wikipedia "people
 * from X" category, so trying it first tends to produce either a failed
 * lookup or an unhelpfully narrow result. `city` (e.g. "San Francisco",
 * "姫路市") is the level most "people from X" categories actually exist at,
 * so it's the reliable default for GPS-based search — matching what a user
 * typing a place name by hand would naturally search for. `subregion` and
 * `region` broaden further if `city` has no category. `district` is kept
 * only as a last-resort fallback, for the rare case where a locality has a
 * category but its containing city does not.
 *
 * `street`/`streetNumber` are excluded entirely: Wikipedia categories
 * essentially never exist at that granularity, so trying them would only
 * add failed lookups.
 */
export async function getPlaceCandidatesFromCoords(
  latitude: number,
  longitude: number
): Promise<string[]> {
  await ensureAndroidGeocodingPermission();

  const results = await Location.reverseGeocodeAsync({ latitude, longitude });
  const address = results[0];
  if (!address) {
    throw new LocationError('REVERSE_GEOCODE_FAILED');
  }

  const candidates = candidatesFromAddress(address);
  if (candidates.length === 0) {
    throw new LocationError('PLACE_NOT_IDENTIFIED');
  }

  return candidates;
}

export async function getCurrentCoordinates(): Promise<Coordinates> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new LocationError('PERMISSION_DENIED');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

/**
 * Requests location permission, gets the device's current position, and
 * reverse-geocodes it into a list of place-name candidates to try, in order.
 */
export async function getCurrentPlaceCandidates(): Promise<string[]> {
  const coords = await getCurrentCoordinates();
  return getPlaceCandidatesFromCoords(coords.latitude, coords.longitude);
}

export async function geocodePlace(place: string): Promise<Coordinates | null> {
  try {
    await ensureAndroidGeocodingPermission();
    const results = await Location.geocodeAsync(place);
    const first = results[0];
    if (!first) return null;
    return { latitude: first.latitude, longitude: first.longitude };
  } catch {
    return null;
  }
}

