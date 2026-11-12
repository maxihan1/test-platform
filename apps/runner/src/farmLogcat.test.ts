// 통과 항목 logcat 하나만 받는 길이 영상을 부르지 않고 팜 밖으로 토큰을 보내지 않는지 보는 단위 테스트

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { FARM_EVIDENCE_DIR } from '@platform/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { logcat만받는다 } from './farmLogcat.js';

let 폴더: string;
const 목록주소 = 'http://farm:4723/wd/hub/api/sessions/sess-1/artifacts';
const 답 = (값: unknown): Response => new Response(JSON.stringify({ value: 값 }));
const 쉬기 = vi.fn(async () => undefined);

beforeEach(() => {
  폴더 = mkdtempSync(join(tmpdir(), 'farm-logcat-'));
  쉬기.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  rmSync(폴더, { recursive: true, force: true });
});

describe('logcat만받는다', () => {
  it('산출물 목록에서 logcat.txt 만 받아 farm/logcat.txt 에 두고 영상은 부르지 않는다', async () => {
    const fetch = vi.fn(async (주소: string) => {
      if (주소 === 목록주소) {
        return 답({ ready: true, files: [{ name: 'video-1.mp4', url: '/wd/hub/api/sessions/sess-1/files/video-1.mp4' }, { name: 'logcat.txt', url: '/wd/hub/api/sessions/sess-1/files/logcat.txt' }] });
      }
      return new Response('FATAL EXCEPTION: main');
    });
    vi.stubGlobal('fetch', fetch);
    await logcat만받는다(폴더, 'http://farm:4723/wd/hub', 'sess-1', 'pat_kim', 쉬기);
    expect(readFileSync(join(폴더, FARM_EVIDENCE_DIR, 'logcat.txt'), 'utf8')).toBe('FATAL EXCEPTION: main');
    expect(fetch.mock.calls.map((c) => c[0])).toEqual([목록주소, 'http://farm:4723/wd/hub/api/sessions/sess-1/files/logcat.txt']);
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ headers: { Authorization: 'Bearer pat_kim' } });
    expect(existsSync(join(폴더, `${FARM_EVIDENCE_DIR}.logcat.part`))).toBe(false);
  });

  it('팜이 아직 만드는 중(ready:false)이면 다시 묻는다', async () => {
    let 물음 = 0;
    vi.stubGlobal('fetch', vi.fn(async (주소: string) => {
      if (주소 !== 목록주소) return new Response('줄');
      물음 += 1;
      return 물음 === 1 ? 답({ ready: false }) : 답({ ready: true, files: [{ name: 'logcat.txt', url: '/wd/hub/x/logcat.txt' }] });
    }));
    await logcat만받는다(폴더, 'http://farm:4723/wd/hub', 'sess-1', undefined, 쉬기);
    expect(쉬기).toHaveBeenCalledTimes(1);
    expect(existsSync(join(폴더, FARM_EVIDENCE_DIR, 'logcat.txt'))).toBe(true);
  });

  it('팜이 다른 출처를 가리키면 토큰을 보내지 않고 던진다', async () => {
    const fetch = vi.fn(async () => 답({ ready: true, files: [{ name: 'logcat.txt', url: 'http://evil.example/logcat.txt' }] }));
    vi.stubGlobal('fetch', fetch);
    await expect(logcat만받는다(폴더, 'http://farm:4723/wd/hub', 'sess-1', 'pat_kim', 쉬기)).rejects.toThrow('팜 밖 주소다');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('목록에 logcat 이 없으면 던지고 farm 에 아무것도 두지 않는다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => 답({ ready: true, files: [{ name: 'video-1.mp4', url: '/v.mp4' }] })));
    await expect(logcat만받는다(폴더, 'http://farm:4723/wd/hub', 'sess-1', undefined, 쉬기)).rejects.toThrow('logcat.txt 을 주지 않는다');
    expect(existsSync(join(폴더, FARM_EVIDENCE_DIR))).toBe(false);
  });
});
