// 디바이스 팜에서 빈 폰을 잡아 일을 맡기고 놓는지 본다. 팜 대신 받은 요청을 적는 가짜 fetch 를 쓴다 (러너 §5.2 「디바이스 팜 접속 방식」)

import { describe, expect, it } from 'vitest';

import { 팜주소, 팜폰으로 } from './farm.js';

const 팜 = 'http://farm.test/wd/hub';

type 답 = { status: number; body: unknown };

function 가짜팜(답들: { 목록?: 답; 잡기?: 답; 놓기?: 답 }) {
  const 받음: string[] = [];
  const 부르기 = (async (주소: string | URL | Request, 설정?: RequestInit) => {
    const 경로 = String(주소).replace(팜, '');
    const 방법 = 설정?.method ?? 'GET';
    받음.push(`${방법} ${경로}${설정?.body ? ` ${String(설정.body)}` : ''}`);
    const 고른 =
      방법 === 'GET' ? (답들.목록 ?? { status: 200, body: { value: { devices: [] } } })
      : 방법 === 'POST' ? (답들.잡기 ?? { status: 200, body: { held: {} } })
      : (답들.놓기 ?? { status: 200, body: { released: true } });
    return new Response(JSON.stringify(고른.body), { status: 고른.status });
  }) as typeof fetch;
  return { 받음, 부르기 };
}

const 빈폰하나 = { status: 200, body: { value: { devices: [{ serial: 'R3CR10TCVCD', state: 'IDLE' }] } } };

describe('팜폰으로', () => {
  it('빈 폰을 30분 잡고 그 번호로 일을 맡긴 뒤 놓는다', async () => {
    const { 받음, 부르기 } = 가짜팜({ 목록: 빈폰하나 });

    const 결과 = await 팜폰으로(팜, async (udid) => `돌림 ${udid}`, (까닭) => 까닭, 부르기);

    expect(결과).toBe('돌림 R3CR10TCVCD');
    expect(받음).toEqual([
      'GET /api/devices?status=idle',
      'POST /api/devices/R3CR10TCVCD/hold {"minutes":30}',
      'DELETE /api/devices/R3CR10TCVCD/hold',
    ]);
  });

  it('일이 던져도 폰을 놓는다', async () => {
    const { 받음, 부르기 } = 가짜팜({ 목록: 빈폰하나 });

    await expect(
      팜폰으로(팜, async () => { throw new Error('러너 고장'); }, (까닭) => 까닭, 부르기),
    ).rejects.toThrow('러너 고장');
    expect(받음.at(-1)).toBe('DELETE /api/devices/R3CR10TCVCD/hold');
  });

  it('빈 폰이 없으면 잡지도 놓지도 않고 까닭을 넘긴다', async () => {
    const { 받음, 부르기 } = 가짜팜({});

    expect(await 팜폰으로(팜, async () => '돌림', (까닭) => 까닭, 부르기)).toBe('디바이스 팜에 빈 폰이 없습니다');
    expect(받음).toEqual(['GET /api/devices?status=idle']);
  });

  it('잡기가 거절되면 팜의 거절 문장을 까닭에 싣고 놓지 않는다', async () => {
    const { 받음, 부르기 } = 가짜팜({ 목록: 빈폰하나, 잡기: { status: 409, body: { refused: '다른 사용자(maxi)가 쓰는 중' } } });

    expect(await 팜폰으로(팜, async () => '돌림', (까닭) => 까닭, 부르기)).toBe(
      '디바이스 팜이 폰을 내주지 않았습니다: 다른 사용자(maxi)가 쓰는 중',
    );
    expect(받음.some((줄) => 줄.startsWith('DELETE'))).toBe(false);
  });

  it('팜에 닿지 못하면 던지지 않고 까닭을 넘긴다', async () => {
    const 부르기 = (async () => { throw new Error('connect ECONNREFUSED'); }) as typeof fetch;

    expect(await 팜폰으로(팜, async () => '돌림', (까닭) => 까닭, 부르기)).toBe('디바이스 팜에 닿지 못했습니다: connect ECONNREFUSED');
  });

  it('놓기가 실패해도 일의 결과를 그대로 돌려준다', async () => {
    const { 부르기 } = 가짜팜({ 목록: 빈폰하나, 놓기: { status: 409, body: { refused: '잡은 폰이 아니다' } } });

    expect(await 팜폰으로(팜, async () => '돌림', (까닭) => 까닭, 부르기)).toBe('돌림');
  });
});

describe('팜주소', () => {
  it('비면 없음이고 끝의 / 는 뗀다', () => {
    expect(팜주소({})).toBeUndefined();
    expect(팜주소({ DEVICE_FARM_URL: '' })).toBeUndefined();
    expect(팜주소({ DEVICE_FARM_URL: 'http://127.0.0.1:4723/wd/hub/' })).toBe('http://127.0.0.1:4723/wd/hub');
  });
});
