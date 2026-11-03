// 단계 끝 되돌리기 검사 — 가짜 탭 · 창으로 표의 줄마다 단계가 부른 것을 적고 거꾸로 되돌리는지 본다. 시계 · 주입 스크립트 · 가로채기 · 새 탭은 e2e.test 가 진짜 브라우저로 본다 (SPEC 도메인/시나리오 §3.7 결정 3 「단계 끝 되돌리기」)

import type { BrowserContext, Page } from '@playwright/test';
import { describe, expect, it, vi } from 'vitest';

import { 단계감시, type 창처음값 } from './revert.js';

function 판(처음: 창처음값 = {}, 기준?: string) {
  const 차례: string[] = [];
  const 떼기 = (이름: string) => vi.fn(async () => ({ dispose: vi.fn(async () => { 차례.push(`뗌 ${이름}`); }) }));
  const 시계 = { setFixedTime: vi.fn(async () => {}), setSystemTime: vi.fn(async () => {}), resume: vi.fn(async () => {}) };
  const 탭 = {
    addInitScript: 떼기('탭 스크립트'), exposeFunction: 떼기('탭 함수'), exposeBinding: 떼기('탭 묶음'), route: 떼기('탭 가로채기'),
    on: vi.fn(), once: vi.fn(), off: vi.fn((이름: string) => { 차례.push(`끔 ${이름}`); }),
    addLocatorHandler: vi.fn(async () => {}), removeLocatorHandler: vi.fn(async () => {}),
    setExtraHTTPHeaders: vi.fn(async () => {}), setViewportSize: vi.fn(async () => {}), emulateMedia: vi.fn(async () => {}),
    setDefaultTimeout: vi.fn(), setDefaultNavigationTimeout: vi.fn(),
    goto: vi.fn(async () => null), title: vi.fn(async () => '제목'), isClosed: () => false,
  };
  const 창 = {
    addInitScript: 떼기('창 스크립트'), route: 떼기('창 가로채기'), on: vi.fn(), once: vi.fn(), off: vi.fn(),
    setExtraHTTPHeaders: vi.fn(async () => {}), setOffline: vi.fn(async () => {}), setGeolocation: vi.fn(async () => {}),
    grantPermissions: vi.fn(async () => {}), clearPermissions: vi.fn(async () => {}),
    setDefaultTimeout: vi.fn(), setDefaultNavigationTimeout: vi.fn(),
    pages: () => [탭], request: { 이름: '단계 request' }, clock: 시계,
  };
  const 감시 = 단계감시(탭 as unknown as Page, 창 as unknown as BrowserContext, 처음, 기준);
  return { 탭, 창, 시계, 차례, 감시, page: 감시.page };
}

