// 디바이스 팜에서 빈 폰을 잡아 일을 맡기고 놓는지 본다. 팜 대신 받은 요청을 적는 가짜 fetch 를 쓴다 (러너 §5.2 「디바이스 팜 접속 방식」)

import { describe, expect, it, vi } from 'vitest';

import { 잡기를늘린다, 팜머리, 팜주소, 팜폰으로 } from './farm.js';

const 팜 = 'http://farm.test/wd/hub';

type 답 = { status: number; body: unknown };

// 목록은 차례로 하나씩 꺼내고 마지막 것을 되풀이한다. 잡기가 'throw' 면 닿지 못한 것처럼 던진다
function 가짜팜(답들: { 목록?: 답[]; 잡기?: 답 | 'throw'; 놓기?: 답 }) {
  const 받음: string[] = [];
  const 목록들 = [...(답들.목록 ?? [{ status: 200, body: { value: { devices: [] } } }])];
  const 부르기 = (async (주소: string | URL | Request, 설정?: RequestInit) => {
    const 경로 = String(주소).replace(팜, '');
    const 방법 = 설정?.method ?? 'GET';
    받음.push(`${방법} ${경로}${설정?.body ? ` ${String(설정.body)}` : ''}`);
    if (방법 === 'POST' && 답들.잡기 === 'throw') throw new Error('The operation was aborted due to timeout');
    const 고른 =
      방법 === 'GET' ? (목록들.length > 1 ? 목록들.shift()! : 목록들[0]!)
      : 방법 === 'POST' ? ((답들.잡기 as 답 | undefined) ?? { status: 200, body: { held: {} } })
      : (답들.놓기 ?? { status: 200, body: { released: true } });
    return new Response(typeof 고른.body === 'string' ? 고른.body : JSON.stringify(고른.body), { status: 고른.status });
  }) as typeof fetch;
  return { 받음, 부르기 };
}

const 안쉼 = async () => {};

const 빈폰하나 = { status: 200, body: { value: { devices: [{ serial: 'R3CR10TCVCD', state: 'IDLE', detail: 'ready' }] } } };
const 정리중 = { status: 200, body: { value: { devices: [{ serial: 'R3CR10TCVCD', state: 'OCCUPIED', detail: 'cleaning' }] } } };
const 남이씀 = { status: 200, body: { value: { devices: [{ serial: 'R3CR10TCVCD', state: 'OCCUPIED', detail: 'manual' }] } } };

describe('팜폰으로', () => {
  it('빈 폰을 30분 잡고 그 번호로 일을 맡긴 뒤 놓는다', async () => {
    const { 받음, 부르기 } = 가짜팜({ 목록: [빈폰하나] });

    const 결과 = await 팜폰으로(팜, async (udid) => `돌림 ${udid}`, (까닭) => 까닭, 부르기, 안쉼);

    expect(결과).toBe('돌림 R3CR10TCVCD');
    expect(받음).toEqual([
      'GET /api/devices',
      'POST /api/devices/R3CR10TCVCD/hold {"minutes":30}',
      'DELETE /api/devices/R3CR10TCVCD/hold',
    ]);
  });

  it('잡는 분을 넘기면 그 값으로 잡는다 — 게임 실행은 120분', async () => {
    const { 받음, 부르기 } = 가짜팜({ 목록: [빈폰하나] });

    await 팜폰으로(팜, async () => '돌림', (까닭) => 까닭, 부르기, 안쉼, 120);

    expect(받음[1]).toBe('POST /api/devices/R3CR10TCVCD/hold {"minutes":120}');
  });

  it('일이 던져도 폰을 놓는다', async () => {
    const { 받음, 부르기 } = 가짜팜({ 목록: [빈폰하나] });

    await expect(
      팜폰으로(팜, async () => { throw new Error('러너 고장'); }, (까닭) => 까닭, 부르기, 안쉼),
    ).rejects.toThrow('러너 고장');
    expect(받음.at(-1)).toBe('DELETE /api/devices/R3CR10TCVCD/hold');
  });

  it('빈 폰이 없으면 잡지도 놓지도 않고 까닭을 넘긴다 — 사람이 잡은 폰은 기다리지 않는다', async () => {
    const { 받음, 부르기 } = 가짜팜({ 목록: [남이씀] });

    expect(await 팜폰으로(팜, async () => '돌림', (까닭) => 까닭, 부르기, 안쉼)).toBe('Device VISION 에 빈 폰이 없습니다');
    expect(받음).toEqual(['GET /api/devices']);
  });

  it('앞 항목이 막 놓아 정리 중인 폰은 빈 폰이 될 때까지 다시 본다', async () => {
    const { 받음, 부르기 } = 가짜팜({ 목록: [정리중, 정리중, 빈폰하나] });

    expect(await 팜폰으로(팜, async (udid) => `돌림 ${udid}`, (까닭) => 까닭, 부르기, 안쉼)).toBe('돌림 R3CR10TCVCD');
    expect(받음.filter((줄) => 줄.startsWith('GET'))).toHaveLength(3);
  });

  it('잡기 답이 늦어 끊기면 팜이 잡았을 수 있어 놓기를 보낸다', async () => {
    const { 받음, 부르기 } = 가짜팜({ 목록: [빈폰하나], 잡기: 'throw' });

    expect(await 팜폰으로(팜, async () => '돌림', (까닭) => 까닭, 부르기, 안쉼)).toBe(
      'Device VISION 에 닿지 못했습니다: The operation was aborted due to timeout',
    );
    expect(받음.at(-1)).toBe('DELETE /api/devices/R3CR10TCVCD/hold');
  });

  it('목록이 JSON 이 아니면 주소를 보라고 한다 — 닿지 못했다고 하지 않는다', async () => {
    const { 부르기 } = 가짜팜({ 목록: [{ status: 200, body: '<html>다른 곳</html>' }] });

    expect(await 팜폰으로(팜, async () => '돌림', (까닭) => 까닭, 부르기, 안쉼)).toBe(
      'Device VISION 의 기기 목록을 읽지 못했습니다 — DEVICE_FARM_URL 을 확인하세요',
    );
  });

  it('잡기가 거절되면 팜의 거절 문장을 까닭에 싣고 놓지 않는다', async () => {
    const { 받음, 부르기 } = 가짜팜({ 목록: [빈폰하나], 잡기: { status: 409, body: { refused: '다른 사용자(maxi)가 쓰는 중' } } });

    expect(await 팜폰으로(팜, async () => '돌림', (까닭) => 까닭, 부르기, 안쉼)).toBe(
      'Device VISION 이 폰을 내주지 않았습니다: 다른 사용자(maxi)가 쓰는 중',
    );
    expect(받음.some((줄) => 줄.startsWith('DELETE'))).toBe(false);
  });

  it('팜에 닿지 못하면 던지지 않고 까닭을 넘긴다', async () => {
    const 부르기 = (async () => { throw new Error('connect ECONNREFUSED'); }) as typeof fetch;

    expect(await 팜폰으로(팜, async () => '돌림', (까닭) => 까닭, 부르기, 안쉼)).toBe('Device VISION 에 닿지 못했습니다: connect ECONNREFUSED');
  });

  it('놓기가 실패해도 일의 결과를 그대로 돌려준다', async () => {
    const { 부르기 } = 가짜팜({ 목록: [빈폰하나], 놓기: { status: 409, body: { refused: '잡은 폰이 아니다' } } });

    expect(await 팜폰으로(팜, async () => '돌림', (까닭) => 까닭, 부르기, 안쉼)).toBe('돌림');
  });
});

