import type { Link } from 'control-cli';
import { describe, expect, it } from 'vitest';

import type { StepScope } from './context.js';
import { stepScope } from './context.js';
import { openGame } from './game.js';
import { 돌발팝업읽기 } from './gamePopups.js';

const 안쉼 = async (): Promise<void> => {};
const 초대 = { window: '/Canvas/Invite', close: '/Canvas/Invite/Decline' };

/** 초대 창이 떠 있는 동안 「강화」 버튼은 막혀 실패로 답하는 가짜 게임 — 「거절」을 누르면 창이 닫힌다 */
async function 초대창게임(팝업: unknown, 창이떠있나 = true): Promise<{ game: Awaited<ReturnType<typeof openGame>>; 보낸: Record<string, unknown>[] }> {
  let 떠있음 = 창이떠있나;
  const 보낸: Record<string, unknown>[] = [];
  const link: Link = async (cmd) => {
    if (cmd.cmd === 'ping') return { ok: true, app: 'Ashveil', version: '0.1.27' };
    보낸.push(cmd);
    if (cmd.cmd === 'find') return cmd.target === 초대.window && 떠있음 ? { ok: true, found: true, path: 초대.window } : { ok: true, found: false };
    if (cmd.cmd === 'click' && cmd.target === 초대.close) {
      떠있음 = false;
      return { ok: true, x: 1, y: 2 };
    }
    if (cmd.cmd === 'click' && 떠있음) return { ok: false, error: '/Hud/Enhance 는 가려져 누를 수 없습니다' };
    return { ok: true, x: 1, y: 2 };
  };
  const env = 팝업 === undefined ? {} : { PLATFORM_GAME_POPUPS: JSON.stringify(팝업) };
  return { game: await openGame(env, link, 안쉼), 보낸 };
}

describe('돌발 팝업 자동 닫기', () => {
  it('막힌 동작에서 떠 있는 돌발 팝업을 닫고 그 동작을 한 번 더 하며 절차에 「돌발 팝업 닫음」 줄을 남긴다', async () => {
    const { game, 보낸 } = await 초대창게임([초대]);
    const 절차: StepScope = { assertions: [] };
    await stepScope.run(절차, () => game.click('/Hud/Enhance'));
    expect(보낸.map((c) => [c.cmd, c.target])).toEqual([
      ['click', '/Hud/Enhance'],
      ['find', '/Canvas/Invite'],
      ['click', '/Canvas/Invite/Decline'],
      ['click', '/Hud/Enhance'],
    ]);
    expect(절차.assertions).toEqual([{ statement: '돌발 팝업 닫음 — /Canvas/Invite', status: 'PASS', actual: '/Canvas/Invite/Decline 누름', expected: null }]);
  });

  it('기다림이 끝나지 않을 때도 닫고 다시 기다린다', async () => {
    let 결과창 = false;
    const 보낸: string[] = [];
    let 떠있음 = true;
    const link: Link = async (cmd) => {
      if (cmd.cmd === 'ping') return { ok: true, app: 'Ashveil', version: '0.1.27' };
      보낸.push(`${String(cmd.cmd)} ${String(cmd.target)}`);
      if (cmd.cmd === 'find' && cmd.target === 초대.window) return 떠있음 ? { ok: true, found: true, path: 초대.window } : { ok: true, found: false };
      if (cmd.cmd === 'find') return 결과창 ? { ok: true, found: true, path: '/Canvas/Result' } : { ok: true, found: false };
      if (cmd.cmd === 'click') {
        떠있음 = false;
        결과창 = true;
      }
      return { ok: true, x: 1, y: 2 };
    };
    const game = await openGame({ PLATFORM_GAME_POPUPS: JSON.stringify([초대]) }, link, 안쉼);
    await game.waitFor('/Canvas/Result', { timeoutMs: 1 });
    expect(보낸.slice(-3)).toEqual(['find /Canvas/Invite', 'click /Canvas/Invite/Decline', 'find /Canvas/Result']);
  });

  it('떠 있는 돌발 팝업이 없으면 다시 하지 않고 원래 실패를 낸다', async () => {
    const { game, 보낸 } = await 초대창게임([{ window: '/Canvas/Notice', close: '/Canvas/Notice/Close' }]);
    await expect(game.click('/Hud/Enhance')).rejects.toThrow('/Hud/Enhance 는 가려져 누를 수 없습니다');
    expect(보낸.map((c) => [c.cmd, c.target])).toEqual([['click', '/Hud/Enhance'], ['find', '/Canvas/Notice']]);
  });

  it('케이스가 그 창 안 오브젝트를 다루는 동작이면 창을 닫지 않는다 — 초대 창을 확인하는 케이스가 버그를 숨기지 않게', async () => {
    const { game, 보낸 } = await 초대창게임([초대]);
    await expect(game.click('/Canvas/Invite/Accept')).rejects.toThrow('가려져');
    expect(보낸.map((c) => c.cmd)).toEqual(['click']);
  });

  it('한 번 더 해도 실패하면 그 실패를 낸다 — 두 번째는 닫지 않는다', async () => {
    const 보낸: string[] = [];
    const link: Link = async (cmd) => {
      if (cmd.cmd === 'ping') return { ok: true, app: 'Ashveil', version: '0.1.27' };
      보낸.push(String(cmd.cmd));
      if (cmd.cmd === 'find') return { ok: true, found: true, path: 초대.window };
      if (cmd.cmd === 'click' && cmd.target === 초대.close) return { ok: true, x: 1, y: 2 };
      return { ok: false, error: '여전히 막혔습니다' };
    };
    const game = await openGame({ PLATFORM_GAME_POPUPS: JSON.stringify([초대]) }, link, 안쉼);
    await expect(game.click('/Hud/Enhance')).rejects.toThrow('여전히 막혔습니다');
    expect(보낸).toEqual(['click', 'find', 'click', 'click']);
  });

  it('목록이 비면 감싸지 않는다 — 지금처럼 실패다', async () => {
    const { game, 보낸 } = await 초대창게임(undefined);
    await expect(game.click('/Hud/Enhance')).rejects.toThrow('가려져');
    expect(보낸.map((c) => c.cmd)).toEqual(['click']);
  });

  it('PLATFORM_GAME_POPUPS 꼴이 틀리면 게임에 붙기 전에 던진다', () => {
    expect(돌발팝업읽기({})).toEqual([]);
    expect(돌발팝업읽기({ PLATFORM_GAME_POPUPS: '' })).toEqual([]);
    expect(() => 돌발팝업읽기({ PLATFORM_GAME_POPUPS: '{' })).toThrow('읽지 못했다');
    expect(() => 돌발팝업읽기({ PLATFORM_GAME_POPUPS: JSON.stringify([{ window: '/Canvas/Invite' }]) })).toThrow('{ window, close } 배열');
  });
});
