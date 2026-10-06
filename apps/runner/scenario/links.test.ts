// 이어 주기 규칙 검사 — 브라우저 없이 무늬 · 주소 · 값 꺼내기 · 응답 적기 · 꽂기 · 안 걸린 이어 주기를 본다. 가르기는 links-gate.test.ts (SPEC 도메인/시나리오 §3.7 결정 12)

import type { ScenarioExecuteRequest, ScenarioLink, ScenarioResponseRef } from '@platform/kit';
import { describe, expect, it, vi } from 'vitest';

import { 값꺼냄, 꽂기, 무늬맞음, 새부품, 새이음, 안걸린, 요청주소, 적기, type 받은응답 } from './links.js';

type Part = ScenarioExecuteRequest['parts'][number];
type CasePart = Extract<Part, { kind: 'case' }>;

const BASE = 'https://x.com/shop/';
const 케이스 = (tcId: string, links: ScenarioLink[] = [], params: Record<string, unknown> = {}): CasePart => ({
  kind: 'case', tcId, params, expected: {}, skipSteps: [], links,
});
const json = (body: unknown): 받은응답 => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
const 만든글: ScenarioResponseRef = { fromSeq: 1, method: 'POST', urlPattern: '**/api/posts', jsonPath: 'data.id' };

const 돌려주기: ScenarioLink = { kind: 'reuse', method: 'GET', urlPattern: '**/api/posts', fromSeq: 1 };
const 막기: ScenarioLink = { kind: 'block', method: 'DELETE', urlPattern: '**/api/cart' };
const 바꿔보내기: ScenarioLink = {
  kind: 'rewrite', method: 'POST', urlPattern: '**/api/posts', to: { method: 'PUT', path: '/api/posts/{}', value: 만든글 },
};
const 꽂기링크: ScenarioLink = { kind: 'bind', param: 'postId', value: 만든글 };

// 2번 부품이 이어 주기를 걸고 1번 부품의 응답을 쓴다. 기본은 준비 구간(첫 절차는 섰고 절차 밖 · 판정 전)
function 판(links: ScenarioLink[], phase: Partial<{ started: boolean; inStep: number; judged: boolean }> = {}) {
  const 이음 = 새이음([케이스('A-001'), 케이스('A-002', links)], BASE);
  const 부품 = 새부품(2, links);
  Object.assign(부품.phase, { started: true }, phase);
  return { 이음, 부품 };
}

describe('무늬맞음', () => {
  it('** 는 앞을 다 받고 무늬는 주소 끝까지 맞아야 한다', () => {
    expect(무늬맞음('**/api/posts', 'https://x.com/api/posts', BASE)).toBe(true);
    expect(무늬맞음('**/api/posts', 'https://x.com/api/posts/1', BASE)).toBe(false);
  });

  it('* 는 / 를 넘지 않는다', () => {
    expect(무늬맞음('https://x.com/api/*', 'https://x.com/api/posts', BASE)).toBe(true);
    expect(무늬맞음('https://x.com/api/*', 'https://x.com/api/posts/1', BASE)).toBe(false);
  });

  it('{a,b} 는 둘 중 하나에 맞는다', () => {
    expect(무늬맞음('**/api/{posts,comments}', 'https://x.com/api/posts', BASE)).toBe(true);
    expect(무늬맞음('**/api/{posts,comments}', 'https://x.com/api/comments', BASE)).toBe(true);
    expect(무늬맞음('**/api/{posts,comments}', 'https://x.com/api/users', BASE)).toBe(false);
  });

  it('/ 로 시작하는 무늬는 baseUrl 의 origin 을 붙여 맞춘다', () => {
    expect(무늬맞음('/api/*', 'https://x.com/api/a', 'https://x.com/shop')).toBe(true);
    expect(무늬맞음('/api/*', 'https://y.com/api/a', 'https://x.com/shop')).toBe(false);
  });

  it('깨진 무늬는 던지지 않고 안 맞는다', () => {
    expect(무늬맞음('**/api/{posts', 'https://x.com/api/posts', BASE)).toBe(false);
  });
});

