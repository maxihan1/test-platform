// 「PRD 관리」 화면이 서버를 부르는 호출 모음. 응답 모양은 admin 의 prd/routes.ts 가 내보내는 것을 그대로 옮겼다 (도메인/작성 §7 「표준 기획서 통로」)

import type { PrdItem } from '@platform/kit';

import { call, json, 거절이면던진다 } from './api.js';

export interface PrdNow {
  /** 0 이면 아직 표준 기획서가 없다 */
  version: number;
  items: PrdItem[];
  unapplied: { changed: string[]; added: string[]; removed: string[] };
  needsCheck: { count: number; oldestSince: string | null };
}

export interface PrdVersionRow {
  version: number;
  source: 'AGENT' | 'PERSON' | 'REVERT';
  savedByName: string;
  savedAt: string;
}

/** 보내는 항목. 새 항목은 번호가 없다 — 번호 · checkSince · byPerson 은 서버가 매긴다 */
export type PrdItemDraft = Omit<PrdItem, 'reqId' | 'checkSince' | 'byPerson'> & { reqId?: string };

const 꼬리 = (service: string) => `?service=${encodeURIComponent(service)}`;

export const prdApi = {
  now: (service: string) => call<PrdNow>(`/prd${꼬리(service)}`),
  versions: (service: string) => call<PrdVersionRow[]>(`/prd/versions${꼬리(service)}`),
  save: (service: string, baseVersion: number, items: PrdItemDraft[]) =>
    call<{ version: number }>(`/prd${꼬리(service)}`, { ...json({ baseVersion, items }), method: 'PUT' }),
  confirm: (service: string, baseVersion: number, reqIds: string[]) =>
    call<{ version: number }>(`/prd/confirm${꼬리(service)}`, json({ baseVersion, reqIds })),
  revert: (service: string, baseVersion: number, toVersion: number) =>
    call<{ version: number }>(`/prd/revert${꼬리(service)}`, json({ baseVersion, toVersion })),
  // 워드는 JSON 이 아니라 파일이다 — 케이스 엑셀(api.caseExport)과 같은 길로 받는다
  wordExport: async (service: string): Promise<{ 파일: Blob; 머리: string | null }> => {
    const path = `/prd/export${꼬리(service)}&format=docx`;
    const res = await fetch(`/api${path}`, { credentials: 'same-origin' });
    await 거절이면던진다(res, path);
    return { 파일: await res.blob(), 머리: res.headers.get('content-disposition') };
  },
};
