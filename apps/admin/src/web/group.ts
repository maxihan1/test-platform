// 실행 항목을 케이스 1건 = 1행으로 묶는다 (SPEC §8.3)
// 환경별로 행을 쪼개면 목록이 두 배가 되고 "PC는 되는데 모바일만 깨짐"이 한 줄에서 안 보인다

import type { ItemStatus, Platform, RunItemSummary } from './api.js';

export interface CaseGroup {
  tcId: string;
  tcName: string;
  byPlatform: Partial<Record<Platform, RunItemSummary>>;
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
    group.byPlatform[item.platform] = item;
  }

  return order.map((tcId) => groups.get(tcId)!);
}

/** 환경 필터가 걸려 있으면 그 환경의 결과만 놓고 상태를 본다. 안 보이는 칸 때문에 행이 남으면 안 된다 */
export function filterGroups(
  groups: CaseGroup[],
  status: ItemStatus | 'ALL',
  platform: Platform | 'ALL',
): CaseGroup[] {
  return groups.filter((group) => {
    const visible = (platform === 'ALL' ? Object.values(group.byPlatform) : [group.byPlatform[platform]]).filter(
      (item): item is RunItemSummary => item !== undefined,
    );

    if (visible.length === 0) return false;
    return status === 'ALL' || visible.some((item) => item.status === status);
  });
}
