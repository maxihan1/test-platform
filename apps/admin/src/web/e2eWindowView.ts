// E2E 실행 창(시험 · 정식)이 그릴 단계 이름 · 목록 줄을 계산하는 순수 함수 (도메인/실행 §8.16 ⑥)

import type { ScenarioPart } from '@platform/kit';

import type { Platform, 모바일위치 } from './api.js';
import { t, type 언어 } from './i18n.js';
import type { ScenarioRunPart } from './scenarioApi.js';
import { 카드요약, 종류글, type 재료들 } from './scenarioView.js';
import { PLATFORM_LABEL } from './ui.js';
import { 도는단계줄들 } from './trialView.js';
import type { 쌓인단계 } from './useTrialQueue.js';

export interface 이름줄 {
  /** 케이스 번호 꼬리 `FN-087`. 케이스가 아닌 단계는 종류 이름 */
  꼬리: string;
  제목: string;
}

export interface 목록줄 extends 이름줄 {
  seq: number;
  상태: 'done' | 'now' | 'wait';
  /** 끝난 단계는 걸린 시간, 지금 단계는 경과 */
  ms?: number;
  /** 러너가 아직 첫 단계를 알리지 않아 1단계가 기다리는 중이다 */
  기다림?: boolean;
}

/** `DMW-FN-087` → `FN-087`. 접두사 하나뿐이면 그대로 둔다 */
export const 번호꼬리 = (tcId: string): string => (tcId.split('-').length >= 3 ? tcId.slice(tcId.indexOf('-') + 1) : tcId);

function 이름(part: ScenarioPart, 케이스이름: string | null | undefined, 언어: 언어): 이름줄 {
  if (part.kind === 'case') return { 꼬리: 번호꼬리(part.tcId), 제목: 케이스이름 ?? part.tcId };
  return { 꼬리: t(종류글[part.kind], 언어), 제목: 카드요약(part, undefined, 언어) };
}

/** 시험 실행은 돌린 때의 단계와 불러 둔 케이스 재료로 이름을 만든다 */
export const 시험이름줄들 = (단계들: ScenarioPart[], 재료: 재료들, 언어: 언어): 이름줄[] =>
  단계들.map((p) => 이름(p, p.kind === 'case' ? 재료.get(p.tcId)?.name : null, 언어));

/** 정식 실행은 서버가 준 부품에서 이름을 읽는다 */
export const 정식이름줄들 = (부품들: ScenarioRunPart[], 언어: 언어): 이름줄[] => 부품들.map((p) => 이름(p.part, p.tcName, 언어));

/**
 * 단계 목록 — 끝난 단계는 걸린 시간, 지금 단계는 경과, 남은 단계는 흐리게.
 * 지금 단계는 러너가 알린 부품 번호이고, 아직 안 알렸으면 1단계가 기다리는 중이다
 */
export function 목록줄들(이름들: 이름줄[], 쌓임: 쌓인단계[], 도는중: boolean): 목록줄[] {
  const 줄들 = 도는단계줄들(쌓임, 이름들.map((n) => n.제목));
  const 붙임: 목록줄[] = 줄들.map(({ title, ...나머지 }) => ({ ...나머지, 제목: title, 꼬리: 이름들[나머지.seq - 1]?.꼬리 ?? '' }));
  const 첫 = 붙임[0];
  if (도는중 && 쌓임.length === 0 && 첫 !== undefined) 붙임[0] = { ...첫, 상태: 'now', 기다림: true };
  return 붙임;
}

/** 머리 `4 / 8 단계` 의 앞 숫자 — 지금 단계 번호. 아직 안 알렸으면 1이다 */
export const 지금번호 = (줄들: 목록줄[]): number => 줄들.find((줄) => 줄.상태 === 'now')?.seq ?? (줄들.length > 0 && 줄들.every((줄) => 줄.상태 === 'done') ? 줄들.length : 1);

/** 시작 확인 상자의 디바이스 글 — 모바일은 가상 기기인지 실제 기기인지 붙인다 */
export function 디바이스글(t: (키: string) => string, platform: Platform, 위치: 모바일위치): string {
  const 이름 = t(PLATFORM_LABEL[platform]);
  return platform === 'mobile' ? 이름 + ' (' + t(위치 === 'vision' ? '실제 디바이스' : '가상 디바이스') + ')' : 이름;
}

/** 경과 `0:21` · `1:05` — 분과 초 */
export function 경과글(ms: number): string {
  const 초 = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(초 / 60)}:${String(초 % 60).padStart(2, '0')}`;
}
