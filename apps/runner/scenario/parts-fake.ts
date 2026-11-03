// 부품 흐름 검사의 가짜 창 — 창 하나를 열고, 웹 단계를 열 때마다 새 가짜 단계 자리를 만들어 받은 부품 · 넘겨받기 · 그때 걸린 모킹을 적어 둔다 (parts-links.test.ts · parts-limit.test.ts)

import type { ScenarioCleanup, ScenarioExecuteRequest, ScenarioPartResult } from '@platform/kit';
import { vi } from 'vitest';

import { 새이음, type 부품상태, type 상태 } from './links.js';
import type { PartDeps, RouteHandler, 단계창, 창 } from './parts.js';

type Part = ScenarioExecuteRequest['parts'][number];

export type 받은단계 = { 부품: 부품상태; 넘겨받기: boolean; mocks: string[]; 단계: 단계창 };

export function 창들(parts: Part[], 칸: { partTimeoutMs?: number; 단계마다?: (n: number, 부품: 부품상태) => Partial<단계창> } = {}) {
  const 받은: 받은단계[] = [];
  const 줄: ScenarioPartResult[] = [];
  const 뒷정리: ScenarioCleanup[][] = [];
  const 이음값 = 새이음(parts, 'https://qa.example.com');
  let 걸린: ReadonlyMap<string, RouteHandler> = new Map();
  const 창하나: 창 = {
    route: vi.fn(async () => {}),
    unroute: vi.fn(async () => {}),
    waitForTimeout: vi.fn(async () => {}),
    fetch: vi.fn(async () => ({ status: () => 200, text: async () => "", headers: () => ({}) })),
    단계: vi.fn(async (부품: 부품상태, 넘겨받기: boolean) => {
      const n = 받은.length;
      const 하나: 단계창 = {
        runCase: vi.fn(async (_part, seq: number) => ({
          seq: seq + 1,
          steps: [{ seq: seq + 1, title: '가', status: 'PASS' as const, durationMs: 1, assertions: [] }],
          failed: false,
        })),
        state: vi.fn(async () => ({ cookies: [쿠키(`단계${n}`)], origins: [] })),
        close: vi.fn(async () => {}),
        ...칸.단계마다?.(n, 부품),
      };
      받은.push({ 부품, 넘겨받기, mocks: [...걸린.keys()], 단계: 하나 });
      return 하나;
    }),
    state: vi.fn(async () => ({ cookies: [쿠키('창')], origins: [] })),
    close: vi.fn(async () => {}),
  };
  const deps: PartDeps = {
    baseUrl: 'https://qa.example.com',
    partTimeoutMs: 칸.partTimeoutMs ?? 30_000,
    이음: 이음값,
    newWindow: vi.fn(async (mocks: ReadonlyMap<string, RouteHandler>) => {
      걸린 = mocks;
      return 창하나;
    }),
    sendDelete: vi.fn(async () => 200),
    write: (result) => {
      줄.push(result);
    },
    writeCleanup: (list) => {
      뒷정리.push(list);
    },
  };
  return { deps, 창: 창하나, 받은, 줄, 뒷정리, 이음: 이음값 };
}

export const 쿠키 = (name: string, domain = 'qa.example.com', value = 'v'): 상태['cookies'][number] => ({
  name, value, domain, path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax',
});

// window.ts 검사용 가짜 Playwright 창 — 공용 창 열기 · 단계 열기 · 단계 닫기가 부르는 것만 갖춘다 (window.test.ts · apps-mix.test.ts)
export function 가짜플창(baseURL?: string) {
  const 탭 = {
    viewportSize: () => ({ width: 1280, height: 720 }), once: vi.fn(), isClosed: () => false, url: () => 'https://qa.example.com/',
    evaluate: vi.fn(async () => {}), goto: vi.fn(async () => null), close: vi.fn(async () => {}), waitForTimeout: vi.fn(async () => {}),
  };
  const 창 = {
    _options: { baseURL },
    request: { fetch: vi.fn(), delete: vi.fn() } as Record<string, unknown>,
    route: vi.fn(async () => ({ dispose: vi.fn(async () => {}) })),
    on: vi.fn(),
    off: vi.fn(),
    newPage: vi.fn(async () => 탭),
    pages: () => [탭],
    storageState: vi.fn(async (): Promise<상태> => ({ cookies: [], origins: [] })),
    cookies: vi.fn(async (): Promise<상태['cookies']> => []),
    setStorageState: vi.fn(async () => {}),
    unrouteAll: vi.fn(async () => {}),
    addCookies: vi.fn(async () => {}),
    clock: {},
    close: vi.fn(async () => {}),
  };
  return { 창, 탭 };
}
