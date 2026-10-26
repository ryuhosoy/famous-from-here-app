export type Celebrity = {
  pageid: number;
  title: string;
  description: string | null;
  extract: string;
  thumbnailUrl: string | null;
  pageUrl: string;
};

export type FavoriteCelebrity = Celebrity & {
  savedAt: number;
};

export type HistoryEntry = {
  place: string;
  searchedAt: number;
};

export type SearchResult = {
  placeUsed: string;
  categoryTitle: string;
  celebrities: Celebrity[];
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type MapPlacePin = SearchResult & {
  coordinates: Coordinates;
};

export type CityPin = {
  id: number;
  name: string;
  candidates: string[];
  coordinates: Coordinates;
  population: number;
  kind?: number;
};

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type OccupationId =
  | 'actor'
  | 'athlete'
  | 'musician'
  | 'politician'
  | 'creator'
  | 'other';
