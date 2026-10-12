// 느린 망이 화면의 API 요청만 0.1~1.5초 늦추고, 환경 변수가 없으면 아무것도 안 거는지 검사한다

import type { Page, Route } from '@playwright/test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 느린망, 늦추기 } from './slowApi.js';

function 가짜요청(종류: string) {
  const fallback = vi.fn(async () => {});
  return { route: { request: () => ({ resourceType: () => 종류 }), fallback } as unknown as Route, fallback };
}

describe('늦추기', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ['fetch', 0, 100],
    ['xhr', 1, 1500],
  ])('%s 요청은 뽑은 값 %d 이면 %dms 기다린 뒤 넘긴다', async (종류, 뽑은값, 기다림) => {
    const { route, fallback } = 가짜요청(종류);
    const 끝 = 늦추기(route, () => 뽑은값);
    await vi.advanceTimersByTimeAsync(기다림 - 1);
    expect(fallback).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await 끝;
    expect(fallback).toHaveBeenCalledOnce();
  });

  it.each(['document', 'image', 'script'])('%s 요청은 기다리지 않고 바로 넘긴다', async (종류) => {
    const { route, fallback } = 가짜요청(종류);
    await 늦추기(route, () => 1);
    expect(fallback).toHaveBeenCalledOnce();
  });
});

describe('느린망', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const 가짜창 = () => {
    const route = vi.fn(async () => {});
    return { page: { context: () => ({ route }) } as unknown as Page, route };
  };

  it('PLATFORM_SLOW_API 가 1 이면 창 묶음의 모든 요청에 건다', async () => {
    vi.stubEnv('PLATFORM_SLOW_API', '1');
    const { page, route } = 가짜창();
    await 느린망(page);
    expect(route).toHaveBeenCalledWith('**/*', expect.any(Function));
  });

  it.each([undefined, '0', 'true'])('PLATFORM_SLOW_API 가 %s 이면 아무것도 안 건다', async (값) => {
    vi.stubEnv('PLATFORM_SLOW_API', 값);
    const { page, route } = 가짜창();
    await 느린망(page);
    expect(route).not.toHaveBeenCalled();
  });
});
