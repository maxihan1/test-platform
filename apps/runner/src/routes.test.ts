// 러너 HTTP 계약(SPEC §5.2)을 실제 요청으로 검사한다. 포트를 열지 않고 inject로 두드린다

import { spawn } from 'node:child_process';
import { once } from 'node:events';

import Fastify from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { running } from './execute.js';
import { registerRoutes } from './routes.js';

function 서버() {
  const app = Fastify();
  registerRoutes(app);
  return app;
}

// 지도를 비우는 책임은 execute()의 finally에만 있고 이 테스트는 그 경로를 안 거친다
afterEach(() => running.clear());

describe('GET /health', () => {
  it('이미지와 라이브러리 버전이 어긋났는지 보려고 playwright 버전을 같이 낸다', async () => {
    const res = await 서버().inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
    expect(res.json().playwrightVersion).toMatch(/^\d+\./);
  });
});

describe('POST /execute', () => {
  it('요청 형태가 계약과 다르면 400 INVALID_REQUEST다', async () => {
    const res = await 서버().inject({
      method: 'POST',
      url: '/execute',
      payload: { runId: '숫자가 아니다' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('INVALID_REQUEST');
  });
});

describe('POST /abort', () => {
  it('이미 끝났거나 모르는 항목이면 200에 aborted false다', async () => {
    const res = await 서버().inject({ method: 'POST', url: '/abort', payload: { historyId: 999 } });

    // 중단 요청과 정상 종료가 겹치는 것은 경합이지 고장이 아니다. 404면 admin이 정상 상황마다 에러를 받는다
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ aborted: false });
  });

  it('historyId가 없으면 400 INVALID_REQUEST다', async () => {
    const res = await 서버().inject({ method: 'POST', url: '/abort', payload: {} });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('INVALID_REQUEST');
  });

  it('돌고 있는 항목이면 자식을 끊고 200에 aborted true다', async () => {
    const child = spawn('sh', ['-c', 'sleep 30'], { detached: true, stdio: 'ignore' });
    running.set(42, { child, killedBy: null });

    const res = await 서버().inject({ method: 'POST', url: '/abort', payload: { historyId: 42 } });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ aborted: true });
    await once(child, 'close');
  });
});
