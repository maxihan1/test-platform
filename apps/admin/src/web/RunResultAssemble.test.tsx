// @vitest-environment jsdom
// 결과 화면 조립 검사 — 머리 한 줄 · 요약 한 줄 · 실행 차례 표 (도메인/실행 §8.3)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api } from './api.js';
import { RunResult } from './RunResult.js';
import { RUN_ID, 도는중응답, 실행까지, 증적 } from './RunResult.fixture.js';
import { 견줌, 끝난실행, 대비단추, 앞선가, 섞인항목, 연다, 줄번호들, 첫실행, 칩, 항목줄 } from './RunResultAssemble.fixture.js';

// globals 가 꺼져 있어 testing-library 가 스스로 cleanup 을 걸지 못한다. 직접 건다.
// 언마운트가 곧 `setInterval` 정리다 — 안 걸면 2초 폴링이 검사를 붙잡는다
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (질의: string) => ({ matches: 질의.includes('reduce'), media: 질의, addEventListener() {}, removeEventListener() {} }),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  sessionStorage.clear();
});

// 끝난 실행은 요약 한 줄 → 실행 차례 표다. 미확정 항목은 제 차례에 꼬리표만 단다 (도메인/실행 §8.3, 2026-10-11)
describe('결과 화면 조립 — 머리 한 줄 · 요약 한 줄 · 표', () => {
  it('요약 한 줄 → 실행 차례 표 차례이고 실패 카드 구획도 미확정 묶음 칸도 없다', async () => {
    연다(섞인항목, 견줌);
    await screen.findByText('이름-ZRR-002');

    expect(앞선가(document.querySelector('.rf-sum'), document.querySelector('.rf-table'))).toBe(true);
    expect(document.querySelector('.fc-list')).toBeNull();
    expect(document.querySelector('.rr-unconf')).toBeNull();
    expect(screen.queryByText(/실패 요구사항/)).toBeNull();
  });

  it('실패가 있는 줄이 위에 서고 같은 케이스의 통과 디바이스 줄은 따로 서지 않는다', async () => {
    연다(섞인항목);
    await screen.findByText('이름-ZRR-002');

    expect(줄번호들()).toEqual(['ZRR-001', 'ZRR-005', 'ZRR-002', 'ZRR-003', 'ZRR-004']);
  });

  it('미확정 줄은 제 차례에 서고 「미확정 · 사유」 꼬리를 단다 — 판정 색은 그대로다', async () => {
    연다(섞인항목, 견줌);
    await screen.findByText('이름-ZRR-004');

    const 통과줄 = [...document.querySelectorAll('.rf-row')].find((el) => el.textContent?.includes('ZRR-004'))!;
    expect(통과줄.textContent).toContain('미확정 · 기획서에 값이 없습니다');
    expect(통과줄.querySelector('.vd-pass')).not.toBeNull();
    const 실패줄 = [...document.querySelectorAll('.rf-row')].find((el) => el.textContent?.includes('ZRR-005'))!;
    expect(실패줄.textContent).toContain('미확정 · 기획서에 값이 없습니다');
    expect(실패줄.classList.contains('fail')).toBe(true);
  });

  it('요약은 미확정까지 모든 항목을 세고 「그중 미확정 N건」을 단다', async () => {
    연다(섞인항목, 견줌);
    await screen.findByText('이름-ZRR-002');

    expect(document.querySelector('.rf-rate b')?.textContent).toBe('42.9%');
    expect(칩('전체').textContent).toBe('전체 7');
    expect(칩('Pass').textContent).toBe('Pass 3');
    expect(칩('Fail').textContent).toBe('Fail 3');
    expect(screen.getByText('그중 미확정 2건')).toBeTruthy();
  });

  it('도는 실행은 카드 통로도 견주기 통로도 부르지 않고 진행 집계와 같은 표를 그린다', async () => {
    const 견줌부름 = vi.spyOn(api, 'insights').mockResolvedValue(첫실행);
    const 실패부름 = vi.spyOn(api, 'failures');
    vi.spyOn(api, 'progress').mockResolvedValue({ items: [], remainingMs: null });
    vi.spyOn(api, 'run').mockResolvedValue({ ...도는중응답, items: [항목줄(1, 'ZRR-001', 'desktop', 'PASS')] });
    const { container } = render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    await screen.findByText('이름-ZRR-001');
    expect(실패부름).not.toHaveBeenCalled();
    expect(견줌부름).not.toHaveBeenCalled();
    expect(container.querySelector('.rf-sum')).toBeNull();
    expect(container.querySelector('.stripe')).not.toBeNull();
    expect(container.querySelector('.tally')?.textContent).toContain('Pass');
    expect(screen.getByText('실행 중단')).toBeTruthy();
    expect(container.querySelector('.rf-table')).not.toBeNull();
  });

  it('실패가 0건이어도 카드 통로를 부르지 않는다 — 표에 통과 줄만 선다', async () => {
    const 실패부름 = 연다([항목줄(1, 'ZRR-002', 'desktop', 'PASS')]);
    await screen.findByText('이름-ZRR-002');

    expect(칩('Fail').textContent).toBe('Fail 0');
    expect(실패부름).not.toHaveBeenCalled();
    expect(screen.queryByText('Fail 케이스가 없습니다')).toBeNull();
  });

  it('실행 정보 · 증적 문서는 머리 한 줄에 있고 옆 칸이 없다 (점검 2.2)', async () => {
    연다(섞인항목, 견줌, false, [증적('PDF', 'READY')]);
    const 머리 = await waitFor(() => {
      const 칸 = document.querySelector('.head');
      expect(칸?.textContent).toContain('만듦');
      return 칸!;
    });

    const 글 = 머리.textContent ?? '';
    for (const 조각 of [`RUN ${String(RUN_ID)}`, '기능 테스트', '대상 서버 qa', 'https://qa-pay.example.com', '김철수', 'PC · 모바일', '만듦']) {
      expect(글, 조각).toContain(조각);
    }
    expect(document.querySelector('.rr-side')).toBeNull();
    expect(screen.queryByText('실행 정보')).toBeNull();
    expect(screen.queryByText('같은 사유로 실패')).toBeNull();
  });

  it('결과 칸에서는 머리에 실행 제목과 번호 · 정보 한 줄이 서고 요약 한 줄부터 스크롤한다', async () => {
    연다(섞인항목, 견줌, true);
    const 제목 = await screen.findByRole('heading', { level: 2, name: /RUN/ });

    expect(제목.closest('.box-head')?.querySelector('.head-meta')?.textContent).toContain('대상 서버 qa');
    expect(document.querySelector('.rows-scroll .rf-sum')).not.toBeNull();
    expect(document.querySelector('.rr-side')).toBeNull();
  });
});

