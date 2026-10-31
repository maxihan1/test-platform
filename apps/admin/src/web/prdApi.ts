// 「PRD 관리」 화면이 서버를 부르는 호출 모음. 응답 모양은 admin 의 prd/routes.ts 가 내보내는 것을 그대로 옮겼다 (도메인/작성 §7 「표준 기획서 통로」)

import type { PrdItem } from '@platform/kit';

import type { 지도API } from '../prd/apiMap.js';
import type { 덮는케이스 } from '../prd/trace.js';
import { call, json, 파일받기 } from './api.js';

/** 계정이 없어 테스트를 못 쓴 요구 — 번호 → 역할들. registered 는 그 역할 계정을 이미 넣었나. continueFrom 은 「남은 요구로 이어 작성」이 이어 갈 뿌리(없으면 null) */
export interface PrdHeld {
  reqs: Record<string, string[]>;
  roles: { role: string; count: number; registered: boolean }[];
  continueFrom: number | null;
}

export interface PrdNow {
  /** 0 이면 아직 표준 기획서가 없다 */
  version: number;
  items: PrdItem[];
  /** 지도 ① — 번호마다 덮는 활성 케이스. 추적표 칸이 센다 */
  cases: Record<string, 덮는케이스[]>;
  held: PrdHeld;
  /** 요구 번호 → 그 요구를 근거로 든 성능 목표 수와 최근 판정. 실행 read 가 없으면 {} (도메인/성능 §3.9 「추적표」) */
  perf: Record<string, 성능칸>;
}

export interface 성능칸 {
  targets: number;
  verdict: 'PASS' | 'FAIL' | null;
  runId: number | null;
}

/** 버전 기록의 「바뀐 것」 한 줄 — 결정 진행 · 화면이 맞음이 올린 버전만 서버가 적는다 (prd/changes.ts) */
export interface PrdVersionChange {
  kind: 'EDIT' | 'PICK' | 'CONFIRM' | 'ADD' | 'DEL' | 'CHECK';
  reqId: string;
  text: string | null;
  asset: string | null;
  tcId: string | null;
  /** PRD 초안 줄에서 온 고침만 */
  issueKeys?: string[];
}

export interface PrdVersionRow {
  version: number;
  source: 'AGENT' | 'PERSON' | 'REVERT' | 'DECISION' | 'ROLLBACK';
  savedByName: string;
  /** 롤백 판을 세운 배포의 빌드 번호 — 롤백 판만 찬다 */
  rollbackBuild?: string | null;
  savedAt: string;
  requestId: number | null;
  /** 그 AI 작성이 테스트 작성 「결정 필요」에서 세운 것인가 */
  fromDecision: boolean;
  /** null 이면 앞 버전과 견줘 화면이 계산한다 */
  changes: PrdVersionChange[] | null;
}

/** 보내는 항목. 새 항목은 번호가 없다 — 번호 · checkSince · byPerson 은 서버가 매긴다 */
export type PrdItemDraft = Omit<PrdItem, 'reqId' | 'checkSince' | 'byPerson'> & { reqId?: string };

const 꼬리 = (service: string) => `?service=${encodeURIComponent(service)}`;

export const prdApi = {
  now: (service: string) => call<PrdNow>(`/prd${꼬리(service)}`),
  /** 서비스 지도 — API 마다 거친 케이스 · 화면. 요구사항은 now 의 cases 로 잇는다 */
  apis: (service: string) => call<{ apis: 지도API[] }>(`/prd/apis${꼬리(service)}`),
  versions: (service: string) => call<PrdVersionRow[]>(`/prd/versions${꼬리(service)}`),
  /** 옛 버전 하나의 요구 전체. 버전 기록의 「바뀐 것」이 앞 버전과 견주려고 읽는다 */
  version: (service: string, version: number) => call<{ version: number; items: PrdItem[] }>(`/prd/versions/${String(version)}${꼬리(service)}`),
  save: (service: string, baseVersion: number, items: PrdItemDraft[]) =>
    call<{ version: number }>(`/prd${꼬리(service)}`, { ...json({ baseVersion, items }), method: 'PUT' }),
  revert: (service: string, baseVersion: number, toVersion: number) =>
    call<{ version: number }>(`/prd/revert${꼬리(service)}`, json({ baseVersion, toVersion })),
  wordExport: (service: string) => 파일받기(`/prd/export${꼬리(service)}&format=docx`),
  /** 요구사항 추적표 엑셀. 마지막 결과 칸은 실행 read 가 있어야 찬다 */
  rtmExport: (service: string) => 파일받기(`/prd/export${꼬리(service)}&format=xlsx`),
};
