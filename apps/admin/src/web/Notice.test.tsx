// @vitest-environment jsdom
// 본문 위 알림 줄 · 「알림」 버튼 · 알림 서랍 검사 (SPEC 공통/5-화면공통 §8 「알림」)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { api, ApiError, 알림바뀜, type NoticeResponse } from './api.js';
import { 언어함 } from './i18n.js';
import { Notice } from './Notice.js';
import { 끝난실행, 끝난작성, 도는E2E, 도는실행, 도는작성, 전에 } from './notice.fixture.js';
import { 읽음들 } from './noticeRead.js';
import { 보는실행알림 } from './viewedRun.js';

beforeEach(() => {
  보는실행알림(null);
  localStorage.clear();
  서비스바꿈.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const 서비스바꿈 = vi.fn();

function 띄운다(답: NoticeResponse, 줄숨김 = false) {
  const 부름 = vi.spyOn(api, 'notifications').mockResolvedValue(답);
  render(
    <언어함 value="ko">
      <Notice 줄숨김={줄숨김} 서비스바꿈={서비스바꿈} />
    </언어함>,
  );
  return 부름;
}

const 버튼 = () => document.querySelector('.nt-btn') as HTMLElement;

describe('「알림」 버튼', () => {
  it('알릴 것이 없어도 늘 있고, 안 읽은 수 배지도 없다', async () => {
    띄운다({ running: [], recent: [] });
    expect(버튼().getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('.nt-lines')).toBeNull();
    expect(document.querySelector('.nt-badge')).toBeNull();
  });

  it('최근 7일 끝난 것 가운데 이 브라우저가 안 읽은 수를 배지에 단다 — 줄을 숨긴 대시보드에서도', async () => {
    띄운다({ running: [], recent: [끝난실행(1), 끝난작성(2, { finishedAt: 전에(60 * 24 * 3) })] }, true);
    expect((await screen.findByLabelText('안 읽은 알림 2건')).textContent).toBe('2');
    expect(document.querySelector('.nt-lines')).toBeNull();
  });
});

describe('알림 줄', () => {
  it('도는 실행은 열기 링크와 남은 시간 글을, 도는 작성은 단계를 보인다', async () => {
    띄운다({ running: [도는실행(2113), 도는작성(5)], recent: [] });
    expect(await screen.findByText('RUN 2113 실행 중 · 기능 전체 382건 · 기능 테스트 · 대상 서버 qa · 12 / 40 완료 · 실패 2')).toBeTruthy();
    expect(screen.getByText('남은 시간 계산 중')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: '열기' }).map((a) => a.getAttribute('href'))).toEqual(['#/runs/2113', '#/authoring/5']);
    expect(screen.getByText(/#5 작성 요청이 진행 중입니다 · 3 \/ 6 단계 케이스 작성/)).toBeTruthy();
    expect(screen.getAllByText('결제 애플리케이션')).toHaveLength(2);
  });

  it('지금 결과를 보고 있는 실행의 도는 줄은 빼고, 보는 곳을 옮기면 다시 나타난다', async () => {
    보는실행알림(2113);
    띄운다({ running: [도는실행(2113), 도는실행(2114)], recent: [끝난실행(2113)] });
    expect(await screen.findByText(/^RUN 2114 실행 중/)).toBeTruthy();
    expect(screen.queryByText(/^RUN 2113 실행 중/)).toBeNull();
    expect(screen.getByText(/^RUN 2113 실행이 끝났습니다/)).toBeTruthy();
    // 실행 기록에서 줄을 바꿔 고르면 주소는 replaceState 로 바뀌어 hashchange 가 안 온다 — 결과 화면이 알린다
    act(() => 보는실행알림(2114));
    expect(screen.getByText(/^RUN 2113 실행 중/)).toBeTruthy();
    expect(screen.queryByText(/^RUN 2114 실행 중/)).toBeNull();
  });

  it('끝난 줄의 ×를 누르면 줄이 사라지고 읽음으로 남는다. 배지도 하나 준다', async () => {
    띄운다({ running: [], recent: [끝난실행(7, { pass: 3, fail: 1 }), 끝난실행(8)] });
    const 글 = await screen.findByText('RUN 7 실행이 끝났습니다 · 기능 전체 382건 · 기능 테스트 · 대상 서버 qa · 3 통과 · 1 실패');
    fireEvent.click(within(글.closest('.nt-line') as HTMLElement).getByRole('button', { name: '알림 닫기' }));
    expect(screen.queryByText(/RUN 7 실행이 끝났습니다/)).toBeNull();
    expect(읽음들().has('run:7')).toBe(true);
    expect(screen.getByLabelText('안 읽은 알림 1건').textContent).toBe('1');
  });

  it('결과 보기 링크를 눌러도 읽음이 된다', async () => {
    띄운다({ running: [], recent: [끝난실행(7)] });
    fireEvent.click(await screen.findByRole('link', { name: '결과 보기' }));
    expect(읽음들().has('run:7')).toBe(true);
  });

  it('작성이 끝났는데 PRD 확인이 남았으면 그 수와 PRD 관리 링크를 같은 줄에 둔다', async () => {
    띄운다({ running: [], recent: [끝난작성(9, { prdNeedsCheck: 3 })] });
    const 줄 = (await screen.findByText('#9 작성 요청이 끝났습니다 · 케이스 파일 12개')).closest('.nt-line') as HTMLElement;
    expect(within(줄).getByText(/PRD 확인 필요 3건/)).toBeTruthy();
    expect(within(줄).getByRole('link', { name: '결정 필요' }).getAttribute('href')).toBe('#/authoring?todo=1');
    expect(within(줄).getByRole('link', { name: '작성 결과' }).getAttribute('href')).toBe('#/authoring/9');
  });

  it('줄이 셋을 넘으면 둘만 보이고 나머지는 「외 N건」으로 서랍을 연다', async () => {
    띄운다({ running: [도는실행(1), 도는실행(2), 도는실행(3)], recent: [끝난실행(4), 끝난실행(5)] });
    fireEvent.click(await screen.findByRole('button', { name: '외 3건 — 알림 열기' }));
    expect(screen.getAllByText(/실행 중 ·/)).toHaveLength(2);
    expect(screen.getByRole('complementary', { name: '알림' })).toBeTruthy();
  });

  it('줄을 숨기는 자리(대시보드)에서는 도는 것이 있어도 줄을 그리지 않는다', async () => {
    const 부름 = 띄운다({ running: [도는실행(1)], recent: [] }, true);
    await act(async () => {});
    expect(부름).toHaveBeenCalled();
    expect(screen.queryByText(/실행 중 ·/)).toBeNull();
  });
});

describe('알림 서랍', () => {
  const 답: NoticeResponse = {
    running: [],
    recent: [
      끝난실행(1, { pass: 4 }, { finishedAt: 전에(5) }),
      끝난작성(2, { prdNeedsCheck: 2, finishedAt: 전에(20) }),
      끝난작성(3, { status: 'FAILED', error: '자료를 못 받았다', finishedAt: 전에(60 * 24 * 3) }),
    ],
  };

  async function 연다() {
    띄운다(답);
    await screen.findByLabelText('안 읽은 알림 3건');
    fireEvent.click(버튼());
    return screen.getByRole('complementary', { name: '알림' });
  }

  it('버튼으로 열고 닫는다. 뒤를 가리는 덮개가 없다', async () => {
    await 연다();
    expect(버튼().getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector('.modal-back, .backdrop, [role="dialog"]')).toBeNull();
    fireEvent.click(버튼());
    expect(screen.queryByRole('complementary', { name: '알림' })).toBeNull();
  });

  it('PC 에는 손잡이가 없고, 휴대폰에서는 손잡이를 아래로 끌면 닫힌다', async () => {
    const 서랍 = await 연다();
    expect(서랍.querySelector('.sheet-grab')).toBeNull();
    cleanup();

    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    const 판 = await 연다();
    const 손잡이 = 판.querySelector('.sheet-grab') as HTMLElement;
    fireEvent.pointerDown(손잡이, { clientY: 100 });
    fireEvent.pointerUp(손잡이, { clientY: 200 });
    expect(screen.queryByRole('complementary', { name: '알림' })).toBeNull();
    vi.unstubAllGlobals();
  });

  it('Esc 로 닫으면 포커스가 버튼으로 돌아간다', async () => {
    await 연다();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('complementary', { name: '알림' })).toBeNull();
    expect(document.activeElement).toBe(버튼());
  });

  it('최근 7일 것을 새것 먼저 보이고 PRD 확인 필요 칩과 링크를 단다', async () => {
    const 서랍 = within(await 연다());
    const 제목들 = 서랍.getAllByRole('listitem').map((li) => li.querySelector('.nt-item-title')?.textContent);
    expect(제목들).toEqual(['RUN 1 실행이 끝났습니다', '#2 작성 요청이 끝났습니다', '#3 작성 요청이 실패했습니다']);
    expect(서랍.getByText('PRD 확인 필요 2건')).toBeTruthy();
    expect(서랍.getByRole('link', { name: '결정 필요에서 확인' }).getAttribute('href')).toBe('#/authoring?todo=1');
    expect(서랍.getByText('볼 수 있는 애플리케이션 전체 · 최근 7일')).toBeTruthy();
  });

  it('거르기 칩이 종류와 안 읽음으로 거른다', async () => {
    const 서랍 = within(await 연다());
    fireEvent.click(서랍.getByRole('button', { name: '실행' }));
    expect(서랍.getAllByRole('listitem')).toHaveLength(1);
    fireEvent.click(서랍.getByRole('button', { name: '작성' }));
    expect(서랍.getAllByRole('listitem')).toHaveLength(2);
    expect(서랍.getByRole('button', { name: '안 읽음 3' })).toBeTruthy();
  });

  it('줄을 누르면 읽음이 되고 서랍이 닫힌다', async () => {
    const 서랍 = within(await 연다());
    fireEvent.click(서랍.getAllByRole('link')[0]!);
    expect(읽음들().has('run:1')).toBe(true);
    expect(screen.queryByRole('complementary', { name: '알림' })).toBeNull();
    expect(screen.getByLabelText('안 읽은 알림 2건')).toBeTruthy();
  });

  it('모두 읽음으로 누르면 배지가 사라지고 안 읽음 칩이 0 이 된다', async () => {
    const 서랍 = within(await 연다());
    fireEvent.click(서랍.getByRole('button', { name: '모두 읽음으로' }));
    expect(document.querySelector('.nt-badge')).toBeNull();
    expect(서랍.getByRole('button', { name: '안 읽음 0' })).toBeTruthy();
    expect(서랍.getByRole('button', { name: '모두 읽음으로' }).hasAttribute('disabled')).toBe(true);
  });

  it('비었으면 최근 7일 동안 없다고 말한다', async () => {
    띄운다({ running: [], recent: [] });
    fireEvent.click(버튼());
    expect(await screen.findByText('최근 7일 동안 끝난 실행과 작성이 없습니다')).toBeTruthy();
  });
});

describe('다른 애플리케이션의 작성 · PRD 고리', () => {
  const 다른서비스 = { serviceId: 2, prefix: 'ORD', serviceName: '주문 애플리케이션' };

  it('도는 작성의 열기를 누르면 먼저 그 알림의 애플리케이션으로 바꾼다. 실행의 열기는 애플리케이션을 안 바꾼다', async () => {
    띄운다({ running: [도는작성(5, 다른서비스), 도는실행(6, 다른서비스)], recent: [] });
    const 열기들 = await screen.findAllByRole('link', { name: '열기' });
    fireEvent.click(열기들[0]!);
    expect(서비스바꿈).not.toHaveBeenCalled();
    fireEvent.click(열기들[1]!);
    expect(서비스바꿈).toHaveBeenCalledExactlyOnceWith('ORD');
  });

  it('끝난 줄의 작성 결과 · PRD 관리를 누르면 그 애플리케이션으로 바꾸고, 결과 보기는 안 바꾼다', async () => {
    띄운다({
      running: [],
      recent: [끝난작성(9, { ...다른서비스, prdNeedsCheck: 3 }), 끝난작성(10, { ...다른서비스, prdNeedsCheck: 3, finishedAt: 전에(1) }), 끝난실행(7, {}, 다른서비스)],
    });
    fireEvent.click(await screen.findByRole('link', { name: '결과 보기' }));
    expect(서비스바꿈).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('link', { name: '작성 결과' })[0]!);
    fireEvent.click(screen.getByRole('link', { name: '결정 필요' }));
    expect(서비스바꿈.mock.calls).toEqual([['ORD'], ['ORD']]);
  });

  it('서랍의 작성 줄과 PRD 관리에서 확인 링크도 그 애플리케이션으로 바꾼 뒤 간다', async () => {
    띄운다({ running: [], recent: [끝난작성(2, { ...다른서비스, prdNeedsCheck: 2 })] });
    await screen.findByLabelText('안 읽은 알림 1건');
    fireEvent.click(버튼());
    const 서랍 = within(screen.getByRole('complementary', { name: '알림' }));
    fireEvent.click(서랍.getByRole('link', { name: '결정 필요에서 확인' }));
    expect(서비스바꿈).toHaveBeenCalledExactlyOnceWith('ORD');
  });

  it('서랍의 실행 줄은 애플리케이션을 안 바꾼다', async () => {
    띄운다({ running: [], recent: [끝난실행(1, {}, 다른서비스)] });
    await screen.findByLabelText('안 읽은 알림 1건');
    fireEvent.click(버튼());
    fireEvent.click(within(screen.getByRole('complementary', { name: '알림' })).getAllByRole('link')[0]!);
    expect(서비스바꿈).not.toHaveBeenCalled();
  });
});

