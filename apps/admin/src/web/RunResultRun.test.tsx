// @vitest-environment jsdom
// 실행 결과 화면 — 진행 상자 · 상자 안 배치 (SPEC §8.3 · §8.9)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api } from './api.js';
import { RunResult } from './RunResult.js';
import { RUN_ID, 그리기, 도는중응답, 끝난응답, 상자라벨, 실행, 실행까지, 증적 } from './RunResult.fixture.js';

// globals 가 꺼져 있어 testing-library 가 스스로 cleanup 을 걸지 못한다. 직접 건다.
// 언마운트가 곧 `setInterval` 정리다 — 안 걸면 2초 폴링이 검사를 붙잡는다
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  sessionStorage.clear();
});

describe('실행 진행 상자 (SPEC §8.9)', () => {
  it('도는 중인 실행을 열면 진행 상자가 떠 있다', async () => {
    vi.spyOn(api, 'run').mockResolvedValue(도는중응답);
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    await screen.findByRole('dialog');
    expect(상자라벨()).toContain('진행 중입니다');
  });

  it('이미 끝난 실행을 열면 상자가 뜨지 않는다', async () => {
    그리기('FINISHED');

    await screen.findAllByText(/만들기$/);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('진행 상자를 닫아도 폴링은 계속 돈다', async () => {
    vi.useFakeTimers();
    const 부름 = vi.spyOn(api, 'run').mockResolvedValue(도는중응답);
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
    await act(async () => {});

    fireEvent.click(screen.getByText('닫기'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(부름).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(부름).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('진행 상자를 닫은 뒤 실행이 끝나면 완료 상자가 뜬다', async () => {
    vi.useFakeTimers();
    vi.spyOn(api, 'run').mockResolvedValueOnce(도는중응답).mockResolvedValue(끝난응답);
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
    await act(async () => {});

    fireEvent.click(screen.getByText('닫기'));
    expect(screen.queryByRole('dialog')).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(상자라벨()).toContain('끝났습니다');
  });
});

// 상자 635px 중 603px(95%)을 정보 UI 가 먹고 케이스 목록에 32px 만 남았다 — 줄이 101px 이라
// **한 줄도 안 들어갔다.** 증적 정보는 머리로 올리고 견줌은 접는다 (2026-09-22 실측)
describe('상자 안에서 정보 UI 가 목록 자리를 뺏지 않는다 (SPEC §8.3, 2026-09-22)', () => {
  const 견줌있음 = {
    previous: { runId: 2110, startedAt: '2026-09-14T10:00:00.000Z' },
    주소바뀜: false,
    빠진건수: 0,
    케이스들: [
      { tcId: 'DEMO-003', tcName: '할 일 추가', platform: 'desktop' as const, 판정: '새로깨짐' as const },
    ],
    실패덩어리들: [],
  };

  const 첫실행 = { previous: null, 주소바뀜: false, 빠진건수: 0, 케이스들: [], 실패덩어리들: [] };

  it('상자 안에서는 증적 문서 정보가 RUN 머리 줄에 있다', async () => {
    vi.spyOn(api, 'insights').mockResolvedValue(첫실행);
    vi.spyOn(api, 'run').mockResolvedValue({
      ...실행,
      status: 'FINISHED',
      items: [],
      evidence: [증적('PDF', 'READY')],
    });
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} 상자안 />);
    await screen.findAllByText(/만들기$/);

    const 머리 = document.querySelector('.box-head');
    expect(머리?.textContent, '머리에 증적 문서 줄이 없다').toMatch(/만듦/);
    // 같은 말을 두 번 하지 않는다 — 머리에 올렸으면 본문에 블록으로 또 서지 않는다.
    // **접기(`.sec.fold`)는 빼고 본다** — 그것은 견줌 칸이고 증적과 상관이 없다.
    // 안 빼면 견줌이 있는 실행에서 엉뚱한 이유로 빨개진다 (2026-09-22 자기검토)
    expect(document.querySelector('.screen .sec:not(.fold)')).toBeNull();
  });

  it('화면 전체에서는 증적 문서가 옆 칸에 선다', async () => {
    vi.spyOn(api, 'insights').mockResolvedValue(첫실행);
    그리기('FINISHED', [증적('PDF', 'READY')]);
    await screen.findAllByText(/만들기$/);

    expect(document.querySelector('.box-head')).toBeNull();
    expect(document.querySelector('.rr-side .sec')?.textContent).toMatch(/만듦/);
  });

  it('직전 실행 대비 수는 접지 않고 요약 띠에 바로 보인다', async () => {
    vi.spyOn(api, 'insights').mockResolvedValue(견줌있음);
    그리기('FINISHED');

    const 대비 = await waitFor(() => {
      const 칸 = document.querySelector('.rs-diff');
      expect(칸).not.toBeNull();
      return 칸!;
    });
    expect(대비.textContent).toContain('RUN 2110');
    expect(대비.textContent).toContain('신규 실패1');
    expect(document.querySelector('details')).toBeNull();
  });

  // SPEC 공통/7-데모와-완료 §7 — 「첫 실행에서는 그 칸이 **아예 없다**」.
  // 접기를 null 체크 바깥에 두면 내용 없는 `<summary>` 한 줄이 남아 이 규칙이 깨진다
  it('첫 실행에서는 견줌이 아예 없다 — 빈 접기 줄도 없다', async () => {
    vi.spyOn(api, 'insights').mockResolvedValue(첫실행);
    vi.spyOn(api, 'run').mockResolvedValue({ ...실행, status: 'FINISHED', items: [], evidence: [] });
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} 상자안 />);
    await screen.findAllByText(/만들기$/);

    expect(screen.queryByText(/직전 실행과 비교/)).toBeNull();
    expect(document.querySelector('details')).toBeNull();
  });
});

describe('상자 안에서는 제목 아래 전부가 한 스크롤 칸이다 (SPEC §8.3 · §8.7, 2026-10-08)', () => {
  it('상자안 이면 머리 · 요약 띠 · 본문이 모두 .rows-scroll 안에 있다', async () => {
    vi.spyOn(api, 'run').mockResolvedValue({ ...실행, status: 'FINISHED', items: [], evidence: [] });
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} 상자안 />);

    await screen.findAllByText(/만들기$/);

    const 면 = document.querySelector('.screen');
    expect(면?.classList.contains('modal-results')).toBe(true);
    expect(면?.children).toHaveLength(1);
    const 스크롤칸 = 면?.firstElementChild;
    expect(스크롤칸?.classList.contains('rows-scroll')).toBe(true);
    expect(스크롤칸?.querySelector('.box-head')).not.toBeNull();
    expect(스크롤칸?.querySelector('.rs')).not.toBeNull();
    expect(스크롤칸?.querySelector('.toolbar')).not.toBeNull();
  });

  it('상자안 이 아니면(화면 전체) 스크롤칸을 따로 두지 않는다 — 페이지가 그대로 스크롤한다', async () => {
    그리기('FINISHED');
    await screen.findAllByText(/만들기$/);

    const 면 = document.querySelector('.screen');
    expect(면?.classList.contains('modal-results')).toBe(false);
    expect(면?.querySelector('.rows-scroll')).toBeNull();
  });
});
