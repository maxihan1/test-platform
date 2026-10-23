// E2E 정상 쪽(흐름 칸) 판정 — 조립 화면 팔레트와 서버의 AI 흐름 후보 재료가 같이 부른다 (도메인/시나리오 §8.11 「가르는 기준」 · §3.7 결정 15)
// 화면에만 두면 서버가 다시 적어야 하고, 둘이 어긋나면 AI 가 팔레트에 없는 흐름을 낸다

import type { Technique } from '@platform/kit/types';

// 상태 전이 기법이 붙은 케이스는 순서가 있는 흐름이라 단계 팔레트의 흐름 칸에 둔다
const 상태전이: Technique = '상태 전이';

/**
 * 흐름 칸(정상 쪽)인가. PRD 를 쓰는 서비스에서 요구가 붙었으면 종류로 — 경계 · 예외 요구만 덮으면 나머지, 그 밖은 흐름이다.
 * 그 밖에는 설계 기법으로 — 상태 전이가 있거나 기법이 없으면 흐름이다
 */
export function 흐름인가(c: { reqs?: readonly { axis: string }[] | undefined; techniques?: readonly string[] | undefined }, PRD씀: boolean): boolean {
  const reqs = c.reqs ?? [];
  if (PRD씀 && reqs.length > 0) return !reqs.every((r) => r.axis === '경계' || r.axis === '예외');
  const 기법 = c.techniques ?? [];
  return 기법.length === 0 || 기법.some((x) => x === 상태전이);
}
