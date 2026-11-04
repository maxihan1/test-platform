// 테스트 작성 「결정 필요」 결정 목록이 서버를 부르는 호출. 모양은 서버 authoring/decisionItems.ts · decisionRun.ts 가 정본이다 (도메인/작성 §7 「결정 목록 통로」)

import type { 결정목록, 고르기 } from '../authoring/decisionItems.js';
import type { 진행단계 } from '../authoring/decisionRun.js';
import { call, json } from './api.js';

export type { 결정목록, 결정항목, 고르기, 막힘 } from '../authoring/decisionItems.js';
export type { 진행단계 } from '../authoring/decisionRun.js';

/** 진행 본문의 고른 것 하나. 「나중에」는 보내지 않는다 */
export interface 보낼고름 {
  key: string;
  pick: 고르기;
  text?: string;
  option?: number;
  env?: string;
  rows?: number[];
  /** SCREENS 에서 체크한 화면 주소(틀) */
  screens?: string[];
}

const 꼬리 = (service: string) => `?service=${encodeURIComponent(service)}`;

export const decideApi = {
  list: (service: string) => call<결정목록>(`/authoring/decisions${꼬리(service)}`),
  run: (service: string, prdVersion: number, picks: 보낼고름[]) =>
    call<{ steps: 진행단계[] }>(`/authoring/decisions/run${꼬리(service)}`, json({ prdVersion, picks })),
  /** [제외](skip true) · [되돌리기](false) — 적용 버튼을 안 기다린다 */
  skipScreen: (service: string, url: string, skip: boolean) => call<{ ok: true }>(`/authoring/decisions/skip-screen${꼬리(service)}`, json({ url, skip })),
};
