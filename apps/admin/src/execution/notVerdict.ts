// 「판정이 아닌 결과」를 가르는 한 곳 — 미실행(NA)으로 끝난 줄이 왜 판정이 아닌지와, 세는 질의가 같이 쓰는 조건 (SPEC 도메인/실행 §3.2 「판정이 아닌 결과 — 한 곳에서 가른다」)
// 자리마다 status 와 error.message 를 따로 읽으면 Blocked 가 한 곳에서는 미실행이고 다른 곳에서는 실패가 된다

import { BLOCKED, PROCEDURE_CHANGED } from '@platform/kit/protocol';

/** OTHER 는 사유 글자가 정해지지 않은 미실행이다 — 러너 고장 · 폰을 못 잡음 · 결과를 저장하지 못함 */
export type 판정아닌까닭 = 'BLOCKED' | 'ABORTED' | 'PREP_FAILED' | 'TIMEOUT' | 'PROCEDURE_CHANGED' | 'OTHER';

const 아는까닭 = new Set<string>([BLOCKED, 'ABORTED', 'PREP_FAILED', 'TIMEOUT', PROCEDURE_CHANGED]);

/**
 * 끝난 줄의 판정값과 사유 글자로 가른다. 통과 · 실패는 판정이라 null 이다.
 * 시간 초과는 글이 둘이다 — 러너가 프로세스를 끊으면 `TIMEOUT`, kit 이 케이스 한도에서 끊으면 Playwright 꼴 「Test timeout of …ms exceeded.」다(packages/kit/src/runtime/procedure.ts)
 */
export function 판정아닌까닭을가른다(status: string, message: string | null | undefined): 판정아닌까닭 | null {
  if (status !== 'NA') return null;
  if (typeof message !== 'string') return 'OTHER';
  if (message.startsWith('Test timeout of ')) return 'TIMEOUT';
  return 아는까닭.has(message) ? (message as 판정아닌까닭) : 'OTHER';
}

const 앞 = (별칭: string): string => (별칭 === '' ? '' : `${별칭}.`);

/** 판정이 난 줄 — 앞선 결과를 고치는 것은 이 줄뿐이다. 판정이 아닌 결과는 앞선 통과 · 실패를 덮지 않는다 */
export const 판정난줄 = (별칭 = ''): string => `${앞(별칭)}status IN ('PASS', 'FAIL')`;

/** 앞 케이스에 막힌 줄 — 미실행에 들되 따로 센다 */
export const Blocked줄 = (별칭 = ''): string => `(${앞(별칭)}status = 'NA' AND ${앞(별칭)}error->>'message' = '${BLOCKED}')`;

/**
 * 멈춰서 안 돌고 닫힌 항목(NA · error ABORTED)과 준비 실패로 안 돈 항목(NA · error PREP_FAILED)을 빼는 조건 — 넣으면 통과였던 케이스가 멈춘 실행 하나로 「미실행」이 된다.
 * 「케이스마다 최근 실행」을 고르는 질의는 모두 이 조건을 건다 (execution/history.ts lastByCase · authoring/decisionReads.ts).
 * Blocked · 시간 초과 · 프로시저가 바뀐 줄은 빼지 않는다 — 케이스의 마지막 결과는 가장 늦게 끝난 줄 그대로다(가장 늦은 줄이 Blocked 면 미실행이다)
 */
export const 멈춰닫힌항목아님 = (별칭 = ''): string => `NOT (${앞(별칭)}status = 'NA' AND ${앞(별칭)}error->>'message' IN ('ABORTED', 'PREP_FAILED'))`;
