import { useCallback, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import {
  fetchCelebritiesByCandidates,
  NotFoundError,
  PersonHometownNotFoundError,
  PersonNotFoundError,
  PersonSearchHit,
  resolvePersonHometown,
  searchPersonArticles,
} from './src/api/wikipedia';
import { findCityByQuery } from './src/api/cities';
import { geocodePlace, getPlaceCandidatesFromCoords, LocationError } from './src/api/location';
import { FavoritesPanel } from './src/components/FavoritesPanel';
import { MapExplore } from './src/components/MapExplore';
import { PersonSearchPicker } from './src/components/PersonSearchPicker';
import { FocusPerson, PlaceSheet } from './src/components/PlaceSheet';
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

type MainTab = 'explore' | 'favorites';
type SearchMode = 'place' | 'person';

function AppContent() {
  const [tab, setTab] = useState<MainTab>('explore');
  const [searchMode, setSearchMode] = useState<SearchMode>('place');
  const [query, setQuery] = useState('');
  const [selectedPin, setSelectedPin] = useState<MapPlacePin | null>(null);
  const [focusPerson, setFocusPerson] = useState<FocusPerson | null>(null);
  const [personPickerHits, setPersonPickerHits] = useState<PersonSearchHit[] | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<Coordinates | null>(null);
  const [flyToken, setFlyToken] = useState(0);
  const {
    ready,
    favorites,
    isFavorite,
    toggleFavorite,
    refreshFavorite,
    addHistory,
  } = useLibrary();

  const errorMessage = useCallback((e: unknown, fallback: string) => {
    if (e instanceof PersonNotFoundError) return t.personNotFoundError;
    if (e instanceof PersonHometownNotFoundError) return t.personHometownNotFoundError;
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
    async (coords: Coordinates, candidates: string[], personToFocus?: FocusPerson | null) => {
      setMapLoading(true);
      setMapError(null);
      flyMapTo(coords);
      setFocusPerson(personToFocus ?? null);
      try {
        const searchResult = await fetchCelebritiesByCandidates(candidates, lang);
        setSelectedPin({
          ...searchResult,
          coordinates: coords,
        });
        await addHistory(searchResult.placeUsed);
      } catch (e) {
        setMapError(errorMessage(e, t.genericSearchError));
        setFocusPerson(null);
      } finally {
        setMapLoading(false);
      }
    },
    [addHistory, errorMessage, flyMapTo]
  );

  const goToPerson = useCallback(
    async (hit: PersonSearchHit) => {
      setPersonPickerHits(null);
      setMapLoading(true);
      setMapError(null);
      try {
        const hometown = await resolvePersonHometown(hit.pageid, hit.title, lang);
        const city = findCityByQuery(hometown.placeUsed, lang);
        const coords = city?.coordinates ?? (await geocodePlace(hometown.placeUsed));
        if (!coords) {
          setMapError(t.notFoundError);
          return;
        }
        await searchAt(coords, hometown.candidates, {
          pageid: hometown.pageid,
          title: hometown.title,
        });
      } catch (e) {
        setMapError(errorMessage(e, t.genericSearchError));
      } finally {
        setMapLoading(false);
      }
    },
    [errorMessage, searchAt]
  );

  const handlePersonSearch = useCallback(async () => {
    Keyboard.dismiss();
    const trimmed = query.trim();
    if (!trimmed) {
      setMapError(t.emptyQueryErrorPerson);
      return;
    }

    setMapLoading(true);
    setMapError(null);
    try {
      const hits = await searchPersonArticles(trimmed, lang);
      if (hits.length === 0) {
        throw new PersonNotFoundError();
      }
      if (hits.length === 1) {
        await goToPerson(hits[0]);
        return;
      }
      setPersonPickerHits(hits);
    } catch (e) {
      setMapError(errorMessage(e, t.genericSearchError));
    } finally {
      setMapLoading(false);
    }
  }, [errorMessage, goToPerson, query]);

  const handleManualSearch = useCallback(async () => {
    if (searchMode === 'person') {
      await handlePersonSearch();
      return;
    }

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
  }, [errorMessage, handlePersonSearch, query, searchAt, searchMode]);

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
      {tab === 'explore' ? (
        <>
          <View style={styles.header}>
            <View style={styles.modeRow}>
              <Pressable
                style={[styles.modeChip, searchMode === 'place' && styles.modeChipActive]}
                onPress={() => {
                  setSearchMode('place');
                  setMapError(null);
                }}
              >
                <Text style={[styles.modeChipText, searchMode === 'place' && styles.modeChipTextActive]}>
                  {t.searchModePlace}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modeChip, searchMode === 'person' && styles.modeChipActive]}
                onPress={() => {
                  setSearchMode('person');
                  setMapError(null);
                }}
              >
                <Text style={[styles.modeChipText, searchMode === 'person' && styles.modeChipTextActive]}>
                  {t.searchModePerson}
                </Text>
              </Pressable>
            </View>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.input}
                placeholder={searchMode === 'place' ? t.inputPlaceholder : t.inputPlaceholderPerson}
                placeholderTextColor="#9AA0A6"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={() => {
                  void handleManualSearch();
                }}
                returnKeyType="search"
              />
              <Pressable
                style={styles.searchButton}
                onPress={() => void handleManualSearch()}
                disabled={mapLoading}
              >
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
            focusPerson={focusPerson}
            lang={lang}
            t={t}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
            onDetailLoaded={refreshFavorite}
            onClose={() => {
              setSelectedPin(null);
              setFocusPerson(null);
            }}
          />

          <PersonSearchPicker
            visible={personPickerHits !== null}
            hits={personPickerHits ?? []}
            t={t}
            onSelect={(hit) => void goToPerson(hit)}
            onClose={() => setPersonPickerHits(null)}
          />
        </>
      ) : (
        <FavoritesPanel
          lang={lang}
          t={t}
          ready={ready}
          favorites={favorites}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
          onDetailLoaded={refreshFavorite}
        />
      )}

      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabButton, tab === 'explore' && styles.tabButtonActive]}
          onPress={() => setTab('explore')}
        >
          <Text style={[styles.tabLabel, tab === 'explore' && styles.tabLabelActive]}>{t.tabMap}</Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, tab === 'favorites' && styles.tabButtonActive]}
          onPress={() => setTab('favorites')}
        >
          <Text style={[styles.tabLabel, tab === 'favorites' && styles.tabLabelActive]}>
            {t.tabFavorites}
            {favorites.length > 0 ? ` (${favorites.length})` : ''}
          </Text>
        </Pressable>
      </View>
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
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F1F3F4',
  },
  modeChipActive: {
    backgroundColor: '#E8F0FE',
  },
  modeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5F6368',
  },
  modeChipTextActive: {
    color: '#1A73E8',
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
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DADCE0',
    backgroundColor: '#FFFFFF',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderTopWidth: 2,
    borderTopColor: '#1A73E8',
    marginTop: -StyleSheet.hairlineWidth,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5F6368',
  },
  tabLabelActive: {
    color: '#1A73E8',
  },
});
