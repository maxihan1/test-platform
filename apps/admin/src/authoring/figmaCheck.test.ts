// 피그마 파일 미리 열어 보기 판정 — 확실한 거절만 막고 모르는 것은 통과시키는지 본다 (SPEC 도메인/작성 §7 「자료」)

import { afterEach, describe, expect, it, vi } from 'vitest';

import { 피그마막힘판정 } from './figmaCheck.js';

const 하나 = 'https://www.figma.com/design/AbC123/?node-id=1-2';
const 둘 = 'https://www.figma.com/design/XyZ789/';

function 답(상태: number, 본문: unknown = {}) {
  return new Response(JSON.stringify(본문), { status: 상태, headers: { 'content-type': 'application/json' } });
}

function 피그마가(...응답: (Response | Error)[]) {
  const 가짜 = vi.fn(async () => {
    const 다음 = 응답.shift() ?? 답(200);
    if (다음 instanceof Error) throw 다음;
    return 다음;
  });
  vi.stubGlobal('fetch', 가짜);
  return 가짜;
}

afterEach(() => vi.unstubAllGlobals());

describe('피그마막힘판정', () => {
  it('주소가 없으면 열어 보지 않는다 — 토큰이 없어도 막지 않는다', async () => {
    const 가짜 = 피그마가();
    expect(await 피그마막힘판정([], null)).toBeNull();
    expect(가짜).not.toHaveBeenCalled();
  });

  it('토큰이 없는데 주소가 있으면 열어 보기 전에 NO_TOKEN', async () => {
    const 가짜 = 피그마가();
    expect(await 피그마막힘판정([하나], null)).toBe('NO_TOKEN');
    expect(가짜).not.toHaveBeenCalled();
  });

  it('열리면 통과 — 파일 키와 토큰을 api.figma.com 으로만 보낸다', async () => {
    const 가짜 = 피그마가(답(200, { name: '화면' }));
    expect(await 피그마막힘판정([하나], 'figd_ok')).toBeNull();
    const [주소, 옵션] = 가짜.mock.calls[0] as unknown as [string, RequestInit];
    expect(주소).toBe('https://api.figma.com/v1/files/AbC123?depth=1');
    expect((옵션.headers as Record<string, string>)['X-Figma-Token']).toBe('figd_ok');
    expect(옵션.redirect).toBe('error');
  });

  it('403 「Invalid token」은 TOKEN — 틀렸거나 만료된 토큰', async () => {
    피그마가(답(403, { status: 403, err: 'Invalid token' }));
    expect(await 피그마막힘판정([하나], 'figd_bad')).toBe('TOKEN');
  });

  it('401 도 TOKEN', async () => {
    피그마가(답(401));
    expect(await 피그마막힘판정([하나], 'figd_bad')).toBe('TOKEN');
  });

  it('토큰은 맞는데 403(Forbidden)이면 FILE — 그 파일 권한 없음', async () => {
    피그마가(답(403, { status: 403, err: 'Forbidden' }));
    expect(await 피그마막힘판정([하나], 'figd_ok')).toBe(`FILE:${하나}`);
  });

  it('403 본문을 못 읽어도 던지지 않고 FILE 로 본다', async () => {
    피그마가(new Response('<html>', { status: 403 }));
    expect(await 피그마막힘판정([하나], 'figd_ok')).toBe(`FILE:${하나}`);
  });

  it('404 는 FILE — 파일이 없거나 볼 수 없다', async () => {
    피그마가(답(404, { status: 404, err: 'Not found' }));
    expect(await 피그마막힘판정([하나], 'figd_ok')).toBe(`FILE:${하나}`);
  });

  it.each([429, 500, 502, 503])('%i 는 모르는 것이라 막지 않는다', async (상태) => {
    피그마가(답(상태));
    expect(await 피그마막힘판정([하나], 'figd_ok')).toBeNull();
  });

  it('시간 초과 · 연결 실패도 막지 않는다 — 작성은 다른 기계가 하고 거기서는 닿을 수 있다', async () => {
    피그마가(new Error('fetch failed'));
    expect(await 피그마막힘판정([하나], 'figd_ok')).toBeNull();
  });

  it('같은 파일의 노드 주소가 여럿이어도 한 번만 연다', async () => {
    const 가짜 = 피그마가();
    await 피그마막힘판정([하나, 'https://www.figma.com/design/AbC123/?node-id=3-4', 둘], 'figd_ok');
    expect(가짜).toHaveBeenCalledTimes(2);
  });

  it('여러 파일 중 막힌 것의 주소를 알린다', async () => {
    피그마가(답(200), 답(404));
    expect(await 피그마막힘판정([하나, 둘], 'figd_ok')).toBe(`FILE:${둘}`);
  });
});
