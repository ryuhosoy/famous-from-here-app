import { Lang } from '../i18n';
import { Celebrity, SearchResult } from '../types';

const MAX_MEMBERS = 40;
const DETAIL_BATCH_SIZE = 20;

type WikiConfig = {
  apiBase: string;
  buildCategoryTitle: (place: string) => string;
  placeFromCategoryTitle: (categoryTitle: string) => string;
  isConventionalCategoryTitle: (categoryTitle: string) => boolean;
};

const WIKI_CONFIG: Record<Lang, WikiConfig> = {
  ja: {
    apiBase: 'https://ja.wikipedia.org/w/api.php',
    buildCategoryTitle: (place) => `Category:${place}出身の人物`,
    placeFromCategoryTitle: (categoryTitle) =>
      categoryTitle.replace(/^Category:/, '').replace(/出身の人物$/, ''),
    isConventionalCategoryTitle: (categoryTitle) => categoryTitle.endsWith('出身の人物'),
  },
  en: {
    apiBase: 'https://en.wikipedia.org/w/api.php',
    buildCategoryTitle: (place) => `Category:People from ${place}`,
    placeFromCategoryTitle: (categoryTitle) => categoryTitle.replace(/^Category:People from /, ''),
    isConventionalCategoryTitle: (categoryTitle) => categoryTitle.startsWith('Category:People from '),
  },
};

async function wikiGet(apiBase: string, params: Record<string, string>): Promise<any> {
  const query = new URLSearchParams({ format: 'json', origin: '*', ...params });
  const res = await fetch(`${apiBase}?${query.toString()}`);
  if (!res.ok) {
    throw new Error(`Wikipedia API error: ${res.status}`);
  }
  return res.json();
}

async function categoryExists(apiBase: string, categoryTitle: string): Promise<boolean> {
  const data = await wikiGet(apiBase, { action: 'query', titles: categoryTitle });
  const pages = data?.query?.pages;
  if (!pages) return false;
  const page = Object.values(pages)[0] as any;
  return Boolean(page && page.pageid !== undefined && !page.missing);
}

async function searchCategoryNamespace(
  apiBase: string,
  searchTerm: string,
  expectedSuffixOrPrefix: (title: string) => boolean
): Promise<string | null> {
  const data = await wikiGet(apiBase, {
    action: 'query',
    list: 'search',
    srnamespace: '14',
    srsearch: searchTerm,
    srlimit: '5',
  });
  const results: Array<{ title: string }> = data?.query?.search ?? [];
  const bestMatch = results.find((r) => expectedSuffixOrPrefix(r.title)) ?? results[0];
  return bestMatch ? bestMatch.title : null;
}

/**
 * Resolves free-form input (alternate spelling, another language, ...) to the
 * title of the matching Wikipedia article, e.g. "San Francisco" -> "サンフランシスコ"
 * on ja.wikipedia. Falls back to null if no article matches.
 */
async function resolveArticleTitle(apiBase: string, placeName: string): Promise<string | null> {
  const data = await wikiGet(apiBase, {
    action: 'query',
    list: 'search',
    srnamespace: '0',
    srsearch: placeName,
    srlimit: '1',
  });
  const results: Array<{ title: string }> = data?.query?.search ?? [];
  return results[0]?.title ?? null;
}

async function findCategoryTitle(config: WikiConfig, placeName: string): Promise<string | null> {
  const { apiBase, buildCategoryTitle, isConventionalCategoryTitle } = config;

  const exactTitle = buildCategoryTitle(placeName);
  if (await categoryExists(apiBase, exactTitle)) {
    return exactTitle;
  }

  const viaCategorySearch = await searchCategoryNamespace(apiBase, exactTitle, isConventionalCategoryTitle);
  if (viaCategorySearch) {
    return viaCategorySearch;
  }

  // Input may be in another language or an alternate name (e.g. "San Francisco").
  // Resolve it to the canonical article title and retry.
  const resolvedTitle = await resolveArticleTitle(apiBase, placeName);
  if (resolvedTitle && resolvedTitle !== placeName) {
    const resolvedExactTitle = buildCategoryTitle(resolvedTitle);
    if (await categoryExists(apiBase, resolvedExactTitle)) {
      return resolvedExactTitle;
    }
    const viaResolvedCategorySearch = await searchCategoryNamespace(
      apiBase,
      resolvedExactTitle,
      isConventionalCategoryTitle
    );
    if (viaResolvedCategorySearch) {
      return viaResolvedCategorySearch;
    }
  }

  return null;
}