describe('읽음 목록 정리', () => {
  it('서버 목록(7일)에 없고 적은 지 8일이 지난 열쇠만 지운다', async () => {
    const 지금 = Date.now();
    localStorage.setItem('notice-read', JSON.stringify({ 'run:1': 지금, 'run:998': 지금 - 9 * 86_400_000, 'run:999': 지금 }));
    띄운다({ running: [], recent: [끝난실행(1)] });
    await act(async () => {});
    expect([...읽음들()].sort()).toEqual(['run:1', 'run:999']);
  });
});

describe('토스트', () => {
  const 토스트 = () => document.querySelector<HTMLElement>('.toast');
  async function 다시묻는다(답: NoticeResponse, 부름: ReturnType<typeof 띄운다>): Promise<void> {
    부름.mockResolvedValue(답);
    await act(async () => {
      window.dispatchEvent(new Event(알림바뀜));
    });
  }

  it('화면을 연 뒤 새로 끝난 실행 하나를 아래에 띄우고 3초 뒤 흐려져 사라진다. 열 때 이미 있던 것은 안 띄운다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const 부름 = 띄운다({ running: [], recent: [끝난실행(1)] });
    await act(async () => {});
    expect(토스트()).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('');

    await 다시묻는다({ running: [], recent: [끝난실행(2), 끝난실행(1)] }, 부름);
    expect(screen.getByRole('status').textContent).toMatch(/^RUN 2 실행이 끝났습니다/);
    const 뜬것 = 토스트()!;
    expect(뜬것.className).toBe('toast');
    expect(within(뜬것).getByText(/^RUN 2 실행이 끝났습니다/)).toBeTruthy();
    expect(within(뜬것).getByRole('link', { name: '결과 보기' }).getAttribute('href')).toBe('#/runs/2');

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(토스트()!.className).toBe('toast out');
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(토스트()).toBeNull();
  });

  it('마우스를 올린 동안은 사라지지 않고 떼면 다시 3초를 센다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const 부름 = 띄운다({ running: [], recent: [] });
    await act(async () => {});
    await 다시묻는다({ running: [], recent: [끝난실행(3)] }, 부름);

    fireEvent.mouseEnter(토스트()!);
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(토스트()!.className).toBe('toast');

    fireEvent.mouseLeave(토스트()!);
    await act(async () => {
      vi.advanceTimersByTime(3250);
    });
    expect(토스트()).toBeNull();
  });

  it('고리를 누르면 읽음이 되고 토스트가 닫힌다', async () => {
    const 부름 = 띄운다({ running: [], recent: [] });
    await act(async () => {});
    await 다시묻는다({ running: [], recent: [끝난실행(7)] }, 부름);

    fireEvent.click(within(토스트()!).getByRole('link', { name: '결과 보기' }));
    expect(토스트()).toBeNull();
    expect(읽음들().has('run:7')).toBe(true);
  });

  it('지금 결과를 보고 있는 실행이 끝나면 토스트를 안 띄운다', async () => {
    보는실행알림(9);
    const 부름 = 띄운다({ running: [도는실행(9)], recent: [] });
    await act(async () => {});
    await 다시묻는다({ running: [], recent: [끝난실행(9)] }, 부름);
    expect(토스트()).toBeNull();
  });
});

