// 「PRD 관리」 화면이 서버를 부르는 호출 모음. 응답 모양은 admin 의 prd/routes.ts 가 내보내는 것을 그대로 옮겼다 (도메인/작성 §7 「표준 기획서 통로」)

import type { PrdItem } from '@platform/kit';

import { call, json, 파일받기 } from './api.js';

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
  wordExport: (service: string) => 파일받기(`/prd/export${꼬리(service)}&format=docx`),
  /** 「바뀐 요구 N건 테스트에 반영」 — 작성 요청 하나를 세운다. 그 PR 이 병합돼야 반영 안 됨이 준다 */
  apply: (service: string) => call<{ id: number }>(`/prd/apply${꼬리(service)}`, json({})),
};
