// 실행 위치 판정과 요청 본문 스키마 검사 (DB 없이 돈다)

import { describe, expect, it } from 'vitest';

import { runBody, 실행위치를본다 } from './location.js';

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
});