describe('요청주소', () => {
  it('상대 주소는 기준 주소로 푼다 — new URL 과 같다', () => {
    expect(요청주소('/api/a', 'https://x.com/shop/')).toBe('https://x.com/api/a');
  });

  it('절대 주소는 그대로다', () => {
    expect(요청주소('https://y.com/api/b', 'https://x.com/shop/')).toBe('https://y.com/api/b');
  });

  it('기준이 없으면 상대 주소를 그대로 둔다', () => {
    expect(요청주소('/api/a', undefined)).toBe('/api/a');
  });

  it('params 는 쿼리로 붙이고 이미 쿼리가 있으면 이어 붙인다', () => {
    expect(요청주소('/api/a', 'https://x.com', { page: 2, on: true })).toBe('https://x.com/api/a?page=2&on=true');
    expect(요청주소('/api/a?sort=new', 'https://x.com', { page: 2 })).toBe('https://x.com/api/a?sort=new&page=2');
  });
});

describe('값꺼냄', () => {
  it('점 표기 경로로 값을 꺼낸다 — 배열은 번호로', () => {
    expect(값꺼냄('{"data":{"id":812}}', 'data.id')).toEqual({ ok: true, value: 812 });
    expect(값꺼냄('{"items":[{"id":"a"}]}', 'items.0.id')).toEqual({ ok: true, value: 'a' });
  });

  it('없는 경로 · JSON 아닌 본문은 못 꺼낸다', () => {
    expect(값꺼냄('{"data":{}}', 'data.id')).toEqual({ ok: false });
    expect(값꺼냄('{"data":"abc"}', 'data.length')).toEqual({ ok: false });
    expect(값꺼냄('<html></html>', 'data.id')).toEqual({ ok: false });
  });
});

describe('새부품', () => {
  it('표시판은 첫 절차 전 · 절차 밖 · 판정 전에서 시작하고 이어 주기가 없으면 빈 목록이다', () => {
    const 부품 = 새부품(3, undefined);

    expect(부품).toMatchObject({ seq: 3, links: [], phase: { started: false, inStep: 0, judged: false } });
    expect(부품.걸림.size).toBe(0);
    expect(부품.오류).toBeUndefined();
  });
});

describe('새이음 · 적기', () => {
  it('case 부품의 돌려주기 · 바꿔 보내기 · 값 꽂기가 가리키는 앞 응답만 겹치지 않게 모은다', () => {
    const parts: Part[] = [
      케이스('A-001'),
      { kind: 'api', method: 'GET', path: '/api/ping', expectStatus: 200 },
      케이스('A-002', [돌려주기, 막기, 바꿔보내기, 꽂기링크]),
    ];

    const 이음 = 새이음(parts, BASE);

    expect(이음.가리킴).toEqual([
      { fromSeq: 1, method: 'GET', urlPattern: '**/api/posts' },
      { fromSeq: 1, method: 'POST', urlPattern: '**/api/posts' },
    ]);
    expect(이음).toMatchObject({ baseUrl: BASE, 미룸: [], 얼림: false });
    expect(이음.응답.size).toBe(0);
    expect(이음.모킹.size).toBe(0);
  });

  it('가리킨 무늬에 처음 맞은 응답만 자리를 잡는다 — 자리는 바로 잡고 두 번째 응답은 본문도 안 읽는다', async () => {
    const { 이음 } = 판([바꿔보내기]);
    const 첫본문 = vi.fn(async () => json({ data: { id: 812 } }));
    const 둘째본문 = vi.fn(async () => json({ data: { id: 813 } }));

    적기(이음, 1, 'POST', 'https://x.com/api/posts', 첫본문);
    expect(이음.응답.has('1 POST **/api/posts')).toBe(true);
    적기(이음, 1, 'POST', 'https://x.com/api/posts', 둘째본문);

    expect(첫본문).toHaveBeenCalledTimes(1);
    expect(둘째본문).not.toHaveBeenCalled();
    await expect(이음.응답.get('1 POST **/api/posts')).resolves.toEqual(json({ data: { id: 812 } }));
  });

  it('안 가리킨 응답은 적지 않고 본문도 안 읽는다 — 다른 부품 · 다른 메서드 · 다른 주소', () => {
    const { 이음 } = 판([바꿔보내기]);
    const 본문 = vi.fn(async () => json({}));

    적기(이음, 2, 'POST', 'https://x.com/api/posts', 본문);
    적기(이음, 1, 'GET', 'https://x.com/api/posts', 본문);
    적기(이음, 1, 'POST', 'https://x.com/api/users', 본문);

    expect(본문).not.toHaveBeenCalled();
    expect(이음.응답.size).toBe(0);
  });

  it('한 응답이 가리킴 둘에 맞아도 본문은 한 번만 읽는다', async () => {
    const 다른무늬: ScenarioResponseRef = { ...만든글, urlPattern: 'https://x.com/api/*' };
    const { 이음 } = 판([바꿔보내기, { kind: 'bind', param: 'id', value: 다른무늬 }]);
    const 본문 = vi.fn(async () => json({ data: { id: 1 } }));

    적기(이음, 1, 'POST', 'https://x.com/api/posts', 본문);

    expect(본문).toHaveBeenCalledTimes(1);
    expect(이음.응답.size).toBe(2);
  });

  it('본문을 못 읽으면 그 자리에 사유를 둔다', async () => {
    const { 이음 } = 판([바꿔보내기]);

    적기(이음, 1, 'POST', 'https://x.com/api/posts', async () => {
      throw new Error('Target closed');
    });

    await expect(이음.응답.get('1 POST **/api/posts')).resolves.toBe('1번 부품 응답 본문을 못 읽었다');
  });
});

