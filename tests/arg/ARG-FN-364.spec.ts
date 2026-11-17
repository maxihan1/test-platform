import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 낱말모든값, 몬스터줄, 첫값 } from './helpers/battle.helper.js';
import { 던전으로, 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기, 데이터읽기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-364',
  name: '플레이어가 레벨 30 일 때 몬스터 데이터를 읽으면 임프 체력이 15 그대로다',
  platforms: ['android'],
  precondition: ['레벨 30 일반 회원이 탱커로 던전에 들어와 있다'],
  elements: ['monster:imp', 'level:30'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 레벨을 30 으로 올린 뒤 탱커로 던전에 들어간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await GM(game, '/gm level 30');
      await 던전으로(game, 아이디, 비밀번호, 0);
    });
    await test.step('던전을 확인한다', async () => {
      await verify('던전에 「공격」 버튼이 보인다', await 던전화면.지금(game).보이나(던전화면.공격), true, { blocker: true });
    });

    await test.step('GM 명령으로 몬스터 데이터를 읽는다', async () => {
      const 임프 = 몬스터줄(await 데이터읽기(game, 'monster'), 'imp');
      const 같다 = await verify.element('임프 체력이 몬스터 표와 같다', 'monster:imp', 첫값(낱말모든값(임프, '(?:체력|hp|HP|health)')), 15);
      await verify('플레이어가 레벨 30 일 때 몬스터 데이터를 읽으면 임프 체력이 15 그대로다', 같다, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
