import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로, 로비로 } from './helpers/game-enter.helper.js';
import { 행동스킬들 } from './helpers/battle.helper.js';
import { 계정되돌리기, 상태읽기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-087',
  name: '고른 직업으로 던전에 들어가면 행동 버튼 스킬이 직업별 스킬 표와 같다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 있다'],
  elements: ['class:tank', 'skill:war_hammer', 'skill:shield_aura'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });

    await test.step('고른 직업으로 던전에 들어가 행동 버튼 스킬 이름을 읽는다', async () => {
      await 던전으로(game, 아이디, 비밀번호, 로비화면.카드차례.탱커);
      const 스킬 = 행동스킬들(await 상태읽기(game, true));
      const 공격 = await verify.element('「공격」 버튼 스킬이 직업별 스킬 표와 같다', 'skill:war_hammer', 스킬[0], '전투 망치');
      const 스킬1 = await verify.element('「스킬 1」 버튼 스킬이 직업별 스킬 표와 같다', 'skill:shield_aura', 스킬[1], '방패 오라');
      await verify('고른 직업으로 던전에 들어가면 행동 버튼 스킬이 직업별 스킬 표와 같다', 공격 && 스킬1, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
