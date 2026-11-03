// 설정 › BTS 연결 화면이 서버를 부르는 호출 모음 (도메인/BTS §7 「설정 › BTS 연결」). 모양의 정본은 서버 bts/link.ts · choices.ts · setup.ts 다

import { call, json } from './api.js';

export type 상태단계 = 'DEPLOY_WAIT' | 'QA_REQUEST' | 'QA_REVIEW' | 'DEV_REQUEST' | 'CODE_REVIEW' | 'CLOSED';
export type 해결단계 = 'SCREEN_RIGHT' | 'TEST_PROBLEM' | 'FLAKY' | 'ENV' | 'DUPLICATE';

export interface BTS연결 {
  linked: boolean;
  baseUrl: string | null;
  btsProject: string | null;
  /** 「QA Hub AI」 Auth 계정 이름 — 비밀이 아니다. S25 전에 이은 연결은 null */
  botUsername: string | null;
  /** 상태 단계 → BTS 상태 키 */
  statusMap: Partial<Record<상태단계, string>>;
  /** 해결 단계 → BTS 해결 사유 이름 */
  resolutionMap: Partial<Record<해결단계, string>>;
  deployKey: { tail: string; createdAt: string } | null;
  ruleToken: { tail: string; createdAt: string } | null;
  /** 서버의 공개 주소. 없으면 화면이 브라우저 주소로 물러선다 */
  publicUrl: string | null;
}

export interface BTS고를목록 {
  statuses: { key: string; name: string }[];
  resolutions: { name: string }[];
}

export type 설정항목 = 'WEBHOOK' | 'RULE_ASSIGNEE' | 'RULE_PR' | 'BOARD';

export interface BTS설정결과 {
  what: 설정항목;
  ok: boolean;
  /** BTS 가 준 상태 코드. 0 은 닿지 않음 */
  status?: number;
}

const 바탕 = (projectId: number) => `/settings/projects/${projectId}/bts`;

export const btsApi = {
  get: (projectId: number) => call<BTS연결>(바탕(projectId)),
  save: (
    projectId: number,
    body: { baseUrl: string; btsProject: string; botUsername: string; statusMap: Record<상태단계, string>; resolutionMap: Record<해결단계, string> },
  ) => call<{ ok: true }>(바탕(projectId), { ...json(body), method: 'PUT' }),
  remove: (projectId: number) => call<void>(바탕(projectId), { method: 'DELETE' }),
  choices: (projectId: number, baseUrl: string, botUsername: string) => call<BTS고를목록>(`${바탕(projectId)}/choices`, json({ baseUrl, botUsername })),
  setup: (projectId: number) => call<{ items: BTS설정결과[] }>(`${바탕(projectId)}/setup`, json({})),
  /** 원문은 이 응답 한 번뿐이다 */
  deployKey: (projectId: number) => call<{ key: string }>(`${바탕(projectId)}/keys/deploy`, json({})),
};
