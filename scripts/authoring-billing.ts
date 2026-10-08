// 작성 에이전트가 Max 플랜의 월간 API 크레딧을 먼저 쓰고, 떨어지면 구독 한도로 넘어가는 판단 (2026-10-08 사용자)
//
// 크레딧은 연결된 Console 조직의 API 키로 `claude -p` 를 띄울 때만 쓰인다 — 플랜 로그인으로 띄우면 구독 한도다.
// 키는 전용 이름으로만 받는다. `ANTHROPIC_API_KEY` 는 과금 안전핀(authoring-rules `과금위험`)이 그대로 막는다 —
// 엉뚱한 키가 환경에 남아 실비가 새는 길은 닫힌 채, 일부러 넣은 크레딧 키만 자식에게 건넨다.
// 그 조직에 결제 수단 · 자동 충전이 없어야 떨어졌을 때 청구 없이 멈춘다(SETUP.md) — 코드로는 그 설정을 못 읽는다

import { type 돌린결과 } from './authoring-spawn.js';
import { 흐름풀기 } from './authoring-usage.js';

export const 크레딧키이름 = 'AUTHORING_CREDIT_KEY';

/** 키 모양만 본다. 구독 토큰(sk-ant-oat)을 넣으면 크레딧이 아니라 구독으로 돌아 넣은 뜻과 어긋난다 */
export function 크레딧키검사(값: string | undefined): string | null {
  if (!값) return null;
  if (/^sk-ant-api\d*-/.test(값)) return null;
  return `${크레딧키이름} 는 크레딧을 받은 Console 조직의 API 키(sk-ant-api…)여야 한다. 구독 토큰은 CLAUDE_CODE_OAUTH_TOKEN 에 넣는다.`;
}

/** 자식이 API 크레딧이 없어 멈췄나. 한도걸렸나 처럼 끝 몇 줄과 표준 오류만 — 대상 화면 문구를 인용한 글까지 바닥으로 세지 않는다 */
export function 크레딧바닥났나(글: string, 오류 = ''): boolean {
  const 끝줄들 = 글.trimEnd().split('\n').slice(-3).join('\n');
  return /credit balance|insufficient credit|spend(?:ing)? limit|workspace api usage limit/i.test(`${끝줄들}\n${오류}`);
}

/** 자식 환경을 한쪽으로 못 박는다 — 키와 구독 토큰이 같이 있으면 어느 쪽으로 도는지 장담 못 한다 */
export function 결제환경(
  환경: Record<string, string | undefined>,
  키: string | undefined,
): Record<string, string | undefined> {
  const { [크레딧키이름]: _전용, ANTHROPIC_API_KEY: _키, CLAUDE_CODE_OAUTH_TOKEN: 구독토큰, ...나머지 } = 환경;
  if (키 !== undefined) return { ...나머지, ANTHROPIC_API_KEY: 키 };
  return 구독토큰 === undefined ? 나머지 : { ...나머지, CLAUDE_CODE_OAUTH_TOKEN: 구독토큰 };
}

/**
 * 크레딧 키가 있으면 그 키로 먼저 띄운다. 시작하자마자(출력 0) 크레딧이 없으면 알리고 구독으로 한 번 더 띄운다.
 * 일하다 도중에 떨어졌으면 다시 띄우지 않는다 — 처음부터 다시 쓰면 만든 것과 겹친다. 부르는 쪽이 한도 멈춤으로 끝내고,
 * 이어하기 때 이 함수가 다시 크레딧부터 시도해 바로 구독으로 넘어간다
 */
export async function 크레딧먼저(
  키: string | undefined,
  띄운다: (키: string | undefined) => Promise<돌린결과>,
  알린다: () => void,
): Promise<{ 돌린것: 돌린결과; 크레딧으로: boolean }> {
  if (키 === undefined) return { 돌린것: await 띄운다(undefined), 크레딧으로: false };
  const 첫 = await 띄운다(키);
  if (첫.멈춤으로죽음 || 첫.시간초과) return { 돌린것: 첫, 크레딧으로: true };
  const 풀린 = 흐름풀기(첫.낸것);
  if (풀린.사용량.output > 0 || !크레딧바닥났나(풀린.글, 첫.오류)) return { 돌린것: 첫, 크레딧으로: true };
  알린다();
  return { 돌린것: await 띄운다(undefined), 크레딧으로: false };
}
