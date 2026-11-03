// 시나리오 부품이 쓰는 API 도구를 감싼다 — 이어 주기 · 모킹 · 뒷정리 미루기를 거는 자리. 창을 여는 쪽(window.ts)이 창 · 연결마다 건다 (SPEC 도메인/러너 §5.2 「이어 주기를 건다」)

import type { APIRequestContext, APIResponse } from '@playwright/test';

import { 가르기, 미룬응답, 요청주소, 적기, type 미룬삭제, type 받은응답, type 부품상태, type 상태, type 이음 } from './links.js';

export const 빈상태: 상태 = { cookies: [], origins: [] };

// Playwright 의 상대 주소 풀이와 같다 — new URL(주소, 기준) 이 못 풀면 그대로 (playwright-core constructURLBasedOnBaseURL).
// 창이 하나라 창 · page.request 의 기준 주소는 시작 애플리케이션으로 굳는다. 섞인 시나리오의 다른 애플리케이션 단계는 러너가 먼저 풀어 넘긴다 (SPEC 도메인/러너 §5.2 「창 하나로 끝까지」)
export function 기준풀기(기준: string, 주소: string): string {
  try {
    return new URL(주소, 기준).toString();
  } catch {
    return 주소;
  }
}
const API = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'fetch']);

export interface 도구묶음 {
  부품: 부품상태 | undefined;
  기준: string | undefined;
  // 미룬 삭제를 보낼 때 다시 싣는다 — Bearer 머리 · 기본 인증도 로그인 상태다 (SPEC 도메인/러너 §5.2 「미룬 삭제」)
  만들때: { headers?: Record<string, string>; httpCredentials?: 미룬삭제['httpCredentials'] };
  상태읽기(): Promise<상태>;
}

// Playwright 의 APIResponse 는 밖에서 못 만든다. 케이스는 판정을 verify 로만 하므로 같은 메서드만 갖춘다 (SPEC 도메인/러너 §5.2 「이어 주기를 건다」)
function 가짜응답(r: 받은응답, url: string): APIResponse {
  const 값 = {
    ok: () => r.status >= 200 && r.status <= 299,
    status: () => r.status,
    statusText: () => '',
    url: () => url,
    headers: () => ({ 'content-type': r.contentType }),
    headersArray: () => [{ name: 'content-type', value: r.contentType }],
    body: async () => Buffer.from(r.body),
    text: async () => r.body,
    json: async (): Promise<unknown> => JSON.parse(r.body),
    dispose: async () => {},
    [Symbol.asyncDispose]: async () => {},
  };
  return 값 as unknown as APIResponse;
}

// 브라우저 응답과 API 응답이 같은 세 메서드를 가진다
export async function 읽어둠(r: { status(): number; headers(): Record<string, string>; text(): Promise<string> }): Promise<받은응답> {
  return { status: r.status(), contentType: r.headers()['content-type'] ?? '', body: await r.text() };
}

const 떠둠 = <T>(v: T): T =>
  Array.isArray(v) || (typeof v === 'object' && v !== null && Object.getPrototypeOf(v) === Object.prototype) ? structuredClone(v) : v;

// API 도구 하나를 감싼다. 케이스가 받는 모양은 그대로다 — 케이스 파일은 안 바뀐다 (SPEC 도메인/시나리오 §3.7 결정 12)
export function 감싼도구(api: APIRequestContext, 이음값: 이음, 묶음: 도구묶음): APIRequestContext {
  return new Proxy(api, {
    get(target, prop) {
      const original: unknown = Reflect.get(target, prop, target);
      if (typeof original !== 'function') return original;
      const call = (original as (...args: unknown[]) => unknown).bind(target);
      if (typeof prop !== 'string' || !API.has(prop)) return call;
      return async (주소: unknown, options?: Record<string, unknown>): Promise<APIResponse> => {
        if (typeof 주소 !== 'string') return (await call(주소, options)) as APIResponse;
        const method = prop === 'fetch' ? String(options?.method ?? 'GET').toUpperCase() : prop.toUpperCase();
        const url = 요청주소(주소, 묶음.기준, options?.params as Parameters<typeof 요청주소>[2]);
        const { 부품 } = 묶음;
        const 가름 = await 가르기(이음값, 부품, 'api', method, url);
        if (가름.kind === 'fail') throw new Error(가름.message);
        if (가름.kind === 'fulfill') return 가짜응답(가름.응답, url);
        if (가름.kind === 'defer' && 부품 !== undefined) {
          // 모을 때의 로그인 상태 — 도구가 이미 닫혔으면 한도에 걸려 닫기 직전에 찍은 것 (SPEC 도메인/러너 §5.2 「미룬 삭제」)
          const state = await 묶음.상태읽기().catch(() => 부품.찍은상태 ?? 빈상태);
          const headers = { ...묶음.만들때.headers, ...(options?.headers as Record<string, string> | undefined) };
          // 본문으로 지울 것을 고르는 서버도 있다 — 빼고 보내면 다른 것이 지워지거나 400 이다 (2026-10-24 FIX-F2-05 · 리뷰 L37).
          // 케이스가 같은 객체를 고쳐 다시 지우면 보낼 때는 뒤 값이다 — 평범한 객체 · 배열은 모을 때 떠 둔다(Buffer · FormData 는 그대로)
          const { data, form, multipart } = (options ?? {}) as NonNullable<미룬삭제['본문']>;
          이음값.미룸.push({ fromSeq: 부품.seq, url, headers, state, httpCredentials: 묶음.만들때.httpCredentials, 본문: { data: 떠둠(data), form: 떠둠(form), multipart } });
          return 가짜응답(미룬응답(이음값, url), url);
        }
        // 상대 주소는 이 도구의 기준(그 단계 주소)으로 풀어 보낸다. 섞인 시나리오에서 page.request 의 처음 기준이 시작 애플리케이션이라서다 —
        // 기준이 같은 도구에서는 Playwright 가 풀어도 같은 주소다 (SPEC 도메인/러너 §5.2 「창 하나로 끝까지」)
        const 응답 = (가름.kind === 'send' && 가름.url !== undefined
          ? await target.fetch(가름.url, { ...options, params: undefined, method: 가름.method })
          : await call(묶음.기준 === undefined ? 주소 : 기준풀기(묶음.기준, 주소), options)) as APIResponse;
        if (부품 !== undefined) 적기(이음값, 부품.seq, method, url, () => 읽어둠(응답));
        return 응답;
      };
    },
  });
}
