export type Celebrity = {
  pageid: number;
  title: string;
  extract: string;
  thumbnailUrl: string | null;
  pageUrl: string;
};

export type SearchResult = {
  placeUsed: string;
  categoryTitle: string;
  celebrities: Celebrity[];
};
