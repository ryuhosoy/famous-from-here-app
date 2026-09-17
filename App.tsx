import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { fetchCelebritiesByCandidates, NotFoundError } from './src/api/wikipedia';
import { getCurrentPlaceCandidates, LocationError } from './src/api/location';
import { CelebrityCard } from './src/components/CelebrityCard';
import { CelebrityDetail } from './src/components/CelebrityDetail';
import { Celebrity, HistoryEntry, SearchResult } from './src/types';
import { detectLang, getStrings } from './src/i18n';
import { useLibrary } from './src/storage/useLibrary';

const lang = detectLang();
const t = getStrings(lang);

type Tab = 'search' | 'favorites' | 'history';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [tab, setTab] = useState<Tab>('search');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [selected, setSelected] = useState<Celebrity | null>(null);
  const { favorites, history, isFavorite, toggleFavorite, addHistory, clearHistory } = useLibrary();

  const runSearch = useCallback(
    async (candidates: string[]) => {
      setLoading(true);
      setError(null);
      setResult(null);
      setTab('search');
      try {
        const searchResult = await fetchCelebritiesByCandidates(candidates, lang);
        setResult(searchResult);
        await addHistory(searchResult.placeUsed);
      } catch (e) {
        if (e instanceof NotFoundError) {
          setError(t.notFoundError);
        } else {
          setError(t.genericSearchError);
        }
      } finally {
        setLoading(false);
      }
    },
    [addHistory]
  );

  const handleManualSearch = useCallback(() => {
    Keyboard.dismiss();
    const trimmed = query.trim();
    if (!trimmed) {
      setError(t.emptyQueryError);
      return;
    }
    runSearch([trimmed]);
  }, [query, runSearch]);

  const handleUseCurrentLocation = useCallback(async () => {
    setLocating(true);
    setError(null);
    try {
      const candidates = await getCurrentPlaceCandidates();
      setQuery(candidates[0]);
      await runSearch(candidates);
    } catch (e) {
      if (e instanceof LocationError) {
        setError(
          e.code === 'PERMISSION_DENIED'
            ? t.permissionDenied
            : e.code === 'REVERSE_GEOCODE_FAILED'
              ? t.reverseGeocodeFailed
              : t.placeNotIdentified
        );
      } else {
        setError(t.locationError);
      }
    } finally {
      setLocating(false);
    }
  }, [runSearch]);

  const handleHistoryPress = useCallback(
    (entry: HistoryEntry) => {
      setQuery(entry.place);
      runSearch([entry.place]);
    },
    [runSearch]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <Text style={styles.headerSubtitle}>{t.subtitle}</Text>
      </View>

      <View style={styles.tabs}>
        {([
          ['search', t.tabSearch],
          ['favorites', t.tabFavorites],
          ['history', t.tabHistory],
        ] as const).map(([id, label]) => (
          <Pressable
            key={id}
            style={[styles.tab, tab === id && styles.tabActive]}
            onPress={() => setTab(id)}
          >
            <Text style={[styles.tabText, tab === id && styles.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'search' ? (
        <>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              placeholder={t.inputPlaceholder}
              placeholderTextColor="#9AA0A6"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleManualSearch}
              returnKeyType="search"
            />
            <Pressable style={styles.searchButton} onPress={handleManualSearch} disabled={loading}>
              <Text style={styles.searchButtonText}>{t.searchButton}</Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.locationButton}
            onPress={handleUseCurrentLocation}
            disabled={locating || loading}
          >
            {locating ? (
              <ActivityIndicator color="#1A73E8" />
            ) : (
              <Text style={styles.locationButtonText}>{t.locationButton}</Text>
            )}
          </Pressable>

          {loading && (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#1A73E8" />
              <Text style={styles.centerBoxText}>{t.searching}</Text>
            </View>
          )}

          {!loading && error && (
            <View style={styles.centerBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!loading && !error && result && (
            <FlatList
              data={result.celebrities}
              keyExtractor={(item) => String(item.pageid)}
              renderItem={({ item }) => (
                <CelebrityCard
                  item={item}
                  favorited={isFavorite(item.pageid)}
                  onPress={() => setSelected(item)}
                />
              )}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                <Text style={styles.resultHeader}>
                  {t.resultHeader(result.placeUsed, result.celebrities.length)}
                </Text>
              }
            />
          )}

          {!loading && !error && !result && (
            <View style={styles.centerBox}>
              <Text style={styles.centerBoxText}>{t.idleHint}</Text>
            </View>
          )}
        </>
      ) : null}

      {tab === 'favorites' ? (
        favorites.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.centerBoxText}>{t.favoritesEmpty}</Text>
          </View>
        ) : (
          <FlatList
            data={favorites}
            keyExtractor={(item) => String(item.pageid)}
            renderItem={({ item }) => (
              <CelebrityCard item={item} favorited onPress={() => setSelected(item)} />
            )}
            contentContainerStyle={styles.listContent}
          />
        )
      ) : null}

      {tab === 'history' ? (
        history.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.centerBoxText}>{t.historyEmpty}</Text>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => `${item.place}-${item.searchedAt}`}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <Pressable style={styles.clearHistoryButton} onPress={clearHistory}>
                <Text style={styles.clearHistoryText}>{t.clearHistory}</Text>
              </Pressable>
            }
            renderItem={({ item }) => (
              <Pressable style={styles.historyRow} onPress={() => handleHistoryPress(item)}>
                <View style={styles.historyBody}>
                  <Text style={styles.historyPlace}>{item.place}</Text>
                  <Text style={styles.historyMeta}>
                    {new Date(item.searchedAt).toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-US')}
                  </Text>
                </View>
                <Text style={styles.historyAction}>{t.historySearchAgain}</Text>
              </Pressable>
            )}
          />
        )
      ) : null}

      <CelebrityDetail
        celebrity={selected}
        lang={lang}
        t={t}
        isFavorite={selected ? isFavorite(selected.pageid) : false}
        onToggleFavorite={toggleFavorite}
        onClose={() => setSelected(null)}
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
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#202124',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#5F6368',
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
    backgroundColor: '#F1F3F4',
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5F6368',
  },
  tabTextActive: {
    color: '#1A73E8',
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
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
  locationButton: {
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1A73E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationButtonText: {
    color: '#1A73E8',
    fontWeight: '600',
    fontSize: 15,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  centerBoxText: {
    color: '#5F6368',
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: '#D93025',
    fontSize: 15,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  resultHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 10,
  },
  clearHistoryButton: {
    alignSelf: 'flex-end',
    marginBottom: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearHistoryText: {
    color: '#D93025',
    fontSize: 13,
    fontWeight: '600',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  historyBody: {
    flex: 1,
  },
  historyPlace: {
    fontSize: 15,
    fontWeight: '700',
    color: '#202124',
  },
  historyMeta: {
    fontSize: 12,
    color: '#5F6368',
    marginTop: 4,
  },
  historyAction: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A73E8',
    marginLeft: 8,
  },
});
