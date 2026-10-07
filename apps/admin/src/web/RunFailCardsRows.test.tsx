// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api } from './api.js';
import { RunFailCards } from './RunFailCards.js';
import { RUN_ID, 그리기, 단계, 상세, 장치, 줄, 쪽, 케이스 } from './RunFailCards.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('실패 카드 — 통과 줄 · 거르개 · 쪽 · 불러오기 (실행 §8.3)', () => {
  it('그 케이스의 통과 · 미실행 디바이스는 한 줄이고, 펼칠 때만 상세를 한 번 불러온다', async () => {
    const 상세부름 = vi.spyOn(api, 'item').mockResolvedValue(
      상세(2, 'mobile', {
        status: 'PASS',
        precondition: ['모바일 사전조건'],
        steps: [단계(1, '모바일 절차', [['모바일 확인', 'PASS', true, true]])],
      }),
    );
    그리기(
      쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1)])]),
      [
        줄(1, 'ZZI-0001', 'desktop', 'FAIL'),
        줄(2, 'ZZI-0001', 'mobile', 'PASS', { durationMs: 3600 }),
        줄(3, 'ZZI-0001', 'android', 'NA', { durationMs: null }),
        줄(9, 'ZZI-0009', 'desktop', 'PASS'),
      ],
    );

    const 모바일 = await screen.findByRole('button', { name: /ZZI-0001.*모바일/ });
    expect(모바일.getAttribute('aria-expanded')).toBe('false');
    expect(모바일.getAttribute('aria-controls')).not.toBeNull();
    expect(screen.getByText('3.60초')).toBeDefined();
    expect(screen.getByRole('button', { name: /ZZI-0001.*Android 앱/ })).toBeDefined();
    expect(screen.queryByRole('button', { name: /ZZI-0009/ })).toBeNull();
    expect(상세부름).not.toHaveBeenCalled();

    fireEvent.click(모바일);
    expect(await screen.findByText('모바일 절차')).toBeDefined();
    expect(상세부름).toHaveBeenCalledTimes(1);
    expect(상세부름).toHaveBeenCalledWith(RUN_ID, 2);
    expect(screen.getByText('모바일 사전조건')).toBeDefined();
    expect(모바일.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(모바일);
    expect(모바일.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(모바일);
    expect(모바일.getAttribute('aria-expanded')).toBe('true');
    expect(상세부름).toHaveBeenCalledTimes(1);
  });

  it('펼친 상세를 불러오는 중이면 그 자리에 한 줄을, 못 불러오면 오류 한 줄을 적는다', async () => {
    vi.spyOn(api, 'item').mockRejectedValue(new Error('상세를 못 읽었습니다'));
    그리기(
      쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1)])]),
      [줄(1, 'ZZI-0001', 'desktop', 'FAIL'), 줄(2, 'ZZI-0001', 'mobile', 'PASS')],
    );

    fireEvent.click(await screen.findByRole('button', { name: /ZZI-0001.*모바일/ }));
    expect(screen.getByText('불러오는 중입니다.')).toBeDefined();
    expect(await screen.findByText('상세를 못 읽었습니다')).toBeDefined();
  });

  it('디바이스 거르개가 바뀌면 서버에 다시 묻고 화면이 거르지 않는다', async () => {
    const { 부름, rerender } = 그리기(쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1)])]));
    await screen.findByRole('article');
    expect(부름.mock.calls[0]).toEqual([RUN_ID, 1, undefined]);

    rerender(<RunFailCards runId={RUN_ID} env="qa" items={[줄(1, 'ZZI-0001', 'desktop', 'FAIL')]} platform="mobile" />);
    await waitFor(() => expect(부름).toHaveBeenCalledTimes(2));
    expect(부름.mock.calls[1]).toEqual([RUN_ID, 1, 'mobile']);
  });

  it('쪽이 둘 이상이면 이전 · 다음이 있고, 쪽을 넘기면 포커스가 카드 목록 머리로 간다', async () => {
    const 첫쪽 = 쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1)]), 케이스('ZZI-0002', '로그인', [장치('desktop', 2)])], { pageSize: 2, total: 3 });
    const 둘째쪽 = 쪽([케이스('ZZI-0003', '결제', [장치('desktop', 3)])], { pageSize: 2, total: 3, page: 2 });
    const 부름 = vi.spyOn(api, 'failures').mockResolvedValueOnce(첫쪽).mockResolvedValueOnce(둘째쪽);
    render(
      <RunFailCards
        runId={RUN_ID}
        env="qa"
        items={[줄(1, 'ZZI-0001', 'desktop', 'FAIL'), 줄(2, 'ZZI-0002', 'desktop', 'FAIL'), 줄(3, 'ZZI-0003', 'desktop', 'FAIL')]}
        platform="ALL"
      />,
    );

    const 다음 = await screen.findByRole('button', { name: '다음' });
    expect((screen.getByRole('button', { name: '이전' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(다음);

    expect(await screen.findByText('ZZI-0003')).toBeDefined();
    expect(부름.mock.calls[1]).toEqual([RUN_ID, 2, undefined]);
    const 머리 = screen.getByRole('heading', { name: /실패한 케이스/ });
    await waitFor(() => expect(document.activeElement).toBe(머리));
    expect((screen.getByRole('button', { name: '다음' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('쪽이 하나뿐이면 이전 · 다음을 그리지 않는다', async () => {
    그리기(쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1)])]));

    await screen.findByRole('article');
    expect(screen.queryByRole('button', { name: '다음' })).toBeNull();
  });

  it('불러오는 중과 실패는 한 줄로 적는다', async () => {
    vi.spyOn(api, 'failures').mockReturnValue(new Promise(() => undefined));
    render(<RunFailCards runId={RUN_ID} env="qa" items={[줄(1, 'ZZI-0001', 'desktop', 'FAIL')]} platform="ALL" />);
    expect(screen.getByText('불러오는 중입니다.')).toBeDefined();

    cleanup();
    vi.restoreAllMocks();
    vi.spyOn(api, 'failures').mockRejectedValue(new Error('카드를 못 읽었습니다'));
    render(<RunFailCards runId={RUN_ID} env="qa" items={[줄(1, 'ZZI-0001', 'desktop', 'FAIL')]} platform="ALL" />);
    expect(await screen.findByText('카드를 못 읽었습니다')).toBeDefined();
  });

  it('항목이 하나도 없으면 통로를 부르지 않고, 서버가 빈 쪽을 줘도 같은 한 줄을 적는다', async () => {
    const 부름 = vi.spyOn(api, 'failures').mockResolvedValue(쪽([]));
    render(<RunFailCards runId={RUN_ID} env="qa" items={[]} platform="ALL" />);
    expect(screen.getByText('실패한 케이스가 없습니다')).toBeDefined();
    expect(부름).not.toHaveBeenCalled();

    cleanup();
    render(<RunFailCards runId={RUN_ID} env="qa" items={[줄(1, 'ZZI-0001', 'desktop', 'PASS')]} platform="ALL" />);
    expect(await screen.findByText('실패한 케이스가 없습니다')).toBeDefined();
  });

  it('카드에 상세 보기 링크가 있다 — 코드 뷰는 상세에만 둔다', async () => {
    그리기(쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 17)])]));

    const 링크 = await screen.findByRole('link', { name: '상세 보기' });
    expect(링크.getAttribute('href')).toBe(`#/runs/${RUN_ID}/items/17`);
    expect(screen.queryByText('실패 지점 코드')).toBeNull();
  });
});