describe('요약 한 줄의 이전 실행 대비', () => {
  it('해결 목록은 요약 아래에 접혀 있다', async () => {
    연다(섞인항목, 견줌);
    const 접기 = await waitFor(() => {
      const 칸 = document.querySelector('.rf-under details');
      expect(칸).not.toBeNull();
      return 칸!;
    });

    expect(접기.hasAttribute('open')).toBe(false);
    expect(접기.querySelector('summary')?.textContent).toBe('해결 1');
    expect(접기.textContent).toContain('이름-ZRR-009');
  });

  it('견줄 앞이 없으면 대비 칸도 해결 줄도 없다', async () => {
    연다(섞인항목, { ...첫실행, 실패덩어리들: 견줌.실패덩어리들 });
    await screen.findByText('이름-ZRR-002');

    expect(document.querySelector('.rf-diff')).toBeNull();
    expect(screen.queryByRole('button', { name: /^해결/ })).toBeNull();
  });

  it('「Pass · 알림」은 요약 한 줄과 표 사이에 접힌 채 선다', async () => {
    연다(섞인항목, { ...첫실행, 통과알림들: [{ historyId: 3, tcId: 'ZRR-002', tcName: '이름-ZRR-002', platform: 'desktop', statement: '로그인', notice: '낱말이 맞아 통과' }], 통과알림수: 1 });
    await screen.findByText('Pass · 알림 1건');

    const 알림 = document.querySelector('.rr-notice');
    expect(앞선가(document.querySelector('.rf-sum'), 알림)).toBe(true);
    expect(앞선가(알림, document.querySelector('.rf-table'))).toBe(true);
    expect(알림?.hasAttribute('open')).toBe(false);
  });
});

