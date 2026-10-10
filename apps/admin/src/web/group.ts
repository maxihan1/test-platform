// 실행 항목을 케이스 1건 = 1행으로 묶는다 (SPEC §8.3)
// 디바이스별로 행을 쪼개면 목록이 두 배가 되고 "PC는 되는데 모바일만 깨짐"이 한 줄에서 안 보인다
// 반복 실행한 회차도 행을 늘리지 않는다 — 판정 칸이 요약이 된다

import type { ItemStatus, Platform, RunItemSummary } from './api.js';
import { t, 기본언어, type 언어 } from './i18n.js';

export interface CaseGroup {
  tcId: string;
  tcName: string;
  /** 한 디바이스에 회차가 여럿일 수 있다. 회차 순으로 쌓는다 */
  byPlatform: Partial<Record<Platform, RunItemSummary[]>>;
}

export function groupByCase(items: RunItemSummary[]): CaseGroup[] {
  const order: string[] = [];
  const groups = new Map<string, CaseGroup>();

  for (const item of items) {
    let group = groups.get(item.tcId);
    if (group === undefined) {
      group = { tcId: item.tcId, tcName: item.tcName, byPlatform: {} };
      groups.set(item.tcId, group);
      order.push(item.tcId);
    }
    (group.byPlatform[item.platform] ??= []).push(item);
  }

  for (const group of groups.values()) {
    for (const 칸 of Object.values(group.byPlatform)) 칸.sort((a, b) => a.attempt - b.attempt);
  }

  return order.map((tcId) => groups.get(tcId)!);
}

export interface 회차 {
  회차수: number;
  /** 칸에 칠할 판정. 전 회차 통과해야 통과다 */
  status: ItemStatus;
  /** `3/5 통과`. 1회면 null — 그때는 판정 배지만 그린다 */
  글: string | null;
  /** 끝난 회차의 평균. 끝난 것이 없으면 null */
  평균소요ms: number | null;
}

/**
 * 판정 칸이 요약이 된다 (SPEC §8.3).
 *
 * **다섯 번 중 세 번만 통과한 테스트는 믿을 수 없는 테스트다.** 통과 색으로 칠하지 않는다 —
 * 하나라도 통과가 아니면 그 칸은 실패(또는 미실행)로 보인다.
 *
 * 언어를 안 주면 한국어다 — 이 함수를 부르는 실행 결과 화면 셋은 아직 다국어로 안 옮겼다.
 */
export function 회차요약(칸: RunItemSummary[], 언어: 언어 = 기본언어): 회차 {
  const 통과 = 칸.filter((i) => i.status === 'PASS').length;
  const 실패있나 = 칸.some((i) => i.status === 'FAIL');
  // 한 줄로 쓰면 두 판정 글자 사이에 낀 한국어 변수명이 화면 글자로 읽힌다 (messages.test.ts)
  const status: ItemStatus =
    통과 === 칸.length
      ? 'PASS'
      : 실패있나
        ? 'FAIL'
        : 'NA';

  const 끝난것 = 칸.map((i) => i.durationMs).filter((ms): ms is number => ms !== null);
  const 평균소요ms =
    끝난것.length === 0 ? null : Math.round(끝난것.reduce((a, b) => a + b, 0) / 끝난것.length);

  return {
    회차수: 칸.length,
    status,
    글: 칸.length <= 1 ? null : t('{통과}/{전체} 통과', 언어, { 통과, 전체: 칸.length }),
    평균소요ms,
  };
}

export interface 갈림 {
  /** 실패가 없는 케이스의 항목. 판정별 보기가 이미 걸려 있다. 미확정 항목도 제 차례에 든다 */
  줄들: CaseGroup[];
  /**
   * 판정별 보기 「통과」 · 「미실행」에서 **실패 카드 안에만 있어** 줄 목록에 안 나오는 그 판정의 항목 수.
   * 줄 목록 아래 한 줄 안내가 읽는다 — 항목 수 집계와 줄 수가 왜 다른지 알려 준다
   */
  카드안항목수: number;
}

/**
 * 끝난 실행의 항목을 카드 · 줄 목록으로 가른다 (도메인/실행 §8.3).
 *
 * 실패가 하나라도 있는 케이스는 카드로 가므로 줄 목록에서 뺀다 — 같은 케이스가 두 번 나오지 않게.
 * 미확정 항목도 따로 가르지 않고 같은 길로 보낸다 — 꼬리표는 줄 · 카드가 단다.
 * **디바이스를 먼저 거른다.** 카드 통로도 서버에서 그 디바이스로 거르므로, 모바일만 보면 PC 가 깨진 케이스의
 * 모바일 통과분이 줄로 와야 한다. 거르기 전 항목으로 가르면 그 케이스가 카드에도 줄에도 안 나온다.
 */
export function 갈라낸다(
  items: RunItemSummary[],
  판정: ItemStatus | 'ALL',
  platform: Platform | 'ALL',
): 갈림 {
  const 보는 = platform === 'ALL' ? items : items.filter((i) => i.platform === platform);
  const 실패케이스 = new Set(보는.filter((i) => i.status === 'FAIL').map((i) => i.tcId));

  // 줄은 「그 판정 항목이 하나라도 있는」 케이스다 (명세 문장). 회차 요약 판정으로 가르면
  // 통과 한 번 · 미실행 한 번인 줄이 「통과」에서 빠져 판정별 보기 수와 어긋난다
  const 있는줄 = (g: CaseGroup): boolean =>
    판정 === 'ALL' || Object.values(g.byPlatform).some((칸) => 칸?.some((i) => i.status === 판정));
  const 줄후보 = groupByCase(보는.filter((i) => !실패케이스.has(i.tcId)));

  return {
    줄들: 판정 === 'FAIL' ? [] : 줄후보.filter(있는줄),
    카드안항목수:
      판정 === 'PASS' || 판정 === 'NA' ? 보는.filter((i) => 실패케이스.has(i.tcId) && i.status === 판정).length : 0,
  };
}

/** 디바이스 필터가 걸려 있으면 그 디바이스의 결과만 놓고 상태를 본다. 안 보이는 칸 때문에 행이 남으면 안 된다 */
export function filterGroups(
  groups: CaseGroup[],
  status: ItemStatus | 'ALL',
  platform: Platform | 'ALL',
): CaseGroup[] {
  return groups.filter((group) => {
    const 칸들 = platform === 'ALL' ? Object.values(group.byPlatform) : [group.byPlatform[platform]];
    const visible = 칸들.filter((칸): 칸 is RunItemSummary[] => 칸 !== undefined && 칸.length > 0);

    if (visible.length === 0) return false;
    // 회차가 여럿이면 요약 판정으로 거른다 — 목록에 보이는 것과 필터가 같은 값을 봐야 한다
    return status === 'ALL' || visible.some((칸) => 회차요약(칸).status === status);
  });
}
