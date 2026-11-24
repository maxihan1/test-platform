// 러너 입구가 케이스 목록을 실은 요청을 받고 프로시저를 돌릴 수 있다고 밝히는지 검사한다 (SPEC 도메인/러너 §5.2 「프로시저 실행」)

import type { ExecuteResponse } from '@platform/kit';
import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { execute } from './execute.js';
import { 팜증적받기를줄세운다 } from './farmEvidence.js';
import { registerRoutes } from './routes.js';

// 입구가 실행에 무엇을 넘기고 무엇을 답하는지만 본다. 진짜 실행은 자식 프로세스를 띄운다
vi.mock('./execute.js', async (원본) => ({ ...(await 원본<typeof import('./execute.js')>()), execute: vi.fn() }));
vi.mock('./farmEvidence.js', async (원본) => ({ ...(await 원본<typeof import('./farmEvidence.js')>()), 팜증적받기를줄세운다: vi.fn() }));

function 서버() {
  const app = Fastify();
  registerRoutes(app);
  return app;
}

const 케이스들 = [
  { tcId: 'MTA-FN-101', params: { loginId: 'qa1' }, expected: {} },
  { tcId: 'MTA-FN-102', params: {}, expected: { 남은글자: '-1' } },
];
// 입구는 파일이 있는지만 본다 — 있는 파일 하나를 빌린다
const 요청 = { runId: 3, historyId: 41, platform: 'android', filePath: 'todo/TODO-001.spec.ts', baseUrl: 'https://qa.example.com', procId: 'MTA-TP-012', cases: 케이스들, timeoutMs: 600_000 };
const 답 = (둘째: 'PASS' | 'FAIL'): ExecuteResponse => ({
  historyId: 41,
  durationMs: 9,
  results: [
    { tcId: 'MTA-FN-101', status: 'PASS', durationMs: 4, steps: [] },
    { tcId: 'MTA-FN-102', status: 둘째, durationMs: 5, steps: [] },
  ],
});

beforeEach(() => {
  vi.mocked(execute).mockReset();
  vi.mocked(팜증적받기를줄세운다).mockReset();
});

describe('GET /health', () => {
  it('프로시저를 돌릴 수 있다고 밝힌다 — admin 은 이 칸이 없는 러너에 프로시저 파일을 안 보낸다', async () => {
    const res = await 서버().inject({ method: 'GET', url: '/health' });

    expect(res.json()).toMatchObject({ ok: true, procedure: true });
  });
});

describe('POST /execute — 케이스 목록', () => {
  it('케이스 목록과 프로시저 번호를 버리지 않고 실행에 넘기고 케이스별 결과를 그대로 답한다', async () => {
    vi.mocked(execute).mockResolvedValue(답('FAIL'));

    const res = await 서버().inject({ method: 'POST', url: '/execute', payload: 요청 });

    expect(res.statusCode).toBe(200);
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ historyId: 41, procId: 'MTA-TP-012', cases: 케이스들, timeoutMs: 600_000 }), expect.any(String));
    expect(res.json()).toEqual(답('FAIL'));
  });

  it.each([
    ['통과가 아닌 케이스가 있으면', 'FAIL', 'FAIL'],
    ['케이스가 다 통과면', 'PASS', 'PASS'],
  ] as const)('%s 팜 증적 받기에 %s 를 넘긴다 — 증적은 실행 단위에 하나다', async (_무엇, 둘째, 넘긴값) => {
    vi.mocked(execute).mockResolvedValue(답(둘째));

    await 서버().inject({ method: 'POST', url: '/execute', payload: 요청 });

    expect(팜증적받기를줄세운다).toHaveBeenCalledWith(3, 41, 넘긴값, undefined, undefined, undefined);
  });

  it.each([
    ['케이스가 비었으면', []],
    ['같은 tcId 가 둘이면', [케이스들[0], 케이스들[0]]],
    ['케이스 목록이 없으면', undefined],
  ])('%s 400 INVALID_REQUEST 다', async (_무엇, cases) => {
    const res = await 서버().inject({ method: 'POST', url: '/execute', payload: { ...요청, cases } });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('INVALID_REQUEST');
    expect(execute).not.toHaveBeenCalled();
  });

  it('파일이 없으면 지금처럼 404 CASE_NOT_FOUND 다', async () => {
    const res = await 서버().inject({ method: 'POST', url: '/execute', payload: { ...요청, filePath: 'mta/MTA-TP-999.spec.ts' } });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('CASE_NOT_FOUND');
  });
});