describe('꽂기', () => {
  it('값 꽂기는 params 복사본의 그 칸에 넣고 넣은 값을 돌려준다', async () => {
    const part = 케이스('A-002', [꽂기링크], { title: '글' });
    const { 이음, 부품 } = 판([꽂기링크]);
    적기(이음, 1, 'POST', 'https://x.com/api/posts', async () => json({ data: { id: 812 } }));

    await expect(꽂기(이음, part, 부품)).resolves.toEqual({ params: { title: '글', postId: 812 }, bound: { postId: 812 } });
    expect(part.params).toEqual({ title: '글' });
  });

  it('값 꽂기가 없으면 원래 params 만 돌려준다', async () => {
    const part = 케이스('A-002', [막기], { title: '글' });
    const { 이음, 부품 } = 판([막기]);

    const 결과 = await 꽂기(이음, part, 부품);

    expect(결과).toEqual({ params: { title: '글' } });
    expect('bound' in 결과).toBe(false);
  });

  it('못 꺼내면 가르기와 같은 사유를 돌려준다', async () => {
    const part = 케이스('A-002', [꽂기링크]);
    const 응답없음 = 판([꽂기링크]);
    const 값없음 = 판([꽂기링크]);
    적기(값없음.이음, 1, 'POST', 'https://x.com/api/posts', async () => json({ data: {} }));

    await expect(꽂기(응답없음.이음, part, 응답없음.부품)).resolves.toEqual({ 오류: '1번 부품에 맞는 응답이 없다' });
    await expect(꽂기(값없음.이음, part, 값없음.부품)).resolves.toEqual({ 오류: '1번 부품 응답에 data.id 가 없다' });
  });
});

describe('안걸린', () => {
  it('한 번도 안 걸린 돌려주기 · 막기 · 바꿔 보내기를 한 줄로 적는다 — 값 꽂기는 안 센다', () => {
    const 부품 = 새부품(2, [돌려주기, 막기, 바꿔보내기, 꽂기링크]);
    부품.걸림.add(0);

    expect(안걸린(부품)).toBe('안 걸린 이어 주기 — 요청 막기 DELETE **/api/cart · 바꿔 보내기 POST **/api/posts');
  });

  it('앞 응답 돌려주기도 이름으로 적는다', () => {
    expect(안걸린(새부품(2, [돌려주기]))).toBe('안 걸린 이어 주기 — 앞 응답 돌려주기 GET **/api/posts');
  });

  it('다 걸렸거나 걸 것이 없으면 없다', () => {
    const 다걸림 = 새부품(2, [막기]);
    다걸림.걸림.add(0);

    expect(안걸린(다걸림)).toBeUndefined();
    expect(안걸린(새부품(2, [꽂기링크]))).toBeUndefined();
    expect(안걸린(새부품(2, undefined))).toBeUndefined();
  });
});
