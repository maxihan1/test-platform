import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './api.js';
import { scenarioApi } from './scenarioApi.js';

function 막는다(status = 200, 본문: unknown = { ok: true }) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(본문), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function 보낸것(fetchMock: ReturnType<typeof 막는다>) {
  const [주소, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit | undefined];
  return { 주소, 메서드: init?.method ?? 'GET', 본문: init?.body === undefined ? undefined : JSON.parse(String(init.body)) };
}

const 부품 = [{ kind: 'case' as const, tcId: 'PAY-FN-001', params: {}, expected: {}, skipSteps: [] }];

describe('시나리오 서버 호출 모음', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('목록은 서비스를 싣고 uses 가 있을 때만 쉼표로 이어 붙인다', async () => {
    const m = 막는다(200, { items: [] });
    await scenarioApi.list('PAY');
    expect(보낸것(m)).toMatchObject({ 주소: '/api/scenarios?service=PAY', 메서드: 'GET' });

    const m2 = 막는다(200, { items: [] });
    await scenarioApi.list('PAY', ['PAY-FN-001', 'PAY-FN-002']);
    expect(보낸것(m2).주소).toBe('/api/scenarios?service=PAY&uses=PAY-FN-001%2CPAY-FN-002');
  });

  it('빈 uses 는 서버가 전부로 읽어 묻지 않고 빈 목록이다', async () => {
    const m = 막는다(200, { items: [{ id: 1 }] });
    expect(await scenarioApi.list('PAY', [])).toEqual({ items: [] });
    expect(m).not.toHaveBeenCalled();
  });

  it('읽는 호출은 응답을 그대로 돌려준다', async () => {
    막는다(200, { id: 12 });
    expect(await scenarioApi.detail(12)).toEqual({ id: 12 });
  });

  it('읽는 호출은 맞는 주소로 간다', async () => {
    const 호출 = [
      [() => scenarioApi.detail(12), '/api/scenarios/12'],
      [() => scenarioApi.version(12, 3), '/api/scenarios/12/versions/3'],
      [() => scenarioApi.caseParts('PAY-FN-001'), '/api/scenarios/case-parts/PAY-FN-001'],
      [() => scenarioApi.caseParts('A/B'), '/api/scenarios/case-parts/A%2FB'],
      [() => scenarioApi.result(77), '/api/runs/77/scenario'],
      [() => scenarioApi.trial('a b'), '/api/scenario-trials/a%20b'],
    ] as const;
    for (const [부르기, 주소] of 호출) {
      const m = 막는다();
      await 부르기();
      expect(보낸것(m), 주소).toMatchObject({ 주소, 메서드: 'GET' });
    }
  });

  it('쓰는 호출은 맞는 메서드와 JSON 본문을 보낸다', async () => {
    const 호출 = [
      [
        () => scenarioApi.create({ service: 'PAY', name: '결제', platform: 'desktop', parts: 부품 }),
        '/api/scenarios',
        'POST',
        { service: 'PAY', name: '결제', platform: 'desktop', parts: 부품 },
      ],
      [
        () => scenarioApi.update(12, { name: '결제', platform: 'desktop', parts: 부품, baseVersion: 3 }),
        '/api/scenarios/12',
        'PUT',
        { name: '결제', platform: 'desktop', parts: 부품, baseVersion: 3 },
      ],
      [() => scenarioApi.restore(12, 2), '/api/scenarios/12/restore', 'POST', { version: 2 }],
      [() => scenarioApi.run(12, 'stage'), '/api/scenarios/12/runs', 'POST', { env: 'stage' }],
      [
        () => scenarioApi.startTrial({ service: 'PAY', env: 'stage', platform: 'desktop', parts: 부품 }),
        '/api/scenario-trials',
        'POST',
        { service: 'PAY', env: 'stage', platform: 'desktop', parts: 부품 },
      ],
    ] as const;
    for (const [부르기, 주소, 메서드, 본문] of 호출) {
      const m = 막는다();
      await 부르기();
      expect(보낸것(m), 주소).toEqual({ 주소, 메서드, 본문 });
    }
  });

  it('사진 주소는 글자만 돌려준다', () => {
    expect(scenarioApi.runShot(77, 5)).toBe('/api/runs/77/scenario/screenshots/5');
    expect(scenarioApi.trialShot('abc', 5)).toBe('/api/scenario-trials/abc/screenshots/5');
  });

  it('E2E 실행 목록은 kind=scenario 를 싣고 거르개는 있을 때만 붙인다', async () => {
    const m = 막는다(200, { items: [] });
    await scenarioApi.runs('PAY', 1);
    expect(보낸것(m).주소).toBe('/api/runs?service=PAY&page=1&kind=scenario');

    const m2 = 막는다(200, { items: [] });
    await scenarioApi.runs('PAY', 2, { q: 'abc', state: 'failed' });
    expect(보낸것(m2).주소).toBe('/api/runs?service=PAY&page=2&kind=scenario&q=abc&state=failed');
  });

  it('서버가 거절하면 ApiError 로 던진다', async () => {
    막는다(409, { error: 'STALE_VERSION', latest: 4 });
    const 오류 = await scenarioApi.update(12, { name: 'a', platform: 'desktop', parts: 부품, baseVersion: 3 }).catch((e: unknown) => e);
    expect(오류).toBeInstanceOf(ApiError);
    expect(오류).toMatchObject({ status: 409, code: 'STALE_VERSION' });
  });
});