async function getCategoryMembers(
  apiBase: string,
  categoryTitle: string
): Promise<Array<{ pageid: number; title: string }>> {
  const data = await wikiGet(apiBase, {
    action: 'query',
    list: 'categorymembers',
    cmtitle: categoryTitle,
    cmtype: 'page',
    cmlimit: String(MAX_MEMBERS),
  });
  return data?.query?.categorymembers ?? [];
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function getPageDetails(apiBase: string, pageids: number[], lang: Lang): Promise<Celebrity[]> {
  const batches = chunk(pageids, DETAIL_BATCH_SIZE);
  const results: Celebrity[] = [];
  const wikiHost = lang === 'ja' ? 'ja.wikipedia.org' : 'en.wikipedia.org';

  for (const batch of batches) {
    const data = await wikiGet(apiBase, {
      action: 'query',
      pageids: batch.join('|'),
      prop: 'extracts|pageimages',
      exintro: 'true',
      explaintext: 'true',
      exsentences: '2',
      piprop: 'thumbnail',
      pithumbsize: '300',
    });
    const pages = data?.query?.pages ?? {};
    for (const page of Object.values(pages) as any[]) {
      if (!page || page.missing !== undefined) continue;
      results.push({
        pageid: page.pageid,
        title: page.title,
        extract: (page.extract ?? '').trim(),
        thumbnailUrl: page.thumbnail?.source ?? null,
        pageUrl: `https://${wikiHost}/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
      });
    }
  }

  results.sort((a, b) => a.title.localeCompare(b.title, lang));
  return results;
}

/**
 * Fetches a longer lead-section extract and a larger thumbnail for the detail screen.
 */
export async function fetchCelebrityDetail(pageid: number, lang: Lang): Promise<Celebrity> {
  const config = WIKI_CONFIG[lang];
  const wikiHost = lang === 'ja' ? 'ja.wikipedia.org' : 'en.wikipedia.org';
  const data = await wikiGet(config.apiBase, {
    action: 'query',
    pageids: String(pageid),
    prop: 'extracts|pageimages',
    exintro: 'true',
    explaintext: 'true',
    piprop: 'thumbnail',
    pithumbsize: '800',
  });
  const page = data?.query?.pages?.[String(pageid)];
  if (!page || page.missing !== undefined) {
    throw new Error('PAGE_NOT_FOUND');
  }
  return {
    pageid: page.pageid,
    title: page.title,
    extract: (page.extract ?? '').trim(),
    thumbnailUrl: page.thumbnail?.source ?? null,
    pageUrl: `https://${wikiHost}/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
  };
}

/**
 * Tries each candidate place name in order (e.g. city -> district -> prefecture)
 * and returns the first one whose Wikipedia category yields results, using
 * either Japanese or English Wikipedia depending on `lang`.
 */
export async function fetchCelebritiesByCandidates(candidates: string[], lang: Lang): Promise<SearchResult> {
  const config = WIKI_CONFIG[lang];
  const tried = new Set<string>();

  for (const rawCandidate of candidates) {
    const candidate = rawCandidate?.trim();
    if (!candidate || tried.has(candidate)) continue;
    tried.add(candidate);

    const categoryTitle = await findCategoryTitle(config, candidate);
    if (!categoryTitle) continue;

    const members = await getCategoryMembers(config.apiBase, categoryTitle);
    if (members.length === 0) continue;

    const celebrities = await getPageDetails(
      config.apiBase,
      members.map((m) => m.pageid),
      lang
    );
    if (celebrities.length > 0) {
      const placeUsed = config.placeFromCategoryTitle(categoryTitle);
      return { placeUsed, categoryTitle, celebrities };
    }
  }

  throw new NotFoundError();
}

export class NotFoundError extends Error {
  constructor() {
    super('NOT_FOUND');
  }
}
