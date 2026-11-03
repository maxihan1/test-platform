// 애플리케이션을 섞은 시나리오 검사 — 부품마다 다른 주소로 무늬를 맞추고, 바꿔 보내고, 창 · 연결을 여는지 본다 (SPEC 도메인/시나리오 §3.7 결정 13)

import type { APIRequest, Browser } from '@playwright/test';
import type { ScenarioExecuteRequest, ScenarioLink } from '@platform/kit';
import { describe, expect, it, vi } from 'vitest';

import { 가르기, 새부품, 새이음, 적기, 주소의, type 받은응답 } from './links.js';
import { runParts } from './parts.js';
import { 가짜플창 } from './parts-fake.js';
import { 감싸기걸기, 주소채움 } from './window.js';

type Part = ScenarioExecuteRequest['parts'][number];

const 쇼핑몰 = 'https://shop.example.com';
const 어드민 = 'https://adm.example.com';
const 케이스 = (tcId: string, baseUrl?: string, links: ScenarioLink[] = []): Part => ({
  kind: 'case', tcId, params: {}, expected: {}, skipSteps: [], links, ...(baseUrl === undefined ? {} : { baseUrl }),
});
const json = (body: unknown): 받은응답 => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

describe('새이음 · 주소의', () => {
  it('baseUrl 이 붙은 case · api 부품만 부품 번호로 주소를 쥔다', () => {
    const 이음 = 새이음(
      [케이스('MKT-FN-001'), 케이스('ADM-FN-001', 어드민), { kind: 'api', method: 'GET', path: '/x', expectStatus: 200, baseUrl: 쇼핑몰 }, { kind: 'wait', ms: 10 }],
      쇼핑몰,
    );

    expect([...이음.부품주소]).toEqual([[2, 어드민], [3, 쇼핑몰]]);
  });

  it('자기 주소가 없는 부품은 요청 전체 주소를 쓴다', () => {
    const 이음 = 새이음([케이스('MKT-FN-001'), 케이스('ADM-FN-001', 어드민)], 쇼핑몰);

    expect(주소의(이음, 1)).toBe(쇼핑몰);
    expect(주소의(이음, 2)).toBe(어드민);
  });
});

describe('값 연결이 애플리케이션을 건넌다', () => {
  const 주문번호: ScenarioLink = { kind: 'bind', param: 'orderId', value: { fromSeq: 1, method: 'POST', urlPattern: '/api/orders', jsonPath: 'data.id' } };
  const 바꿔보내기: ScenarioLink = {
    kind: 'rewrite', method: 'POST', urlPattern: '**/api/orders',
    to: { method: 'PUT', path: '/api/orders/{}', value: { fromSeq: 1, method: 'POST', urlPattern: '/api/orders', jsonPath: 'data.id' } },
  };

  it('앞 응답은 그 앞 부품의 주소로 상대 무늬를 맞춘다 — 다른 애플리케이션 주소의 같은 경로는 안 맞는다', async () => {
    const 이음 = 새이음([케이스('MKT-FN-001', 쇼핑몰), 케이스('ADM-FN-001', 어드민, [주문번호])], 쇼핑몰);

    적기(이음, 1, 'POST', `${어드민}/api/orders`, async () => json({ data: { id: 1 } }));
    expect(이음.응답.size).toBe(0);
    적기(이음, 1, 'POST', `${쇼핑몰}/api/orders`, async () => json({ data: { id: 812 } }));

    await expect(이음.응답.get('1 POST /api/orders')).resolves.toEqual(json({ data: { id: 812 } }));
  });

  it('바꿔 보내기는 받는 부품의 주소로 간다', async () => {
    const 이음 = 새이음([케이스('MKT-FN-001', 쇼핑몰), 케이스('ADM-FN-001', 어드민, [바꿔보내기])], 쇼핑몰);
    const 부품 = 새부품(2, [바꿔보내기]);
    Object.assign(부품.phase, { started: true });
    적기(이음, 1, 'POST', `${쇼핑몰}/api/orders`, async () => json({ data: { id: 812 } }));

    const 가름 = await 가르기(이음, 부품, 'api', 'POST', `${어드민}/api/orders`);

    expect(가름).toEqual({ kind: 'send', method: 'PUT', url: `${어드민}/api/orders/812` });
  });

  it('상대 무늬의 이어 주기는 받는 부품의 주소 기준으로 맞는다', async () => {
    const 막기: ScenarioLink = { kind: 'block', method: 'GET', urlPattern: '/api/cart' };
    const 이음 = 새이음([케이스('MKT-FN-001', 쇼핑몰), 케이스('ADM-FN-001', 어드민, [막기])], 쇼핑몰);
    const 부품 = 새부품(2, [막기]);
    Object.assign(부품.phase, { started: true });

    expect((await 가르기(이음, 부품, 'api', 'GET', `${쇼핑몰}/api/cart`)).kind).toBe('send');
    expect((await 가르기(이음, 부품, 'api', 'GET', `${어드민}/api/cart`)).kind).toBe('fulfill');
  });
});

