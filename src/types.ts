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
