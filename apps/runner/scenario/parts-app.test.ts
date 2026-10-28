// 부품 흐름 검사 — 앱 · 게임 단계는 창을 안 열고 폰 자리로 돌며, 웹 단계 창 · 로그인 상태는 그 사이에 그대로 이어진다 (SPEC 도메인/시나리오 §3.7 결정 16)

import type { ScenarioPhoneOpener } from '@platform/kit/scenario';
import type { ScenarioExecuteRequest } from '@platform/kit';
import { describe, expect, it, vi } from 'vitest';

import { runParts, type 단계창 } from './parts.js';
import { 쿠키, 창들 } from './parts-fake.js';
import { 새폰자리 } from './phone.js';

type Part = ScenarioExecuteRequest['parts'][number];

const 케이스 = (tcId: string, appStep = false): Part => ({
  kind: 'case', tcId, params: {}, expected: {}, skipSteps: [], filePath: `/tests/${tcId}.spec.ts`, ...(appStep && { appStep: true }),
});

function 앱자리들(runCase?: 단계창['runCase']) {
  const 연: 단계창[] = [];
  const appWindow = vi.fn(async () => {
    const 하나: 단계창 = {
      runCase: runCase ?? vi.fn(async (_part, seq: number) => ({
        seq: seq + 1, steps: [{ seq: seq + 1, title: '앱', status: 'PASS' as const, durationMs: 1, assertions: [] }], failed: false,
      })),
      state: vi.fn(async () => ({ cookies: [], origins: [] })),
      close: vi.fn(async () => {}),
    };
    연.push(하나);
    return 하나;
  });
  return { appWindow, 연 };
}

describe('앱 · 게임 단계', () => {
  it('창을 안 열고 폰 자리로 돈다 — 다음 웹 단계는 앞 웹 창의 로그인을 이어받고 순번은 이어진다', async () => {
    const parts = [케이스('XWB-001'), 케이스('XAP-001', true), 케이스('XAP-002', true), 케이스('XWB-002')];
    const { deps, 받은, 줄 } = 창들(parts);
    const { appWindow, 연 } = 앱자리들();

    await runParts(parts, { ...deps, appWindow, appPartTimeoutMs: 120_000 });

    expect(줄.map((r) => [r.seq, r.status])).toEqual([[1, 'PASS'], [2, 'PASS'], [3, 'PASS'], [4, 'PASS']]);
    expect(줄.map((r) => r.steps[0]?.seq)).toEqual([1, 2, 3, 4]);
    // 빈 창 · 웹 1 · 웹 2 — 앱 단계는 창을 안 연다
    expect(받은).toHaveLength(3);
    expect(받은[2]!.state?.cookies).toEqual([쿠키('창1')]);
    expect(appWindow).toHaveBeenCalledTimes(2);
    // 앱 단계의 request 도 앞 웹 창의 로그인으로 부른다
    expect(appWindow).toHaveBeenNthCalledWith(1, expect.anything(), { cookies: [쿠키('창1')], origins: [] });
    expect(연.map((자리) => vi.mocked(자리.close).mock.calls.length)).toEqual([1, 1]);
    expect(받은[1]!.창.close).toHaveBeenCalledTimes(1);
  });

  it('앱 단계 한도는 android project 한도다 — 넘으면 그 값으로 실패를 적는다', async () => {
    vi.useFakeTimers();
    try {
      const parts = [케이스('XAP-001', true)];
      const { deps, 줄 } = 창들(parts, { partTimeoutMs: 1000 });
      const { appWindow } = 앱자리들(vi.fn(() => new Promise<never>(() => {})));

      const 끝 = runParts(parts, { ...deps, appWindow, appPartTimeoutMs: 2000 });
      await vi.advanceTimersByTimeAsync(1500);
      expect(줄).toHaveLength(0);
      await vi.advanceTimersByTimeAsync(20_000);
      await 끝;

      expect(줄[0]).toMatchObject({ status: 'FAIL', error: { message: '단계 제한 시간 2000ms 를 넘었다' } });
    } finally {
      vi.useRealTimers();
    }
  });

  it('폰 자리를 못 주는 실행에서는 그 단계가 실패로 멈춘다', async () => {
    const parts = [케이스('XAP-001', true), 케이스('XWB-001')];
    const { deps, 줄 } = 창들(parts);

    await runParts(parts, deps);

    expect(줄).toHaveLength(1);
    expect(줄[0]).toMatchObject({ status: 'FAIL', error: { message: '이 실행은 앱 · 게임 단계를 돌릴 수 없다' } });
  });
});

describe('폰 자리', () => {
  const 폰 = { driver: {} as never, device: { model: 'SM-S918N', osVersion: '14', appVersion: null, appBuild: null } };

  it('처음 부를 때 한 번만 열고 기기 줄을 한 번 흘린다 · 끝에 한 번 닫는다', async () => {
    const 여는것: ScenarioPhoneOpener = { open: vi.fn(async () => 폰), close: vi.fn(async () => {}) };
    const 적은 = vi.fn();
    const 자리 = 새폰자리(() => 여는것, { PLATFORM_APP: '/a.apk' }, 적은);

    expect(await 자리.얻기()).toBe(폰);
    expect(await 자리.얻기()).toBe(폰);
    await 자리.닫기();

    expect(여는것.open).toHaveBeenCalledTimes(1);
    expect(여는것.open).toHaveBeenCalledWith({ PLATFORM_APP: '/a.apk' });
    expect(적은).toHaveBeenCalledWith(폰.device);
    expect(여는것.close).toHaveBeenCalledWith(폰);
  });

  it('안 열었거나 못 열었으면 닫지 않는다 · 여는 함수가 안 올랐으면 그 까닭으로 실패한다', async () => {
    const 여는것: ScenarioPhoneOpener = { open: vi.fn(async () => Promise.reject(new Error('팜 폰 없음'))), close: vi.fn(async () => {}) };
    const 안연자리 = 새폰자리(() => 여는것, {}, vi.fn());
    await 안연자리.닫기();
    const 못연자리 = 새폰자리(() => 여는것, {}, vi.fn());
    await expect(못연자리.얻기()).rejects.toThrow('팜 폰 없음');
    await 못연자리.닫기();

    expect(여는것.close).not.toHaveBeenCalled();
    await expect(새폰자리(() => undefined, {}, vi.fn()).얻기()).rejects.toThrow('폰 연결을 올리지 않았다');
  });
});
