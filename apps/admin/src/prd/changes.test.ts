// 화면이 맞음 버전의 「바뀐 것」 — 화면이 맞음 번호만 바뀌었을 때만 적는다 (도메인/작성 §7 「결정 목록 통로」 changes)

import type { PrdItem } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import { 화면변경 } from './changes.js';

const 항목 = (reqId: string, text: string, status: PrdItem['status'] = 'CONFIRMED'): PrdItem => ({ reqId, feature: '주문', text, basis: [{ from: '화면', quote: text }], status });
const 지금 = { version: 1, lastNo: 2, items: [항목('MK-REQ-001', '옛 문장', 'NEEDS_CHECK'), 항목('MK-REQ-002', '그대로')] };
const 화면 = new Map([['MK-REQ-001', 'MK-FN-001']]);

describe('화면변경', () => {
  it('화면이 맞음 번호의 문장이 바뀌면 EDIT, 확정만 됐으면 CONFIRM 을 그 케이스와 적는다', () => {
    expect(화면변경(지금, [항목('MK-REQ-001', '새 문장'), 지금.items[1]!], 화면)).toEqual([{ kind: 'EDIT', reqId: 'MK-REQ-001', text: '새 문장', asset: null, tcId: 'MK-FN-001' }]);
    expect(화면변경(지금, [항목('MK-REQ-001', '옛 문장'), 지금.items[1]!], 화면)).toEqual([{ kind: 'CONFIRM', reqId: 'MK-REQ-001', text: null, asset: null, tcId: 'MK-FN-001' }]);
  });

  it('다른 번호도 바뀌었거나 더하고 지웠으면 null — 화면이 앞 판과 견준다', () => {
    expect(화면변경(지금, [항목('MK-REQ-001', '새 문장'), 항목('MK-REQ-002', '바뀜')], 화면)).toBeNull();
    expect(화면변경(지금, [항목('MK-REQ-001', '새 문장'), 지금.items[1]!, 항목('MK-REQ-003', '더함')], 화면)).toBeNull();
    expect(화면변경(지금, [항목('MK-REQ-001', '새 문장')], 화면)).toBeNull();
    expect(화면변경(지금, 지금.items, 화면)).toBeNull();
  });
});
