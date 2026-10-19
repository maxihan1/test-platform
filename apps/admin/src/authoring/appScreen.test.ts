// 앱 화면 통로의 중계: 러너에 앱 파일 경로를 싣고, 읽지 못한 까닭을 던지지 않고 돌려주는지 본다. 네트워크는 fetch 가짜로 막는다

import { describe, expect, it, vi } from 'vitest';

import { 앱화면읽기 } from './appScreen.js';

const 답 = (몸: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(몸), { status })) as unknown as typeof fetch;

describe('앱화면읽기', () => {
  it('앱 파일 경로가 없으면 러너를 부르지 않고 까닭도 없이 비운다 — 앱이 없는 서비스', async () => {
    const 부르기 = 답({});

    expect(await 앱화면읽기(null, 'http://m:4001', 부르기)).toEqual({ screen: null, reason: null });
    expect(부르기).not.toHaveBeenCalled();
  });

  it('러너가 꺼져 있으면 까닭을 적는다', async () => {
    expect(await 앱화면읽기('/apk/a.apk', undefined, 답({}))).toEqual({
      screen: null,
      reason: '내 컴퓨터 러너(LOCAL_RUNNER_URL)가 꺼져 있다',
    });
  });

  it('러너 /app-screen 에 앱 파일 경로를 싣고 화면 글을 돌려준다', async () => {
    const 부르기 = 답({ screen: '화면 1080x2400 · 요소 1개' });

    const 결과 = await 앱화면읽기('/apk/a.apk', 'http://m:4001', 부르기);

    expect(결과).toEqual({ screen: '화면 1080x2400 · 요소 1개', reason: null });
    const [url, init] = (부르기 as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://m:4001/app-screen');
    expect(JSON.parse(init.body as string)).toEqual({ app: '/apk/a.apk' });
  });

  it('러너가 폰이 바쁘다고(409) 하면 그 말로 적는다', async () => {
    expect(await 앱화면읽기('/a.apk', 'http://m:4001', 답({ error: 'RUNNER_BUSY' }, 409))).toEqual({
      screen: null,
      reason: '폰이 다른 실행에 쓰이는 중이다',
    });
  });

  it('러너 오류는 detail 을 200자까지 싣는다', async () => {
    const 결과 = await 앱화면읽기('/a.apk', 'http://m:4001', 답({ error: 'RUNNER_ERROR', detail: 'x'.repeat(500) }, 500));

    expect(결과.screen).toBeNull();
    expect(결과.reason).toBe(`러너가 화면을 못 읽었다: ${'x'.repeat(200)}…`);
  });

  it('러너에 못 닿으면 던지지 않고 까닭만 돌려준다 — 주소는 싣지 않는다', async () => {
    const 부르기 = vi.fn(async () => {
      throw new TypeError('fetch failed http://secret-host:4001');
    }) as unknown as typeof fetch;

    const 결과 = await 앱화면읽기('/a.apk', 'http://secret-host:4001', 부르기);

    expect(결과).toEqual({ screen: null, reason: '러너에 닿지 못했다: TypeError' });
  });
});