describe('판정 칩과 디바이스 칩은 같은 표를 거른다', () => {
  it('칩을 누르면 그 판정의 항목이 하나라도 있는 줄만 남고 「전체」로 돌아온다', async () => {
    연다(섞인항목);
    await screen.findByText('이름-ZRR-002');

    fireEvent.click(칩('Fail'));
    expect(칩('Fail').getAttribute('aria-pressed')).toBe('true');
    expect(줄번호들()).toEqual(['ZRR-001', 'ZRR-005']);

    fireEvent.click(칩('Pass'));
    expect(줄번호들()).toEqual(['ZRR-001', 'ZRR-002', 'ZRR-004']);

    fireEvent.click(칩('Not tested'));
    expect(줄번호들()).toEqual(['ZRR-003']);

    fireEvent.click(칩('전체'));
    expect(줄번호들()).toHaveLength(5);
  });

  it('디바이스 칩은 돈 디바이스만 두고 누르면 그 디바이스 칸만 남는다', async () => {
    연다(섞인항목);
    await screen.findByText('이름-ZRR-002');
    const 묶음 = screen.getByRole('group', { name: '디바이스 필터' });
    expect(within(묶음).getAllByRole('button').map((b) => b.textContent)).toEqual(['전체', 'PC', '모바일']);

    fireEvent.click(within(묶음).getByRole('button', { name: '모바일' }));

    expect(줄번호들()).toEqual(['ZRR-005', 'ZRR-001']);
    expect(document.querySelector('.rf-head')?.textContent).toContain('결과');
  });

  it('돈 디바이스가 하나면 디바이스 칩이 없다', async () => {
    연다([항목줄(1, 'ZRR-001', 'desktop', 'PASS')]);
    await screen.findByText('이름-ZRR-001');

    expect(screen.queryByRole('group', { name: '디바이스 필터' })).toBeNull();
  });

  it('「회귀 실패」 칸은 그 변화의 줄만 남기고 한 번 더 누르면 푼다', async () => {
    연다(섞인항목, 견줌);
    const 단추 = await 대비단추('회귀 실패');

    fireEvent.click(단추);
    expect(단추.getAttribute('aria-pressed')).toBe('true');
    expect(줄번호들()).toEqual(['ZRR-001']);

    fireEvent.click(단추);
    expect(줄번호들()).toHaveLength(5);
  });
});

describe('주소의 케이스(`&tc=`)로 화면을 옮기는 것은 한 번이다', () => {
  afterEach(() => {
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
  });

  it('디바이스 칩을 바꿔 표가 새로 서도 그 줄로 다시 옮기지 않는다', async () => {
    const 옮김 = vi.fn();
    Element.prototype.scrollIntoView = 옮김;
    vi.spyOn(api, 'run').mockResolvedValue(끝난실행(섞인항목));
    vi.spyOn(api, 'insights').mockResolvedValue(첫실행);
    vi.spyOn(api, 'failures').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 5 });
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} 열카드="ZRR-001" />);
    await screen.findByText('이름-ZRR-001');
    expect(옮김).toHaveBeenCalledTimes(1);

    fireEvent.click(within(screen.getByRole('group', { name: '디바이스 필터' })).getByRole('button', { name: '모바일' }));
    fireEvent.click(within(screen.getByRole('group', { name: '디바이스 필터' })).getByRole('button', { name: 'PC' }));

    expect(줄번호들()).toContain('ZRR-001');
    expect(옮김).toHaveBeenCalledTimes(1);
  });
});

describe('실행이 바뀌는 때', () => {
  it('도는 동안은 견주기를 안 부르고 끝난 뒤에 부른다 — 카드 통로는 줄을 펼칠 때만이다', async () => {
    vi.useFakeTimers();
    const 도는 = { ...도는중응답, items: [항목줄(1, 'ZRR-001', 'desktop', 'FAIL')] };
    vi.spyOn(api, 'run')
      .mockResolvedValueOnce(도는)
      .mockResolvedValue({ ...도는, status: 'FINISHED', finishedAt: '2026-09-15T17:25:00.000Z', counts: { total: 1, pass: 0, fail: 1, na: 0, running: 0 }, evidence: [] });
    vi.spyOn(api, 'progress').mockResolvedValue({ items: [], remainingMs: null });
    const 견줌부름 = vi.spyOn(api, 'insights').mockResolvedValue(첫실행);
    const 실패부름 = vi.spyOn(api, 'failures');
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
    await act(async () => {});
    expect(견줌부름).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(견줌부름).toHaveBeenCalledWith(RUN_ID);
    expect(실패부름).not.toHaveBeenCalled();
  });

  it('「이전 실행 RUN N」으로 옮기면 앞 실행에서 누른 「회귀 실패」가 풀린다 — 새 실행에 앞 실행이 없으면 풀 칸도 없다', async () => {
    vi.spyOn(api, 'run').mockImplementation((id) => Promise.resolve({ ...끝난실행(섞인항목), runId: id }));
    vi.spyOn(api, 'insights').mockImplementation((id) => Promise.resolve(id === RUN_ID ? 견줌 : 첫실행));
    vi.spyOn(api, 'failures').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 5 });
    const { rerender } = render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
    fireEvent.click(await 대비단추('회귀 실패'));
    expect(줄번호들()).toEqual(['ZRR-001']);

    rerender(<RunResult runId={2110} 판정하기={() => 실행까지} />);

    await waitFor(() => expect(줄번호들()).toHaveLength(5));
    expect(screen.queryByRole('button', { name: /^회귀 실패/ })).toBeNull();
  });
});
