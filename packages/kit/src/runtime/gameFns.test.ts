// 게임 동작이 지나던 화면 객체 함수 · 도우미 이름이 절차 기록에 남는지 본다 (도메인/게임 §3.10 「정식 실행이 맵을 고친다」)

import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { Link } from 'control-cli';
import { describe, expect, it } from 'vitest';

import type { StepResult } from '../types.js';
import { runScope, stepScope, type RunScope, type StepScope } from './context.js';
import { 던전화면, 로비화면, 사냥한번 } from './fixtures/pages/dungeon.page.js';
import { openGame } from './game.js';
import { 실패함수들, 지나던함수 } from './gameFns.js';
import { traced } from './http.js';
import { runStep } from './step.js';

const 안쉼 = async (): Promise<void> => {};

/** 「공격」 버튼만 못 찾는 가짜 게임 */
async function 가짜게임(공격실패 = false): Promise<Awaited<ReturnType<typeof openGame>>> {
  const link: Link = async (cmd) => {
    if (cmd.cmd === 'click' && cmd.target === '/Hud/Attack' && 공격실패) return { ok: false, error: '켜진 오브젝트 중에 /Hud/Attack 이 없습니다' };
    return { ok: true, x: 1, y: 2 };
  };
  return openGame({}, link, 안쉼);
}

function makeRun(): { run: RunScope; emitted: StepResult[] } {
  const emitted: StepResult[] = [];
  const run: RunScope = { seq: 0, failed: false, stopped: false, capture: async () => undefined, emit: async (r) => void emitted.push(r) };
  return { run, emitted };
}

describe('지나던함수', () => {
  it('화면 객체 · 도우미 폴더의 프레임에서 함수 이름을 안쪽부터 읽고 케이스 파일 · kit · 이름 없는 함수 · 생성자는 뺀다', () => {
    const stack = [
      'Error: x',
      '    at Game.click (/repo/node_modules/control-cli/dist/game.js:10:5)',
      '    at <anonymous> (/repo/tests/arg/pages/dungeon.page.ts:30:9)',
      '    at async 던전화면.공격 (/repo/tests/arg/pages/dungeon.page.ts:31:5)',
      '    at new 던전화면 (/repo/tests/arg/pages/dungeon.page.ts:5:5)',
      '    at async 공통HUD.글읽기 (file:///repo/tests/arg/components/hud.component.ts:12:3)',
      '    at async 사냥한번 (/repo/tests/arg/helpers/game-state.helper.ts:40:3)',
      '    at async 던전화면.공격 (/repo/tests/arg/pages/dungeon.page.ts:31:5)',
      '    at async /repo/tests/arg/ARG-FN-012.spec.ts:20:7',
      '    at async runStep (/repo/packages/kit/src/runtime/step.ts:61:5)',
    ].join('\n');
    expect(지나던함수(stack)).toEqual(['던전화면.공격', '공통HUD.글읽기', '사냥한번']);
    expect(지나던함수(undefined)).toEqual([]);
  });

  it('정적 함수(Function.열기)는 소스에서 그 줄 위의 클래스 이름을 읽어 붙이고, 못 읽으면 그 프레임을 뺀다', () => {
    const 파일 = new URL('./fixtures/pages/dungeon.page.ts', import.meta.url).pathname;
    expect(지나던함수(`Error\n    at Function.열기 (${파일}:10:16)\n    at Function.열기 (${파일}:19:16)`)).toEqual(['로비화면.열기', '던전화면.열기']);
    expect(지나던함수('Error\n    at Function.열기 (/없는/pages/x.page.ts:3:1)')).toEqual([]);
  });
});

describe('게임 동작마다 함수 이름을 적는다', () => {
  it('화면 객체 함수 · 정적 함수 · 도우미 안에서 부른 동작이 그 절차의 gameFns 에 겹침 없이 남는다', async () => {
    const game = await 가짜게임();
    const 절차: StepScope = { assertions: [] };
    await stepScope.run(절차, async () => {
      await 로비화면.열기(game);
      const 던전 = await 던전화면.열기(game);
      await 던전.공격();
      await 던전.공격();
      await 사냥한번(game);
    });
    expect(절차.gameFns).toEqual(['로비화면.열기', '던전화면.열기', '던전화면.공격', '사냥한번']);
  });

  it('절차 밖의 동작은 적지 않는다', async () => {
    const game = await 가짜게임();
    await expect(new 던전화면(game).공격()).resolves.toBeUndefined();
  });

  it('동작이 던지면 절차 기록에 gameFailedFns 로 부른 함수 이름이 남는다', async () => {
    const game = await 가짜게임(true);
    const { run, emitted } = makeRun();
    await runStep(run, '임프를 공격한다', async () => {
      await 로비화면.열기(game);
      await 사냥한번(game);
    });
    expect(emitted[0]).toMatchObject({ status: 'FAIL', gameFns: ['로비화면.열기', '던전화면.공격', '사냥한번'] });
    expect(emitted[0]!.gameFailedFns).toContain('던전화면.공격');
    expect(emitted[0]!.gameFailedFns).not.toContain('로비화면.열기');
  });

  it('화면 객체가 스스로 던진 오류는 오류 스택에서 함수 이름을 읽는다', async () => {
    const game = await 가짜게임();
    const 오류 = await new 던전화면(game).스스로던진다().catch((e: unknown) => e);
    expect(실패함수들(오류)).toEqual(['던전화면.스스로던진다']);
    expect(실패함수들('글자')).toEqual([]);
  });

  it('통과한 절차에는 gameFailedFns 가 없고, 게임 동작이 없는 절차에는 두 칸 다 없다', async () => {
    const game = await 가짜게임();
    const { run, emitted } = makeRun();
    await runStep(run, '던전에 들어간다', async () => void (await 던전화면.열기(game)));
    await runStep(run, '아무것도 안 누른다', () => {
      throw new Error('웹 화면 객체 오류');
    });
    expect(emitted[0]).toMatchObject({ gameFns: ['던전화면.열기'] });
    expect(emitted[0]).not.toHaveProperty('gameFailedFns');
    expect(emitted[1]).not.toHaveProperty('gameFns');
    expect(emitted[1]).not.toHaveProperty('gameFailedFns');
  });
});

describe('어드민 API 도우미', () => {
  const 응답 = { status: () => 200, text: async () => '{}' } as unknown as APIResponse;
  const 요청 = { post: async () => 응답 } as unknown as APIRequestContext;
  async function 계정되돌리기(admin: APIRequestContext): Promise<void> {
    await admin.post('/admin/reset');
  }

  it('게임 항목이면 요청을 부른 함수 이름을 적고, 게임 항목이 아니면 스택을 읽지 않는다', async () => {
    const 감싼 = traced(요청, new Set());
    const 부른다 = async (run: RunScope): Promise<StepScope> => {
      const 절차: StepScope = { assertions: [] };
      await runScope.run(run, () => stepScope.run(절차, () => 사냥한번({ click: () => 계정되돌리기(감싼) })));
      return 절차;
    };
    expect((await 부른다({ ...makeRun().run, apiCalls: [] })).gameFns).toEqual(['던전화면.공격', '사냥한번']);
    expect((await 부른다(makeRun().run)).gameFns).toBeUndefined();
  });
});
