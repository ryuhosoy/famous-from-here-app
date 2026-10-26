import { Lang } from '../i18n';
import { Celebrity, SearchResult } from '../types';

const MEMBER_PAGE_SIZE = 500;
const DETAIL_BATCH_SIZE = 50;

type WikiConfig = {
  apiBase: string;
  buildCategoryTitle: (place: string) => string;
  searchCategoryQuery: (place: string) => string;
  placeFromCategoryTitle: (categoryTitle: string) => string;
  isConventionalCategoryTitle: (categoryTitle: string) => boolean;
};

const WIKI_CONFIG: Record<Lang, WikiConfig> = {
  ja: {
    apiBase: 'https://ja.wikipedia.org/w/api.php',
    buildCategoryTitle: (place) => `Category:${place}出身の人物`,
    searchCategoryQuery: (place) => `${place} 出身の人物`,
    placeFromCategoryTitle: (categoryTitle) =>
      categoryTitle.replace(/^Category:/, '').replace(/出身の人物$/, ''),
    isConventionalCategoryTitle: (categoryTitle) => categoryTitle.endsWith('出身の人物'),
  },
  en: {
    apiBase: 'https://en.wikipedia.org/w/api.php',
    buildCategoryTitle: (place) => `Category:People from ${place}`,
    searchCategoryQuery: (place) => `People from ${place}`,
    placeFromCategoryTitle: (categoryTitle) => categoryTitle.replace(/^Category:People from /, ''),
    isConventionalCategoryTitle: (categoryTitle) => categoryTitle.startsWith('Category:People from '),
  },
};

const JA_PLACE_SUFFIXES = ['特別区', '市', '区', '町', '村', '都', '府', '県', '郡'];

function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = raw?.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

function normalizePlaceName(name: string): string {
  return name
    .replace(/戶/g, '戸')
    .replace(/廣/g, '広')
    .replace(/驛/g, '駅')
    .replace(/萬/g, '万')
    .replace(/國/g, '国')
    .replace(/學/g, '学')
    .replace(/縣/g, '県')
    .replace(/濱/g, '浜')
    .replace(/繩/g, '縄')
    .replace(/\s+City$/i, '')
    .replace(/\s*,\s*Saitama$/i, '')
    .trim();
}

function expandPlaceCandidates(names: string[]): string[] {
  const adminNames: string[] = [];
  const givenNames: string[] = [];
  const strippedNames: string[] = [];

  for (const original of uniqueNames(names)) {
    const normalized = normalizePlaceName(original);
    for (const name of uniqueNames([original, normalized])) {
      givenNames.push(name);
      const hasSuffix = JA_PLACE_SUFFIXES.some((suffix) => name.endsWith(suffix));
      if (/[\u4e00-\u9faf]/.test(name) && !hasSuffix) {
        adminNames.push(`${name}区`, `${name}市`);
      }
      for (const suffix of JA_PLACE_SUFFIXES) {
        if (name.endsWith(suffix) && name.length > suffix.length) {
          strippedNames.push(name.slice(0, -suffix.length));
        }
      }
    }
  }

  return uniqueNames([...adminNames, ...givenNames, ...strippedNames]);
}

