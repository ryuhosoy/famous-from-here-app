import * as Localization from 'expo-localization';

import { OccupationId } from './types';

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
  tabMap: string;
  tabFavorites: string;
  tabHistory: string;
  favoritesEmpty: string;
  historyEmpty: string;
  close: string;
  clearHistory: string;
  addFavorite: string;
  removeFavorite: string;
  historySearchAgain: string;
  mapHint: string;
  locateMe: string;
  mapCredit: string;
  pinCount: (count: number) => string;
  pinNone: string;
  occupationAll: string;
  occupationActor: string;
  occupationAthlete: string;
  occupationMusician: string;
  occupationPolitician: string;
  occupationCreator: string;
  occupationOther: string;
};

const strings: Record<Lang, Strings> = {
  ja: {
    title: '有名人サーチ',
    subtitle: '地図で探して、出身有名人をWikipediaから',
    inputPlaceholder: '地名を入力（例: 渋谷区, 京都市）',
    searchButton: '検索',
    locationButton: '📍 現在地から探す',
    searching: '検索中...',
    emptyQueryError: '地名を入力してください',
    genericSearchError: '検索中にエラーが発生しました',
    locationError: '現在地の取得に失敗しました',
    idleHint: '地名を入力するか、地図タブで場所を選んで\n出身の有名人を検索してみましょう',
    resultHeader: (place: string, count: number) => `「${place}」出身の有名人 ${count}名`,
    notFoundError: '有名人が見つかりませんでした。別の地名で試してください。',
    permissionDenied: '位置情報の利用が許可されませんでした',
    reverseGeocodeFailed: '現在地の住所を取得できませんでした',
    placeNotIdentified: '現在地から地名を特定できませんでした',
    detailBack: '← 戻る',
    detailLoadError: '詳細の読み込みに失敗しました',
    detailAttribution: '出典: Wikipedia',
    tabSearch: '検索',
    tabMap: '地図',
    tabFavorites: '保存',
    tabHistory: '履歴',
    favoritesEmpty: 'お気に入りはまだありません。\n詳細画面の★から追加すると、オフラインでも読めます。',
    historyEmpty: '検索履歴はまだありません。',
    close: '閉じる',
    clearHistory: '履歴を消去',
    addFavorite: 'お気に入りに追加',
    removeFavorite: 'お気に入り解除',
    historySearchAgain: '再検索',
    mapHint: '地図を動かすと、見えている都市のピンが出ます。タップして出身有名人を見る',
    locateMe: '現在地',
    mapCredit: '地名: Wikipedia / Wikidata / GeoNames',
    pinCount: (count: number) => `${count}人`,
    pinNone: 'なし',
    occupationAll: 'すべて',
    occupationActor: '俳優',
    occupationAthlete: 'スポーツ',
    occupationMusician: '音楽',
    occupationPolitician: '政治',
    occupationCreator: 'クリエイター',
    occupationOther: 'その他',
  },
  en: {
    title: 'Famous From Here',
    subtitle: 'Search the map and discover famous people via Wikipedia',
    inputPlaceholder: 'Enter a place (e.g. Paris, Tokyo)',
    searchButton: 'Search',
    locationButton: '📍 Use current location',
    searching: 'Searching...',
    emptyQueryError: 'Please enter a place name',
    genericSearchError: 'Something went wrong while searching',
    locationError: 'Failed to get current location',
    idleHint: 'Enter a place name, or pick a spot on the Map tab\nto find celebrities from there',
    resultHeader: (place: string, count: number) => `${count} celebrities from "${place}"`,
    notFoundError: 'No celebrities found. Try a different place name.',
    permissionDenied: 'Location permission was denied',
    reverseGeocodeFailed: 'Could not resolve an address for your location',
    placeNotIdentified: 'Could not identify a place name from your location',
    detailBack: '← Back',
    detailLoadError: 'Failed to load details',
    detailAttribution: 'Source: Wikipedia',
    tabSearch: 'Search',
    tabMap: 'Map',
    tabFavorites: 'Saved',
    tabHistory: 'History',
    favoritesEmpty: 'No favorites yet.\nTap ★ on a detail screen to save one for offline reading.',
    historyEmpty: 'No search history yet.',
    close: 'Close',
    clearHistory: 'Clear history',
    addFavorite: 'Add to favorites',
    removeFavorite: 'Remove favorite',
    historySearchAgain: 'Search again',
    mapHint: 'Move the map to see cities in view. Tap a pin to find famous people',
    locateMe: 'My location',
    mapCredit: 'Places: Wikipedia / Wikidata / GeoNames',
    pinCount: (count: number) => `${count}`,
    pinNone: 'None',
    occupationAll: 'All',
    occupationActor: 'Actors',
    occupationAthlete: 'Sports',
    occupationMusician: 'Music',
    occupationPolitician: 'Politics',
    occupationCreator: 'Creators',
    occupationOther: 'Other',
  },
};

export function getStrings(lang: Lang): Strings {
  return strings[lang];
}

export function occupationLabel(t: Strings, id: OccupationId | 'all'): string {
  switch (id) {
    case 'all':
      return t.occupationAll;
    case 'actor':
      return t.occupationActor;
    case 'athlete':
      return t.occupationAthlete;
    case 'musician':
      return t.occupationMusician;
    case 'politician':
      return t.occupationPolitician;
    case 'creator':
      return t.occupationCreator;
    case 'other':
      return t.occupationOther;
  }
}
