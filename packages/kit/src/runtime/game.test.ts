// 게임 케이스가 고르는 길 · 켜질 때까지 기다리기 · 실패 증적 두 파일을 검사한다. 게임은 명령 하나를 받는 가짜 함수로 바꿔 끼운다

import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Game, type Link } from 'control-cli';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { 게임증적을남긴다, gameLink, openGame, 팜원점 } from './game.js';

describe('팜원점', () => {
  it('/wd/hub 를 떼고 주소 안 계정을 Basic 머리로 옮긴다', () => {
    expect(팜원점('http://qa:p%40ss@farm.local:4723/wd/hub/')).toEqual({
      base: 'http://farm.local:4723',
      headers: { Authorization: `Basic ${Buffer.from('qa:p@ss').toString('base64')}` },
    });
    expect(팜원점('http://farm.local:4723')).toEqual({ base: 'http://farm.local:4723', headers: {} });
  });
});

describe('gameLink', () => {
  it('팜 길인데 폰 번호가 없으면 던진다', async () => {
    await expect(gameLink({ PLATFORM_GAME_LINK: 'farm', PLATFORM_APPIUM_URL: 'http://farm:4723/wd/hub' })).rejects.toThrow(
      'PLATFORM_APPIUM_URL 과 PLATFORM_DEVICE_UDID 가 필요하다',
    );
  });

  it('길을 모르면 던진다 — 러너가 늘 정해 넘긴다', async () => {
    await expect(gameLink({})).rejects.toThrow('게임에 닿는 길을 모른다');
  });
});

describe('openGame', () => {
  const 안쉼 = async (): Promise<void> => {};

  it('게임이 포트를 열 때까지 ping 을 되풀이한다', async () => {
    let 번 = 0;
    const link: Link = async () => {
      번 += 1;
      if (번 < 3) throw new Error('게임 포트 13100 에 붙지 못했습니다 — QA 빌드가 켜져 있나요?');
      return { ok: true, app: 'Ashveil', version: '0.1.27' };
    };
    await openGame({}, link, 안쉼);
    expect(번).toBe(3);
  });

  it('디바이스 팜이 4xx 로 거절하면 기다리지 않고 원문을 달아 던진다', async () => {
    let 번 = 0;
    const link: Link = async () => {
      번 += 1;
      throw new Error('디바이스 팜이 게임 명령을 HTTP 409 로 거절했습니다: 잡은 폰이 아니다');
    };
    await expect(openGame({}, link, 안쉼)).rejects.toThrow('HTTP 409 로 거절했습니다: 잡은 폰이 아니다');
    expect(번).toBe(1);
  });
});

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

  it('게임이 답하지 않아도 던지지 않는다 — 이미 난 판정을 덮지 않는다', async () => {
    const 죽은게임 = new Game(async () => {
      throw new Error('게임이 20초 안에 답하지 않았습니다');
    });
    await expect(게임증적을남긴다(죽은게임, '7', '45')).resolves.toBeUndefined();
  });
});
