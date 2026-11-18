import { defineCase, gameLog, repeatUntil, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { 임프하나만두고레벨맞추기 } from './helpers/battle.helper.js';
import { 로그읽기, type 로그줄, 받은피해, 설명안되는줄, type 시작조건, 임프에게맞기, 임프치기, 준피해, 처치줄 } from './helpers/game-log.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ARG-GS-001',
  name: '레벨 1 탱커가 장비 없이 혼자 임프에게 맞고 임프를 잡는 동안 받은 피해 · 준 피해 · 처치 경험치가 기획서 값이다',
  platforms: ['android'],
  precondition: ['레벨 1 일반 회원이 장비 없이 탱커로 혼자 던전에 있다', '곁에 임프 하나만 있다'],
  elements: ['class:tank', 'skill:war_hammer', 'monster:imp'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 조건: 시작조건 = { level: 1, job: '탱커', players: 1 };
  await test.cleanup('일반 회원 계정 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));
  await test.step('탱커로 혼자 던전에 들어가 임프 하나만 두고 레벨을 1 로 맞춘다', async () => {
    await 던전으로(game, 아이디, 비밀번호, 0);
    await 임프하나만두고레벨맞추기(game, 1);
  });
  const 로그 = await gameLog((since) => 로그읽기(admin, 아이디, since));
  await test.step('임프에게 한 번 맞은 뒤 「전투 망치」로 임프를 잡는 동안 쌓인 로그를 기획서 값과 견준다', async () => {
    let 줄들: 로그줄[] = [];
    let 멈춤: unknown;
    try {
      await repeatUntil(() => 임프에게맞기(game), {
        progress: async () => 받은피해((줄들 = await 로그.lines()), 아이디, 조건).length,
        goal: 1,
        stallMs: 60_000,
      });
      await repeatUntil(() => 임프치기(game), {
        progress: async () => 처치줄((줄들 = await 로그.lines()), 아이디, 조건).length,
        goal: 1,
        stallMs: 60_000,
      });
    } catch (e) {
      멈춤 = e;
    }
    const 맞음 = 받은피해(줄들, 아이디, 조건);
    await verify.log('ARG-REQ-349 던전에 혼자일 때 레벨 1 탱커가 장비 없이 임프에게 받은 피해는 8 이다', 맞음.map((줄) => 줄.value), 8);
    const 침 = 준피해(줄들, 아이디, 조건, '전투 망치');
    await verify.log('ARG-REQ-082 레벨 1 탱커가 버프 없이 「전투 망치」로 임프를 치면 준 피해는 10 이다', 침.map((줄) => 줄.value), 10);
    const 처치 = 처치줄(줄들, 아이디, 조건);
    await verify.log('ARG-REQ-096 레벨 1 에서 장비 · 파티 없이 임프를 처치한 경험치는 12 이다', 처치.map((줄) => 줄.exp), 12);
    for (const 줄 of 설명안되는줄(줄들, [...맞음, ...침, ...처치])) await verify.note('설명 안 되는 줄', 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});
