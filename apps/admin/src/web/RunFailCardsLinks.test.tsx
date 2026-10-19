// @vitest-environment jsdom
// 실패 카드에서 이어지는 길 — 펼친 채 열기 · 판정 꼬리표와 거르개 · 직전 대비 거르개 · 다시 돌린 결과 (실행 §8.3 · 점검 2.17 · 2.20 · 2.24)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api } from './api.js';
import { RunFailCards } from './RunFailCards.js';
import { RUN_ID, 그리기, 장치, 줄, 쪽, 케이스 } from './RunFailCards.fixture.js';

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

describe('실패 카드 판정 꼬리표와 거르개 (점검 2.24)', () => {
  it('판정을 남긴 카드 머리에만 「판정함」 꼬리표가 붙는다', async () => {
    그리기(두장(), 두줄);

    expect(await screen.findAllByText('판정함 · 버그')).toHaveLength(1);
  });

  it('「판정 안 한 카드」를 누르면 아직 안 본 카드만 남는다', async () => {
    그리기(두장(), 두줄);

    fireEvent.click(await screen.findByRole('button', { name: /판정 안 한 카드/ }));

    await waitFor(() => expect(screen.queryByText('회원가입')).toBeNull());
    expect(screen.getByText('로그인')).toBeTruthy();
  });
});

describe('직전 대비 거르개 (점검 2.20)', () => {
  it('변화를 주면 그 변화가 있는 카드만 남는다', () => {
    vi.spyOn(api, 'failures').mockResolvedValue(두장());
    render(<RunFailCards runId={RUN_ID} env="qa" items={두줄} platform="ALL" 권한={() => true} 변화="새로깨짐" />);

    return waitFor(() => {
      expect(screen.getByText('회원가입')).toBeTruthy();
      expect(screen.queryByText('로그인')).toBeNull();
    });
  });
});

describe('펼친 채 열기 (점검 6.1)', () => {
  it('열카드로 받은 케이스의 카드만 펼쳐진 채 선다', async () => {
    vi.spyOn(api, 'failures').mockResolvedValue(두장());
    const { container } = render(<RunFailCards runId={RUN_ID} env="qa" items={두줄} platform="ALL" 권한={() => true} 열카드="ZZI-0002" />);

    await screen.findByText('로그인');
    const 접이들 = [...container.querySelectorAll('details.fc-fold')] as HTMLDetailsElement[];
    expect(접이들.map((d) => d.open)).toEqual([false, true]);
  });

  it('펼칠 카드가 1쪽에 없으면 그 카드가 있는 쪽으로 간다', async () => {
    const 부름 = vi.spyOn(api, 'failures').mockImplementation((_run, 쪽번호) =>
      Promise.resolve(
        쪽번호 === 1
          ? 쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1)])], { total: 2, pageSize: 1 })
          : 쪽([케이스('ZZI-0002', '로그인', [장치('desktop', 2)])], { total: 2, pageSize: 1, page: 2 }),
      ),
    );
    const { container } = render(<RunFailCards runId={RUN_ID} env="qa" items={두줄} platform="ALL" 권한={() => true} 열카드="ZZI-0002" />);

    await screen.findByText('로그인');
    expect((container.querySelector('details.fc-fold') as HTMLDetailsElement).open).toBe(true);
    expect(부름).toHaveBeenCalledWith(RUN_ID, 2, undefined);
  });
});

describe('다시 돌린 결과 꼬리표 (점검 2.17)', () => {
  it('다시 돌려 통과한 케이스에 「RUN n에서 통과」 고리가 붙고 누르면 그 카드가 펼쳐진 채 열린다', async () => {
    vi.spyOn(api, 'failures').mockResolvedValue(두장());
    render(
      <RunFailCards
        runId={RUN_ID}
        env="qa"
        items={두줄}
        platform="ALL"
        권한={() => true}
        다시돌림={new Map([['ZZI-0002', { runId: 130, status: 'PASS' as const }]])}
      />,
    );

    const 고리 = await screen.findByRole('link', { name: 'RUN 130에서 통과' });
    expect(고리.getAttribute('href')).toBe('#/runs/fn?run=130&tc=ZZI-0002');
  });

  it('다시 돌려도 실패면 「에서도 실패」라고 적는다', async () => {
    vi.spyOn(api, 'failures').mockResolvedValue(두장());
    render(
      <RunFailCards
        runId={RUN_ID}
        env="qa"
        items={두줄}
        platform="ALL"
        권한={() => true}
        다시돌림={new Map([['ZZI-0001', { runId: 131, status: 'FAIL' as const }]])}
      />,
    );

    expect(await screen.findByRole('link', { name: 'RUN 131에서도 실패' })).toBeTruthy();
  });
});
