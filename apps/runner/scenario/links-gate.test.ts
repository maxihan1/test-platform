// 이어 주기 가르기 검사 — 준비 구간의 이어 주기 · 뒷정리 미루기 · API 쪽 모킹과 그 순서를 브라우저 없이 본다 (SPEC 도메인/시나리오 §3.7 결정 12)

import type { ScenarioExecuteRequest, ScenarioLink, ScenarioResponseRef } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import { 가르기, 새부품, 새이음, 적기, type 받은응답 } from './links.js';

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
// 2번 부품이 이어 주기를 걸고 1번 부품의 응답을 쓴다. 기본은 준비 구간(첫 절차는 섰고 절차 밖 · 판정 전)
function 판(links: ScenarioLink[], phase: Partial<{ started: boolean; inStep: number; judged: boolean }> = {}) {
  const 이음 = 새이음([케이스('A-001'), 케이스('A-002', links)], BASE);
  const 부품 = 새부품(2, links);
  Object.assign(부품.phase, { started: true }, phase);
  return { 이음, 부품 };
}

describe('가르기 — 준비 구간의 이어 주기', () => {
  it('요청 막기는 서버 대신 200 {} 를 주고 걸림에 자리 번호를 적는다', async () => {
    const { 이음, 부품 } = 판([돌려주기, 막기]);

    await expect(가르기(이음, 부품, 'browser', 'DELETE', 'https://x.com/api/cart')).resolves.toEqual({
      kind: 'fulfill', 응답: { status: 200, contentType: 'application/json', body: '{}' },
    });
    expect([...부품.걸림]).toEqual([1]);
  });

  it('API 쪽 절차 밖 DELETE 라도 막기가 걸리면 미루지 않고 막는다', async () => {
    const { 이음, 부품 } = 판([막기]);

    await expect(가르기(이음, 부품, 'api', 'DELETE', 'https://x.com/api/cart')).resolves.toMatchObject({ kind: 'fulfill' });
  });

  it('앞 응답 돌려주기는 적어 둔 응답을 준다', async () => {
    const { 이음, 부품 } = 판([돌려주기]);
    적기(이음, 1, 'GET', 'https://x.com/api/posts', async () => json({ data: [1, 2] }));

    await expect(가르기(이음, 부품, 'browser', 'GET', 'https://x.com/api/posts')).resolves.toEqual({
      kind: 'fulfill', 응답: json({ data: [1, 2] }),
    });
    expect([...부품.걸림]).toEqual([0]);
  });

  it('돌려줄 응답이 없으면 fail 이고 부품 오류에 사유가 남는다', async () => {
    const { 이음, 부품 } = 판([돌려주기]);

    await expect(가르기(이음, 부품, 'browser', 'GET', 'https://x.com/api/posts')).resolves.toEqual({
      kind: 'fail', message: '1번 부품에 맞는 응답이 없다',
    });
    expect(부품.오류).toBe('1번 부품에 맞는 응답이 없다');
  });

  it('적어 둔 자리가 못 읽은 사유면 그 사유로 fail', async () => {
    const { 이음, 부품 } = 판([돌려주기]);
    적기(이음, 1, 'GET', 'https://x.com/api/posts', async () => {
      throw new Error('끊김');
    });

    await expect(가르기(이음, 부품, 'api', 'GET', 'https://x.com/api/posts')).resolves.toEqual({
      kind: 'fail', message: '1번 부품 응답 본문을 못 읽었다',
    });
  });

  it('바꿔 보내기는 baseUrl 끝 / 를 떼고 path 의 {} 를 값으로 바꿔 고치기 요청으로 보낸다 — 값은 주소 글자로 감싼다', async () => {
    const { 이음, 부품 } = 판([바꿔보내기]);
    적기(이음, 1, 'POST', 'https://x.com/api/posts', async () => json({ data: { id: '8/12' } }));

    await expect(가르기(이음, 부품, 'browser', 'POST', 'https://x.com/api/posts')).resolves.toEqual({
      kind: 'send', method: 'PUT', url: 'https://x.com/shop/api/posts/8%2F12',
    });
    expect([...부품.걸림]).toEqual([0]);
  });

  it('바꿔 보내기에 쓸 값이 응답에 없으면 fail', async () => {
    const { 이음, 부품 } = 판([바꿔보내기]);
    적기(이음, 1, 'POST', 'https://x.com/api/posts', async () => json({ data: {} }));

    await expect(가르기(이음, 부품, 'browser', 'POST', 'https://x.com/api/posts')).resolves.toEqual({
      kind: 'fail', message: '1번 부품 응답에 data.id 가 없다',
    });
  });

  it('바꿔 보내기에 쓸 응답이 없으면 fail', async () => {
    const { 이음, 부품 } = 판([바꿔보내기]);

    await expect(가르기(이음, 부품, 'browser', 'POST', 'https://x.com/api/posts')).resolves.toEqual({
      kind: 'fail', message: '1번 부품에 맞는 응답이 없다',
    });
  });

  it('부품 오류는 처음 것만 남는다', async () => {
    const { 이음, 부품 } = 판([돌려주기, 바꿔보내기]);
    적기(이음, 1, 'POST', 'https://x.com/api/posts', async () => json({ data: {} }));

    await 가르기(이음, 부품, 'browser', 'GET', 'https://x.com/api/posts');
    await 가르기(이음, 부품, 'browser', 'POST', 'https://x.com/api/posts');

    expect(부품.오류).toBe('1번 부품에 맞는 응답이 없다');
  });

  it('첫 판정이 선 뒤에는 셋 다 안 건다', async () => {
    const { 이음, 부품 } = 판([돌려주기, 막기, 바꿔보내기], { judged: true });
    적기(이음, 1, 'GET', 'https://x.com/api/posts', async () => json({}));

    await expect(가르기(이음, 부품, 'browser', 'GET', 'https://x.com/api/posts')).resolves.toEqual({ kind: 'send' });
    await expect(가르기(이음, 부품, 'browser', 'DELETE', 'https://x.com/api/cart')).resolves.toEqual({ kind: 'send' });
    await expect(가르기(이음, 부품, 'browser', 'POST', 'https://x.com/api/posts')).resolves.toEqual({ kind: 'send' });
    expect(부품.걸림.size).toBe(0);
  });

  it('메서드가 다르면 안 건다', async () => {
    const { 이음, 부품 } = 판([막기]);

    await expect(가르기(이음, 부품, 'browser', 'GET', 'https://x.com/api/cart')).resolves.toEqual({ kind: 'send' });
    expect(부품.걸림.size).toBe(0);
  });
});

