import { defineCase, gameLog, repeatUntil, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로, 로비로 } from './helpers/game-enter.helper.js';
import { 임프하나만두고레벨맞추기 } from './helpers/battle.helper.js';
import { 로그읽기, type 로그줄, 설명안되는줄, type 시작조건, 임프치기, 준피해 } from './helpers/game-log.helper.js';
import { GM, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-GS-006',
  name: '레벨 11 마법사가 「마력탄」으로 임프를 친 피해가 기획서 값이다',
  platforms: ['android'],
  precondition: ['레벨 11 일반 회원이 마법사로 혼자 던전에 있다', '곁에 임프 하나만 있다'],
  elements: ['class:mage', 'skill:magic_bolt', 'monster:imp'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 조건: 시작조건 = { level: 11, job: '마법사', players: 1 };
  await test.cleanup('일반 회원 계정 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));
  await test.step('마법사로 혼자 던전에 들어가 임프 하나만 두고 레벨을 11 로 맞춘 뒤 무적을 켠다', async () => {
    await 로비로(game, 아이디, 비밀번호);
    await 던전으로(game, 아이디, 비밀번호, 로비화면.카드차례.마법사);
    await 임프하나만두고레벨맞추기(game, 11);
    await GM(game, '/gm god');
  });
  const 로그 = await gameLog((since) => 로그읽기(admin, 아이디, since));
  await test.step('「마력탄」으로 임프를 치는 동안 쌓인 로그를 기획서 값과 견준다', async () => {
    let 줄들: 로그줄[] = [];
    let 멈춤: unknown;
    try {
      await repeatUntil(() => 임프치기(game), {
        progress: async () => 준피해((줄들 = await 로그.lines()), 아이디, 조건, '마력탄').length,
        goal: 1,
        stallMs: 60_000,
      });
    } catch (e) {
      멈춤 = e;
    }
    const 침 = 준피해(줄들, 아이디, 조건, '마력탄');
    await verify.log('ARG-REQ-086 레벨 11 마법사가 「마력탄」으로 임프를 치면 5 × 1.30 = 6.5 를 짝수 쪽으로 반올림해 준 피해는 6 이다', 침.map((줄) => 줄.value), 6);
    for (const 줄 of 설명안되는줄(줄들, [...침])) await verify.note('설명 안 되는 줄', 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});
