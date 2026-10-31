// @vitest-environment jsdom
// 진행 알약 — 진행 창을 닫으면 알약이 남고, 끝나면 어느 화면에서든 완료 창이 뜬다 (도메인/실행 §8.9)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import { api } from './api.js';
import { RUN_ID, 도는중응답, 끝난응답, 상자라벨, 실행까지 } from './RunResult.fixture.js';
import { 알림본적있나 } from './runState.js';
import { RunWatch } from './RunWatch.js';
import { 지켜본다 } from './runWatchStore.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  sessionStorage.clear();
  localStorage.clear();
  지켜본다(null);
  window.location.hash = '';
});

async function 그린다(열림: boolean, 판정 = 실행까지) {
  지켜본다({ runId: RUN_ID, 열림 });
  render(<RunWatch 판정하기={() => 판정} />);
  await act(async () => {});
}

describe('진행 알약 (도메인/실행 §8.9)', () => {
  it('진행 창을 닫으면 알약이 남고 누르면 진행 창이 다시 열린다', async () => {
    vi.spyOn(api, 'run').mockResolvedValue(도는중응답);
    await 그린다(true);
    expect(상자라벨()).toContain('실행 중');

    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    const 알약 = screen.getByRole('button', { name: new RegExp(`RUN ${String(RUN_ID)} 진행 보기`) });
    expect(알약.textContent).toContain(`RUN ${String(RUN_ID)}`);
    expect(sessionStorage.getItem('tp:watch-run')).toBe(String(RUN_ID));

    fireEvent.click(알약);
    expect(상자라벨()).toContain('실행 중');
  });

  it('알약이 떠 있는 실행이 끝나면 다른 화면이어도 완료 창이 뜨고 「결과 보기」는 그 실행 화면으로 간다', async () => {
    vi.useFakeTimers();
    vi.spyOn(api, 'run').mockResolvedValueOnce(도는중응답).mockResolvedValue(끝난응답);
    await 그린다(false);
    expect(screen.queryByRole('dialog')).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(상자라벨()).toContain('끝났습니다');
    expect(screen.queryByRole('button', { name: /진행 보기/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '결과 보기' }));

    expect(window.location.hash).toBe(`#/runs/${String(RUN_ID)}`);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(알림본적있나(RUN_ID)).toBe(true);
    expect(sessionStorage.getItem('tp:watch-run')).toBeNull();
  });

  it('진행 창의 「실행 중단」은 진행 창 위에 확인 창을 겹치고 Esc 는 확인 창만 닫는다', async () => {
    vi.spyOn(api, 'run').mockResolvedValue(도는중응답);
    await 그린다(true);
    expect(document.activeElement?.textContent).toBe('닫기');

    fireEvent.click(screen.getByRole('button', { name: '실행 중단' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(2);
    expect(screen.getAllByRole('dialog')[1]!.getAttribute('aria-label')).toBe(`RUN ${String(RUN_ID)} 실행을 멈출까요?`);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(상자라벨()).toContain('실행 중');
  });

  it('지켜보던 실행이 끝나면 끝났다고 알린다 — 케이스 목록이 줄 결과를 다시 읽는다', async () => {
    const 받음: number[] = [];
    const 듣기 = (e: Event) => 받음.push((e as CustomEvent<number>).detail);
    window.addEventListener('tp:run-done', 듣기);
    vi.spyOn(api, 'run').mockResolvedValue(도는중응답);
    await 그린다(false);
    expect(받음).toEqual([]);
    vi.spyOn(api, 'run').mockResolvedValue(끝난응답);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 2100));
    });
    expect(받음).toContain(RUN_ID);
    window.removeEventListener('tp:run-done', 듣기);
  });

  it('한 건 실행은 진행 창 제목 · 알약을 RUN 번호가 아니라 케이스로 말한다', async () => {
    const tcId = 'ZRS-001';
    const 항목 = {
      historyId: 7, tcId, tcName: '로그인', platform: 'desktop' as const, attempt: 1, params: {}, paramSchema: {}, status: 'NA' as const,
      durationMs: 0, error: null, startedAt: '', finishedAt: '', rerun: null,
    };
    const 한건 = { ...도는중응답, origin: 'SINGLE' as const, items: [항목] };
    vi.spyOn(api, 'run').mockResolvedValue(한건);
    await 그린다(true);
    expect(상자라벨()).toContain(`${tcId} 실행 중`);
    expect(상자라벨()).not.toContain('RUN');
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    const 알약 = screen.getByRole('button', { name: new RegExp(`${tcId} 진행 보기`) });
    expect(알약.textContent).toContain(tcId);
    expect(알약.textContent).not.toContain('RUN');
  });

  it('멈출 권한이 없으면 진행 창에 「실행 중단」이 없다', async () => {
    vi.spyOn(api, 'run').mockResolvedValue(도는중응답);
    await 그린다(true, (무엇) => 무엇 !== '멈춤');

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '실행 중단' })).toBeNull();
  });

  it('처음 읽기가 실패하면 알약을 내려놓는다', async () => {
    vi.spyOn(api, 'run').mockRejectedValue(new Error('없음'));
    await 그린다(false);

    expect(screen.queryByRole('button', { name: /진행 보기/ })).toBeNull();
    expect(sessionStorage.getItem('tp:watch-run')).toBeNull();
  });
});
