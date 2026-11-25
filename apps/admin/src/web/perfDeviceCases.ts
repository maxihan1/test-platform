// 기기 성능에서 고를 케이스 목록과 프로시저 자동 포함 — 측정 시작과 결과의 「다시 실행」 확인이 같이 쓴다 (도메인/성능 §3.9 「기기 성능」)

import { 게임시나리오인가 } from '@platform/kit/protocol';

import { api, type CaseRow } from './api.js';

/** 폰 케이스만 고른다(게임 케이스도 android 다) — 서버도 아니면 거절한다. 목록은 쪽마다 50건이라 끝까지 받는다 */
export async function 폰케이스들(prefix: string): Promise<CaseRow[]> {
  const 모음: CaseRow[] = [];
  for (let page = 1; ; page += 1) {
    const 쪽 = await api.cases({ service: prefix, platform: 'android', page });
    모음.push(...쪽.items);
    if (쪽.items.length === 0 || 모음.length >= 쪽.total) break;
  }
  // 게임 시나리오(-GS-)는 기기 성능에 안 쓴다 — 서버도 거절한다 (공통/3-공유계약 「게임 시나리오 도구」)
  return 모음.filter((c) => !게임시나리오인가(c.tcId));
}

/** 고른 케이스가 든 테스트 프로시저는 케이스 전부가 돈다 — 서버가 펼치는 것을 화면이 먼저 보인다. 상한은 고른 케이스만 센다 */
export function 자동포함(케이스들: CaseRow[], 고른: string[]) {
  const 활성 = (c: CaseRow) => c.procId != null && c.isActive !== false;
  const 프로시저 = new Set(케이스들.filter((c) => 고른.includes(c.tcId) && 활성(c)).map((c) => c.procId));
  const 인가 = (c: CaseRow) => !고른.includes(c.tcId) && 활성(c) && 프로시저.has(c.procId);
  return { 있나: 프로시저.size > 0, 인가, 수: 케이스들.filter(인가).length };
}
