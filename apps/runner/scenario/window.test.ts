// 고정 spec 감싸기 검사 — 브라우저 없이 가짜 Browser · APIRequest 로 미룬 삭제 연결 옵션 · 응답 적기를 본다 (SPEC 도메인/러너 §5.2)

import type { APIRequest, Browser, BrowserContext } from '@playwright/test';
import { describe, expect, it, vi } from 'vitest';

import { 새부품, 새이음, type 미룬삭제 } from './links.js';
import { 감싸기걸기, 만들때값, 응답듣기 } from './window.js';

const 설정 = { baseUrl: 'https://qa.example.com', platform: 'desktop', 기본머리: { 'x-tenant': 'qa' }, 기본인증: { username: 'qa', password: 'pw' } };

describe('만들때값 — 미룬 삭제에 다시 실을 로그인 상태 (Playwright 와 같은 규칙: 그 칸을 안 줬을 때만 프로젝트 기본값)', () => {
  it('옵션 없이 만든 도구(부품 request · page.request)는 프로젝트 기본 머리글 · 기본 인증을 쓴다', () => {
    expect(만들때값(undefined, 설정)).toEqual({ headers: { 'x-tenant': 'qa' }, httpCredentials: { username: 'qa', password: 'pw' } });
  });

  it('케이스가 그 칸을 주고 만든 연결은 준 것만 쓴다 — 기본값을 깔지 않는다', () => {
    expect(만들때값({ extraHTTPHeaders: { 'x-tenant': 'other' } }, 설정)).toEqual({
      headers: { 'x-tenant': 'other' }, httpCredentials: { username: 'qa', password: 'pw' },
    });
    expect(만들때값({ httpCredentials: undefined }, 설정)).toEqual({ headers: { 'x-tenant': 'qa' }, httpCredentials: undefined });
  });
});

describe('sendDelete', () => {
  // 감싸기걸기가 newContext 를 감싼 것으로 바꿔 끼우므로 원래 가짜 함수는 따로 쥔다
  const 가짜 = () => {
    const 연결 = { fetch: vi.fn(async () => ({ status: () => 200 })), dispose: vi.fn(async () => {}) };
    const 만들기 = vi.fn(async (_options?: object) => 연결);
    const 요청도구 = { newContext: 만들기 } as unknown as APIRequest;
    const 브라우저 = { newContext: vi.fn() } as unknown as Browser;
    return { 연결, 요청도구: { newContext: 만들기 }, 감싸기: 감싸기걸기(브라우저, 요청도구, 새이음([], 설정.baseUrl), 설정) };
  };
  const 미룸 = (칸: Partial<미룬삭제> = {}): 미룬삭제 => ({ fromSeq: 1, url: 'https://qa.example.com/api/posts/1', headers: {}, state: { cookies: [], origins: [] }, ...칸 });

  it('기본 인증이 없으면 그 칸을 아예 안 넣는다 — undefined 로라도 넣으면 Playwright 가 프로젝트 기본값을 안 채운다', async () => {
    const { 요청도구, 감싸기 } = 가짜();

    await 감싸기.sendDelete(미룸(), 1000);

    const 옵션 = vi.mocked(요청도구.newContext).mock.calls[0]![0]!;
    expect('httpCredentials' in 옵션).toBe(false);
  });

  it('모을 때의 머리글 · 기본 인증 · 쿠키를 그대로 싣고 요청 한도를 건다', async () => {
    const { 연결, 요청도구, 감싸기 } = 가짜();
    const 인증 = { username: 'u', password: 'p' };

    await expect(감싸기.sendDelete(미룸({ headers: { a: '1' }, httpCredentials: 인증 }), 1000)).resolves.toBe(200);

    expect(vi.mocked(요청도구.newContext)).toHaveBeenCalledWith({ storageState: { cookies: [], origins: [] }, extraHTTPHeaders: { a: '1' }, httpCredentials: 인증 });
    expect(연결.fetch).toHaveBeenCalledWith('https://qa.example.com/api/posts/1', { method: 'DELETE', timeout: 1000 });
    expect(연결.dispose).toHaveBeenCalled();
  });
});

describe('응답듣기', () => {
  it('가리킨 부품의 응답을 적고, 3xx 는 본문을 못 읽어 자리만 차지하므로 건너뛴다', async () => {
    const 이음 = 새이음([
      { kind: 'case', tcId: 'A-001', params: {}, expected: {}, skipSteps: [] },
      { kind: 'case', tcId: 'A-002', params: {}, expected: {}, skipSteps: [], links: [{ kind: 'bind', param: 'x', value: { fromSeq: 1, method: 'POST', urlPattern: '**/api/posts', jsonPath: 'id' } }] },
    ], 설정.baseUrl);
    let 들음: ((res: unknown) => void) | undefined;
    const 창 = { on: (_이름: string, f: (res: unknown) => void) => { 들음 = f; } } as unknown as BrowserContext;
    const 응답 = (status: number) => ({
      status: () => status, url: () => 'https://qa.example.com/api/posts', headers: () => ({ 'content-type': 'application/json' }),
      text: async () => '{"id":812}', request: () => ({ method: () => 'POST' }),
    });

    응답듣기(창, 이음, 새부품(1, []));
    들음!(응답(302));
    expect(이음.응답.size).toBe(0);
    들음!(응답(201));

    await expect(이음.응답.get('1 POST **/api/posts')).resolves.toEqual({ status: 201, contentType: 'application/json', body: '{"id":812}' });
  });
});
