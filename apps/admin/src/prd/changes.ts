// 버전 기록 「바뀐 것」(prd_version.changes) — 결정 진행 버전과 화면이 맞음 요청이 올린 버전만 서버가 적는다 (도메인/작성 §7 「결정 목록 통로」 changes)

import type { PrdItem } from '@platform/kit';

import { 요구같나, type 앞판 } from './rules.js';

/** 「바뀐 것」 한 줄 */
export interface 판변경 {
  /** CHECK 는 PRD 초안의 안 고른 삭제 줄 — 요구는 두고 확인 필요로 돌렸다 */
  kind: 'EDIT' | 'PICK' | 'CONFIRM' | 'ADD' | 'DEL' | 'CHECK';
  reqId: string;
  text: string | null;
  asset: string | null;
  tcId: string | null;
  /** PRD 초안 줄에서 온 고침만 — 롤백이 지운 번호를 여기서 찾는다(도메인/BTS 「롤백 바퀴」 1) */
  issueKeys?: string[];
}

/**
 * 화면이 맞음 번호 가운데 지금 판에서 바뀐 것 — 문장이 바뀌었으면 EDIT, 확인 필요가 확정만 됐으면 CONFIRM.
 * 없거나 다른 번호도 바뀌었으면(더함 · 지움 포함) null — changes 가 차면 화면이 그것만 적어 다른 번호의 고침이 안 보인다(화면이 앞 판과 견준다)
 */
export function 화면변경(지금: 앞판 | null, items: PrdItem[], 화면번호: ReadonlyMap<string, string>): 판변경[] | null {
  const 앞것들 = new Map((지금?.items ?? []).map((x) => [x.reqId, x]));
  if (items.length !== 앞것들.size) return null;
  const 변경: 판변경[] = [];
  for (const x of items) {
    const 앞것 = 앞것들.get(x.reqId);
    if (앞것 === undefined) return null;
    const tcId = 화면번호.get(x.reqId);
    if (tcId === undefined) {
      if (!요구같나(x, 앞것) || x.status !== 앞것.status) return null;
      continue;
    }
    if (앞것.text !== x.text) 변경.push({ kind: 'EDIT', reqId: x.reqId, text: x.text, asset: null, tcId });
    else if (앞것.status === 'NEEDS_CHECK' && x.status === 'CONFIRMED') 변경.push({ kind: 'CONFIRM', reqId: x.reqId, text: null, asset: null, tcId });
  }
  return 변경.length === 0 ? null : 변경;
}
