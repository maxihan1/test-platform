// 실행 위치 판정과 요청 본문 스키마 검사 (DB 없이 돈다)

import { describe, expect, it } from 'vitest';

import { DEFAULT_TIMEOUT_MS, runBody, 선언밖디바이스, 실행위치를본다, 앱케이스를뺀다 } from './location.js';

const 안드로이드 = [{ platforms: ['android'] }];
const 주소있음 = { LOCAL_RUNNER_URL: 'http://127.0.0.1:4100' };

describe('실행위치를본다', () => {
  it('android 항목이 있는데 location 이 없으면 400 INVALID_REQUEST 다', () => {
    const r = 실행위치를본다(안드로이드, undefined, 주소있음);
    expect(r).toMatchObject({ status: 400, error: 'INVALID_REQUEST' });
    expect(r?.detail).toBeTruthy();
  });

  it("android + 'farm' 이면 409 FARM_OFF 다", () => {
    expect(실행위치를본다(안드로이드, 'farm', 주소있음)).toMatchObject({ status: 409, error: 'FARM_OFF' });
  });

  it("android + 'local' 인데 LOCAL_RUNNER_URL 이 비면 409 LOCAL_OFF 다", () => {
    expect(실행위치를본다(안드로이드, 'local', {})).toMatchObject({ status: 409, error: 'LOCAL_OFF' });
    expect(실행위치를본다(안드로이드, 'local', { LOCAL_RUNNER_URL: '' })).toMatchObject({
      status: 409,
      error: 'LOCAL_OFF',
    });
  });

  it('409 사유는 화면 문장과 같은 말을 되풀이하지 않는다 — FARM_OFF 는 사유가 없고 LOCAL_OFF 는 값 이름만', () => {
    expect(실행위치를본다(안드로이드, 'farm', 주소있음)?.detail).toBeUndefined();
    expect(실행위치를본다(안드로이드, 'local', {})?.detail).toBe('LOCAL_RUNNER_URL 이 비어 있다');
  });

  it("android + 'local' + 주소가 있으면 통과다", () => {
    expect(실행위치를본다(안드로이드, 'local', 주소있음)).toBeNull();
  });

  it('여러 항목 중 하나라도 android 면 판정한다', () => {
    const r = 실행위치를본다([{ platforms: ['desktop'] }, { platforms: ['desktop', 'android'] }], 'farm', 주소있음);
    expect(r).toMatchObject({ status: 409, error: 'FARM_OFF' });
  });

  it('브라우저 항목만 있으면 location 을 보지 않는다', () => {
    const 브라우저 = [{ platforms: ['desktop', 'mobile'] }];
    expect(실행위치를본다(브라우저, undefined, {})).toBeNull();
    expect(실행위치를본다(브라우저, 'farm', {})).toBeNull();
  });
});

describe('앱케이스를뺀다', () => {
  const 웹 = { tcId: 'A-1', platforms: ['desktop'] as const };
  const 앱 = { tcId: 'A-2', platforms: ['android'] as const };
  const 둘다 = { tcId: 'A-3', platforms: ['desktop', 'android'] as const };

  it('android 를 선언한 케이스를 빼고 남은 것은 원래 차례 그대로 둔다', () => {
    const r = 앱케이스를뺀다([웹, 앱, 둘다, { ...웹, tcId: 'A-4' }]);
    expect(r.남은.map((c) => c.tcId)).toEqual(['A-1', 'A-4']);
    expect(r.뺀수).toBe(2);
  });

  it('전부 android 면 남은 것이 비고 뺀 수가 전체다', () => {
    expect(앱케이스를뺀다([앱, 둘다])).toEqual({ 남은: [], 뺀수: 2 });
  });

  it('android 가 없으면 그대로 두고 뺀 수는 0 이다', () => {
    const r = 앱케이스를뺀다([웹]);
    expect(r.남은).toEqual([웹]);
    expect(r.뺀수).toBe(0);
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

  it("location 은 'local' | 'farm' 만 받고 없어도 스키마는 통과한다", () => {
    expect(runBody.safeParse({ ...기본, location: 'mars' }).success).toBe(false);
    const 로컬 = runBody.safeParse({ ...기본, location: 'local' });
    expect(로컬.success && 로컬.data.location).toBe('local');
    expect(runBody.safeParse(기본).success).toBe(true);
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
