// 대상 서버 줄의 테스트 데이터 준비 주소 — 입력 꼴 · 값 규칙 · 읽기 · 이어받기 (도메인/인증 §7 envs[] prep · 도메인/실행 §3.2 「실행 전 준비」)
// envs.ts 가 300줄에 닿지 않게 뗐다. 비밀 헤더 값의 저장 · 가림은 어드민 키와 같은 규칙이다

import { z } from 'zod';

import { 머리이름인가, 어드민키값인가 } from './apiService.js';
import { 설정오류 } from './errors.js';

// 칸 하나하나의 규칙은 아래 준비틀림 이 본다 — 어기면 INVALID_REQUEST 가 아니라 BAD_PREP 다
export const 준비줄 = z.object({
  url: z.string(),
  header: z.string(),
  value: z.string().optional(),
  timeoutSec: z.number().optional(),
});

export type 준비입력 = z.infer<typeof 준비줄>;

/** service_env.prep 원문. 관리 서버만 읽는다 — 러너 · 작성 에이전트로 안 간다 */
export interface 준비 {
  url: string;
  header: string;
  value: string;
  timeoutSec: number;
}

export const 기본준비시간 = 120;

const 준비칸틀림 = (p: 준비입력): boolean =>
  !/^https?:\/\/\S+$/.test(p.url.trim()) ||
  p.url.trim().length > 1000 ||
  !머리이름인가(p.header.trim()) ||
  (p.value !== undefined && !어드민키값인가(p.value)) ||
  (p.timeoutSec !== undefined && (!Number.isInteger(p.timeoutSec) || p.timeoutSec < 10 || p.timeoutSec > 600));

/** 한 줄이라도 어긋나면 저장 전체를 막는다 — 400 BAD_PREP */
export const 준비틀림 = (envs: { prep?: 준비입력 | null }[] | undefined): boolean =>
  (envs ?? []).some((e) => e.prep != null && 준비칸틀림(e.prep));

/** service_env.prep 을 읽는다. JSONB 라 모양을 다시 본다 — 저장은 envs.ts 만 하지만 DB 는 손으로도 고친다 */
export function 준비읽기(값: unknown): 준비 | null {
  if (typeof 값 !== 'object' || 값 === null) return null;
  const { url, header, value, timeoutSec } = 값 as Record<string, unknown>;
  return typeof url === 'string' && typeof header === 'string' && typeof value === 'string'
    ? { url, header, value, timeoutSec: typeof timeoutSec === 'number' ? timeoutSec : 기본준비시간 }
    : null;
}

/**
 * 키가 없으면 옛 값, null 이면 지운다, 값이 없으면 같은 주소 · 같은 머리의 옛 값을 잇는다(줄 이름이 같은 것은 부르는 쪽이 옛 줄을 이름으로 찾아 맞춘다).
 * 주소나 머리를 바꾸면 잇지 않는다 — 끝 4자리만 본 사람이 원문을 다른 주소로 보내지 못하게(어드민 키의 주소 규칙과 같은 까닭).
 * 실서비스 서버 줄에 남으면 400 PREP_ON_PROD — 키를 안 보내 옛 값이 남는 경우도 같다. 데이터를 지우고 되돌리는 주소라서다
 */
export function 준비이어받기(보낸것: 준비입력 | null | undefined, 옛것: 준비 | null, 실서비스: boolean): 준비 | null {
  const 남길것 = 보낸것 === undefined ? 옛것 : 보낸것 === null ? null : 준비만들기(보낸것, 옛것);
  if (남길것 !== null && 실서비스) throw new 설정오류('PREP_ON_PROD');
  return 남길것;
}

function 준비만들기(보낸: 준비입력, 옛것: 준비 | null): 준비 {
  const url = 보낸.url.trim();
  const header = 보낸.header.trim();
  const value = 보낸.value ?? (옛것?.url === url && 옛것.header === header ? 옛것.value : undefined);
  if (value === undefined) throw new 설정오류('PREP_VALUE_REQUIRED');
  return { url, header, value, timeoutSec: 보낸.timeoutSec ?? 기본준비시간 };
}
