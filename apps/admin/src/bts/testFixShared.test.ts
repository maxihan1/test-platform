// 테스트 수정 확인 실행의 Blocked 가르기와 닫기 댓글 덧줄 (도메인/BTS 「테스트 수정 바퀴」 5 프로시저 줄)

import { describe, expect, it } from 'vitest';

import { 막힌대상, 통과못한다른케이스 } from './testFixShared.js';

const 막힘 = { status: 'NA', message: 'BLOCKED', blocked_by: 'MTA-FN-277' };

describe('막힌대상', () => {
  it('통과 못 한 줄이 모두 Blocked 면 막은 케이스 번호다', () => {
    expect(막힌대상([막힘, { status: 'PASS', message: null, blocked_by: null }])).toBe('MTA-FN-277');
  });

  it('한 디바이스라도 진짜 Fail 이면 Blocked 로 가리지 않는다 · 다 통과면 없다', () => {
    expect(막힌대상([막힘, { status: 'FAIL', message: null, blocked_by: null }])).toBeNull();
    expect(막힌대상([{ status: 'PASS', message: null, blocked_by: null }])).toBeNull();
  });
});

describe('통과못한다른케이스', () => {
  it('대상 밖에서 통과하지 못한 케이스를 번호 차례로 한 줄 덧붙이고, 없으면 빈 글이다', () => {
    const 줄들 = [
      { tc_id: 'MTA-FN-278', status: 'PASS' },
      { tc_id: 'MTA-FN-280', status: 'NA' },
      { tc_id: 'MTA-FN-279', status: 'FAIL' },
    ];
    expect(통과못한다른케이스(줄들, 'MTA-FN-278')).toBe('\n같은 프로시저의 다른 테스트 2건은 통과하지 못했어요 — MTA-FN-279 · MTA-FN-280');
    expect(통과못한다른케이스([{ tc_id: 'MTA-FN-278', status: 'PASS' }], 'MTA-FN-278')).toBe('');
  });
});
