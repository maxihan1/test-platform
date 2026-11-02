// 목록에서 고른 케이스를 실행 요청 항목으로 바꾸는 계산 (SPEC §8.2). 화면 조각은 없다

import type { CaseRow, RunRequestItem } from './api.js';
import { 항목수 } from './runPlan.js';
import type { Field } from './schema.js';

/** 실행 창이 「실행」으로 넘기는 것 (SPEC §8.10). RunPickModal 이 300줄에 닿아 여기로 옮겼다 */
export interface 실행요청 {
  env: string;
  repeat: number;
  notifySlack: boolean;
  items: RunRequestItem[];
}

/** 모달에서 케이스마다 고쳐 넣은 값. 안 고친 케이스는 아예 없다 */
export type 고친값표 = Record<
  string,
  { params?: Record<string, unknown>; expected?: Record<string, unknown> } | undefined
>;

/**
 * 케이스마다 고쳐 넣은 **글자**. 목록 줄과 모달이 같은 표를 쓴다 (2026-09-21 ②).
 *
 * 두 벌로 두면 같은 케이스를 두 자리가 서로 다른 값으로 보여준다.
 * **편 적 없는 케이스는 여기 아예 없고** 코드의 기본값으로 돈다 (SPEC §8.10).
 */
export type 글자표 = Record<
  string,
  { params: Record<string, string>; expected: Record<string, string> } | undefined
>;

/**
 * 실제로 돌릴 케이스.
 *
 * 아무것도 안 고르면 「전체 실행」이라 넘겨받은 목록이 그대로 대상이다 —
 * 목록은 화면이 이미 서버 조건으로 좁혀 놓은 것이라 여기서 다시 좁히지 않는다.
 * 비활성은 고른 것에 섞여 있어도 뺀다 — 스캔이 코드에서 지웠다고 판정한 케이스다 (SPEC §3.1).
 *
 * **검색 조건(마지막 결과 칩 포함)은 「전체」일 때만 건다** — 서버가 이미 걸러 준 목록이다. 체크박스를 누른 것은
 * 사람이 이름을 대고 지목한 것이고, 칩은 「무엇을 볼까」이지 「무엇을 돌릴까」가 아니다 —
 * 2건을 골라 두고 칩을 「실패」로 바꾸면 버튼은 「고른 2건」인데 1건만 걸리던 자리다.
 */
export function 담을것(목록: CaseRow[], 고른: ReadonlyMap<string, CaseRow>): CaseRow[] {
  // 고른 줄을 통째로 들고 왔다. 목록에서 다시 찾지 않으므로 검색 조건 밖의 것도 안 빠진다
  return (고른.size > 0 ? [...고른.values()] : 목록).filter((c) => c.isActive);
}

/**
 * 실행을 거는 쪽이 그대로 쓰는 항목 (execution/scheduled.ts 와 같은 모양).
 *
 * 값을 안 고쳐도 도는 이유 — 사람이 채워야만 도는 케이스를 §4 K10 이 막고 있어
 * 빈 객체를 보내면 케이스 코드에 적힌 기본값으로 돈다. 정기 실행이 이미 이 길로 돈다
 */
export function 실행항목(케이스들: CaseRow[], 고친값: 고친값표): RunRequestItem[] {
  return 케이스들.map((c) => ({
    tcId: c.tcId,
    platforms: c.platforms,
    params: 고친값[c.tcId]?.params ?? {},
    expected: 고친값[c.tcId]?.expected ?? {},
  }));
}

/**
 * 지난 실행에서 쓴 값을 칸 글자로 편다 — 항목 상세의 「입력 값 수정 후 다시 실행」이 창을 그 값으로 연다 (도메인/실행 §8.10).
 *
 * **비밀값 칸은 펴지 않는다.** 항목 응답은 비밀값을 `********` 로 가려 주므로(공통/2 §4.1) 그대로 채우면
 * 별표가 비밀번호로 나간다. 빈 칸으로 두면 저장값이 있을 때 서버가 채우고, 없으면 사람이 다시 넣는다.
 * 객체 값은 `initialText` 와 같이 JSON 으로 편다 — 다르면 손대지 않은 칸이 「바뀜」으로 보인다
 */
export function 지난값글자(fields: Field[], 값들: Record<string, unknown>): Record<string, string> {
  const 글자: Record<string, string> = {};
  for (const field of fields) {
    const 값 = 값들[field.key];
    if (field.secret || 값 === undefined || 값 === null) continue;
    글자[field.key] = typeof 값 === 'object' ? JSON.stringify(값) : String(값);
  }
  return 글자;
}

/** 실행 위치 안내 줄을 보일지 가른다 (SPEC §8.10) */
export function 안드로이드있나(케이스들: CaseRow[]): boolean {
  return 케이스들.some((c) => c.platforms.includes('android'));
}

/**
 * 만들어질 실행 항목 수.
 *
 * 케이스마다 도는 디바이스 수가 달라 곱이 아니라 합이다 — PC 만 도는 케이스와
 * 둘 다 도는 케이스가 섞이면 곱셈은 있지도 않은 조합을 센다.
 * 셈과 상한은 runPlan 이 정본이다 (CLAUDE.md §2.7 ⑤)
 */
export function 몇건(케이스들: CaseRow[], 반복: number): number {
  return 항목수(
    케이스들.map((c) => c.platforms.length),
    반복,
  );
}

/**
 * 「케이스 3 × 디바이스 2 × 반복 1 = 6번」 풀이의 재료.
 *
 * 디바이스 수가 케이스마다 같을 때만 `디바이스` 가 숫자다 — 다르면 곱셈이 맞지 않아 null 이고 `디바이스합` 으로 풀어 쓴다(`몇건` 과 같은 이유).
 * 총건수는 `몇건` 이 정본이라 여기서 다시 세지 않는다
 */
export function 건수재료(케이스들: CaseRow[]): { 케이스: number; 디바이스: number | null; 디바이스합: number } {
  const 수들 = 케이스들.map((c) => c.platforms.length);
  const 첫째 = 수들[0] ?? 0;
  return {
    케이스: 케이스들.length,
    디바이스: 수들.every((n) => n === 첫째) ? 첫째 : null,
    디바이스합: 수들.reduce((합, n) => 합 + n, 0),
  };
}
