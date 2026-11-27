// 실행 결과 표의 짜임 — 항목을 프로시저로 묶고 실행 차례대로 세우고 거르고 쪽으로 나눈다 (SPEC 도메인/실행 §8.3 「결과 화면은 요약 한 줄 + 실행 차례 표다」)

import type { ItemStatus, Platform, RunInsights, RunItemSummary } from './api.js';
import { groupByCase, 회차요약, type CaseGroup } from './group.js';
import type { 변화칸 } from './RunSummary.js';

/** 한 쪽의 케이스 줄 수. 프로시저는 쪽 사이에서 갈리지 않아 한 쪽이 이보다 조금 길 수 있다 */
export const 쪽크기 = 50;

/** kit 이 막힌 케이스에 적는 사유 글자 (packages/kit/src/protocol.ts `BLOCKED`) — 화면 번들이 kit 런타임을 안 싣게 글자로 둔다 */
const BLOCKED = 'BLOCKED';

type 막힘재료 = Pick<RunItemSummary, 'status' | 'error' | 'blockedBy'>;

/** 막은 케이스 번호 없이 Blocked 로 끝난 줄이 드물게 있어 사유 글자도 같이 본다 (도메인/실행 §3.2 「막은 케이스 번호가 없는 Blocked」) */
export const 막힌항목 = (i: 막힘재료): boolean => i.status === 'NA' && (i.blockedBy != null || i.error?.message === BLOCKED);

/** 표의 한 덩어리 — 프로시저 하나(헤더가 선다)이거나 프로시저에 안 든 케이스 하나(헤더가 없다) */
export interface 흐름묶음 {
  열쇠: string;
  procId: string | null;
  procName: string | null;
  줄들: CaseGroup[];
}

const 차례 = (g: CaseGroup): number => Math.min(...Object.values(g.byPlatform).flatMap((칸) => (칸 ?? []).map((i) => i.execSeq ?? Number.MAX_SAFE_INTEGER)));

/**
 * 프로시저 번호로 묶는다 — 반복 실행은 같은 프로시저의 실행 단위가 여럿이라 실행 단위 번호로 묶으면 헤더가 회차마다 선다.
 * 덩어리는 처음 나온 차례 그대로, 프로시저 안 케이스는 실행 차례대로다
 */
export function 흐름으로묶는다(items: RunItemSummary[]): 흐름묶음[] {
  const 모음 = new Map<string, RunItemSummary[]>();
  for (const i of items) {
    const 열쇠 = i.procId != null ? `proc:${i.procId}` : `tc:${i.tcId}`;
    모음.set(열쇠, [...(모음.get(열쇠) ?? []), i]);
  }
  return [...모음].map(([열쇠, 것]) => {
    const 첫 = 것[0]!;
    const 줄들 = groupByCase(것);
    return { 열쇠, procId: 첫.procId ?? null, procName: 첫.procName ?? null, 줄들: 첫.procId == null ? 줄들 : 줄들.sort((a, b) => 차례(a) - 차례(b)) };
  });
}

export interface 줄판정 {
  status: ItemStatus;
  blocked: boolean;
  /** 아직 안 끝난 항목이 있다 — 판정 칸이 「진행 중」이다 */
  도는중: boolean;
}

/** 케이스 한 줄의 대표 판정 — 디바이스 · 회차 가운데 하나라도 Fail 이면 Fail, 모두 Pass 여야 Pass 다. 줄 왼쪽 띠 · 헤더의 판정 점 · 건수가 같이 쓴다 */
export function 줄판정of(g: CaseGroup, columns: readonly Platform[]): 줄판정 {
  const 것 = columns.flatMap((p) => g.byPlatform[p] ?? []);
  const status = 것.length === 0 ? 'NA' : 회차요약(것).status;
  return { status, blocked: status === 'NA' && 것.some(막힌항목), 도는중: 것.some((i) => i.finishedAt === null) };
}

export interface 거르개 {
  판정: ItemStatus | 'ALL';
  columns: readonly Platform[];
  /** 요약 한 줄의 「회귀 실패」 · 「기존 실패」를 눌러 건 것 — 견주기 응답의 케이스로 거른다 */
  변화?: { 칸: 변화칸; insights: RunInsights } | null;
}

/** 그 판정의 항목이 하나라도 있는 줄이다 — 칩의 수가 항목 수라 회차 요약으로 거르면 수와 줄이 어긋난다 */
function 보이나(g: CaseGroup, { 판정, columns, 변화 }: 거르개): boolean {
  const 것 = columns.flatMap((p) => g.byPlatform[p] ?? []);
  if (것.length === 0) return false;
  if (판정 !== 'ALL' && !것.some((i) => i.status === 판정)) return false;
  return 변화 == null || 변화.insights.케이스들.some((c) => c.tcId === g.tcId && c.판정 === 변화.칸 && columns.includes(c.platform));
}

/** 헤더는 프로시저 전체를 말하고(전부) 줄은 거른 것만 선다(보이는) */
export interface 보이는묶음 extends 흐름묶음 {
  보이는: CaseGroup[];
}

/**
 * 실패가 있는 덩어리가 위로 온다 — 이전 버전의 「실패 카드 먼저」가 지키던 것이다. 그 안의 차례는 그대로다.
 * 줄이 하나도 안 남은 덩어리는 뺀다
 */
export function 거른흐름(묶음들: 흐름묶음[], 거르기: 거르개): 보이는묶음[] {
  const 깨졌나 = (b: 흐름묶음) => b.줄들.some((g) => 줄판정of(g, 거르기.columns).status === 'FAIL');
  return [...묶음들.filter(깨졌나), ...묶음들.filter((b) => !깨졌나(b))]
    .map((b) => ({ ...b, 보이는: b.줄들.filter((g) => 보이나(g, 거르기)) }))
    .filter((b) => b.보이는.length > 0);
}

/** 덩어리를 쪽으로 나눈다. 프로시저는 쪽 사이에서 갈리지 않는다 — 헤더와 판정 점 줄이 케이스와 떨어지면 흐름이 안 읽힌다 */
export function 쪽으로나눈다<T extends { 보이는: unknown[] }>(묶음들: T[], 크기 = 쪽크기): T[][] {
  const 쪽들: T[][] = [];
  let 찬 = 0;
  for (const b of 묶음들) {
    if (쪽들.length === 0 || 찬 >= 크기) {
      쪽들.push([]);
      찬 = 0;
    }
    쪽들.at(-1)!.push(b);
    찬 += b.보이는.length;
  }
  return 쪽들;
}

/** 그 케이스가 선 쪽(1부터). 없으면 null — 주소로 온 「이 줄을 펴서 열라」가 그 쪽으로 간다 */
export function 케이스쪽(쪽들: 보이는묶음[][], tcId: string): number | null {
  const 자리 = 쪽들.findIndex((쪽) => 쪽.some((b) => b.보이는.some((g) => g.tcId === tcId)));
  return 자리 === -1 ? null : 자리 + 1;
}