describe('받아 오기', () => {
  it('서버가 403 을 주면(실행 칸을 볼 수 있는 애플리케이션이 없다) 버튼도 줄도 안 그리고 다시 묻지도 않는다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const 부름 = vi.spyOn(api, 'notifications').mockRejectedValue(new ApiError(403, 'FORBIDDEN', '권한이 없습니다'));
    render(
      <언어함 value="ko">
        <Notice 줄숨김={false} 서비스바꿈={서비스바꿈} />
      </언어함>,
    );
    await act(async () => {});
    expect(screen.queryByRole('button', { name: /알림/ })).toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(부름).toHaveBeenCalledTimes(1);
  });

  it('도는 것이 있으면 3초마다, 없으면 20초마다 다시 묻는다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const 부름 = vi.spyOn(api, 'notifications').mockResolvedValue({ running: [도는실행(1)], recent: [] });
    render(
      <언어함 value="ko">
        <Notice 줄숨김={false} 서비스바꿈={서비스바꿈} />
      </언어함>,
    );
    await act(async () => {});
    const 처음 = 부름.mock.calls.length;
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });
    expect(부름.mock.calls.length).toBe(처음 + 1);

    부름.mockResolvedValue({ running: [], recent: [] });
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });
    const 비운뒤 = 부름.mock.calls.length;
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(부름.mock.calls.length).toBe(비운뒤);
    await act(async () => {
      vi.advanceTimersByTime(11_000);
    });
    expect(부름.mock.calls.length).toBeGreaterThan(비운뒤);
  });

  it('E2E 실행만 돌면 20초마다 묻는다 — 도중 진척이 없어 자주 물어도 바뀌는 것이 없다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const 부름 = vi.spyOn(api, 'notifications').mockResolvedValue({ running: [도는E2E(7)], recent: [] });
    render(
      <언어함 value="ko">
        <Notice 줄숨김={false} 서비스바꿈={서비스바꿈} />
      </언어함>,
    );
    await act(async () => {});
    const 처음 = 부름.mock.calls.length;
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(부름.mock.calls.length).toBe(처음);
    expect(screen.getByText(/E2E RUN 7 실행 중/)).toBeTruthy();
  });

  it('작성 요청을 폐기하면 20초를 기다리지 않고 바로 다시 물어 그 끝난 줄을 지운다', async () => {
    const 부름 = 띄운다({ running: [], recent: [끝난작성(14671)] });
    expect(await screen.findByText(/#14671 작성 요청이 끝났습니다/)).toBeTruthy();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    부름.mockResolvedValue({ running: [], recent: [] });

    await act(async () => {
      await api.discardAuthoring('PAY', 14671);
    });

    expect(screen.queryByText(/#14671 작성 요청이 끝났습니다/)).toBeNull();
  });

  it('폐기 전에 나간 주기 요청의 답이 늦게 와도 지운 줄을 되살리지 않는다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const 옛답 = { running: [], recent: [끝난작성(14671)] };
    const 부름 = 띄운다(옛답);
    expect(await screen.findByText(/#14671 작성 요청이 끝났습니다/)).toBeTruthy();
    let 늦은답풀기: (답: NoticeResponse) => void = () => undefined;
    부름.mockReturnValueOnce(new Promise((풀기) => { 늦은답풀기 = 풀기; }));
    await act(async () => {
      vi.advanceTimersByTime(20_100);
    });

    부름.mockResolvedValue({ running: [], recent: [] });
    await act(async () => {
      window.dispatchEvent(new Event(알림바뀜));
    });
    expect(screen.queryByText(/#14671 작성 요청이 끝났습니다/)).toBeNull();
    await act(async () => {
      늦은답풀기(옛답);
    });
    expect(screen.queryByText(/#14671 작성 요청이 끝났습니다/)).toBeNull();
  });
});
