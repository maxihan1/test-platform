// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import type { ItemStatus, RunItemSummary, 항목진행 } from './api.js';
import type { RunDetail } from './runProgress.js';
import { RunProgressModal } from './RunProgressModal.js';

afterEach(cleanup);

const 분 = (n: number) => `2026-09-21T00:${String(n).padStart(2, '0')}:00.000Z`;

function 항목(n: number, finishedAt: string | null, status: ItemStatus): RunItemSummary {
  return {
    historyId: n,
    tcId: `ZZR-${String(n).padStart(4, '0')}`,
    tcName: `케이스 ${n}`,
    platform: 'desktop',
    attempt: 1,
    params: {},
    paramSchema: {},
    status,
    durationMs: finishedAt === null ? null : 100,
    error: status === 'FAIL' ? { message: '기대값 200, 실제 500\n  at login.spec.ts:12' } : null,
    startedAt: 분(0),
    finishedAt,
  };
}

const 끝난열둘 = [...Array(12).keys()].map((i) => 항목(i + 1, 분(i + 1), i === 11 ? 'FAIL' : 'PASS'));
const 안끝난스물둘 = [...Array(22).keys()].map((i) => 항목(i + 13, null, 'PASS'));

function 실행(status: string, items: RunItemSummary[], counts: RunDetail['counts']): RunDetail {
  return {
    runId: 7,
    title: 'ZZR 진행 확인',
    triggeredBy: 'zzr',
    triggeredByName: '테스터',
    env: 'qa',
    baseUrl: 'https://zzr.example.test',
    serviceName: 'ZZR',
    status,
    startedAt: 분(0),
    finishedAt: status === 'RUNNING' ? null : 분(40),
    counts,
    items,
  };
}

const 도는중실행 = 실행('RUNNING', [...끝난열둘, ...안끝난스물둘], {
  total: 34,
  pass: 11,
  fail: 1,
  na: 0,
  running: 22,
});

const 끝난실행 = 실행(
  'FINISHED',
  [...끝난열둘, ...안끝난스물둘.map((it) => ({ ...it, finishedAt: 분(40) }))],
  { total: 34, pass: 33, fail: 1, na: 0, running: 0 },
);

// 한 케이스를 5회 돌려 3회 깨진 실행. 항목으로 세면 그 하나가 목록을 먹는다
const 반복실행 = 실행(
  'FINISHED',
  [
    ...[1, 2, 3, 4, 5].map((n) => ({
      ...항목(100, 분(n), n <= 3 ? ('FAIL' as ItemStatus) : ('PASS' as ItemStatus)),
      historyId: 100 + n,
      attempt: n,
    })),
    항목(200, 분(6), 'FAIL'),
    항목(201, 분(7), 'FAIL'),
  ],
  { total: 7, pass: 2, fail: 5, na: 0, running: 0 },
);

function 절차(historyId: number, seq: number, title: string, elapsedMs: number): 항목진행 {
  return { historyId, seq, title, elapsedMs, timeoutMs: 300000 };
}

const 본문 = () => document.querySelector('.modal-body')?.textContent ?? '';

