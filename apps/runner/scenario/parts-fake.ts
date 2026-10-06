// 부품 흐름 검사의 가짜 창 — newWindow 가 부를 때마다 새 가짜 창을 만들고 받은 상태 · 모킹 · 부품을 적어 둔다 (parts-links.test.ts · parts-limit.test.ts)

import type { ScenarioCleanup, ScenarioExecuteRequest, ScenarioPartResult } from '@platform/kit';
import { vi } from 'vitest';

import { 새이음, type 부품상태, type 상태 } from './links.js';
import type { PartDeps, RouteHandler, 창 } from './parts.js';

type Part = ScenarioExecuteRequest['parts'][number];

export type 받은창 = { state: 상태 | undefined; mocks: string[]; 부품: 부품상태 | undefined; 창: 창 };

export function 창들(parts: Part[], 칸: { partTimeoutMs?: number; 창마다?: (n: number, 부품: 부품상태 | undefined) => Partial<창> } = {}) {
  const 받은: 받은창[] = [];
  const 줄: ScenarioPartResult[] = [];
  const 뒷정리: ScenarioCleanup[][] = [];
  const 이음값 = 새이음(parts, 'https://qa.example.com');
  const deps: PartDeps = {
    baseUrl: 'https://qa.example.com',
    partTimeoutMs: 칸.partTimeoutMs ?? 30_000,
    이음: 이음값,
    newWindow: vi.fn(async (state: 상태 | undefined, mocks: ReadonlyMap<string, RouteHandler>, 부품?: 부품상태) => {
      const n = 받은.length;
      const 하나: 창 = {
        route: vi.fn(async () => {}),
        unroute: vi.fn(async () => {}),
        waitForTimeout: vi.fn(async () => {}),
        fetch: vi.fn(async () => ({ status: () => 200 })),
        runCase: vi.fn(async (_part, seq: number) => ({
          seq: seq + 1,
          steps: [{ seq: seq + 1, title: '가', status: 'PASS' as const, durationMs: 1, assertions: [] }],
          failed: false,
        })),
        state: vi.fn(async () => ({ cookies: [쿠키(`창${n}`)], origins: [] })),
        close: vi.fn(async () => {}),
        ...칸.창마다?.(n, 부품),
      };
      받은.push({ state, mocks: [...mocks.keys()], 부품, 창: 하나 });
      return 하나;
    }),
    sendDelete: vi.fn(async () => 200),
    write: (result) => {
      줄.push(result);
    },
    writeCleanup: (list) => {
      뒷정리.push(list);
    },
  };
  return { deps, 받은, 줄, 뒷정리, 이음: 이음값 };
}

export const 쿠키 = (name: string, domain = 'qa.example.com', value = 'v'): 상태['cookies'][number] => ({
  name, value, domain, path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax',
});
