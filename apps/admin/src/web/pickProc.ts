// 실행 창이 테스트 프로시저를 통째로 보이는 계산 — 고른 케이스가 든 프로시저의 나머지 케이스를 받아 실행 차례대로 채운다 (도메인/실행 §3.2 「테스트 프로시저 실행」 「고르기」)
// 서버가 펼치는 것을 화면이 먼저 보인다. 요청에는 고른 케이스만 싣고 자동 포함 줄은 싣지 않는다 — 서버가 저장값 → 코드 기본값으로 채운다

import { api, type CaseRow } from './api.js';
import { 다음이있나 } from './paging.js';
import { 케이스서비스 } from './role.js';

/** 창이 든 케이스 줄. 자동 포함은 사람이 고르지 않았는데 같은 프로시저라 같이 도는 줄이다 */
export type 담은줄 = CaseRow & { 자동포함?: boolean };

/**
 * 같은 프로시저의 활성 케이스를 실행 차례대로. 찾기(`?q=`)가 프로시저 번호에도 맞아 번호로 한 번 더 거르고, `procCount` 만큼 모일 때까지 쪽을 넘긴다
 * ponytail: 다섯 쪽까지만 넘긴다(CaseProc 와 같다) — 모자라면 프로시저 번호로만 받는 조건을 서버에 둔다
 */
async function 프로시저받기(row: CaseRow, 번호: string): Promise<CaseRow[]> {
  const 서비스 = 케이스서비스(row.tcId);
  if (서비스 === null) throw new Error(`service of ${row.tcId} is unknown`);
  const 모은: CaseRow[] = [];
  for (let page = 1; page <= 5; page += 1) {
    const 쪽 = await api.cases({ service: 서비스, q: 번호, page });
    모은.push(...쪽.items.filter((c) => c.procId === 번호 && c.isActive));
    if (모은.length >= (row.procCount ?? 0) || !다음이있나(쪽)) break;
  }
  return 모은;
}

/**
 * 고른 줄 가운데 프로시저에 든 것마다 그 프로시저의 케이스를 다 채운다. 프로시저 첫 줄이 나오는 자리에 그 프로시저 전체가 선다 —
 * 고른 줄은 고른 줄 그대로(값 · 디바이스를 여는 쪽이 이미 고쳤다) 두고 받아 온 줄만 자동 포함이다.
 * 못 받았거나 `procCount` 만큼 못 모였으면 받은 만큼으로 열고 `못받음` 을 알린다 — 막지 않는다. 서버가 펼친다
 */
export async function 프로시저채우기(고른: readonly CaseRow[]): Promise<{ 줄들: 담은줄[]; 못받음: boolean }> {
  const 받은 = new Map<string, CaseRow[] | null>();
  let 못받음 = false;
  for (const row of 고른) {
    const 번호 = row.procId;
    if (번호 == null || 받은.has(번호)) continue;
    const 이미 = 고른.filter((c) => c.procId === 번호).length;
    if (이미 >= (row.procCount ?? 0)) {
      받은.set(번호, []);
      continue;
    }
    try {
      받은.set(번호, await 프로시저받기(row, 번호));
    } catch {
      받은.set(번호, null);
    }
  }
  const 줄들: 담은줄[] = [];
  const 썼다 = new Set<string>();
  for (const row of 고른) {
    const 번호 = row.procId;
    if (번호 == null) {
      if (!썼다.has(row.tcId)) 줄들.push(row);
      썼다.add(row.tcId);
      continue;
    }
    if (썼다.has(`proc:${번호}`)) continue;
    썼다.add(`proc:${번호}`);
    const 직접 = new Map(고른.filter((c) => c.procId === 번호).map((c) => [c.tcId, c]));
    const 식구 = new Map([...(받은.get(번호) ?? []).map((c): [string, CaseRow] => [c.tcId, c]), ...직접]);
    const 차례 = [...식구.values()].sort((a, b) => (a.procSeq ?? 0) - (b.procSeq ?? 0));
    if (받은.get(번호) === null || 차례.length < (row.procCount ?? 0)) 못받음 = true;
    for (const c of 차례) {
      if (직접.has(c.tcId)) 줄들.push(직접.get(c.tcId)!);
      else 줄들.push({ ...c, 자동포함: true });
    }
  }
  return { 줄들, 못받음 };
}

/**
 * 한 건인지 — 요청의 케이스가 모두 같은 프로시저 하나에 들거나 옛 꼴 케이스 하나고 반복 1 이면 한 건이다. 서버 규칙을 그대로 따른다 (도메인/실행 §3.2 「한 건 · 다시 돌리기 · 시험 실행」).
 * 한 건이면 대표 케이스를 준다 — 붙을 실행을 찾을 때 쓰므로 요청에 실리는 줄(고른 줄)을 먼저 준다
 */
export function 한건케이스(케이스들: readonly 담은줄[], 반복: number): 담은줄 | null {
  const 첫 = 케이스들[0];
  if (첫 === undefined || 반복 !== 1) return null;
  if (첫.procId == null) return 케이스들.length === 1 ? 첫 : null;
  return 케이스들.every((c) => c.procId === 첫.procId) ? (케이스들.find((c) => c.자동포함 !== true) ?? 첫) : null;
}
