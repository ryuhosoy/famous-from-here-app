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
  isFavorite: boolean;
  onToggleFavorite: (celebrity: Celebrity) => void;
  onDetailLoaded?: (celebrity: Celebrity) => void;
  onClose: () => void;
  embedded?: boolean;
};

type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string };

function parseExtractBlocks(extract: string): Block[] {
  const normalized = extract
    .replace(/\r\n/g, '\n')
    // MediaWiki plaintext sometimes keeps "== Heading ==" markers
    .replace(/^={2,}\s*(.+?)\s*={2,}\s*$/gm, '$1')
    .trim();
  if (!normalized) return [];

  const chunks = normalized.split(/\n{2,}/);
  const blocks: Block[] = [];

  for (const raw of chunks) {
    const text = raw.replace(/\n+/g, ' ').trim();
    if (!text) continue;

    const isHeading =
      text.length <= 40 &&
      !/[.!?。！？]$/.test(text) &&
      !text.includes('。') &&
      text.split(' ').length <= 8;

    blocks.push(isHeading ? { type: 'heading', text } : { type: 'paragraph', text });
  }

  return blocks;
}

export function CelebrityDetail({
  celebrity,
  lang,
  t,
  isFavorite,
  onToggleFavorite,
  onDetailLoaded,
  onClose,
  embedded = false,
}: Props) {
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
        if (cancelled) return;
        setDetail(full);
        onDetailLoaded?.(full);
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
  }, [celebrity, lang, onDetailLoaded]);

  const shown = detail ?? celebrity;
  const blocks = shown?.extract ? parseExtractBlocks(shown.extract) : [];
  const favorited = shown ? isFavorite : false;

  const body = (
    <View style={[styles.container, !embedded && { paddingTop: insets.top }]}>
      <View style={styles.toolbar}>
        <Pressable onPress={onClose} hitSlop={12} style={styles.backButton}>
          <Text style={styles.backButtonText}>{t.detailBack}</Text>
        </Pressable>
        {shown ? (
          <Pressable
            onPress={() => onToggleFavorite(shown)}
            hitSlop={16}
            style={styles.favoriteButton}
            accessibilityRole="button"
            accessibilityLabel={favorited ? t.removeFavorite : t.addFavorite}
          >
            <Text style={[styles.favoriteIcon, favorited && styles.favoriteIconActive]}>
              {favorited ? '★' : '☆'}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.favoriteButton} />
        )}
      </View>

      {!shown ? null : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator
        >
          {shown.thumbnailUrl ? (
            <Image source={{ uri: shown.thumbnailUrl }} style={styles.hero} resizeMode="cover" />
          ) : (
            <View style={[styles.hero, styles.heroPlaceholder]}>
              <Text style={styles.heroPlaceholderText}>?</Text>
            </View>
          )}

          <Text style={styles.title}>{shown.title}</Text>

          {shown.description ? (
            <Text style={styles.description}>{shown.description}</Text>
          ) : null}

          {blocks.length > 0 ? (
            blocks.map((block, index) =>
              block.type === 'heading' ? (
                <Text key={`h-${index}`} style={styles.sectionHeading}>
                  {block.text}
                </Text>
              ) : (
                <Text key={`p-${index}`} style={styles.extract}>
                  {block.text}
                </Text>
              )
            )
          ) : loading ? (
            <ActivityIndicator style={styles.loader} color="#1A73E8" />
          ) : error ? (
            <Text style={styles.errorText}>{t.detailLoadError}</Text>
          ) : null}

          {loading && blocks.length > 0 ? (
            <ActivityIndicator style={styles.loader} color="#1A73E8" />
          ) : null}

          <Text style={styles.attribution}>{t.detailAttribution}</Text>
        </ScrollView>
      )}
    </View>
  );

  if (embedded) {
    if (!celebrity) return null;
    return body;
  }

  return (
    <Modal
      visible={celebrity !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {body}
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
    justifyContent: 'space-between',
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
  favoriteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  favoriteIcon: {
    fontSize: 26,
    color: '#9AA0A6',
  },
  favoriteIconActive: {
    color: '#F9AB00',
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
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#5F6368',
    marginBottom: 16,
    lineHeight: 20,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#202124',
    marginTop: 20,
    marginBottom: 8,
  },
  extract: {
    fontSize: 16,
    lineHeight: 26,
    color: '#3C4043',
    marginBottom: 14,
  },
  loader: {
    marginTop: 16,
  },
  errorText: {
    fontSize: 15,
    color: '#D93025',
  },
  attribution: {
    marginTop: 12,
    fontSize: 12,
    color: '#9AA0A6',
  },
});
