import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { occupationLabel, Strings } from '../i18n';
import { classifyOccupation, countByOccupation } from '../occupation';
import { Celebrity, OccupationId } from '../types';
import { CelebrityCard } from './CelebrityCard';

type Props = {
  placeUsed: string;
  celebrities: Celebrity[];
  isFavorite: (pageid: number) => boolean;
  onPressCelebrity: (celebrity: Celebrity) => void;
  t: Strings;
};

export function PlaceResults({
  placeUsed,
  celebrities,
  isFavorite,
  onPressCelebrity,
  t,
}: Props) {
  const [occupation, setOccupation] = useState<OccupationId | 'all'>('all');

  useEffect(() => {
    setOccupation('all');
  }, [placeUsed]);

  const occupationCounts = useMemo(() => countByOccupation(celebrities), [celebrities]);
  const filtered = useMemo(
    () =>
      occupation === 'all'
        ? celebrities
        : celebrities.filter((item) => classifyOccupation(item) === occupation),
    [celebrities, occupation]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.resultHeader}>{t.resultHeader(placeUsed, celebrities.length)}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Chip
            label={t.occupationAll}
            active={occupation === 'all'}
            onPress={() => setOccupation('all')}
          />
          {occupationCounts.map(({ id, count }) => (
            <Chip
              key={id}
              label={`${occupationLabel(t, id)} ${count}`}
              active={occupation === id}
              onPress={() => setOccupation(id)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.pageid)}
        renderItem={({ item }) => (
          <CelebrityCard
            item={item}
            favorited={isFavorite(item.pageid)}
            onPress={() => onPressCelebrity(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  resultHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 10,
  },
  chips: {
    gap: 8,
    paddingBottom: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F3F4',
  },
  chipActive: {
    backgroundColor: '#E8F0FE',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5F6368',
  },
  chipTextActive: {
    color: '#1A73E8',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
});
