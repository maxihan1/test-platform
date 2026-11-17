import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { 화면자리 } from './helpers/battle.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-339',
  name: '던전 행동 막대 왼쪽에 「물약 3」 버튼이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 탱커로 던전에 들어와 있다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 탱커로 던전에 들어간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호, 로비화면.카드차례.탱커);
    });
    const 던전 = 던전화면.지금(game);
    await test.step('던전에 들어왔는지 확인한다', async () => {
      await verify('던전에 「공격」 버튼이 보인다', await 던전.보이나(던전화면.공격), true, { blocker: true });
    });

    await test.step('행동 막대 왼쪽을 확인한다', async () => {
      const 글 = await verify('「물약 3」 버튼이 보인다', await 던전.물약글읽기(), '물약 3');
      const 물약자리 = await 화면자리(game, 던전화면.물약);
      const 공격자리 = await 화면자리(game, 던전화면.공격);
      const 왼쪽 = await verify('「물약 3」 버튼이 행동 막대의 「공격」 버튼 왼쪽에 있다', 물약자리.가로 < 공격자리.가로, true);
      await verify('던전 행동 막대 왼쪽에 「물약 3」 버튼이 보인다', 글 && 왼쪽, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
