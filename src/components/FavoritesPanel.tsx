import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { Lang, Strings } from '../i18n';
import { Celebrity, FavoriteCelebrity } from '../types';
import { CelebrityCard } from './CelebrityCard';
import { CelebrityDetail } from './CelebrityDetail';

type Props = {
  lang: Lang;
  t: Strings;
  ready: boolean;
  favorites: FavoriteCelebrity[];
  isFavorite: (pageid: number) => boolean;
  onToggleFavorite: (celebrity: Celebrity) => void;
  onDetailLoaded: (celebrity: Celebrity) => void;
};

export function FavoritesPanel({
  lang,
  t,
  ready,
  favorites,
  isFavorite,
  onToggleFavorite,
  onDetailLoaded,
}: Props) {
  const [selected, setSelected] = useState<Celebrity | null>(null);

  if (!ready) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#1A73E8" />
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>{t.favoritesEmpty}</Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={favorites}
        keyExtractor={(item) => String(item.pageid)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <CelebrityCard
            item={item}
            favorited
            onPress={() => setSelected(item)}
          />
        )}
      />
      <CelebrityDetail
        celebrity={selected}
        lang={lang}
        t={t}
        isFavorite={selected ? isFavorite(selected.pageid) : false}
        onToggleFavorite={onToggleFavorite}
        onDetailLoaded={onDetailLoaded}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#5F6368',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
});
