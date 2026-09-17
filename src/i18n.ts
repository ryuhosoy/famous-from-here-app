import * as Localization from 'expo-localization';

export type Lang = 'ja' | 'en';

export function detectLang(): Lang {
  const locale = Localization.getLocales()[0];
  return locale?.languageCode === 'ja' ? 'ja' : 'en';
}

export type Strings = {
  title: string;
  subtitle: string;
  inputPlaceholder: string;
  searchButton: string;
  locationButton: string;
  searching: string;
  emptyQueryError: string;
  genericSearchError: string;
  locationError: string;
  idleHint: string;
  resultHeader: (place: string, count: number) => string;
  notFoundError: string;
  permissionDenied: string;
  reverseGeocodeFailed: string;
  placeNotIdentified: string;
  detailBack: string;
  detailLoadError: string;
  detailAttribution: string;
  tabSearch: string;
  tabFavorites: string;
  tabHistory: string;
  favoritesEmpty: string;
  historyEmpty: string;
  clearHistory: string;
  addFavorite: string;
  removeFavorite: string;
  historySearchAgain: string;
};

const strings: Record<Lang, Strings> = {
  ja: {
    title: '有名人サーチ',
    subtitle: '気になる場所の出身有名人をWikipediaから検索',
    inputPlaceholder: '地名を入力（例: 渋谷区, 京都市）',
    searchButton: '検索',
    locationButton: '📍 現在地から探す',
    searching: '検索中...',
    emptyQueryError: '地名を入力してください',
    genericSearchError: '検索中にエラーが発生しました',
    locationError: '現在地の取得に失敗しました',
    idleHint: '地名を入力するか、現在地ボタンで\n出身の有名人を検索してみましょう',
    resultHeader: (place: string, count: number) => `「${place}」出身の有名人 ${count}名`,
    notFoundError: '有名人が見つかりませんでした。別の地名で試してください。',
    permissionDenied: '位置情報の利用が許可されませんでした',
    reverseGeocodeFailed: '現在地の住所を取得できませんでした',
    placeNotIdentified: '現在地から地名を特定できませんでした',
    detailBack: '← 戻る',
    detailLoadError: '詳細の読み込みに失敗しました',
    detailAttribution: '出典: Wikipedia',
    tabSearch: '検索',
    tabFavorites: 'お気に入り',
    tabHistory: '履歴',
    favoritesEmpty: 'お気に入りはまだありません。\n詳細画面の★から追加できます。',
    historyEmpty: '検索履歴はまだありません。',
    clearHistory: '履歴を消去',
    addFavorite: 'お気に入りに追加',
    removeFavorite: 'お気に入り解除',
    historySearchAgain: '再検索',
  },
  en: {
    title: 'Famous From Here',
    subtitle: 'Discover famous people from any place, via Wikipedia',
    inputPlaceholder: 'Enter a place (e.g. Paris, Tokyo)',
    searchButton: 'Search',
    locationButton: '📍 Use current location',
    searching: 'Searching...',
    emptyQueryError: 'Please enter a place name',
    genericSearchError: 'Something went wrong while searching',
    locationError: 'Failed to get current location',
    idleHint: 'Enter a place name, or tap the location\nbutton to find celebrities from there',
    resultHeader: (place: string, count: number) => `${count} celebrities from "${place}"`,
    notFoundError: 'No celebrities found. Try a different place name.',
    permissionDenied: 'Location permission was denied',
    reverseGeocodeFailed: 'Could not resolve an address for your location',
    placeNotIdentified: 'Could not identify a place name from your location',
    detailBack: '← Back',
    detailLoadError: 'Failed to load details',
    detailAttribution: 'Source: Wikipedia',
    tabSearch: 'Search',
    tabFavorites: 'Favorites',
    tabHistory: 'History',
    favoritesEmpty: 'No favorites yet.\nTap ★ on a detail screen to save one.',
    historyEmpty: 'No search history yet.',
    clearHistory: 'Clear history',
    addFavorite: 'Add to favorites',
    removeFavorite: 'Remove favorite',
    historySearchAgain: 'Search again',
  },
};

export function getStrings(lang: Lang): Strings {
  return strings[lang];
}
