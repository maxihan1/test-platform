// 작성 진척 누적·파일 세기·끝낼 상태 판정·30초 신호 검사 (도메인/작성 §7 「중단 · 폐기 · 진척」)
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { 보고손 } from './authoring-io.js';
import { 멈춤 } from './authoring-io.js';
import type { 돌린결과 } from './authoring-spawn.js';
import {
  끝낼상태,
  멈추라했나,
  진척누적기,
  진척보며돌린다,
  케이스파일들,
  새케이스수,
  화면수,
} from './authoring-progress.js';

const 턴 = (id: string, input: number, output: number, content: unknown[] = [{ type: 'tool_use', name: 'Read' }]) =>
  JSON.stringify({
    type: 'assistant',
    message: {
      id,
      content,
      usage: {
        input_tokens: input,
        output_tokens: output,
        cache_read_input_tokens: 999,
      },
    },
  });

describe('진척누적기 — 흐름 줄을 먹여 토큰·마지막 동작을 모은다', () => {
  it('메시지 id 마다 마지막 사본의 입력+출력만 센다 — 캐시는 안 센다', () => {
    const 누적 = 진척누적기(3600);
    누적.먹기(턴('a', 10, 1));
    누적.먹기(턴('a', 10, 50));
    누적.먹기(턴('b', 3, 7));
    누적.먹기('JSON 아님');
    expect(누적.스냅샷({ elapsedSec: 5, caseFiles: 2 })).toMatchObject({
      childRunning: true,
      elapsedSec: 5,
      limitSec: 3600,
      caseFiles: 2,
      tokens: 70,
      lastAction: '· Read',
    });
  });

  it('먹기는 흘릴 줄을 돌려준다 — 로그와 진척이 같은 줄을 본다', () => {
    const 누적 = 진척누적기(60);
    expect(누적.먹기(턴('a', 1, 1, [{ type: 'text', text: '케이스를 쓴다\n둘째 줄' }]))).toBe('» 케이스를 쓴다');
    expect(누적.먹기('{"type":"result"}')).toBeNull();
  });

  it('동작이 없으면 lastAction·lastActionAt·screens 칸을 안 싣는다', () => {
    const 몸 = 진척누적기(60).스냅샷({ elapsedSec: 0, caseFiles: 0 });
    expect(Object.keys(몸).sort()).toEqual(['caseFiles', 'childRunning', 'elapsedSec', 'limitSec', 'tokens']);
  });

  it('lastAction 은 160자로 자르고 lastActionAt 은 ISO 다 · screens 는 주면 싣는다', () => {
    const 누적 = 진척누적기(60);
    누적.먹기(턴('a', 1, 1, [{ type: 'tool_use', name: 'x'.repeat(300) }]));
    const 몸 = 누적.스냅샷({ elapsedSec: 1, caseFiles: 0, screens: 3 });
    expect(몸.lastAction).toHaveLength(160);
    expect(new Date(몸.lastActionAt ?? '').toISOString()).toBe(몸.lastActionAt);
    expect(몸.screens).toBe(3);
  });
});

describe('파일 세기', () => {
  let 자리 = '';
  afterEach(() => rmSync(자리, { recursive: true, force: true }));

  it('자식 시작 뒤 새로 생긴 .spec.ts 만 센다 — 하위 폴더도, 없는 폴더는 0', () => {
    자리 = mkdtempSync(join(tmpdir(), 'progress-'));
    const 폴더 = join(자리, 'tests', 'mkt');
    expect(새케이스수(폴더, 케이스파일들(폴더))).toBe(0);
    mkdirSync(join(폴더, 'a'), { recursive: true });
    writeFileSync(join(폴더, 'OLD-1.spec.ts'), '');
    const 전 = 케이스파일들(폴더);
    writeFileSync(join(폴더, 'OLD-1.spec.ts'), '고침');
    writeFileSync(join(폴더, 'a', 'NEW-1.spec.ts'), '');
    writeFileSync(join(폴더, 'NEW-2.spec.ts'), '');
    writeFileSync(join(폴더, 'helper.ts'), '');
    expect(새케이스수(폴더, 전)).toBe(2);
  });

  it('화면수 — screens/*.md 만 센다 · 폴더가 없으면 0', () => {
    자리 = mkdtempSync(join(tmpdir(), 'progress-'));
    expect(화면수(join(자리, 'screens'))).toBe(0);
    mkdirSync(join(자리, 'screens'));
    writeFileSync(join(자리, 'screens', '1.md'), '');
    writeFileSync(join(자리, 'screens', '2.md'), '');
    writeFileSync(join(자리, 'screens', 'x.png'), '');
    expect(화면수(join(자리, 'screens'))).toBe(2);
  });
});