describe('RunProgressModal (SPEC §8.9)', () => {
  it('실패한 케이스 목록이 회차를 접는다 — 한 케이스가 목록을 먹지 않는다', () => {
    render(<RunProgressModal data={반복실행} 진행목록={[]} onClose={() => {}} />);

    expect(screen.queryAllByText(/케이스 100/)).toHaveLength(1);
    expect(screen.queryByText(/케이스 200/)).not.toBeNull();
    expect(screen.queryByText(/케이스 201/)).not.toBeNull();
    expect(screen.queryByText(/외 .*건/)).toBeNull();
  });

  it('항목이 하나도 없으면 진행 막대를 그리지 않는다', () => {
    const 빈실행 = 실행('RUNNING', [], { total: 0, pass: 0, fail: 0, na: 0, running: 0 });
    const { container } = render(<RunProgressModal data={빈실행} 진행목록={[]} onClose={() => {}} />);

    expect(container.querySelector('.stripe')).toBeNull();
  });

  it('도는 중이면 지금 진행 중인 항목의 이름이 보인다', () => {
    render(<RunProgressModal data={도는중실행} 진행목록={[]} onClose={() => {}} />);

    expect(screen.queryByText(/케이스 13/)).not.toBeNull();
  });

  it('도는 중이면 끝난 수와 전체 수를 함께 적는다', () => {
    render(<RunProgressModal data={도는중실행} 진행목록={[]} onClose={() => {}} />);

    expect(screen.queryByText('12 / 34 완료')).not.toBeNull();
  });

  it('지금 도는 것을 유일한 것으로 단정하지 않는다', () => {
    render(<RunProgressModal data={도는중실행} 진행목록={[]} onClose={() => {}} />);

    expect(screen.queryByText('진행 중')).not.toBeNull();
    expect(screen.queryByText(/실행 중/)).toBeNull();
  });

  it('도는 중에는 닫는 버튼 하나만 두고 못 누르는 버튼을 놓지 않는다', () => {
    const onClose = vi.fn();
    render(<RunProgressModal data={도는중실행} 진행목록={[]} onClose={onClose} />);

    const 버튼들 = [...document.querySelectorAll('.modal-foot button')];
    expect(버튼들.length).toBe(1);
    expect(버튼들.every((b) => !b.hasAttribute('disabled'))).toBe(true);

    fireEvent.click(버튼들[0]!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('끝나면 같은 컴포넌트가 완료 내용을 그리고 실패한 케이스 이름이 보인다', () => {
    render(<RunProgressModal data={끝난실행} 진행목록={[]} onClose={() => {}} />);

    expect(screen.queryByText(/RUN 7 이 끝났습니다/)).not.toBeNull();
    expect(screen.queryByText(/실패한 케이스/)).not.toBeNull();
    expect(screen.queryByText(/케이스 12/)).not.toBeNull();
    expect(screen.queryByText(/ZZR 진행 확인 · 대상 서버 qa/)).not.toBeNull();
  });

  it('사람이 멈춘 실행은 끝났다고 적지 않는다', () => {
    render(<RunProgressModal data={{ ...끝난실행, status: 'ABORTED' }} 진행목록={[]} onClose={() => {}} />);

    expect(screen.queryByText(/RUN 7 이 멈췄습니다/)).not.toBeNull();
  });

  it('판정을 색만으로 전달하지 않는다 — 숫자 칸마다 글자가 있다', () => {
    for (const data of [도는중실행, 끝난실행]) {
      const { unmount } = render(<RunProgressModal data={data} 진행목록={[]} onClose={() => {}} />);

      const 칸들 = [...document.querySelectorAll('.tally > div')];
      expect(칸들.length).toBeGreaterThan(0);
      for (const 칸 of 칸들) {
        expect(칸.querySelector('b')?.textContent ?? '').not.toBe('');
        expect(칸.querySelector('span')?.textContent ?? '').not.toBe('');
      }
      const 라벨들 = 칸들.map((칸) => 칸.querySelector('span')?.textContent);
      expect(라벨들).toEqual(expect.arrayContaining(['통과', '실패', '미실행']));

      unmount();
    }
  });

  it('러너가 답한 절차의 순번과 제목이 글자로 보인다', () => {
    render(
      <RunProgressModal data={도는중실행} 진행목록={[절차(13, 4, '장바구니에 담는다', 12000)]} onClose={() => {}} />,
    );

    expect(본문()).toContain('절차 4');
    expect(본문()).toContain('장바구니에 담는다');
  });

  it('머문 시간과 제한 시간을 함께 적고 밀리초 숫자를 그대로 내지 않는다', () => {
    render(
      <RunProgressModal data={도는중실행} 진행목록={[절차(13, 4, '장바구니에 담는다', 12000)]} onClose={() => {}} />,
    );

    expect(본문()).toContain('12초째');
    expect(본문()).toContain('제한 5분');
    expect(본문()).not.toContain('12000');
    expect(본문()).not.toContain('300000');
  });

  it('절차가 없으면 그 줄을 아예 두지 않는다 — 빈 자리를 잡아 두지 않는다', () => {
    render(<RunProgressModal data={도는중실행} 진행목록={[]} onClose={() => {}} />);

    expect(document.querySelector('.now-step')).toBeNull();
    expect(screen.queryByText(/케이스 13/)).not.toBeNull();
  });

  it('도는 것이 둘이면 둘 다 절차와 함께 보인다', () => {
    render(
      <RunProgressModal
        data={도는중실행}
        진행목록={[절차(13, 1, '로그인한다', 3000), 절차(14, 2, '검색한다', 61000)]}
        onClose={() => {}}
      />,
    );

    expect(document.querySelectorAll('.now-step').length).toBe(2);
    expect(본문()).toContain('케이스 13');
    expect(본문()).toContain('케이스 14');
    expect(본문()).toContain('절차 1');
    expect(본문()).toContain('절차 2');
    expect(본문()).toContain('1분 1초째');
  });

  it('도는 중 막대는 판정 색 셋과 중립색 하나로 네 칸을 그린다', () => {
    render(<RunProgressModal data={도는중실행} 진행목록={[]} onClose={() => {}} />);

    const 칸들 = [...document.querySelectorAll<HTMLElement>('.stripe i')];
    expect(칸들.map((i) => i.style.background)).toEqual([
      'var(--pass)',
      'var(--fail)',
      'var(--na)',
      'var(--rule)',
    ]);
    expect(칸들.map((i) => i.style.flexGrow)).toEqual(['11', '1', '0', '22']);
  });
});