async function wikiGet(apiBase: string, params: Record<string, string>): Promise<any> {
  const query = new URLSearchParams({ format: 'json', origin: '*', ...params });
  const res = await fetch(`${apiBase}?${query.toString()}`, {
    headers: {
      'Api-User-Agent': 'FamousFromHere/1.0 (hometown-celebrities-app)',
    },
  });
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
  return Boolean(page && typeof page.pageid === 'number' && page.pageid > 0 && page.missing === undefined);
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
    srlimit: '8',
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
  const { apiBase, buildCategoryTitle, searchCategoryQuery, isConventionalCategoryTitle } = config;

  const exactTitle = buildCategoryTitle(placeName);
  if (await categoryExists(apiBase, exactTitle)) {
    return exactTitle;
  }

  const viaCategorySearch = await searchCategoryNamespace(
    apiBase,
    searchCategoryQuery(placeName),
    isConventionalCategoryTitle
  );
  if (viaCategorySearch) {
    return viaCategorySearch;
  }

  const resolvedTitle = await resolveArticleTitle(apiBase, placeName);
  if (resolvedTitle && resolvedTitle !== placeName) {
    const resolvedExactTitle = buildCategoryTitle(resolvedTitle);
    if (await categoryExists(apiBase, resolvedExactTitle)) {
      return resolvedExactTitle;
    }
    const viaResolvedCategorySearch = await searchCategoryNamespace(
      apiBase,
      searchCategoryQuery(resolvedTitle),
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
  categoryTitle: string,
  type: 'page' | 'subcat'
): Promise<Array<{ pageid: number; title: string }>> {
  const members: Array<{ pageid: number; title: string }> = [];
  let cmcontinue: string | undefined;

  do {
    const data = await wikiGet(apiBase, {
      action: 'query',
      list: 'categorymembers',
      cmtitle: categoryTitle,
      cmtype: type,
      cmnamespace: type === 'page' ? '0' : '14',
      cmlimit: String(MEMBER_PAGE_SIZE),
      ...(cmcontinue ? { cmcontinue } : {}),
    });
    members.push(...(data?.query?.categorymembers ?? []));
    cmcontinue = data?.continue?.cmcontinue;
  } while (cmcontinue);

  return members;
}

function isListArticle(title: string): boolean {
  return title.includes('一覧') || title.includes('list of');
}

async function getPeopleFromCategory(
  config: WikiConfig,
  categoryTitle: string
): Promise<Array<{ pageid: number; title: string }>> {
  const pages = await getCategoryMembers(config.apiBase, categoryTitle, 'page');
  const articles = pages.filter((page) => !isListArticle(page.title));
  if (articles.length > 0) return articles;

  const subcats = await getCategoryMembers(config.apiBase, categoryTitle, 'subcat');
  const collected: Array<{ pageid: number; title: string }> = [];
  const seen = new Set<number>();
  for (const subcat of subcats) {
    if (!config.isConventionalCategoryTitle(subcat.title)) continue;
    const nested = await getCategoryMembers(config.apiBase, subcat.title, 'page');
    for (const page of nested) {
      if (isListArticle(page.title) || seen.has(page.pageid)) continue;
      seen.add(page.pageid);
      collected.push(page);
    }
  }
  return collected;
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
      prop: 'extracts|pageimages|description',
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
        description: typeof page.description === 'string' ? page.description.trim() : null,
        extract: (page.extract ?? '').trim(),
        thumbnailUrl: page.thumbnail?.source ?? null,
        pageUrl: `https://${wikiHost}/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
      });
    }
  }

  results.sort((a, b) => a.title.localeCompare(b.title, lang));
  return results;
}

function cleanExtract(extract: string): string {
  return extract
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (/^Template:/i.test(trimmed)) return false;
      if (/^File:/i.test(trimmed)) return false;
      if (/^Category:/i.test(trimmed)) return false;
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Fetches the full plain-text article extract and a larger thumbnail for the detail screen.
 */
export async function fetchCelebrityDetail(pageid: number, lang: Lang): Promise<Celebrity> {
  const config = WIKI_CONFIG[lang];
  const wikiHost = lang === 'ja' ? 'ja.wikipedia.org' : 'en.wikipedia.org';
  const data = await wikiGet(config.apiBase, {
    action: 'query',
    pageids: String(pageid),
    prop: 'extracts|pageimages|description',
    explaintext: 'true',
    exsectionformat: 'plain',
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
    description: typeof page.description === 'string' ? page.description.trim() : null,
    extract: cleanExtract(page.extract ?? ''),
    thumbnailUrl: page.thumbnail?.source ?? null,
    pageUrl: `https://${wikiHost}/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
  };
}

/**
 * Tries each candidate place name in order (e.g. city -> district -> prefecture)
 * and returns the first one whose Wikipedia category yields results, using
 * either Japanese or English Wikipedia depending on `lang`.
 */
async function fetchCelebritiesForLang(candidates: string[], lang: Lang): Promise<SearchResult> {
  const config = WIKI_CONFIG[lang];
  const tried = new Set<string>();

  for (const candidate of expandPlaceCandidates(candidates)) {
    if (tried.has(candidate)) continue;
    tried.add(candidate);

    const categoryTitle = await findCategoryTitle(config, candidate);
    if (!categoryTitle) continue;

    const members = await getPeopleFromCategory(config, categoryTitle);
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

export async function fetchCelebritiesByCandidates(candidates: string[], lang: Lang): Promise<SearchResult> {
  const langs: Lang[] = lang === 'ja' ? ['ja', 'en'] : ['en', 'ja'];
  let lastError: unknown = null;

  for (const tryLang of langs) {
    try {
      return await fetchCelebritiesForLang(candidates, tryLang);
    } catch (e) {
      lastError = e;
      if (!(e instanceof NotFoundError)) throw e;
    }
  }

  throw lastError instanceof NotFoundError ? lastError : new NotFoundError();
}

const TITLE_BATCH = 50;
const MAX_COUNT_TITLES_PER_CITY = 6;

export type CityPeopleCount = {
  count: number;
  placeName?: string;
};

const peopleCountCache = new Map<string, CityPeopleCount>();

export async function fetchCityPeopleCounts(
  cities: Array<{ id: number; candidates: string[] }>,
  lang: Lang
): Promise<Record<number, CityPeopleCount>> {
  const config = WIKI_CONFIG[lang];
  const counts: Record<number, CityPeopleCount> = {};
  const needed: Array<{ id: number; candidates: string[] }> = [];

  for (const city of cities) {
    const cached = peopleCountCache.get(`${lang}:${city.id}`);
    if (cached !== undefined) {
      counts[city.id] = cached;
    } else {
      needed.push(city);
    }
  }

  if (needed.length === 0) return counts;

  const titleToCityIds = new Map<string, number[]>();
  const titles: string[] = [];
  for (const city of needed) {
    const names = expandPlaceCandidates(city.candidates).slice(0, MAX_COUNT_TITLES_PER_CITY);
    for (const name of names) {
      const title = config.buildCategoryTitle(name);
      const cityIds = titleToCityIds.get(title) ?? [];
      if (!cityIds.includes(city.id)) {
        cityIds.push(city.id);
        titleToCityIds.set(title, cityIds);
      }
      if (!titles.includes(title)) titles.push(title);
    }
  }

  for (const batch of chunk(titles, TITLE_BATCH)) {
    try {
      const data = await wikiGet(config.apiBase, {
        action: 'query',
        prop: 'categoryinfo',
        titles: batch.join('|'),
      });
      const pages = data?.query?.pages ?? {};
      for (const page of Object.values(pages) as any[]) {
        if (!page?.title || page.missing !== undefined || !page.categoryinfo) continue;
        const people = Number(page.categoryinfo.pages) || 0;
        if (people <= 0) continue;
        const placeName = config.placeFromCategoryTitle(page.title);
        for (const id of titleToCityIds.get(page.title) ?? []) {
          const prev = counts[id];
          if (!prev || people > prev.count) {
            counts[id] = { count: people, placeName };
          }
        }
      }
    } catch (e) {
      console.warn('fetchCityPeopleCounts batch failed', e);
    }
  }

  for (const city of needed) {
    if (counts[city.id] === undefined) {
      counts[city.id] = { count: 0 };
    }
    peopleCountCache.set(`${lang}:${city.id}`, counts[city.id]);
  }

  return counts;
}

export class NotFoundError extends Error {
  constructor() {
    super('NOT_FOUND');
  }
}
