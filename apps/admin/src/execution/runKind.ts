// 실행 종류 — 케이스 실행은 UI · FN, E2E 는 SCENARIO 다. 「케이스 실행」 조건과 종류 판정을 여기 한 곳에 둔다
// 정본은 SPEC 공통/4-데이터모델 「실행 종류」 · 도메인/작성 §3.6 「★ 테스트 두 갈래」 (2026-10-02 · PR #131)

import { tcId종류 } from '../catalog/rules.js';

export type 케이스종류 = 'UI' | 'FN';
export type RunKind = 케이스종류 | 'SCENARIO';
/** 실행 목록의 `?kind=` — case 는 UI · FN 둘 다다. #132 화면이 하위 메뉴로 가를 때까지 기본값이다 */
export type 목록종류 = 'ui' | 'fn' | 'case' | 'scenario';

const 글자: Record<목록종류, string> = {
  ui: "kind = 'UI'",
  fn: "kind = 'FN'",
  scenario: "kind = 'SCENARIO'",
  case: "kind IN ('UI','FN')",
};

// 모르는 값을 400 으로 막지 않는다 — state 거르개와 같은 관례다 (도메인/시나리오 §7 「실행 목록의 E2E 탭」)
export function 목록종류읽기(값: string | undefined): 목록종류 {
  return 값 === 'ui' || 값 === 'fn' || 값 === 'scenario' ? 값 : 'case';
}

/** 별칭을 비우면 칸 이름만 쓴다 — 단건 조회처럼 test_run 하나만 읽는 질의용 */
export function 종류조건(종류: 목록종류, 별칭 = 'r'): string {
  return 별칭 === '' ? 글자[종류] : `${별칭}.${글자[종류]}`;
}

/** 실행 하나에 한 종류만 담는다. 섞이면 null — 부르는 쪽이 거절한다 */
export function 실행종류(tcIds: string[]): 케이스종류 | null {
  const 종류들 = new Set(tcIds.map(tcId종류));
  if (종류들.size !== 1) return null;
  return 종류들.has('UI') ? 'UI' : 'FN';
}

/** 정해진 시간 전체 실행을 종류별 실행으로 나눈다. 빈 묶음은 실행을 만들지 않는다 */
export function 종류별로나눈다<T extends { tcId: string }>(items: T[]): { kind: 케이스종류; items: T[] }[] {
  return (['UI', 'FN'] as const)
    .map((kind) => ({ kind, items: items.filter((i) => tcId종류(i.tcId) === kind) }))
    .filter((m) => m.items.length > 0);
}
