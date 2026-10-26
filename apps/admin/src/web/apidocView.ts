// 「API 문서」 화면이 서버 응답을 그릴 모양으로 바꾸는 순수 함수들 — 그림(ApiDocs*.tsx)과 떼어 검사한다 (도메인/API §8.13)

import type { ApiCoverage, ApiDocChange, ApiDocVersionRow, OpenApiDoc } from './apiDocApi.js';

export type 응답칸 = ApiCoverage['operations'][number]['codes'][number];

export interface API줄 {
  method: string;
  path: string;
  /** 문서의 summary. 없으면 null */
  이름: string | null;
  codes: 응답칸[];
}

export interface API묶음 {
  /** 문서의 첫 태그. 태그가 없는 API 는 null 묶음이다 */
  태그: string | null;
  줄들: API줄[];
}

const 작업 = (doc: OpenApiDoc | null, method: string, path: string) => doc?.paths?.[path]?.[method.toLowerCase()];

/** 커버리지 차례 그대로 태그마다 묶는다. 묶음 차례는 처음 나온 차례다 — 문서가 적은 차례를 따른다 */
export function API묶기(coverage: ApiCoverage, doc: OpenApiDoc | null, 찾는말 = ''): API묶음[] {
  const 말 = 찾는말.trim().toLowerCase();
  const 묶음들 = new Map<string | null, API줄[]>();
  for (const op of coverage.operations) {
    const 문서 = 작업(doc, op.method, op.path);
    const 이름 = typeof 문서?.summary === 'string' ? 문서.summary : null;
    if (말 !== '' && !`${op.method} ${op.path} ${이름 ?? ''}`.toLowerCase().includes(말)) continue;
    const 태그 = typeof 문서?.tags?.[0] === 'string' ? 문서.tags[0] : null;
    const 줄들 = 묶음들.get(태그) ?? [];
    줄들.push({ method: op.method, path: op.path, 이름, codes: op.codes });
    묶음들.set(태그, 줄들);
  }
  return [...묶음들].map(([태그, 줄들]) => ({ 태그, 줄들 }));
}

/** 통과한 케이스가 아직 받지 못한 응답 코드가 있는 API 와 그 코드들 */
export function 안거친응답(coverage: ApiCoverage): { method: string; path: string; codes: number[] }[] {
  return coverage.operations
    .map((op) => ({ method: op.method, path: op.path, codes: op.codes.filter((c) => !c.seen).map((c) => c.status) }))
    .filter((x) => x.codes.length > 0);
}

/** 판 비교의 바뀐 종류 → PRD 관리와 같은 낱말 키 (prdWords `use반영종류글`) */
export const 바뀐종류 = { CHANGED: 'changed', NEW: 'added', REMOVED: 'removed' } as const satisfies Record<ApiDocChange['change'], string>;

/** 버전이 어디서 왔나 — 대상 서버에서 받았거나 파일로 올렸다 */
export function 받은곳(v: ApiDocVersionRow, t: (키: string, 값?: Record<string, string | number>) => string): string {
  if (v.source === 'FILE') return v.fileName === null ? t('파일') : t('파일 {이름}', { 이름: v.fileName });
  return t('{서버} 서버', { 서버: v.env ?? '—' });
}
