// @vitest-environment jsdom
// 결과 화면 — 카드 구획과 줄 구획의 짜임 (도메인/실행 §8.3, 2026-10-08 게이트 2)

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './api.js';
import { RunResult } from './RunResult.js';
import { RUN_ID, 실행까지 } from './RunResult.fixture.js';
import { 끝난실행, 앞선가, 섞인항목, 연다, 첫실행, 카드응답, 판정칸, 항목줄 } from './RunResultAssemble.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  sessionStorage.clear();
});

const 접힌줄들 = () => [...document.querySelectorAll('.fc-card .fc-pass')];

describe('카드 안 접힌 줄은 디바이스 거르기를 따른다', () => {
  it('PC 칩이면 카드 안에 모바일 줄이 없다', async () => {
    const 실패부름 = 연다([항목줄(1, 'ZRR-001', 'desktop', 'FAIL'), 항목줄(2, 'ZRR-001', 'mobile', 'PASS')]);
    await screen.findByRole('button', { name: /ZRR-001.*모바일/ });

    fireEvent.click(screen.getByRole('button', { name: 'PC' }));
    await waitFor(() => expect(실패부름).toHaveBeenLastCalledWith(RUN_ID, 1, 'desktop'));

    expect(접힌줄들()).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /ZRR-001.*모바일/ })).toBeNull();
  });

  it('서버 카드에 없는 실패 디바이스가 접힌 줄로 나오지 않는다', async () => {
    연다([항목줄(1, 'ZRR-001', 'desktop', 'FAIL'), 항목줄(2, 'ZRR-001', 'mobile', 'FAIL')]);
    await waitFor(() => expect(document.querySelector('.fc-list')).not.toBeNull());

    expect(접힌줄들()).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /ZRR-001.*모바일/ })).toBeNull();
  });
});

describe('카드 쪽은 디바이스 칩이나 실행이 바뀌면 처음으로 돌아간다', () => {
  function 쪽마다한장() {
    vi.spyOn(api, 'run').mockImplementation((id) => Promise.resolve({ ...끝난실행(섞인항목), runId: id }));
    vi.spyOn(api, 'insights').mockResolvedValue(첫실행);
    return vi.spyOn(api, 'failures').mockImplementation((_id, 쪽) =>
      Promise.resolve({ items: [카드응답(`ZRR-00${String(쪽)}`)], total: 3, page: 쪽, pageSize: 1 }),
    );
  }

  it('칩을 바꿨다 돌아오면 1쪽이다', async () => {
    const 실패부름 = 쪽마다한장();
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
    fireEvent.click(await screen.findByRole('button', { name: '다음' }));
    await waitFor(() => expect(실패부름).toHaveBeenLastCalledWith(RUN_ID, 2, undefined));

    fireEvent.click(screen.getByRole('button', { name: 'PC' }));
    await waitFor(() => expect(실패부름).toHaveBeenLastCalledWith(RUN_ID, 1, 'desktop'));
    fireEvent.click(screen.getByRole('button', { name: '전체' }));

    await waitFor(() => expect(실패부름).toHaveBeenLastCalledWith(RUN_ID, 1, undefined));
  });

  it('비교 기준 링크로 실행이 바뀌어도 1쪽부터다', async () => {
    const 실패부름 = 쪽마다한장();
    const { rerender } = render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
    fireEvent.click(await screen.findByRole('button', { name: '다음' }));
    await waitFor(() => expect(실패부름).toHaveBeenLastCalledWith(RUN_ID, 2, undefined));

    rerender(<RunResult runId={RUN_ID + 1} 판정하기={() => 실행까지} />);

    await waitFor(() => expect(실패부름).toHaveBeenLastCalledWith(RUN_ID + 1, 1, undefined));
  });
});