describe('가르기 — 뒷정리 미루기', () => {
  it('API 쪽 · 첫 절차 뒤 · 절차 밖 DELETE 는 미룬다', async () => {
    const { 이음, 부품 } = 판([]);

    await expect(가르기(이음, 부품, 'api', 'DELETE', 'https://x.com/api/posts/1')).resolves.toEqual({ kind: 'defer' });
  });

  it('브라우저 쪽 DELETE 는 안 미룬다', async () => {
    const { 이음, 부품 } = 판([]);

    await expect(가르기(이음, 부품, 'browser', 'DELETE', 'https://x.com/api/posts/1')).resolves.toEqual({ kind: 'send' });
  });

  it('절차 안 · 첫 절차 전 · 얼린 뒤 · 부품 밖이면 안 미룬다', async () => {
    const 절차안 = 판([], { inStep: 1 });
    const 첫절차전 = 판([], { started: false });
    const 얼림 = 판([]);
    얼림.이음.얼림 = true;

    await expect(가르기(절차안.이음, 절차안.부품, 'api', 'DELETE', 'https://x.com/api/posts/1')).resolves.toEqual({ kind: 'send' });
    await expect(가르기(첫절차전.이음, 첫절차전.부품, 'api', 'DELETE', 'https://x.com/api/posts/1')).resolves.toEqual({ kind: 'send' });
    await expect(가르기(얼림.이음, 얼림.부품, 'api', 'DELETE', 'https://x.com/api/posts/1')).resolves.toEqual({ kind: 'send' });
    await expect(가르기(판([]).이음, undefined, 'api', 'DELETE', 'https://x.com/api/posts/1')).resolves.toEqual({ kind: 'send' });
  });

  it('미룰 DELETE 가 모킹 무늬에도 맞으면 미룬다 — 미룸이 모킹보다 먼저다', async () => {
    const { 이음, 부품 } = 판([]);
    이음.모킹.set('**/api/posts/*', json({ 모킹: true }));

    await expect(가르기(이음, 부품, 'api', 'DELETE', 'https://x.com/api/posts/1')).resolves.toEqual({ kind: 'defer' });
  });

  it('DELETE 가 아니면 안 미룬다', async () => {
    const { 이음, 부품 } = 판([]);

    await expect(가르기(이음, 부품, 'api', 'POST', 'https://x.com/api/posts')).resolves.toEqual({ kind: 'send' });
  });
});