describe('창 · 연결을 여는 주소', () => {
  function 가짜() {
    const { 창 } = 가짜플창(쇼핑몰);
    const 연결 = { storageState: vi.fn(async () => ({ cookies: [], origins: [] })), dispose: vi.fn(async () => {}) };
    const 열기 = vi.fn(async (_options?: object) => 창);
    const 요청열기 = vi.fn(async (_options?: object) => 연결);
    const 브라우저 = { newContext: 열기 } as unknown as Browser;
    const 요청도구 = { newContext: 요청열기 } as unknown as APIRequest;
    return { 창, 열기, 요청열기, 브라우저, 요청도구 };
  }
  const 설정 = { baseUrl: 쇼핑몰, platform: 'desktop' };
  const 빈 = { cookies: [], origins: [] };

  it('창은 baseURL 을 안 주고 한 번 연다 — Playwright 프로젝트 기본값(시작 애플리케이션)이 채운다', async () => {
    const { 열기, 브라우저, 요청도구 } = 가짜();
    const 감싸기 = 감싸기걸기(브라우저, 요청도구, 새이음([케이스('MKT-FN-001'), 케이스('ADM-FN-001', 어드민)], 쇼핑몰), 설정);

    await 감싸기.newWindow(new Map());

    expect(열기.mock.calls).toEqual([[{}]]);
  });

  it('다른 애플리케이션 단계는 단계 request 를 그 주소로 열고, 주소 맞추기 칸을 단계 동안만 그 주소로 바꾼다 — 자기 애플리케이션 단계는 안 건드린다', async () => {
    const { 창, 요청열기, 브라우저, 요청도구 } = 가짜();
    const 감싸기 = 감싸기걸기(브라우저, 요청도구, 새이음([케이스('MKT-FN-001'), 케이스('ADM-FN-001', 어드민)], 쇼핑몰), 설정);
    const 공용 = await 감싸기.newWindow(new Map());

    const 첫 = await 공용.단계(새부품(1, []), true);
    expect(창._options.baseURL).toBe(쇼핑몰);
    await 첫.close();
    const 둘 = await 공용.단계(새부품(2, []), true);
    expect(창._options.baseURL).toBe(어드민);
    await 둘.close();

    expect(요청열기.mock.calls).toEqual([[{ storageState: 빈 }], [{ storageState: 빈, baseURL: 어드민 }]]);
    expect(창._options.baseURL).toBe(쇼핑몰);
  });

  it('케이스가 직접 만드는 창 · 연결의 옵션에는 그 부품의 주소를 기본으로 채우고, 케이스가 준 baseURL 이 이긴다', () => {
    const 이음 = 새이음([케이스('MKT-FN-001'), 케이스('ADM-FN-001', 어드민)], 쇼핑몰);

    expect(주소채움({ viewport: { width: 10, height: 10 } }, 이음, 새부품(2, []))).toEqual({ viewport: { width: 10, height: 10 }, baseURL: 어드민 });
    expect(주소채움(undefined, 이음, 새부품(2, []))).toEqual({ baseURL: 어드민 });
    expect(주소채움({ baseURL: 'https://other.example.com' }, 이음, 새부품(2, []))).toEqual({ baseURL: 'https://other.example.com' });
    expect(주소채움({ viewport: { width: 10, height: 10 } }, 이음, 새부품(1, []))).toEqual({ viewport: { width: 10, height: 10 } });
    expect(주소채움(undefined, 이음, undefined)).toBeUndefined();
  });
});

describe('API 부품의 호출 주소', () => {
  it('baseUrl 이 있으면 그 주소로 부르고 없으면 요청 전체 주소로 부른다', async () => {
    const 호출: string[] = [];
    const 창 = {
      route: async () => {}, unroute: async () => {}, waitForTimeout: async () => {},
      fetch: vi.fn(async (url: string) => { 호출.push(url); return { status: () => 200, text: async () => "", headers: () => ({}) }; }),
      단계: async () => { throw new Error('안 돈다'); }, state: async () => ({ cookies: [], origins: [] }), close: async () => {},
    };
    const parts: Part[] = [
      { kind: 'api', method: 'GET', path: '/a', expectStatus: 200 },
      { kind: 'api', method: 'GET', path: '/b', expectStatus: 200, baseUrl: `${어드민}/` },
    ];

    await runParts(parts, {
      baseUrl: 쇼핑몰, partTimeoutMs: 0, 이음: 새이음(parts, 쇼핑몰),
      newWindow: async () => 창, sendDelete: async () => 204, write: () => {}, writeCleanup: () => {},
    });

    expect(호출).toEqual([`${쇼핑몰}/a`, `${어드민}/b`]);
  });
});
