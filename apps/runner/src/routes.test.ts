// 러너 HTTP 계약(SPEC §5.2)을 실제 요청으로 검사한다. 포트를 열지 않고 inject로 두드린다

import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { registerRoutes } from './routes.js';

function 서버() {
  const app = Fastify();
  registerRoutes(app);
  return app;
}

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
