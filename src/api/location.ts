import * as Location from 'expo-location';

export type LocationErrorCode = 'PERMISSION_DENIED' | 'REVERSE_GEOCODE_FAILED' | 'PLACE_NOT_IDENTIFIED';

export class LocationError extends Error {
  code: LocationErrorCode;
  constructor(code: LocationErrorCode) {
    super(code);
    this.code = code;
  }
}

/**
 * Requests location permission, gets the device's current position, and
 * reverse-geocodes it into a list of place-name candidates to try, in order.
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
export async function getCurrentPlaceCandidates(): Promise<string[]> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new LocationError('PERMISSION_DENIED');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const results = await Location.reverseGeocodeAsync({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  });

  const address = results[0];
  if (!address) {
    throw new LocationError('REVERSE_GEOCODE_FAILED');
  }

  const candidates = [address.city, address.subregion, address.region, address.district].filter(
    (value): value is string => Boolean(value && value.trim())
  );

  if (candidates.length === 0) {
    throw new LocationError('PLACE_NOT_IDENTIFIED');
  }

  return candidates;
}
