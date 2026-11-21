// 게임 항목의 실패 증적 두 파일(오브젝트 목록 · 게임 오류)을 검사한다. 게임은 명령 하나를 받는 가짜 함수로 바꿔 끼운다

import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Game } from 'control-cli';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { 게임증적을남긴다 } from './gameEvidence.js';

describe('게임증적을남긴다', () => {
  let 곳: string;
  beforeEach(async () => {
    곳 = await mkdtemp(join(tmpdir(), 'kit-game-'));
    process.env.PLATFORM_ARTIFACTS_DIR = 곳;
  });
  afterEach(async () => {
    delete process.env.PLATFORM_ARTIFACTS_DIR;
    await rm(곳, { recursive: true, force: true });
  });

  const 게임 = (errors: unknown[], extra: Record<string, unknown> = {}): Game =>
    new Game(async (c) =>
      c.cmd === 'tree'
        ? {
            ok: true,
            scene: 'Town',
            screen: [1080, 2400],
            tree: [{ name: 'Hud', children: [{ name: 'Slot', text: '검' }, { name: 'Slot', interactable: false }] }],
          }
        : { ok: true, last: errors.length, errors, ...extra },
    );

  it('켜진 오브젝트 경로와 게임 오류를 팜 증적 폴더에 둔다', async () => {
    const 오류 = [{ seq: 1, time: '12:00:01', type: 'Exception', message: 'NullReferenceException', stack: 'at Enhance()' }];
    await 게임증적을남긴다(게임(오류, { dropped: 3 }), '7', '42');

    const 폴더 = join(곳, 'runs', '7', '42', 'farm');
    expect(await readFile(join(폴더, 'game-tree.txt'), 'utf8')).toBe(
      ['# 장면 Town · 화면 1080×2400 · 켜진 오브젝트 3개', '/Hud', '/Hud/Slot[0] "검"', '/Hud/Slot[1] 잠김', ''].join('\n'),
    );
    const 오류글 = await readFile(join(폴더, 'game-errors.txt'), 'utf8');
    expect(오류글).toContain('# 앞의 3개는 게임이 들고 있는 수(200)를 넘겨 밀려났습니다');
    expect(오류글).toContain('#1 12:00:01 Exception: NullReferenceException\nat Enhance()');
  });

  it('게임 오류가 없으면 오류 파일을 안 만들고, 테스트 실행(runId 0)은 아무것도 안 남긴다', async () => {
    await 게임증적을남긴다(게임([]), '7', '43');
    expect(await readdir(join(곳, 'runs', '7', '43', 'farm'))).toEqual(['game-tree.txt']);

    await 게임증적을남긴다(게임([]), '0', '44');
    await expect(readdir(join(곳, 'runs', '0'))).rejects.toThrow();
  });

  it('정기 실행 통과 항목은 오브젝트 목록 없이 Exception 만 남기고, 시각은 occurredAt 을 앞세우고 메시지를 한 줄로 접는다', async () => {
    const 오류 = [
      { seq: 1, time: '12:00:01', occurredAt: '2026-11-12T03:00:01.000Z', type: 'Error', message: '경고성 오류', stack: 'at A()' },
      { seq: 2, time: '12:00:02', occurredAt: '2026-11-12T03:00:02.000Z', type: 'Exception', message: 'NullReferenceException: 첫 줄\n둘째 줄', stack: 'at B()' },
    ];
    await 게임증적을남긴다(게임(오류), '7', '46', 0, { 통과: true });

    const 폴더 = join(곳, 'runs', '7', '46', 'farm');
    expect(await readdir(폴더)).toEqual(['game-errors.txt']);
    expect(await readFile(join(폴더, 'game-errors.txt'), 'utf8')).toBe(
      ['# 게임 Exception 1개 — 통과 항목이라 Exception 만 남겼습니다', '', '#2 2026-11-12T03:00:02.000Z Exception: NullReferenceException: 첫 줄 둘째 줄', 'at B()', ''].join('\n'),
    );
  });

  it('정기 실행은 오류가 없어도 머리 줄만 있는 파일을 만든다 — 실패 항목은 모든 종류를 남긴다', async () => {
    await 게임증적을남긴다(게임([]), '7', '47', 0, { 통과: true });
    expect(await readFile(join(곳, 'runs', '7', '47', 'farm', 'game-errors.txt'), 'utf8')).toBe('# 게임 Exception 0개 — 통과 항목이라 Exception 만 남겼습니다\n');

    await 게임증적을남긴다(게임([{ seq: 1, time: 't', type: 'Error', message: 'm', stack: 's' }]), '7', '48', 0, { 통과: false });
    const 폴더 = join(곳, 'runs', '7', '48', 'farm');
    expect((await readdir(폴더)).sort()).toEqual(['game-errors.txt', 'game-tree.txt']);
    expect(await readFile(join(폴더, 'game-errors.txt'), 'utf8')).toContain('#1 t Error: m');
  });

  it('게임이 답하지 않아도 던지지 않는다 — 이미 난 판정을 덮지 않는다', async () => {
    const 죽은게임 = new Game(async () => {
      throw new Error('게임이 20초 안에 답하지 않았습니다');
    });
    await expect(게임증적을남긴다(죽은게임, '7', '45')).resolves.toBeUndefined();
  });

  it('케이스 도중 다시 켰으면 앞 게임 오류(since 뒤)와 지금 게임 오류를 처음부터 합치고 「다시 켜졌다」 머리 줄을 단다', async () => {
    const 지금 = [{ seq: 1, time: 't3', type: 'Exception', message: '새 게임', stack: 's3' }];
    let 읽은since: unknown;
    const 게임하나 = Object.assign(
      new Game(async (c) => {
        if (c.cmd === 'errors') 읽은since = c.since;
        return c.cmd === 'tree' ? { ok: true, scene: 'Lobby', screen: [1, 1], tree: [] } : { ok: true, last: 1, errors: 지금 };
      }),
      {
        다시켜기전오류를꺼낸다: () => [
          [
            { seq: 4, time: 't1', type: 'Error', message: '단계 전', stack: 's1' },
            { seq: 5, time: 't2', type: 'Exception', message: '앞 게임', stack: 's2' },
          ],
        ],
      },
    );
    await 게임증적을남긴다(게임하나, '7', '49', 4);
    const 글 = await readFile(join(곳, 'runs', '7', '49', 'farm', 'game-errors.txt'), 'utf8');
    expect(읽은since).toBe(0);
    expect(글).toContain('# 게임 오류 2개');
    expect(글).toContain('# 케이스 도중 게임이 다시 켜졌습니다');
    expect(글).toContain('#5 t2 Exception: 앞 게임');
    expect(글).toContain('#1 t3 Exception: 새 게임');
    expect(글).not.toContain('단계 전');
  });
});