describe('잡기를늘린다', () => {
  it('늘리기 주소를 POST 로 부른다', async () => {
    const { 받음, 부르기 } = 가짜팜({});

    await 잡기를늘린다(팜, 'R3CR10TCVCD', 부르기);

    expect(받음).toEqual(['POST /api/devices/R3CR10TCVCD/hold/extend']);
  });

  it('끝나기 10분 전이 아니라 409 로 거절되는 것은 정상이라 조용히 넘긴다', async () => {
    const 소리 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { 부르기 } = 가짜팜({ 잡기: { status: 409, body: { refused: '아직 늘릴 수 없습니다' } } });

    await expect(잡기를늘린다(팜, 'R3CR10TCVCD', 부르기)).resolves.toBeUndefined();

    expect(소리).not.toHaveBeenCalled();
    소리.mockRestore();
  });

  it('그 밖의 실패는 던지지 않고 알린다', async () => {
    const 소리 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { 부르기 } = 가짜팜({ 잡기: 'throw' });

    await expect(잡기를늘린다(팜, 'R3CR10TCVCD', 부르기)).resolves.toBeUndefined();
    const { 부르기: 오류 } = 가짜팜({ 잡기: { status: 500, body: {} } });
    await 잡기를늘린다(팜, 'R3CR10TCVCD', 오류);

    expect(소리).toHaveBeenCalledTimes(2);
    소리.mockRestore();
  });
});

describe('팜머리', () => {
  it('DEVICE_FARM_TOKEN 이 있으면 Bearer 머리고 비면 빈 머리다', () => {
    expect(팜머리({ DEVICE_FARM_TOKEN: 'pat_abc' })).toEqual({ authorization: 'Bearer pat_abc' });
    expect(팜머리({ DEVICE_FARM_TOKEN: '' })).toEqual({});
    expect(팜머리({})).toEqual({});
  });

  it('토큰이 있으면 목록 · 잡기 · 놓기 · 늘리기 모두 싣는다', async () => {
    const 머리들: (string | null)[] = [];
    const 부르기 = (async (주소: string | URL | Request, 설정?: RequestInit) => {
      머리들.push(new Headers(설정?.headers).get('authorization'));
      return String(주소).endsWith('/api/devices')
        ? new Response(JSON.stringify(빈폰하나.body), { status: 200 })
        : new Response(JSON.stringify({ held: {} }), { status: 200 });
    }) as typeof fetch;
    vi.stubEnv('DEVICE_FARM_TOKEN', 'pat_abc');
    try {
      await 팜폰으로(팜, async (udid) => 잡기를늘린다(팜, udid, 부르기), (까닭) => 까닭, 부르기, 안쉼);
    } finally {
      vi.unstubAllEnvs();
    }
    expect(머리들).toEqual(['Bearer pat_abc', 'Bearer pat_abc', 'Bearer pat_abc', 'Bearer pat_abc']);
  });

  it('기기 목록이 401 이면 토큰을 보라고 말한다', async () => {
    const { 부르기 } = 가짜팜({ 목록: [{ status: 401, body: {} }] });

    expect(await 팜폰으로(팜, async () => '돌림', (까닭) => 까닭, 부르기, 안쉼)).toBe(
      'Device VISION 이 기기 목록을 주지 않았습니다 (HTTP 401) — DEVICE_FARM_TOKEN 을 확인하세요',
    );
  });
});

describe('팜주소', () => {
  it('비면 없음이고 끝의 / 는 뗀다', () => {
    expect(팜주소({})).toBeUndefined();
    expect(팜주소({ DEVICE_FARM_URL: '' })).toBeUndefined();
    expect(팜주소({ DEVICE_FARM_URL: 'http://127.0.0.1:4723/wd/hub/' })).toBe('http://127.0.0.1:4723/wd/hub');
  });
});
