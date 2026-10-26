import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Celebrity } from '../types';

type Props = {
  item: Celebrity;
  onPress: () => void;
  favorited?: boolean;
};

export function CelebrityCard({ item, onPress, favorited }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {item.thumbnailUrl ? (
        <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Text style={styles.thumbnailPlaceholderText}>?</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {favorited ? <Text style={styles.star}>★</Text> : null}
        </View>
        {item.description ? (
          <Text style={styles.cardDescription} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
        {item.extract ? (
          <Text style={styles.cardExtract} numberOfLines={item.description ? 2 : 3}>
            {item.extract}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#202124',
  },
  star: {
    color: '#F9AB00',
    fontSize: 14,
  },
  cardDescription: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A73E8',
    marginBottom: 3,
  },
  cardExtract: {
    fontSize: 12,
    color: '#5F6368',
    lineHeight: 17,
  },
});
