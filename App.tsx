import { useCallback, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { fetchCelebritiesByCandidates, NotFoundError } from './src/api/wikipedia';
import { findCityByQuery } from './src/api/cities';
import { geocodePlace, getPlaceCandidatesFromCoords, LocationError } from './src/api/location';
import { MapExplore } from './src/components/MapExplore';
import { PlaceSheet } from './src/components/PlaceSheet';
import { CityPin, Coordinates, MapPlacePin } from './src/types';
import { detectLang, getStrings } from './src/i18n';
import { useLibrary } from './src/storage/useLibrary';

const lang = detectLang();
const t = getStrings(lang);

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [query, setQuery] = useState('');
  const [selectedPin, setSelectedPin] = useState<MapPlacePin | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<Coordinates | null>(null);
  const [flyToken, setFlyToken] = useState(0);
  const { isFavorite, toggleFavorite, refreshFavorite, addHistory } = useLibrary();

  const errorMessage = useCallback((e: unknown, fallback: string) => {
    if (e instanceof NotFoundError) return t.notFoundError;
    if (e instanceof LocationError) {
      if (e.code === 'PERMISSION_DENIED') return t.permissionDenied;
      if (e.code === 'REVERSE_GEOCODE_FAILED') return t.reverseGeocodeFailed;
      return t.placeNotIdentified;
    }
    return fallback;
  }, []);

  const flyMapTo = useCallback((coords: Coordinates) => {
    setFlyTo(coords);
    setFlyToken((value) => value + 1);
  }, []);

  const searchAt = useCallback(
    async (coords: Coordinates, candidates: string[]) => {
      setMapLoading(true);
      setMapError(null);
      flyMapTo(coords);
      try {
        const searchResult = await fetchCelebritiesByCandidates(candidates, lang);
        setSelectedPin({
          ...searchResult,
          coordinates: coords,
        });
        await addHistory(searchResult.placeUsed);
      } catch (e) {
        setMapError(errorMessage(e, t.genericSearchError));
      } finally {
        setMapLoading(false);
      }
    },
    [addHistory, errorMessage, flyMapTo]
  );

  const handleManualSearch = useCallback(async () => {
    Keyboard.dismiss();
    const trimmed = query.trim();
    if (!trimmed) {
      setMapError(t.emptyQueryError);
      return;
    }

    setMapLoading(true);
    setMapError(null);
    try {
      const city = findCityByQuery(trimmed, lang);
      const coords = city?.coordinates ?? (await geocodePlace(trimmed));
      if (!coords) {
        setMapError(t.notFoundError);
        return;
      }
      await searchAt(coords, city?.candidates ?? [trimmed]);
    } catch (e) {
      setMapError(errorMessage(e, t.genericSearchError));
    } finally {
      setMapLoading(false);
    }
  }, [errorMessage, query, searchAt]);

  const handleMapSearch = useCallback(
    async (latitude: number, longitude: number) => {
      try {
        const candidates = await getPlaceCandidatesFromCoords(latitude, longitude);
        await searchAt({ latitude, longitude }, candidates);
      } catch (e) {
        setMapError(errorMessage(e, t.genericSearchError));
      }
    },
    [errorMessage, searchAt]
  );

  const handleSelectCity = useCallback(
    async (city: CityPin) => {
      await searchAt(city.coordinates, city.candidates);
    },
    [searchAt]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <Text style={styles.headerSubtitle}>{t.subtitle}</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            placeholder={t.inputPlaceholder}
            placeholderTextColor="#9AA0A6"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => {
              void handleManualSearch();
            }}
            returnKeyType="search"
          />
          <Pressable style={styles.searchButton} onPress={() => void handleManualSearch()} disabled={mapLoading}>
            <Text style={styles.searchButtonText}>{t.searchButton}</Text>
          </Pressable>
        </View>
      </View>

      <MapExplore
        lang={lang}
        loading={mapLoading}
        error={mapError}
        flyTo={flyTo}
        flyToken={flyToken}
        onSelectCity={handleSelectCity}
        onSearchAt={handleMapSearch}
        t={t}
      />

      <PlaceSheet
        pin={selectedPin}
        lang={lang}
        t={t}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
        onDetailLoaded={refreshFavorite}
        onClose={() => setSelectedPin(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#202124',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#5F6368',
    marginTop: 2,
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#202124',
  },
  searchButton: {
    backgroundColor: '#1A73E8',
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
