// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import type { ItemStatus, Platform, RunItemSummary } from './api.js';
import { groupByCase } from './group.js';
import { 결과줄 } from './RunResultRow.js';

afterEach(cleanup);

function 항목(
  n: number,
  platform: Platform,
  status: ItemStatus,
  attempt = 1,
  params: Record<string, unknown> = {},
): RunItemSummary {
  return {
    historyId: n,
    tcId: 'ZZW-0001',
    tcName: '로그인하면 토큰이 발급된다',
    platform,
    attempt,
    params,
    paramSchema: { type: 'object', properties: { 비밀번호: { type: 'string', secret: true } } },
    status,
    durationMs: 1200,
    error: status === 'NA' ? { message: '러너에 닿지 못했습니다' } : null,
    startedAt: '2026-09-21T00:00:00.000Z',
    finishedAt: '2026-09-21T00:01:00.000Z',
  };
}

function 그린다(items: RunItemSummary[], columns: Platform[] = ['desktop', 'mobile']) {
  const group = groupByCase(items)[0]!;
  return render(<결과줄 group={group} columns={columns} runId={7} />);
}

describe('결과줄 (SPEC §8.3)', () => {
  it('회차가 여럿이면 판정 칸이 몇 번 중 몇 번 통과인지 적는다', () => {
    그린다([
      항목(1, 'desktop', 'PASS', 1),
      항목(2, 'desktop', 'PASS', 2),
      항목(3, 'desktop', 'FAIL', 3),
    ]);

    expect(screen.queryByText('2/3 통과')).not.toBeNull();
  });

  it('다섯 중 셋만 통과한 칸은 통과 색으로 칠하지 않는다', () => {
    const { container } = 그린다([
      항목(1, 'desktop', 'PASS', 1),
      항목(2, 'desktop', 'PASS', 2),
      항목(3, 'desktop', 'PASS', 3),
      항목(4, 'desktop', 'FAIL', 4),
      항목(5, 'desktop', 'FAIL', 5),
    ]);
    const 거터 = container.querySelector('.gutter');

    expect(거터?.getAttribute('style')).toContain('var(--fail)');
  });

  it('지원하지 않는 디바이스 칸은 판정 대신 줄표로 비운다', () => {
    const { container } = 그린다([항목(1, 'desktop', 'PASS')]);
    const 칸들 = [...container.querySelectorAll('.device')];

    expect(칸들).toHaveLength(2);
    expect(칸들[1]?.querySelector('.device-none')?.textContent).toBe('—');
    expect(칸들[0]?.querySelector('.device-none')).toBeNull();
  });

  it('비밀값 칸은 입력값 줄에서 가려진다', () => {
    const { container } = 그린다([항목(1, 'desktop', 'FAIL', 1, { 비밀번호: 'hunter2' })]);

    expect(container.textContent).not.toContain('hunter2');
  });

  it('미실행 항목은 사유를 같이 적는다 — 없으면 러너 고장과 구분되지 않는다', () => {
    그린다([항목(1, 'desktop', 'NA')]);

    expect(screen.queryByText(/러너에 닿지 못했습니다/)).not.toBeNull();
  });
});