describe('끝낼상태 — 자식이 끝난 모양으로 끝낼 몸을 고른다 (null 이면 올린다)', () => {
  const r = (코드: number | null, 시간초과 = false, 멈춤으로죽음 = false) => ({
    코드,
    시간초과,
    멈춤으로죽음,
  });

  it('멈춤으로 죽었으면 STOPPED USER — 시간초과보다 앞선다', () => {
    expect(끝낼상태(r(null, true, true), false)).toEqual({
      status: 'STOPPED',
      stopReason: 'USER',
    });
  });
  it('시간초과면 STOPPED TIMEOUT', () => {
    expect(끝낼상태(r(null, true), false)).toEqual({
      status: 'STOPPED',
      stopReason: 'TIMEOUT',
    });
  });
  it('코드≠0 이고 한도면 STOPPED LIMIT · 그 밖은 FAILED', () => {
    expect(끝낼상태(r(1), true)).toEqual({
      status: 'STOPPED',
      stopReason: 'LIMIT',
    });
    expect(끝낼상태(r(1), false)).toEqual({
      status: 'FAILED',
      error: '케이스를 만들다 멈췄다. 에이전트 기록을 봐라.',
    });
  });
  it('코드 0 이면 null — 한도 글이 섞여도 올린다', () => {
    expect(끝낼상태(r(0), true)).toBeNull();
  });
});

describe('멈추라했나 — stage 응답 몸의 stop', () => {
  it('stop: true 일 때만 참', () => {
    expect(멈추라했나({ status: 200, 몸: { ok: true, stop: true } })).toBe(true);
    expect(멈추라했나({ status: 200, 몸: { ok: true, stop: false } })).toBe(false);
    expect(멈추라했나({ status: 200, 몸: null })).toBe(false);
    expect(멈추라했나(undefined)).toBe(false);
  });
});

describe('진척보며돌린다 — 자식이 도는 동안 신호를 올리고 stop 이면 멈춘다', () => {
  afterEach(() => {
    멈춤.까닭 = null;
    vi.restoreAllMocks();
  });

  const 끝난결과: 돌린결과 = {
    코드: null,
    낸것: '',
    오류: '',
    시간초과: false,
    멈춤으로죽음: true,
  };
  const 멈출때까지 = (신호: AbortSignal) =>
    new Promise<돌린결과>((resolve) => 신호.addEventListener('abort', () => resolve(끝난결과)));

  it('틱마다 진척을 실어 단계를 부르고, 응답이 stop 이면 abort 한다', async () => {
    const 보낸것: unknown[] = [];
    const 손: 보고손 = {
      단계: async (글, 진척) => {
        보낸것.push([글, 진척]);
        return { status: 200, 몸: { ok: true, stop: 보낸것.length >= 2 } };
      },
      끝내기: async () => undefined,
    };
    const 결과 = await 진척보며돌린다(
      손,
      () => ({
        childRunning: true,
        elapsedSec: 1,
        limitSec: 1,
        caseFiles: 0,
        tokens: 0,
      }),
      멈출때까지,
      10,
    );
    expect(결과.멈춤으로죽음).toBe(true);
    expect(보낸것).toHaveLength(2);
    expect(보낸것[0]).toEqual(['케이스를 만드는 중', expect.objectContaining({ childRunning: true })]);
  });

  it('앞 틱이 떠 있으면 건너뛰고, 끝나면 더 부르지 않는다', async () => {
    let 부름 = 0;
    const 손: 보고손 = {
      단계: async () => {
        부름 += 1;
        await new Promise((r) => setTimeout(r, 60));
        return { status: 200, 몸: { ok: true, stop: false } };
      },
      끝내기: async () => undefined,
    };
    const 결과 = await 진척보며돌린다(
      손,
      () => ({
        childRunning: true,
        elapsedSec: 0,
        limitSec: 0,
        caseFiles: 0,
        tokens: 0,
      }),
      () =>
        new Promise<돌린결과>((resolve) =>
          setTimeout(() => resolve({ ...끝난결과, 코드: 0, 멈춤으로죽음: false }), 100),
        ),
      10,
    );
    expect(결과.코드).toBe(0);
    const 끝날때 = 부름;
    expect(끝날때).toBeLessThanOrEqual(2);
    await new Promise((r) => setTimeout(r, 50));
    expect(부름).toBe(끝날때);
  });

  it('거절이면 멈춤.까닭 을 채우고 자식을 죽인다 · 다른 오류는 로그만', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let 부름 = 0;
    const 손: 보고손 = {
      단계: async () => {
        부름 += 1;
        if (부름 === 1) throw new Error('fetch failed');
        throw new Error('(401) 서버가 거절했다.');
      },
      끝내기: async () => undefined,
    };
    const 결과 = await 진척보며돌린다(
      손,
      () => ({
        childRunning: true,
        elapsedSec: 0,
        limitSec: 0,
        caseFiles: 0,
        tokens: 0,
      }),
      멈출때까지,
      10,
    );
    expect(결과.멈춤으로죽음).toBe(true);
    expect(부름).toBe(2);
    expect(멈춤.까닭).toContain('서버가 거절했다');
  });
});
