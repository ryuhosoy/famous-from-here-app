import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchCelebrityDetail } from '../api/wikipedia';
import { Lang, Strings } from '../i18n';
import { Celebrity } from '../types';

type Props = {
  celebrity: Celebrity | null;
  lang: Lang;
  t: Strings;
  onClose: () => void;
};

export function CelebrityDetail({ celebrity, lang, t, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = useState<Celebrity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!celebrity) {
      setDetail(null);
      setError(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setDetail(celebrity);
    setLoading(true);
    setError(false);

    fetchCelebrityDetail(celebrity.pageid, lang)
      .then((full) => {
        if (!cancelled) setDetail(full);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [celebrity, lang]);

  const shown = detail ?? celebrity;

  return (
    <Modal
      visible={celebrity !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.toolbar}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.backButton}>
            <Text style={styles.backButtonText}>{t.detailBack}</Text>
          </Pressable>
        </View>

        {!shown ? null : (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
          >
            {shown.thumbnailUrl ? (
              <Image source={{ uri: shown.thumbnailUrl }} style={styles.hero} resizeMode="cover" />
            ) : (
              <View style={[styles.hero, styles.heroPlaceholder]}>
                <Text style={styles.heroPlaceholderText}>?</Text>
              </View>
            )}

            <Text style={styles.title}>{shown.title}</Text>

            {shown.extract ? (
              <Text style={styles.extract}>{shown.extract}</Text>
            ) : loading ? (
              <ActivityIndicator style={styles.loader} color="#1A73E8" />
            ) : error ? (
              <Text style={styles.errorText}>{t.detailLoadError}</Text>
            ) : null}

            {loading && shown.extract ? (
              <ActivityIndicator style={styles.loader} color="#1A73E8" />
            ) : null}

            <Text style={styles.attribution}>{t.detailAttribution}</Text>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DADCE0',
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#1A73E8',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  hero: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#E0E0E0',
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderText: {
    fontSize: 48,
    color: '#9AA0A6',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 14,
  },
  extract: {
    fontSize: 16,
    lineHeight: 26,
    color: '#3C4043',
  },
  loader: {
    marginTop: 16,
  },
  errorText: {
    fontSize: 15,
    color: '#D93025',
  },
  attribution: {
    marginTop: 24,
    fontSize: 12,
    color: '#9AA0A6',
  },
});