describe('가르기 — API 쪽 모킹', () => {
  it('API 쪽은 모킹 무늬에 맞으면 그 응답을 준다 — 부품 밖(API 부품 동안)도', async () => {
    const { 이음, 부품 } = 판([]);
    이음.모킹.set('**/api/banner', json({ ad: 1 }));

    await expect(가르기(이음, 부품, 'api', 'GET', 'https://x.com/api/banner')).resolves.toEqual({
      kind: 'fulfill', 응답: json({ ad: 1 }),
    });
    await expect(가르기(이음, undefined, 'api', 'GET', 'https://x.com/api/banner')).resolves.toEqual({
      kind: 'fulfill', 응답: json({ ad: 1 }),
    });
    await expect(가르기(이음, undefined, 'api', 'GET', 'https://x.com/api/posts')).resolves.toEqual({ kind: 'send' });
  });

  it('브라우저 쪽은 모킹을 안 본다 — 브라우저 모킹은 route 가 건다', async () => {
    const { 이음, 부품 } = 판([]);
    이음.모킹.set('**/api/banner', json({ ad: 1 }));

    await expect(가르기(이음, 부품, 'browser', 'GET', 'https://x.com/api/banner')).resolves.toEqual({ kind: 'send' });
  });

  it('준비 구간의 이어 주기가 모킹보다 먼저다 — 판정 뒤에는 모킹이 받는다', async () => {
    const 준비 = 판([막기]);
    준비.이음.모킹.set('**/api/cart', json({ 모킹: true }));
    const 판정뒤 = 판([막기], { judged: true, inStep: 1 });
    판정뒤.이음.모킹.set('**/api/cart', json({ 모킹: true }));

    await expect(가르기(준비.이음, 준비.부품, 'api', 'DELETE', 'https://x.com/api/cart')).resolves.toEqual({
      kind: 'fulfill', 응답: { status: 200, contentType: 'application/json', body: '{}' },
    });
    await expect(가르기(판정뒤.이음, 판정뒤.부품, 'api', 'DELETE', 'https://x.com/api/cart')).resolves.toEqual({
      kind: 'fulfill', 응답: json({ 모킹: true }),
    });
  });

  it('여럿이 맞으면 나중에 건 모킹이 이긴다 — 브라우저 route 와 같다', async () => {
    const { 이음, 부품 } = 판([]);
    이음.모킹.set('**/api/*', json({ 먼저: true }));
    이음.모킹.set('**/api/banner', json({ 나중: true }));

    await expect(가르기(이음, 부품, 'api', 'GET', 'https://x.com/api/banner')).resolves.toEqual({
      kind: 'fulfill', 응답: json({ 나중: true }),
    });
  });
});

describe('가르기 — 검사 반영 (2026-10-06 게이트 2)', () => {
  it('브라우저 쪽은 route 가 이미 맞춘 무늬를 글자로 받는다 — 손으로 옮긴 무늬 맞추기가 상대 무늬에서 갈라도 막는다', async () => {
    const 상대막기: ScenarioLink = { kind: 'block', method: 'DELETE', urlPattern: 'api/cart' };
    const { 이음, 부품 } = 판([상대막기]);

    await expect(가르기(이음, 부품, 'browser', 'DELETE', 'https://x.com/shop/api/cart', 'api/cart')).resolves.toEqual({
      kind: 'fulfill', 응답: { status: 200, contentType: 'application/json', body: '{}' },
    });
    expect(부품.걸림).toEqual(new Set([0]));
  });

  it('바꿔 보내기 값이 「.」 · 「..」 이면 주소가 상위로 풀려서 fail', async () => {
    const { 이음, 부품 } = 판([바꿔보내기]);
    이음.응답.set('1 POST **/api/posts', Promise.resolve(json({ data: { id: '..' } })));

    await expect(가르기(이음, 부품, 'api', 'POST', 'https://x.com/api/posts')).resolves.toEqual({
      kind: 'fail', message: '1번 부품 응답의 data.id 값 「..」 은 주소에 넣을 수 없다',
    });
  });

  it('API 쪽 가짜 응답(막기 · 모킹)도 적는다 — 브라우저 쪽은 fulfill 한 응답도 response 로 적히므로 같게', async () => {
    const 뒤가씀: ScenarioLink = { kind: 'bind', param: 'x', value: { fromSeq: 2, method: 'DELETE', urlPattern: '**/api/cart', jsonPath: 'a' } };
    const 배너: ScenarioLink = { kind: 'bind', param: 'y', value: { fromSeq: 2, method: 'GET', urlPattern: '**/api/banner', jsonPath: 'ad' } };
    const 이음 = 새이음([케이스('A-001'), 케이스('A-002', [막기]), 케이스('A-003', [뒤가씀, 배너])], BASE);
    const 부품 = 새부품(2, [막기]);
    이음.모킹.set('**/api/banner', json({ ad: 1 }));

    await 가르기(이음, 부품, 'api', 'DELETE', 'https://x.com/api/cart');
    await 가르기(이음, 부품, 'api', 'GET', 'https://x.com/api/banner');

    await expect(이음.응답.get('2 DELETE **/api/cart')).resolves.toEqual({ status: 200, contentType: 'application/json', body: '{}' });
    await expect(이음.응답.get('2 GET **/api/banner')).resolves.toEqual(json({ ad: 1 }));
  });
});
