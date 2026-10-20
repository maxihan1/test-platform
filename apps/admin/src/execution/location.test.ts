// 앱 실행을 받을지 판정 · 정기 실행의 앱 케이스 빼기 · 요청 본문 스키마 검사 (DB 없이 돈다)

import { describe, expect, it } from 'vitest';

import { DEFAULT_TIMEOUT_MS, runBody, 선언밖디바이스, 앱케이스를뺀다, 팜을본다 } from './location.js';

const 안드로이드 = [{ platforms: ['android'] }];
const 팜있음 = { DEVICE_FARM_URL: 'http://127.0.0.1:4723/wd/hub' };

describe('팜을본다', () => {
  it('android 항목이 있는데 DEVICE_FARM_URL 이 비면 409 FARM_OFF 이고 사유는 값 이름만이다', () => {
    expect(팜을본다(안드로이드, {})).toEqual({ status: 409, error: 'FARM_OFF', detail: 'DEVICE_FARM_URL 이 비어 있다' });
    expect(팜을본다(안드로이드, { DEVICE_FARM_URL: '' })).toMatchObject({ error: 'FARM_OFF' });
  });

  it('팜 주소가 있으면 통과다', () => {
    expect(팜을본다(안드로이드, 팜있음)).toBeNull();
  });

  it('여러 항목 중 하나라도 android 면 판정한다', () => {
    expect(팜을본다([{ platforms: ['desktop'] }, { platforms: ['desktop', 'android'] }], {})).toMatchObject({ error: 'FARM_OFF' });
  });

  it('브라우저 항목만 있으면 팜을 보지 않는다', () => {
    expect(팜을본다([{ platforms: ['desktop', 'mobile'] }], {})).toBeNull();
  });
});

describe('앱케이스를뺀다', () => {
  const 웹 = { tcId: 'A-1', platforms: ['desktop'] as const };
  const 앱 = { tcId: 'A-2', platforms: ['android'] as const };
  const 둘다 = { tcId: 'A-3', platforms: ['desktop', 'android'] as const };

  it('팜이 없으면 android 를 선언한 케이스를 빼고 남은 것은 원래 차례 그대로 둔다', () => {
    const r = 앱케이스를뺀다([웹, 앱, 둘다, { ...웹, tcId: 'A-4' }], {});
    expect(r.남은.map((c) => c.tcId)).toEqual(['A-1', 'A-4']);
    expect(r.뺀수).toBe(2);
  });

  it('팜이 없고 전부 android 면 남은 것이 비고 뺀 수가 전체다', () => {
    expect(앱케이스를뺀다([앱, 둘다], {})).toEqual({ 남은: [], 뺀수: 2 });
  });

  it('팜이 있으면 앱 케이스도 그대로 담는다', () => {
    expect(앱케이스를뺀다([웹, 앱, 둘다], 팜있음)).toEqual({ 남은: [웹, 앱, 둘다], 뺀수: 0 });
  });
});

describe('선언밖디바이스', () => {
  const 선언 = new Map([
    ['A-1', { platforms: ['android'] }],
    ['W-1', { platforms: ['desktop'] }],
    ['W-2', { platforms: ['desktop', 'mobile'] }],
  ]);

  it('앱 케이스(선언 android)를 desktop 으로 보내면 그 항목과 desktop 을 돌려준다', () => {
    expect(선언밖디바이스([{ tcId: 'A-1', platforms: ['desktop'] }], 선언)).toEqual({ tcId: 'A-1', platform: 'desktop' });
  });

  it('웹 케이스(선언 desktop)를 desktop · mobile 로 보내면 처음 벗어난 mobile 을 돌려준다', () => {
    expect(선언밖디바이스([{ tcId: 'W-1', platforms: ['desktop', 'mobile'] }], 선언)).toEqual({
      tcId: 'W-1',
      platform: 'mobile',
    });
  });

  it('여러 항목이 전부 선언 안이면 null 이다', () => {
    const items = [
      { tcId: 'W-2', platforms: ['desktop', 'mobile'] },
      { tcId: 'A-1', platforms: ['android'] },
      { tcId: 'W-1', platforms: ['desktop'] },
    ];
    expect(선언밖디바이스(items, 선언)).toBeNull();
  });

  it('선언 표에 없는 tcId 는 건너뛴다 — 그 거절은 CASE_NOT_FOUND 몫이다', () => {
    expect(선언밖디바이스([{ tcId: 'Z-9', platforms: ['android'] }], 선언)).toBeNull();
  });
});

describe('runBody', () => {
  const 기본 = { title: 't', env: 'qa', items: [{ tcId: 'X-1', platforms: ['android'] }] };

  it('platforms 에 android 를 받는다', () => {
    expect(runBody.safeParse(기본).success).toBe(true);
  });

  it('옛 화면이 실은 location 은 거절하지 않고 버린다', () => {
    const 옛것 = runBody.safeParse({ ...기본, location: 'local' });
    expect(옛것.success && 'location' in 옛것.data).toBe(false);
  });

  it('항목 timeoutMs 는 300000 까지 받고 넘으면 거절한다 — 없으면 통과다', () => {
    const 시간 = (timeoutMs: number) => ({ ...기본, items: [{ ...기본.items[0], timeoutMs }] });
    expect(runBody.safeParse(시간(300001)).success).toBe(false);
    expect(runBody.safeParse(시간(300000)).success).toBe(true);
    expect(runBody.safeParse(기본).success).toBe(true);
  });

  it('기본 timeoutMs 가 곧 상한이다 — 300000 하나', () => {
    expect(DEFAULT_TIMEOUT_MS).toBe(300000);
  });
});