describe('통과 · 미실행 구획 제목과 안내 (도메인/실행 §8.3)', () => {
  it('구획 제목에 줄 목록의 케이스 수가 붙는다', async () => {
    연다(섞인항목);
    await screen.findByText('이름-ZRR-002');

    expect(screen.getByRole('heading', { name: '통과 · 미실행 3' })).toBeTruthy();
  });

  it('판정별 보기 「통과」에서 카드 안에만 있는 통과 항목 수를 줄 목록 아래 한 줄로 알린다', async () => {
    연다(섞인항목);
    await screen.findByText('이름-ZRR-002');
    expect(screen.queryByText(/실패한 케이스 안의 항목/)).toBeNull();

    fireEvent.click([...document.querySelectorAll('.rs-fbtn')].find((b) => b.textContent?.startsWith('통과')) as HTMLElement);

    expect(screen.getByText('실패한 케이스 안의 항목 1건은 「전체」에서 카드로 봅니다')).toBeTruthy();
  });

  it('카드 안에 그 판정의 항목이 없으면 안내도 없다', async () => {
    연다(섞인항목);
    await screen.findByText('이름-ZRR-002');

    fireEvent.click([...document.querySelectorAll('.rs-fbtn')].find((b) => b.textContent?.startsWith('미실행')) as HTMLElement);

    expect(screen.queryByText(/실패한 케이스 안의 항목/)).toBeNull();
  });
});

describe('디바이스 칩 묶음은 이름이 있다', () => {
  it('판정별 보기 「전체」와 구분되는 그룹 이름이 붙는다', async () => {
    연다(섞인항목);
    await screen.findByText('이름-ZRR-002');

    const 묶음 = screen.getByRole('group', { name: '디바이스로 거르기' });
    expect(묶음.querySelectorAll('button.chip')).toHaveLength(3);
    expect(묶음.textContent).toContain('PC');
  });
});

describe('도는 중에서 끝남으로 바뀌면 견주기 · 카드 통로를 그때 부른다', () => {
  it('도는 동안은 안 부르고 끝난 뒤에 부른다', async () => {
    vi.useFakeTimers();
    const 도는 = { ...끝난실행([항목줄(1, 'ZRR-001', 'desktop', 'FAIL')]), status: 'RUNNING', finishedAt: null };
    vi.spyOn(api, 'run')
      .mockResolvedValueOnce(도는)
      .mockResolvedValue(끝난실행([항목줄(1, 'ZRR-001', 'desktop', 'FAIL')]));
    vi.spyOn(api, 'progress').mockResolvedValue({ items: [] });
    const 견줌부름 = vi.spyOn(api, 'insights').mockResolvedValue(첫실행);
    const 실패부름 = vi.spyOn(api, 'failures').mockResolvedValue({
      items: [카드응답('ZRR-001')], total: 1, page: 1, pageSize: 5,
    });
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
    await act(async () => {});
    expect(견줌부름).not.toHaveBeenCalled();
    expect(실패부름).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(견줌부름).toHaveBeenCalledWith(RUN_ID);
    expect(실패부름).toHaveBeenCalledWith(RUN_ID, 1, undefined);
  });
});

describe('통과 · 미실행으로 건너뛰기 (게이트 1 제안 15)', () => {
  const 버튼이름 = '통과 · 미실행으로 건너뛰기';

  it('실패 카드 구획 앞에 있고 누르면 통과 · 미실행 구획 제목으로 포커스가 간다', async () => {
    연다(섞인항목);
    await waitFor(() => expect(document.querySelector('.fc-list')).not.toBeNull());

    const 버튼 = screen.getByRole('button', { name: 버튼이름 });
    expect(앞선가(버튼, document.querySelector('.fc-list'))).toBe(true);
    fireEvent.click(버튼);

    expect(document.activeElement).toBe(screen.getByRole('heading', { name: /^통과 · 미실행/ }));
  });

  it('실패 카드가 없으면 건너뛸 곳이 없다', async () => {
    연다([항목줄(1, 'ZRR-002', 'desktop', 'PASS')]);
    await screen.findByText('실패한 케이스가 없습니다');

    expect(screen.queryByRole('button', { name: 버튼이름 })).toBeNull();
  });

  it('줄 목록이 없거나 카드가 안 보이는 판정별 보기에서도 없다', async () => {
    연다(섞인항목);
    await waitFor(() => expect(document.querySelector('.fc-list')).not.toBeNull());

    fireEvent.click(판정칸('통과'));
    expect(screen.queryByRole('button', { name: 버튼이름 })).toBeNull();
    fireEvent.click(판정칸('실패'));
    expect(screen.queryByRole('button', { name: 버튼이름 })).toBeNull();
  });
});