describe('단계감시 — 단계 끝 되돌리기 표 (Playwright 1.63)', () => {
  it('떼기를 돌려받는 것(주입 스크립트 · 노출 함수 · 가로채기)과 듣기는 탭 · 창 모두 거꾸로 뗀다', async () => {
    const { 탭, 창, 차례, 감시, page } = 판();
    const 들음 = () => {};

    await page.addInitScript(() => {});
    await page.context().addInitScript(() => {});
    await page.exposeFunction('f', () => {});
    page.on('dialog', 들음);
    await page.route('**/a', () => {});
    page.context().once('page', 들음);
    await 감시.되돌리기();

    expect(차례).toEqual(['뗌 탭 가로채기', '끔 dialog', '뗌 탭 함수', '뗌 창 스크립트', '뗌 탭 스크립트']);
    expect(창.off).toHaveBeenCalledWith('page', 들음);
    expect(탭.off).toHaveBeenCalledWith('dialog', 들음);
  });

  it('화면 처리기는 removeLocatorHandler 로 뗀다', async () => {
    const { 탭, 감시, page } = 판();
    const 자리 = { 이름: '안내창' };

    await page.addLocatorHandler(자리 as never, async () => {});
    await 감시.되돌리기();

    expect(탭.removeLocatorHandler).toHaveBeenCalledWith(자리);
  });

  it('머리글 · 망 · 위치 · 권한 · 탭 크기 · 미디어 · 시간 한도를 바꿨으면 시나리오를 시작할 때 값으로 되돌린다 — 권한 지우기도 권한이다', async () => {
    const 처음: 창처음값 = {
      extraHTTPHeaders: { 'x-tenant': 'qa' }, offline: false, geolocation: { latitude: 37.5, longitude: 127 }, permissions: ['geolocation'],
      colorScheme: 'dark', actionTimeout: 5000, navigationTimeout: 0, viewport: { width: 390, height: 664 },
    };
    const { 탭, 창, 감시, page } = 판(처음);

    await page.setExtraHTTPHeaders({ a: '1' });
    await page.context().setExtraHTTPHeaders({ b: '2' });
    await page.context().setOffline(true);
    await page.context().setGeolocation(null);
    await page.context().clearPermissions();
    await page.setViewportSize({ width: 100, height: 100 });
    await page.emulateMedia({ media: 'print' });
    page.setDefaultTimeout(1);
    await 감시.되돌리기();

    expect(탭.setExtraHTTPHeaders).toHaveBeenLastCalledWith({});
    expect(창.setExtraHTTPHeaders).toHaveBeenLastCalledWith({ 'x-tenant': 'qa' });
    expect(창.setOffline).toHaveBeenLastCalledWith(false);
    expect(창.setGeolocation).toHaveBeenLastCalledWith({ latitude: 37.5, longitude: 127 });
    expect(창.clearPermissions).toHaveBeenCalledTimes(2);
    expect(창.grantPermissions).toHaveBeenCalledWith(['geolocation']);
    expect(탭.setViewportSize).toHaveBeenLastCalledWith({ width: 390, height: 664 });
    expect(탭.emulateMedia).toHaveBeenLastCalledWith({ media: null, colorScheme: 'dark', reducedMotion: 'no-preference', forcedColors: 'none', contrast: 'no-preference' });
    for (const 쪽 of [탭, 창]) {
      expect(쪽.setDefaultTimeout).toHaveBeenLastCalledWith(5000);
      expect(쪽.setDefaultNavigationTimeout).toHaveBeenLastCalledWith(0);
    }
  });

  it('안 건드린 것은 되돌리지 않는다 — 시계도 부르지 않았으면 그대로다', async () => {
    const { 탭, 창, 시계, 감시, page } = 판();

    await page.title();
    await 감시.되돌리기();

    expect(창.setOffline).not.toHaveBeenCalled();
    expect(탭.setViewportSize).not.toHaveBeenCalled();
    expect(시계.setSystemTime).not.toHaveBeenCalled();
  });

  it('시계는 탭 · 창 어느 쪽에서 불러도 지금 시각으로 돌리고 흐르게 한다', async () => {
    const { 시계, 감시, page } = 판();

    await page.context().clock.setFixedTime(new Date('2020-01-02'));
    await 감시.되돌리기();

    expect(시계.setSystemTime).toHaveBeenCalledWith(expect.any(Number));
    expect(Math.abs((시계.setSystemTime.mock.calls[0] as unknown as [number])[0] - Date.now())).toBeLessThan(5000);
    expect(시계.resume.mock.invocationCallOrder[0]).toBeGreaterThan(시계.setSystemTime.mock.invocationCallOrder[0]!);
  });

  it('page.request 는 창의 request(그 단계 것)를 준다 · 기준이 있으면 상대 주소 goto 를 그 주소로 풀고 절대 주소는 그대로 둔다', async () => {
    const 섞임 = 판({}, 'https://adm.example.com/');
    const 홑 = 판();

    await 섞임.page.goto('/orders?x=1');
    await 섞임.page.goto('https://shop.example.com/');
    await 홑.page.goto('/orders');

    expect(섞임.page.request).toBe(섞임.창.request);
    expect(섞임.탭.goto.mock.calls.map((c) => (c as unknown[])[0])).toEqual(['https://adm.example.com/orders?x=1', 'https://shop.example.com/']);
    expect(홑.탭.goto.mock.calls.map((c) => (c as unknown[])[0])).toEqual(['/orders']);
  });

  it('되돌리다 하나가 실패해도 나머지를 되돌린다', async () => {
    const { 창, 감시, page } = 판();
    const 남김 = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await page.context().setOffline(true);
    await page.context().setGeolocation(null);
    창.setOffline.mockRejectedValueOnce(new Error('창이 닫혔다'));
    await 감시.되돌리기();

    expect(창.setGeolocation).toHaveBeenLastCalledWith(null);
    expect(남김).toHaveBeenCalledWith(expect.stringContaining('창이 닫혔다'));
    남김.mockRestore();
  });
});
