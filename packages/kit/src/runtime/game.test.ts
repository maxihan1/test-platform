// 게임 케이스가 고르는 길 · 켜질 때까지 기다리기 · 게임 조작을 검사한다(실패 증적은 gameEvidence.test.ts). 게임은 명령 하나를 받는 가짜 함수로 바꿔 끼운다

import type { Link } from 'control-cli';
import { describe, expect, it } from 'vitest';

import { type GameDriver, gameLink, openGame, 팜원점 } from './game.js';

describe('팜원점', () => {
  it('/wd/hub 를 떼고 주소 안 계정을 Basic 머리로 옮긴다', () => {
    expect(팜원점('http://qa:p%40ss@farm.local:4723/wd/hub/', undefined)).toEqual({
      base: 'http://farm.local:4723',
      headers: { Authorization: `Basic ${Buffer.from('qa:p@ss').toString('base64')}` },
    });
    expect(팜원점('http://farm.local:4723', '')).toEqual({ base: 'http://farm.local:4723', headers: {} });
  });

  it('토큰이 있으면 주소 안 계정보다 앞서 Bearer 머리로 싣는다', () => {
    expect(팜원점('https://qa:pw@farm.example.com/wd/hub', 'pat_abc')).toEqual({
      base: 'https://farm.example.com',
      headers: { Authorization: 'Bearer pat_abc' },
    });
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

  // 답을 바꿔 끼울 수 있는 가짜 게임 — 보낸 명령을 모은다
  const 손가락게임 = async (답: (cmd: Record<string, unknown>) => unknown = () => undefined): Promise<{ game: Awaited<ReturnType<typeof openGame>>; 보낸: unknown[] }> => {
    const 보낸: unknown[] = [];
    const link: Link = async (cmd) => {
      if (cmd.cmd === 'ping') return { ok: true, app: 'Ashveil', version: '0.1.27' };
      보낸.push(cmd);
      const 바꾼 = 답(cmd);
      if (바꾼 !== undefined) return 바꾼 as Awaited<ReturnType<Link>>;
      return cmd.cmd === 'touch-down' ? { ok: true, finger: 10, x: 1, y: 2 } : { ok: true };
    };
    return { game: await openGame({}, link, 안쉼), 보낸 };
  };

  it('findAll · components · members 는 케이스가 읽기만 하는 명령으로 보내고, 메서드 부르기는 케이스 꼴에 없다', async () => {
    const { game, 보낸 } = await 손가락게임((cmd) => {
      if (cmd.cmd === 'find-all') return { ok: true, found: [{ path: '/Ghost(Clone)[0]' }, { path: '/Ghost(Clone)[1]' }] };
      if (cmd.cmd === 'components') return { ok: true, components: [{ name: 'MonsterAI', type: 'Crawler.MonsterAI' }] };
      if (cmd.cmd === 'members') return { ok: true, fields: [{ name: 'TypeData', type: 'MonsterTypeData' }], properties: [], methods: [] };
      return undefined;
    });
    const 케이스: GameDriver = game;
    expect((await 케이스.findAll('Ghost(Clone)')).map((f) => f.path)).toEqual(['/Ghost(Clone)[0]', '/Ghost(Clone)[1]']);
    expect(await 케이스.components('/Ghost(Clone)[0]')).toEqual([{ name: 'MonsterAI', type: 'Crawler.MonsterAI' }]);
    expect((await 케이스.members('/Ghost(Clone)[0]', 'MonsterAI')).fields).toEqual([{ name: 'TypeData', type: 'MonsterTypeData' }]);
    expect(보낸).toEqual([
      { cmd: 'find-all', target: 'Ghost(Clone)' },
      { cmd: 'components', target: '/Ghost(Clone)[0]' },
      { cmd: 'members', target: '/Ghost(Clone)[0]', component: 'MonsterAI' },
    ]);
    // @ts-expect-error 케이스는 게임 메서드를 부르지 않는다
    expect(케이스.callMethod).toBeTypeOf('function');
  });

  it('touchDown 은 주소로 손가락을 눌러 두고 번호를 돌려준다 — touchUp 으로 뗐으면 정리 단계가 더 보내지 않는다', async () => {
    const { game, 보낸 } = await 손가락게임();
    const 케이스: GameDriver = game;
    const 번호 = await 케이스.touchDown('/HudCanvas/ActionBar/Skill1');
    expect(번호).toBe(10);
    await 케이스.touchUp(번호);
    await game.입력을거둔다();
    expect(보낸).toEqual([
      { cmd: 'touch-down', target: '/HudCanvas/ActionBar/Skill1' },
      { cmd: 'touch-up', finger: 10 },
    ]);
  });

  it('touchDown 에 좌표를 넘기면 보내기 전에 던진다 — 케이스는 좌표를 쓰지 않는다', async () => {
    const { game, 보낸 } = await 손가락게임();
    await expect(game.touchDown({ x: 1, y: 2 } as unknown as string)).rejects.toThrow('오브젝트 주소만 받는다');
    expect(보낸).toEqual([]);
  });

  it('손가락을 눌러 둔 채 끝나면 정리 단계가 그 손가락을 한 번 뗀다', async () => {
    const { game, 보낸 } = await 손가락게임();
    await game.touchDown('Skill1');
    await game.입력을거둔다();
    await game.입력을거둔다();
    expect(보낸).toEqual([{ cmd: 'touch-down', target: 'Skill1' }, { cmd: 'touch-up', finger: 10 }]);
  });

  it('누르기 답을 못 받았으면 번호를 몰라도 입력을 거둔다', async () => {
    const { game, 보낸 } = await 손가락게임((cmd) => {
      if (cmd.cmd === 'touch-down') throw new Error('팜이 답하지 않았습니다');
      return undefined;
    });
    await expect(game.touchDown('Skill1')).rejects.toThrow('팜이 답하지 않았습니다');
    await game.입력을거둔다();
    expect(보낸).toEqual([{ cmd: 'touch-down', target: 'Skill1' }, { cmd: 'input-reset' }]);
  });

  it('keyDown 으로 눌러 둔 키는 keyUp 하면 정리 단계가 안 건드리고, 떼지 않고 끝나면 한 번 뗀다', async () => {
    const { game, 보낸 } = await 손가락게임();
    const 케이스: GameDriver = game;
    await 케이스.keyDown('W');
    await 케이스.keyUp('W');
    await 케이스.keyDown('A+LeftShift');
    await 케이스.key('Pad.Cross', { duration: 0.5 });
    await game.입력을거둔다();
    await game.입력을거둔다();
    expect(보낸).toEqual([
      { cmd: 'key-down', key: 'W' },
      { cmd: 'key-up', key: 'W' },
      { cmd: 'key-down', key: 'A+LeftShift' },
      { cmd: 'key', key: 'Pad.Cross', duration: 0.5 },
      { cmd: 'key-up', key: 'A+LeftShift' },
    ]);
  });

  it('mouseMove · scroll 은 주소로 가짜 마우스를 옮기고 굴리며, 정리 단계가 가짜 마우스를 한 번 거둔다', async () => {
    const { game, 보낸 } = await 손가락게임();
    const 케이스: GameDriver = game;
    await 케이스.mouseMove('/BossRoomHudCanvas/Hero Action Bar/Button1', { duration: 0.2 });
    await 케이스.key('Mouse1');
    await 케이스.scroll(-3, { at: '/Showcase HUD' });
    await game.입력을거둔다();
    await game.입력을거둔다();
    expect(보낸).toEqual([
      { cmd: 'mouse-move', target: '/BossRoomHudCanvas/Hero Action Bar/Button1', duration: 0.2 },
      { cmd: 'key', key: 'Mouse1' },
      { cmd: 'scroll', dy: -3, target: '/Showcase HUD' },
      { cmd: 'input-reset' },
    ]);
  });

  it('mouseMove · scroll 에 좌표나 모르는 옵션을 넘기면 보내기 전에 던진다 — 케이스는 좌표를 쓰지 않는다', async () => {
    const { game, 보낸 } = await 손가락게임();
    await expect(game.mouseMove({ x: 1, y: 2 } as unknown as string)).rejects.toThrow('오브젝트 주소만 받는다');
    await expect(game.mouseMove('Skill1', { camera: 'Main' } as never)).rejects.toThrow('주소와 duration 만 받는다');
    await expect(game.scroll(1, { at: { x: 1, y: 2 } } as never)).rejects.toThrow('오브젝트 주소만 받는다');
    await expect(game.scroll(1, { dx: 2 } as never)).rejects.toThrow('at · duration 만 받는다');
    await expect(game.scroll(Number.NaN)).rejects.toThrow('칸 수는 수다');
    await game.입력을거둔다();
    expect(보낸).toEqual([]);
  });

  it('옵션이 null 이어도 kit 문구로 다루고, 자리 없는 휠은 가짜 마우스를 켜지 않아 정리 단계가 거두지 않는다', async () => {
    const { game, 보낸 } = await 손가락게임();
    await game.mouseMove('Skill1', null as never);
    await game.입력을거둔다();
    await game.scroll(2);
    await game.입력을거둔다();
    expect(보낸).toEqual([{ cmd: 'mouse-move', target: 'Skill1' }, { cmd: 'input-reset' }, { cmd: 'scroll', dy: 2 }]);
  });

  it('restart 는 앞 게임 오류를 읽어 둔 뒤 넘겨받은 끄고 켜기를 부르고, 게임이 답할 때까지 기다려 패드를 다시 정한다 — 그 전 입력은 거두지 않는다', async () => {
    const 차례: string[] = [];
    const 앞오류 = { seq: 3, time: 't', type: 'Exception', message: '끄기 전', stack: 's' };
    let 꺼짐 = false;
    const link: Link = async (cmd) => {
      차례.push(String(cmd.cmd));
      if (cmd.cmd === 'ping' && 꺼짐) {
        꺼짐 = false;
        throw new Error('게임 포트 13100 에 붙지 못했습니다');
      }
      if (cmd.cmd === 'ping') return { ok: true, app: 'BossRoom', version: '0.12.0' };
      if (cmd.cmd === 'errors') return { ok: true, last: 3, errors: [앞오류] };
      return cmd.cmd === 'touch-down' ? { ok: true, finger: 10, x: 1, y: 2 } : { ok: true, pad: { type: 'xbox' } };
    };
    const game = await openGame({ PLATFORM_PAD: 'xbox' }, link, 안쉼, async () => {
      차례.push('끄고켜기');
      꺼짐 = true;
    });
    await game.touchDown('Skill1');
    await game.restart();
    await game.입력을거둔다();
    expect(차례).toEqual(['ping', 'pad', 'touch-down', 'errors', '끄고켜기', 'ping', 'ping', 'pad']);
    expect(game.다시켜기전오류를꺼낸다()).toEqual([[앞오류]]);
    expect(game.다시켜기전오류를꺼낸다()).toEqual([]);
  });

  it('끄고 켜기를 못 받은 연결의 restart 는 던진다', async () => {
    const { game, 보낸 } = await 손가락게임();
    await expect(game.restart()).rejects.toThrow('게임을 다시 켤 길이 없다');
    expect(보낸).toEqual([]);
  });

  it('kit 이 덮은 pad · keyDown 은 남는 인자를 버리지 않고 던진다', async () => {
    const { game, 보낸 } = await 손가락게임();
    await expect(game.pad('xbox' as never)).rejects.toThrow('읽기만 한다');
    await expect(game.keyDown('W', { power: 0.5 })).rejects.toThrow('power 는 쓰지 않는다');
    expect(보낸).toEqual([]);
  });

  it('PLATFORM_PAD 가 넷 밖의 값이면 던진다 — 러너가 늘 넷 중 하나나 빈 값을 넘긴다', async () => {
    const link: Link = async () => ({ ok: true, app: 'BossRoom', version: '0.12.0' });
    await expect(openGame({ PLATFORM_PAD: 'generic' }, link, 안쉼)).rejects.toThrow('모르는 패드다: PLATFORM_PAD=generic');
  });

  it('거두기가 실패하면 다음 정리 때 다시 해 본다', async () => {
    let 막힘 = true;
    const { game, 보낸 } = await 손가락게임((cmd) => {
      if (막힘 && (cmd.cmd === 'touch-up' || cmd.cmd === 'input-reset')) throw new Error('잠깐 막힘');
      return undefined;
    });
    await game.touchDown('Skill1');
    await game.입력을거둔다();
    막힘 = false;
    await game.입력을거둔다();
    await game.입력을거둔다();
    expect(보낸.map((c) => (c as { cmd: string }).cmd)).toEqual(['touch-down', 'touch-up', 'input-reset', 'touch-up']);
  });

  it('waitForValue 는 오브젝트가 뜨고 값이 될 때까지 get 을 되풀이하고, 한도가 지나면 마지막 값을 달아 던진다', async () => {
    const 골드: unknown[] = ['없음', 100, 150];
    const link: Link = async (c) => {
      if (c.cmd !== 'get') return { ok: true };
      const v = 골드.shift() ?? 150;
      return v === '없음' ? { ok: false, error: '켜진 오브젝트 중에 Player 이 없습니다' } : { ok: true, value: v };
    };
    const game = await openGame({}, link, 안쉼);

    await game.waitForValue('Player', 'Wallet.gold', 150);
    expect(골드).toEqual([]);

    await expect(game.waitForValue('Player', 'Wallet.gold', 200, { timeoutMs: 0 })).rejects.toThrow(
      'Player.Wallet.gold 이 0초 안에 「200」이 되지 않았습니다 (마지막: 150)',
    );
  });

  it('waitForValue 가 끝까지 못 찾으면 그 까닭을 마지막에 단다', async () => {
    const link: Link = async (c) => (c.cmd === 'get' ? { ok: false, error: '켜진 오브젝트 중에 Popup 이 없습니다' } : { ok: true });
    const game = await openGame({}, link, 안쉼);
    await expect(game.waitForValue('Popup', 'Text.text', '100', { timeoutMs: 0 })).rejects.toThrow('(마지막: 켜진 오브젝트 중에 Popup 이 없습니다)');
  });

  it('디바이스 팜이 잠깐 막는 429 는 기다린다', async () => {
    let 번 = 0;
    const link: Link = async () => {
      번 += 1;
      if (번 < 2) throw new Error('디바이스 팜이 게임 명령을 HTTP 429 로 거절했습니다');
      return { ok: true };
    };
    await openGame({}, link, 안쉼);
    expect(번).toBe(2);
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
