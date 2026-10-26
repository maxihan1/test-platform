// 화면 검사가 같이 쓰는 작성 목록 summary 차림 — 덮을 칸만 넘긴다 (도메인/작성 §7 「목록 줄 summary」)

import type { 목록요약 } from '../authoring/listSummary.js';

export function 요약(덮을것: {
  kind?: 목록요약['kind'];
  what?: Partial<목록요약['what']>;
  result?: Partial<NonNullable<목록요약['result']>> | null;
  from?: Partial<목록요약['from']>;
} = {}): 목록요약 {
  return {
    kind: 덮을것.kind ?? 'PRD',
    what: { features: [], featuresMore: 0, screens: [], screensMore: 0, reqs: 0, screenRight: 0, tcIds: [], tcMore: 0, fix: null, ...덮을것.what },
    result:
      덮을것.result == null
        ? null
        : { casesMade: null, casesFixed: null, reqsCovered: null, reqsTotal: null, held: null, stoppedAt: null, ...덮을것.result },
    from: { by: 'PERSON', after: null, decisions: null, assets: [], assetsMore: 0, ...덮을것.from },
  };
}
