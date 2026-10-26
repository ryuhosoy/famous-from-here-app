import { Celebrity, OccupationId } from './types';

const RULES: Array<{ id: OccupationId; keywords: string[] }> = [
  {
    id: 'athlete',
    keywords: [
      '選手',
      '野球',
      'サッカー',
      '相撲',
      '競馬',
      'athlete',
      'baseball',
      'football',
      'soccer',
      'sumo',
      'tennis',
      'basketball',
    ],
  },
  {
    id: 'musician',
    keywords: [
      '歌手',
      'ミュージシャン',
      'シンガー',
      '作曲',
      'アイドル',
      'singer',
      'musician',
      'rapper',
      'composer',
      'idol',
    ],
  },
  {
    id: 'politician',
    keywords: ['政治家', '議員', '知事', '大臣', 'politician', 'senator', 'mayor', 'minister', 'governor'],
  },
  {
    id: 'creator',
    keywords: [
      '作家',
      '漫画家',
      '監督',
      '脚本',
      '画家',
      'アナウンサー',
      'writer',
      'author',
      'director',
      'manga',
      'artist',
      'announcer',
    ],
  },
  {
    id: 'actor',
    keywords: ['俳優', '女優', 'タレント', '声優', 'お笑い', 'actor', 'actress', 'comedian', 'voice actor'],
  },
];

export function classifyOccupation(celebrity: Celebrity): OccupationId {
  const text = `${celebrity.description ?? ''} ${celebrity.extract ?? ''}`.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
      return rule.id;
    }
  }
  return 'other';
}

export function countByOccupation(celebrities: Celebrity[]): Array<{ id: OccupationId; count: number }> {
  const counts: Record<OccupationId, number> = {
    actor: 0,
    athlete: 0,
    musician: 0,
    politician: 0,
    creator: 0,
    other: 0,
  };
  for (const celebrity of celebrities) {
    counts[classifyOccupation(celebrity)] += 1;
  }
  return (Object.entries(counts) as Array<[OccupationId, number]>)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => ({ id, count }));
}
