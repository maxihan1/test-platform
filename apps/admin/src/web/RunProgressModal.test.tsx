// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { api, type ItemStatus, type RunItemSummary, type 항목진행 } from './api.js';
import type { RunDetail } from './runProgress.js';
import { RunProgressModal } from './RunProgressModal.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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

  it('완료 창의 실패 케이스를 누르면 깨진 회차의 항목 상세로 가고 상자를 닫는다 (점검 5.3)', () => {
    const onClose = vi.fn();
    render(<RunProgressModal data={반복실행} 진행목록={[]} onClose={onClose} />);

    const 고리 = screen.getByRole('link', { name: /케이스 100/ });
    expect(고리.getAttribute('href')).toBe('#/runs/7/items/101');
    fireEvent.click(고리);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('항목이 하나도 없으면 진행 막대를 그리지 않는다', () => {
    const 빈실행 = 실행('RUNNING', [], { total: 0, pass: 0, fail: 0, na: 0, running: 0 });
    const { container } = render(<RunProgressModal data={빈실행} 진행목록={[]} onClose={() => {}} />);

    expect(container.querySelector('.rl-bar')).toBeNull();
  });

  it('도는 중이면 지금 진행 중인 항목의 이름이 보인다', () => {
    render(<RunProgressModal data={도는중실행} 진행목록={[]} onClose={() => {}} />);

    expect(screen.queryByText(/케이스 13/)).not.toBeNull();
  });

  it('끝난 항목은 「끝남」 아래 판정 알약 한 줄이고 영어 예외를 적지 않는다 (점검표 D7)', () => {
    const 상세 = vi.spyOn(api, 'item');
    const 실패만 = 실행('RUNNING', [항목(301, 분(1), 'FAIL'), 항목(302, null, 'PASS')], { total: 2, pass: 0, fail: 1, na: 0, running: 1 });
    render(<RunProgressModal data={실패만} 진행목록={[]} onClose={() => {}} />);

    const 목록 = document.querySelector('.rl-items')!;
    expect(목록.textContent).toContain('끝남 1');
    expect(목록.querySelector('.pill.fail')?.textContent).toBe('실패');
    expect(본문()).not.toContain('기대값 200, 실제 500');
    // 2초마다 다시 그리는 창이 끝난 항목마다 상세를 묻지 않는다
    expect(상세).not.toHaveBeenCalled();
  });

  it('끝남 · 대기가 많으면 앞 서른 줄만 그리고 나머지는 「외 N건」이다', () => {
    const 많음 = 실행(
      'RUNNING',
      Array.from({ length: 70 }, (_, i) => 항목(400 + i, i < 35 ? 분(1) : null, 'PASS')),
      { total: 70, pass: 35, fail: 0, na: 0, running: 35 },
    );
    render(<RunProgressModal data={많음} 진행목록={[]} onClose={() => {}} />);

    expect(document.querySelectorAll('.rl-items li').length).toBe(1 + 30 + 30);
    expect(screen.getByText('외 5건')).toBeTruthy();
    expect(screen.getByText('외 4건')).toBeTruthy();
  });

  it('도는 중이면 끝난 수와 전체 수를 함께 적는다', () => {
    render(<RunProgressModal data={도는중실행} 진행목록={[]} onClose={() => {}} />);

    expect(screen.queryByText('12 / 34 완료')).not.toBeNull();
  });

  it('도는 중이면 완료 수 아래에 남은 시간 글을 적는다 — 서버가 아직 못 쟀으면 계산 중이다', () => {
    const { unmount } = render(<RunProgressModal data={도는중실행} 진행목록={[]} onClose={() => {}} />);
    expect(screen.queryByText('남은 시간 계산 중')).not.toBeNull();
    unmount();
    render(<RunProgressModal data={도는중실행} 진행목록={[]} 남은ms={30_000} onClose={() => {}} />);
    expect(screen.queryByText('1분 미만 남음')).not.toBeNull();
  });

  it('지금 도는 것을 유일한 것으로 단정하지 않는다', () => {
    render(<RunProgressModal data={도는중실행} 진행목록={[]} onClose={() => {}} />);

    expect(document.querySelector('.rl-items .ih')?.textContent).toBe('진행 중 1');
    // 상자 제목 「RUN 7 실행 중」은 실행 하나를 말한다. 항목을 「실행 중: X」로 단정하는 줄은 없다
    expect(본문()).not.toMatch(/실행 중:/);
  });

  it('도는 중 바닥은 닫아도 계속 돈다는 한 줄과 「닫기」다 — 멈출 수 있는 사람에게만 왼쪽에 「실행 중단」', () => {
    const on멈추기 = vi.fn();
    render(<RunProgressModal data={도는중실행} 진행목록={[]} onClose={() => {}} on멈추기={on멈추기} />);

    const 바닥 = document.querySelector('.modal-foot')!;
    expect(바닥.textContent).toContain('닫아도 실행은 계속되고 끝나면 알림이 옵니다');
    const 버튼들 = [...바닥.querySelectorAll('button')].map((b) => b.textContent);
    expect(버튼들).toEqual(['실행 중단', '닫기']);
    fireEvent.click(screen.getByRole('button', { name: '실행 중단' }));
    expect(on멈추기).toHaveBeenCalledTimes(1);
  });

  it('도는 중에도 끝난 뒤에도 같은 1180×744 틀이다 — 머리 단계 표시만 바뀐다 (점검표 D1 · D8)', () => {
    const { unmount } = render(<RunProgressModal data={도는중실행} 진행목록={[]} onClose={() => {}} />);
    expect(document.querySelector('.modal.frame')).not.toBeNull();
    expect(document.querySelector('.frame-steps [aria-current="step"]')?.textContent).toBe('실행 중');
    unmount();
    render(<RunProgressModal data={끝난실행} 진행목록={[]} onClose={() => {}} />);
    expect(document.querySelector('.modal.frame')).not.toBeNull();
    expect(document.querySelector('.frame-steps [aria-current="step"]')?.textContent).toBe('결과');
  });

  it('바깥을 눌러도 닫히지 않는다 — 한 틀의 닫는 길은 × · Esc · 바닥 단추다 (§8.16 「틀」)', () => {
    const onClose = vi.fn();
    render(<RunProgressModal data={도는중실행} 진행목록={[]} onClose={onClose} />);
    const 덮개 = document.querySelector('.modal-back')!;
    fireEvent.mouseDown(덮개, { target: 덮개 });
    expect(onClose).not.toHaveBeenCalled();
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

    expect(screen.queryByText(/RUN 7 실행이 끝났습니다/)).not.toBeNull();
    expect(screen.queryByText(/케이스 12/)).not.toBeNull();
    expect(screen.queryByText(/ZZR 진행 확인 · 대상 서버 qa · 총 40분/)).not.toBeNull();
  });

  it('완료 창은 항목 목록을 실패 먼저 서른 줄까지 그리고 나머지는 「외 N건」이다', () => {
    const 많음 = [...Array(35).keys()].map((i) => 항목(i + 1, 분(i + 1), i === 34 ? 'FAIL' : 'PASS'));
    render(<RunProgressModal data={실행('FINISHED', 많음, { total: 35, pass: 34, fail: 1, na: 0, running: 0 })} 진행목록={[]} onClose={() => {}} />);

    const 줄들 = [...document.querySelectorAll('.done-items > li')];
    expect(줄들).toHaveLength(30);
    expect(줄들[0]?.textContent).toContain('케이스 35');
    expect(줄들[0]?.querySelector('.verdict')?.textContent).toBe('실패');
    expect(screen.queryByText('외 5건')).not.toBeNull();
  });

  it('실패 줄에는 실패 카드가 쓰는 한 줄 이유가 붙는다', async () => {
    vi.spyOn(api, 'failures').mockResolvedValue({
      items: [{ tcId: 'ZZR-0012', devices: [{ platform: 'desktop', item: { failure: { type: 'notFound', reason: '구매하기 단추를 찾지 못했습니다' } } }] }],
    } as never);
    render(<RunProgressModal data={끝난실행} 진행목록={[]} onClose={() => {}} />);

    expect(await screen.findByText('구매하기 단추를 찾지 못했습니다')).toBeTruthy();
  });

  it('사람이 멈춘 실행은 끝났다고 적지 않는다', () => {
    render(<RunProgressModal data={{ ...끝난실행, status: 'ABORTED' }} 진행목록={[]} onClose={() => {}} />);

    expect(screen.queryByText(/RUN 7 실행이 중단됐습니다/)).not.toBeNull();
  });

  it('판정을 색만으로 전달하지 않는다 — 숫자 칸마다 글자가 있다', () => {
    for (const data of [도는중실행, 끝난실행]) {
      const { unmount } = render(<RunProgressModal data={data} 진행목록={[]} onClose={() => {}} />);

      const 알약들 = [...document.querySelectorAll('.rl-pills .pill')];
      expect(알약들.length).toBe(3);
      for (const 알약 of 알약들) expect(알약.querySelector('b')?.textContent ?? '').not.toBe('');
      expect(알약들.map((알약) => 알약.firstChild?.textContent?.trim())).toEqual(['통과', '실패', '미실행']);

      unmount();
    }
  });

  it('러너가 답한 절차의 순번과 제목이 글자로 보인다', () => {
    render(
      <RunProgressModal data={도는중실행} 진행목록={[절차(13, 4, '장바구니에 담는다', 12000)]} onClose={() => {}} />,
    );

    expect(본문()).toContain('4단계 · 장바구니에 담는다');
  });

  it('머문 시간과 제한 시간을 함께 적고 밀리초 숫자를 그대로 내지 않는다', () => {
    render(
      <RunProgressModal data={도는중실행} 진행목록={[절차(13, 4, '장바구니에 담는다', 12000)]} onClose={() => {}} />,
    );

    expect(본문()).toContain('12초 / 제한 5분');
    expect(본문()).not.toContain('12000');
    expect(본문()).not.toContain('300000');
  });

  it('러너가 아무것도 안 알렸으면 안 끝난 첫째를 카드로 세우고 발에 「브라우저를 여는 중」을 적는다', () => {
    render(<RunProgressModal data={도는중실행} 진행목록={[]} onClose={() => {}} />);

    expect(document.querySelector('.lc-foot')?.textContent).toContain('브라우저를 여는 중');
    expect(screen.queryByText(/케이스 13/)).not.toBeNull();
    expect(본문()).not.toContain('undefined');
  });

  it('도는 것이 둘이면 둘 다 절차와 함께 보인다', () => {
    render(
      <RunProgressModal
        data={도는중실행}
        진행목록={[절차(13, 1, '로그인한다', 3000), 절차(14, 2, '검색한다', 61000)]}
        onClose={() => {}}
      />,
    );

    expect(document.querySelectorAll('.lc').length).toBe(2);
    expect(본문()).toContain('케이스 13');
    expect(본문()).toContain('케이스 14');
    expect(본문()).toContain('1단계 · 로그인한다');
    expect(본문()).toContain('2단계 · 검색한다');
    expect(본문()).toContain('1분 1초 / 제한');
  });

  it('도는 중 막대는 판정 색 셋과 중립색 하나로 네 칸을 그린다', () => {
    render(<RunProgressModal data={도는중실행} 진행목록={[]} onClose={() => {}} />);

    const 칸들 = [...document.querySelectorAll<HTMLElement>('.rl-bar i')];
    expect(칸들.map((i) => i.style.background)).toEqual([
      'var(--pass)',
      'var(--fail)',
      'var(--na)',
      'var(--well)',
    ]);
    expect(칸들.map((i) => i.style.flexGrow)).toEqual(['11', '1', '0', '22']);
  });

  it('미확정이 있어도 막대는 네 칸 그대로이고 「그중 미확정 N건」 한 줄만 붙는다', () => {
    const 섞임 = { ...도는중실행, counts: { ...도는중실행.counts, pass: 11, unconfirmed: 2 } };
    render(<RunProgressModal data={섞임} 진행목록={[]} onClose={() => {}} />);

    const 칸들 = [...document.querySelectorAll<HTMLElement>('.rl-bar i')];
    expect(칸들.map((i) => i.style.background)).toEqual([
      'var(--pass)',
      'var(--fail)',
      'var(--na)',
      'var(--well)',
    ]);
    expect(본문()).toContain('그중 미확정 2건');
  });

  it('끝난 실행의 완료 내용에도 「그중 미확정 N건」이 보인다', () => {
    const 섞임 = { ...끝난실행, counts: { ...끝난실행.counts, pass: 31, unconfirmed: 2 } };
    render(<RunProgressModal data={섞임} 진행목록={[]} onClose={() => {}} />);

    expect(본문()).toContain('그중 미확정 2건');
  });
});
