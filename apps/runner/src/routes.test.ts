// 러너 HTTP 계약(SPEC §5.2)을 실제 요청으로 검사한다. 포트를 열지 않고 inject로 두드린다

import { spawn } from 'node:child_process';
import { once } from 'node:events';

import type { StepProgress } from '@platform/kit';
import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { running, 진행을_모은다, type Running } from './execute.js';
import { killTree } from './kill.js';
import { registerRoutes } from './routes.js';

function 서버() {
  const app = Fastify();
  registerRoutes(app);
  return app;
}

// 지도를 비우는 책임은 execute()의 finally에만 있고 이 테스트는 그 경로를 안 거친다.
// 단언이 깨져 끊는 자리까지 못 갔으면 자식이 30초를 더 산다. 비우기 전에 먼저 내린다
afterEach(() => {
  for (const { child } of running.values()) killTree(child);
  running.clear();
  vi.useRealTimers();
});

const 진행줄 = (p: StepProgress) => `@@PROGRESS@@${JSON.stringify(p)}\n`;

// cat 은 받은 것을 그대로 stdout 으로 돌려준다. 실제 자식 stdout 을 타야 갈아 끼우기가 증명된다
function 진행을_흘리는_자식(historyId: number) {
  const child = spawn('sh', ['-c', 'cat'], { detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
  const entry: Running = { child, killedBy: null };
  진행을_모은다(entry, child.stdout);
  running.set(historyId, entry);
  return child;
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

describe('GET /progress', () => {
  it('지금 돌고 있는 항목의 seq·title·elapsedMs를 낸다', async () => {
    const child = 진행을_흘리는_자식(7);
    child.stdin.write(진행줄({ historyId: 7, seq: 3, title: '주문한다' }));
    await once(child.stdout, 'data');

    const res = await 서버().inject({ method: 'GET', url: '/progress' });

    expect(res.statusCode).toBe(200);
    expect(res.json().items).toHaveLength(1);
    const [항목] = res.json().items;
    expect(항목.historyId).toBe(7);
    expect(항목.seq).toBe(3);
    expect(항목.title).toBe('주문한다');
    expect(항목.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('자식이 남의 historyId를 적어 보내도 러너가 아는 번호로 낸다', async () => {
    const child = 진행을_흘리는_자식(7);
    child.stdin.write(진행줄({ historyId: 9999, seq: 1, title: '남의 실행인 척한다' }));
    await once(child.stdout, 'data');

    const res = await 서버().inject({ method: 'GET', url: '/progress' });

    expect(res.json().items).toHaveLength(1);
    expect(res.json().items[0].historyId).toBe(7);
  });

  it('도는 것이 없으면 빈 목록이다', async () => {
    const 아무것도없음 = await 서버().inject({ method: 'GET', url: '/progress' });

    expect(아무것도없음.statusCode).toBe(200);
    expect(아무것도없음.json()).toEqual({ items: [] });

    진행을_흘리는_자식(8);
    const 아직안알림 = await 서버().inject({ method: 'GET', url: '/progress' });

    expect(아직안알림.json()).toEqual({ items: [] });
  });

  it('같은 항목의 다음 절차가 오면 앞 절차를 덮어쓴다', async () => {
    const child = 진행을_흘리는_자식(7);

    child.stdin.write(진행줄({ historyId: 7, seq: 1, title: '화면을 연다' }));
    await once(child.stdout, 'data');
    const 먼저 = await 서버().inject({ method: 'GET', url: '/progress' });

    expect(먼저.json().items).toHaveLength(1);
    expect(먼저.json().items[0].seq).toBe(1);

    child.stdin.write(진행줄({ historyId: 7, seq: 2, title: '로그인' }));
    await once(child.stdout, 'data');
    const 나중 = await 서버().inject({ method: 'GET', url: '/progress' });

    expect(나중.json().items).toHaveLength(1);
    expect(나중.json().items[0].seq).toBe(2);
    expect(나중.json().items[0].title).toBe('로그인');
  });

  it('elapsedMs는 그 절차가 시작된 뒤로 흐른 시간이지 항목이 시작된 뒤가 아니다', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const child = 진행을_흘리는_자식(7);

    vi.setSystemTime(1_000_000);
    child.stdin.write(진행줄({ historyId: 7, seq: 1, title: '화면을 연다' }));
    await once(child.stdout, 'data');

    vi.setSystemTime(1_005_000);
    child.stdin.write(진행줄({ historyId: 7, seq: 2, title: '로그인' }));
    await once(child.stdout, 'data');

    vi.setSystemTime(1_005_300);
    const res = await 서버().inject({ method: 'GET', url: '/progress' });

    expect(res.json().items).toEqual([{ historyId: 7, seq: 2, title: '로그인', elapsedMs: 300 }]);
  });
});
