import { defineCase, gameLog, repeatUntil, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로, 로비로 } from './helpers/game-enter.helper.js';
import { 임프하나만두고레벨맞추기, 장비받아끼기 } from './helpers/battle.helper.js';
import { 로그읽기, type 로그줄, 설명안되는줄, type 시작조건, 임프치기, 준피해 } from './helpers/game-log.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ARG-GS-005',
  name: '레벨 5 탱커가 「강철 롱소드」를 끼고 「전투 망치」로 임프를 친 피해가 기획서 값이다',
  platforms: ['android'],
  precondition: ['레벨 5 일반 회원이 「강철 롱소드」를 끼고 탱커로 혼자 던전에 있다', '곁에 임프 하나만 있다'],
  elements: ['item:steel_longsword', 'skill:war_hammer'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 조건: 시작조건 = { level: 5, job: '탱커', weapon: '강철 롱소드', players: 1 };
  await test.cleanup('일반 회원 계정 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));
  await test.step('로비에서 「강철 롱소드」를 받아 끼고 탱커로 혼자 던전에 들어가 임프 하나만 두고 레벨을 5 로 맞춘다', async () => {
    await 로비로(game, 아이디, 비밀번호);
    await 장비받아끼기(game, admin, 아이디, '강철 롱소드', '무기');
    await 던전으로(game, 아이디, 비밀번호, 0);
    await 임프하나만두고레벨맞추기(game, 5);
  });
  const 로그 = await gameLog((since) => 로그읽기(admin, 아이디, since));
  await test.step('「전투 망치」로 임프를 치는 동안 쌓인 로그를 기획서 값과 견준다', async () => {
    let 줄들: 로그줄[] = [];
    let 멈춤: unknown;
    try {
      await repeatUntil(() => 임프치기(game), {
        progress: async () => 준피해((줄들 = await 로그.lines()), 아이디, 조건, '전투 망치').length,
        goal: 1,
        stallMs: 60_000,
      });
    } catch (e) {
      멈춤 = e;
    }
    const 침 = 준피해(줄들, 아이디, 조건, '전투 망치');
    await verify.log('ARG-REQ-083 레벨 5 탱커가 「강철 롱소드」를 끼고 「전투 망치」로 임프를 치면 준 피해는 12 이다', 침.map((줄) => 줄.value), 12);
    for (const 줄 of 설명안되는줄(줄들, [...침])) await verify.note('설명 안 되는 줄', 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});
