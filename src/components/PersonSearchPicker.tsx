import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PersonSearchHit } from '../api/wikipedia';
import { Strings } from '../i18n';

type Props = {
  visible: boolean;
  hits: PersonSearchHit[];
  t: Strings;
  onSelect: (hit: PersonSearchHit) => void;
  onClose: () => void;
};

export function PersonSearchPicker({ visible, hits, t, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.toolbar}>
          <Text style={styles.title}>{t.personPickTitle}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>{t.close}</Text>
          </Pressable>
        </View>
        <FlatList
          data={hits}
          keyExtractor={(item) => String(item.pageid)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => onSelect(item)}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              {item.snippet ? (
                <Text style={styles.rowSnippet} numberOfLines={2}>
                  {item.snippet}
                </Text>
              ) : null}
            </Pressable>
          )}
        />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DADCE0',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#202124',
    flex: 1,
    marginRight: 12,
  },
  close: {
    color: '#1A73E8',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    padding: 12,
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
    marginBottom: 10,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 4,
  },
  rowSnippet: {
    fontSize: 13,
    lineHeight: 18,
    color: '#5F6368',
  },
});