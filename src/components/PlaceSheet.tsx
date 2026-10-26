import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Lang, Strings } from '../i18n';
import { Celebrity, MapPlacePin } from '../types';
import { CelebrityDetail } from './CelebrityDetail';
import { PlaceResults } from './PlaceResults';

type Props = {
  pin: MapPlacePin | null;
  lang: Lang;
  t: Strings;
  isFavorite: (pageid: number) => boolean;
  onToggleFavorite: (celebrity: Celebrity) => void;
  onDetailLoaded: (celebrity: Celebrity) => void;
  onClose: () => void;
};

export function PlaceSheet({
  pin,
  lang,
  t,
  isFavorite,
  onToggleFavorite,
  onDetailLoaded,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Celebrity | null>(null);

  useEffect(() => {
    if (!pin) setSelected(null);
  }, [pin]);

  return (
    <Modal
      visible={pin !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={selected ? () => setSelected(null) : onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.toolbar}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>{t.close}</Text>
          </Pressable>
        </View>
        {selected ? (
          <CelebrityDetail
            celebrity={selected}
            lang={lang}
            t={t}
            isFavorite={isFavorite(selected.pageid)}
            onToggleFavorite={onToggleFavorite}
            onDetailLoaded={onDetailLoaded}
            onClose={() => setSelected(null)}
            embedded
          />
        ) : pin ? (
          <PlaceResults
            placeUsed={pin.placeUsed}
            celebrities={pin.celebrities}
            isFavorite={isFavorite}
            onPressCelebrity={setSelected}
            t={t}
          />
        ) : null}
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
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DADCE0',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  closeButtonText: {
    color: '#1A73E8',
    fontSize: 16,
    fontWeight: '600',
  },
});
