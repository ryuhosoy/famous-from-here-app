import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import { CelebrityDetail } from './src/components/CelebrityDetail';
import { Celebrity, SearchResult } from './src/types';
import { detectLang, getStrings } from './src/i18n';

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
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [selected, setSelected] = useState<Celebrity | null>(null);

  const runSearch = useCallback(async (candidates: string[]) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const searchResult = await fetchCelebritiesByCandidates(candidates, lang);
      setResult(searchResult);
    } catch (e) {
      if (e instanceof NotFoundError) {
        setError(t.notFoundError);
      } else {
        setError(t.genericSearchError);
      }
    } finally {
      setLoading(false);
    }
  }, []);

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

  const renderItem = ({ item }: { item: Celebrity }) => (
    <Pressable style={styles.card} onPress={() => setSelected(item)}>
      {item.thumbnailUrl ? (
        <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Text style={styles.thumbnailPlaceholderText}>?</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {item.extract ? (
          <Text style={styles.cardExtract} numberOfLines={3}>
            {item.extract}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <Text style={styles.headerSubtitle}>{t.subtitle}</Text>
      </View>

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
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <Text style={styles.resultHeader}>{t.resultHeader(result.placeUsed, result.celebrities.length)}</Text>
          }
        />
      )}

      {!loading && !error && !result && (
        <View style={styles.centerBox}>
          <Text style={styles.centerBoxText}>{t.idleHint}</Text>
        </View>
      )}

      <CelebrityDetail
        celebrity={selected}
        lang={lang}
        t={t}
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
  card: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 84,
    height: 84,
  },
  thumbnailPlaceholder: {
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPlaceholderText: {
    fontSize: 24,
    color: '#9AA0A6',
  },
  cardBody: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 4,
  },
  cardExtract: {
    fontSize: 12,
    color: '#5F6368',
    lineHeight: 17,
  },
});
