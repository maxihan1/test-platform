// @vitest-environment jsdom
// 실패 카드에서 이어지는 길 — 판정 꼬리표 · 펼친 채 열기 · 다시 돌린 결과 (실행 §8.3 · 점검 2.17 · 2.24)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';

import { 그리기, 장치, 줄, 쪽, 케이스 } from './RunFailCard.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 판정함 = { kind: 'BUG', byName: '맥시', at: '2026-10-19T00:00:00.000Z' } as const;

function 두장() {
  return 쪽([
    케이스('ZZI-0001', '회원가입', [장치('desktop', 1, { change: '새로깨짐' })], { judgment: 판정함 }),
    케이스('ZZI-0002', '로그인', [장치('desktop', 2, { change: '계속깨짐', streak: 3 })]),
  ]);
}

const 두줄 = [줄(1, 'ZZI-0001', 'desktop', 'FAIL'), 줄(2, 'ZZI-0002', 'desktop', 'FAIL', { tcName: '로그인' })];

describe('실패 카드 판정 꼬리표 (점검 2.24)', () => {
  it('판정을 남긴 카드 머리에만 「판정함」 꼬리표가 붙는다', async () => {
    그리기(두장(), 두줄);

    expect(await screen.findAllByText('판정함 · 결함')).toHaveLength(1);
  });
});

describe('펼친 채 열기 (점검 6.1)', () => {
  it('열기를 받은 카드는 펼쳐진 채 서고 아니면 접힌 채 선다', () => {
    const { container, unmount } = 그리기(두장(), 두줄, 'ALL', () => true, true);
    expect([...container.querySelectorAll('details.fc-fold')].map((d) => (d as HTMLDetailsElement).open)).toEqual([true, true]);

    unmount();
    const 접힘 = 그리기(두장(), 두줄);
    expect([...접힘.container.querySelectorAll('details.fc-fold')].map((d) => (d as HTMLDetailsElement).open)).toEqual([false, false]);
  });
});

describe('다시 돌린 결과 꼬리표 (점검 2.17)', () => {
  it('다시 돌려 통과한 케이스에 「RUN n에서 Pass」 고리가 붙고 누르면 그 카드가 펼쳐진 채 열린다', async () => {
    그리기(두장(), 두줄, 'ALL', () => true, false, () => undefined, new Map([['ZZI-0002', { runId: 130, status: 'PASS' as const }]]));

    const 고리 = await screen.findByRole('link', { name: 'RUN 130에서 Pass' });
    expect(고리.getAttribute('href')).toBe('#/runs/fn?run=130&tc=ZZI-0002');
  });

  it('다시 돌려도 실패면 「에서도 실패」라고 적는다', async () => {
    그리기(두장(), 두줄, 'ALL', () => true, false, () => undefined, new Map([['ZZI-0001', { runId: 131, status: 'FAIL' as const }]]));

    expect(await screen.findByRole('link', { name: 'RUN 131에서도 Fail' })).toBeTruthy();
  });
});
