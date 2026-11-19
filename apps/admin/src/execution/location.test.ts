// 앱 실행을 받을지 판정 · 정기 실행의 앱 케이스 빼기 · 요청 본문 스키마 검사 (DB 없이 돈다)

import type { Platform } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import { DEFAULT_TIMEOUT_MS, runBody, 선언밖디바이스, 앱케이스를뺀다, 윈도우를펼친다, 팜을본다, 플랫폼밖인가, 항목제한ms } from './location.js';

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

  it('모바일 실행 위치로 실제 폰을 골랐으면 mobile 항목도 팜을 본다 — 흉내면 안 본다', () => {
    expect(팜을본다([{ platforms: ['desktop', 'mobile'] }], {}, 'vision')).toMatchObject({ error: 'FARM_OFF' });
    expect(팜을본다([{ platforms: ['desktop'] }], {}, 'vision')).toBeNull();
    expect(팜을본다([{ platforms: ['mobile'] }], 팜있음, 'vision')).toBeNull();
    expect(팜을본다([{ platforms: ['mobile'] }], {}, 'server')).toBeNull();
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

  it('모바일 실행 위치는 server · vision 만 받고 빠지면 서버 흉내다', () => {
    const 고름 = (mobileOn?: string) => runBody.safeParse({ ...기본, ...(mobileOn !== undefined && { mobileOn }) });
    expect(고름().data?.mobileOn).toBe('server');
    expect(고름('vision').data?.mobileOn).toBe('vision');
    expect(고름('local').success).toBe(false);
  });

  it('윈도우 값 다섯을 받는다 — windows 는 선언대로 펼치고 패드 값은 그대로 한 항목이다', () => {
    const 고름 = (platforms: string[]) => runBody.safeParse({ ...기본, items: [{ ...기본.items[0], platforms }] }).success;
    expect(고름(['windows', 'windows-ps5', 'windows-ps4', 'windows-switch', 'windows-xbox'])).toBe(true);
    expect(고름(['windows-ps3'])).toBe(false);
  });

  it('기본 timeoutMs 가 곧 상한이다 — 300000 하나', () => {
    expect(DEFAULT_TIMEOUT_MS).toBe(300000);
  });
});

describe('항목제한ms', () => {
  it('게임 시나리오는 사람이 준 값과 상관없이 0(한도 없음)이다', () => {
    expect(항목제한ms('ARG-GS-001', 5000)).toBe(0);
    expect(항목제한ms('ARG-GS-001')).toBe(0);
  });

  it('그 밖은 준 값, 없으면 기본값이다', () => {
    expect(항목제한ms('ARG-FN-001', 5000)).toBe(5000);
    expect(항목제한ms('ARG-FN-001')).toBe(DEFAULT_TIMEOUT_MS);
  });
});

describe('윈도우 PC 항목', () => {
  const 선언 = new Map([
    ['ASH-FN-001', { platforms: ['windows'] }],
    ['ASH-FN-002', { platforms: ['windows-ps5', 'windows-ps4', 'windows-xbox'] }],
    ['ASH-FN-003', { platforms: ['windows', 'windows-ps5'] }],
    ['ARG-FN-002', { platforms: ['android'] }],
  ]);

  it('windows 는 윈도우 값을 하나라도 선언한 케이스에 걸고, 윈도우 값 하나하나는 선언에 그대로 있어야 한다', () => {
    expect(선언밖디바이스([{ tcId: 'ASH-FN-002', platforms: ['windows'] }], 선언)).toBeNull();
    expect(선언밖디바이스([{ tcId: 'ASH-FN-002', platforms: ['windows-ps4'] }], 선언)).toBeNull();
    expect(선언밖디바이스([{ tcId: 'ASH-FN-001', platforms: ['windows-ps5'] }], 선언)).toEqual({ tcId: 'ASH-FN-001', platform: 'windows-ps5' });
    expect(선언밖디바이스([{ tcId: 'ARG-FN-002', platforms: ['windows'] }], 선언)).toEqual({ tcId: 'ARG-FN-002', platform: 'windows' });
  });

  it('windows 는 선언대로 펼친다 — 키보드는 한 번, 패드는 지원 패드에 남은 것마다, 값 하나하나로 건 것은 그대로', () => {
    const 펼침 = (items: { tcId: string; platforms: Platform[] }[], 패드: string[]) => 윈도우를펼친다(items, 선언, 패드).map((i) => [i.tcId, i.platforms]);
    expect(펼침([{ tcId: 'ASH-FN-001', platforms: ['windows'] }, { tcId: 'ASH-FN-002', platforms: ['windows'] }], ['ps5', 'xbox'])).toEqual([
      ['ASH-FN-001', ['windows']],
      ['ASH-FN-002', ['windows-ps5', 'windows-xbox']],
    ]);
    // 지원 패드를 다 풀면 버튼 그림 케이스는 빠진다
    expect(펼침([{ tcId: 'ASH-FN-002', platforms: ['windows'] }], [])).toEqual([]);
    // 실패 다시 실행처럼 값 하나로 건 항목은 지원 패드를 안 본다 — 겹치면 한 번이다
    expect(펼침([{ tcId: 'ASH-FN-002', platforms: ['windows-ps4', 'windows'] }], ['ps4'])).toEqual([['ASH-FN-002', ['windows-ps4']]]);
  });

  it('실패 다시 실행의 windows 는 키보드 항목 그대로다 — 키보드만 실패했는데 통과한 패드 항목까지 다시 돌지 않게 (도메인/게임 §3.10 「실패 다시 실행은 원래 항목의 값 그대로다」)', () => {
    expect(윈도우를펼친다([{ tcId: 'ASH-FN-003', platforms: ['windows'] }], 선언, ['ps5'], true).map((i) => i.platforms)).toEqual([['windows']]);
    expect(윈도우를펼친다([{ tcId: 'ASH-FN-003', platforms: ['windows'] }], 선언, ['ps5']).map((i) => i.platforms)).toEqual([['windows', 'windows-ps5']]);
  });

  it('게임 하나에 플랫폼 하나 — 게임 밖 · 모바일 게임의 윈도우 값, PC 게임의 android 는 돌 수 없다', () => {
    expect(['android', 'windows', 'windows-ps5', 'desktop'].map((p) => 플랫폼밖인가('GAME', 'windows', p))).toEqual([true, false, false, false]);
    expect(['android', 'windows', 'windows-ps5'].map((p) => 플랫폼밖인가('GAME', 'android', p))).toEqual([false, true, true]);
    expect(['android', 'windows'].map((p) => 플랫폼밖인가('APP', null, p))).toEqual([false, true]);
  });

  it('윈도우 PC 도 VISION 기기라 팜이 없으면 거절하고, 팜 없는 정기 실행은 그 케이스를 뺀다', () => {
    expect(팜을본다([{ platforms: ['windows-ps5'] }], {})).toMatchObject({ error: 'FARM_OFF' });
    expect(앱케이스를뺀다([{ platforms: ['windows'] }, { platforms: ['desktop'] }], {})).toEqual({ 남은: [{ platforms: ['desktop'] }], 뺀수: 1 });
  });
});
