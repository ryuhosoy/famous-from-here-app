import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

import { citiesInRegion } from '../api/cities';
import { getCurrentCoordinates, LocationError } from '../api/location';
import { fetchCityPeopleCounts } from '../api/wikipedia';
import { Lang, Strings } from '../i18n';
import { CityPin, Coordinates } from '../types';

const DEFAULT_REGION: Region = {
  latitude: 35.6812,
  longitude: 139.7671,
  latitudeDelta: 0.35,
  longitudeDelta: 0.35,
};

const REGION_DEBOUNCE_MS = 280;

type Props = {
  lang: Lang;
  loading: boolean;
  error: string | null;
  flyTo: Coordinates | null;
  flyToken: number;
  onSelectCity: (city: CityPin) => void;
  onSearchAt: (latitude: number, longitude: number) => void;
  t: Strings;
};

export function MapExplore({
  lang,
  loading,
  error,
  flyTo,
  flyToken,
  onSelectCity,
  onSearchAt,
  t,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const regionRef = useRef<Region>(DEFAULT_REGION);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAutoLocateRef = useRef(false);
  const [locating, setLocating] = useState(false);
  const [cityPins, setCityPins] = useState<CityPin[]>(() => citiesInRegion(DEFAULT_REGION, lang));
  const [peopleCounts, setPeopleCounts] = useState<Record<number, { count: number; placeName?: string }>>({});
  const cityPinsRef = useRef(cityPins);
  const requestedCountsRef = useRef<Set<number>>(new Set());
  cityPinsRef.current = cityPins;

  const refreshPins = (region: Region, immediate = false) => {
    regionRef.current = region;
    const apply = () => setCityPins(citiesInRegion(region, lang));
    if (immediate) {
      apply();
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(apply, REGION_DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cities = cityPins.filter((city) => !requestedCountsRef.current.has(city.id));
    if (cities.length === 0) return;
    for (const city of cities) requestedCountsRef.current.add(city.id);

    (async () => {
      try {
        const counts = await fetchCityPeopleCounts(cities, lang);
        if (cancelled) return;
        setPeopleCounts((prev) => ({ ...prev, ...counts }));
      } catch (e) {
        console.warn('map people counts failed', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cityPins, lang]);

  useEffect(() => {
    if (!flyTo) return;
    skipAutoLocateRef.current = true;
    const region: Region = {
      ...flyTo,
      latitudeDelta: 0.18,
      longitudeDelta: 0.18,
    };
    mapRef.current?.animateToRegion(region, 700);
    refreshPins(region, true);
  }, [flyTo, flyToken]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const coords = await getCurrentCoordinates();
        if (cancelled || skipAutoLocateRef.current) return;
        const region: Region = {
          ...coords,
          latitudeDelta: 0.22,
          longitudeDelta: 0.22,
        };
        mapRef.current?.animateToRegion(region, 600);
        refreshPins(region, true);
      } catch {
        // Stay on the default region if permission is denied.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLocateMe = async () => {
    setLocating(true);
    try {
      const coords = await getCurrentCoordinates();
      const region: Region = {
        ...coords,
        latitudeDelta: 0.18,
        longitudeDelta: 0.18,
      };
      mapRef.current?.animateToRegion(region, 500);
      refreshPins(region, true);
    } catch (e) {
      if (!(e instanceof LocationError)) {
        console.warn('locate me failed', e);
      }
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        showsUserLocation
        showsCompass
        onRegionChangeComplete={(region) => {
          refreshPins(region);
        }}
        onLongPress={(event) => {
          if (loading) return;
          const { latitude, longitude } = event.nativeEvent.coordinate;
          onSearchAt(latitude, longitude);
        }}
        onMarkerPress={(event) => {
          if (loading) return;
          const identifier = String(event.nativeEvent.id ?? '');
          const city = cityPinsRef.current.find((item) => String(item.id) === identifier);
          if (city) onSelectCity(city);
        }}
      >
        {cityPins.map((city) => {
          const info = peopleCounts[city.id];
          if (!info || info.count <= 0) return null;
          const countLabel = t.pinCount(info.count);
          const label = info.placeName || city.name;
          return (
            <Marker
              key={city.id}
              identifier={String(city.id)}
              coordinate={city.coordinates}
              title={label}
              description={countLabel}
            >
              <View style={styles.marker} pointerEvents="none">
                <Text style={styles.markerPlace} numberOfLines={1}>
                  {label}
                </Text>
                <Text style={styles.markerCount}>{countLabel}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      <Pressable style={styles.locateButton} onPress={handleLocateMe} disabled={locating || loading}>
        {locating ? (
          <ActivityIndicator color="#1A73E8" />
        ) : (
          <Text style={styles.locateButtonText}>{t.locateMe}</Text>
        )}
      </Pressable>

      {loading ? (
        <View style={styles.loadingBanner}>
          <ActivityIndicator color="#1A73E8" />
          <Text style={styles.loadingText}>{t.searching}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Text style={styles.credit}>{t.mapCredit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  locateButton: {
    position: 'absolute',
    right: 16,
    bottom: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    minHeight: 46,
    minWidth: 88,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DADCE0',
  },
  locateButtonText: {
    color: '#1A73E8',
    fontWeight: '700',
    fontSize: 14,
  },
  loadingBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 92,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#3C4043',
    fontSize: 13,
    fontWeight: '600',
  },
  errorBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 92,
    backgroundColor: '#FCE8E6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: '#D93025',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  credit: {
    position: 'absolute',
    left: 16,
    bottom: 10,
    fontSize: 10,
    color: '#80868B',
  },
  marker: {
    backgroundColor: '#FFFFFF',
    borderColor: '#1A73E8',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    maxWidth: 140,
    alignItems: 'center',
  },
  markerPlace: {
    fontSize: 12,
    fontWeight: '700',
    color: '#202124',
  },
  markerCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1A73E8',
    marginTop: 1,
  },
});
