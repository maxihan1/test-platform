// 목록에서 고른 케이스를 실행 요청 항목으로 바꾸는 계산 (SPEC §8.2). 화면 조각은 없다

import type { CaseRow, ItemStatus, RunRequestItem } from './api.js';
import { type LastMap, 마지막결과로거른다 } from './catalogView.js';
import { 항목수 } from './runPlan.js';
import type { 값들 } from './i18n.js';
import type { Field } from './schema.js';

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
 * **결과 칩과 검색 조건은 「전체」일 때만 건다.** 체크박스를 누른 것은 사람이 이름을 대고
 * 지목한 것이고, 칩은 「무엇을 볼까」이지 「무엇을 돌릴까」가 아니다 —
 * 2건을 골라 두고 칩을 「실패」로 바꾸면 버튼은 「고른 2건」인데 1건만 걸리던 자리다.
 */
export function 담을것(
  목록: CaseRow[],
  고른: ReadonlyMap<string, CaseRow>,
  결과칩: ItemStatus | 'ALL',
  마지막: LastMap,
): CaseRow[] {
  // 고른 줄을 통째로 들고 왔다. 목록에서 다시 찾지 않으므로 검색 조건 밖의 것도 안 빠진다
  if (고른.size > 0) return [...고른.values()].filter((c) => c.isActive);
  return 마지막결과로거른다(
    목록.filter((c) => c.isActive),
    마지막,
    결과칩,
  );
}

/**
 * 실행을 거는 쪽이 그대로 쓰는 항목 (scripts/run-scheduled.ts 와 같은 모양).
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
 * 실행 기록 목록이 이 제목으로 실행을 가리고(§8.7) 증적 문서 머리에도 박제된다(§8.3).
 *
 * 한 건이면 실행 창의 제목 칸 기본값과 **같은 말**로 적는다 — 같은 일에 두 가지 제목이 생기지 않게.
 * 여러 건이면 맨 앞 케이스와 나머지 수로 적는다. 「3건 실행」처럼 수만 적으면
 * 목록에 같은 제목이 줄줄이 쌓여 무엇을 돌린 실행인지 가려낼 수 없다.
 */
export function 실행제목(items: RunRequestItem[], t: (키: string, 값?: 값들) => string): string {
  const 맨앞 = items[0]?.tcId ?? '';
  return items.length <= 1
    ? t('{케이스} 실행', { 케이스: 맨앞 })
    : t('{케이스} 외 {나머지}건 실행', { 케이스: 맨앞, 나머지: items.length - 1 });
}

/**
 * 지난 실행에서 쓴 값을 칸 글자로 편다 — 항목 상세의 「값 바꿔 재실행」이 창을 그 값으로 연다 (도메인/실행 §8.10).
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

/** 실행 위치 칸을 보이고 요청에 location 을 실을지 가른다 (SPEC §8.10) */
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
