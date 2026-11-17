import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드맞추기, 내가길드만들기 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-261',
  name: '길드 창 위쪽에 「「<길드>」 · 길드원 1명」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 혼자인 길드가 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 길드이름 = '시험길드261';
  try {
    await test.step('일반 회원이 혼자 길드를 만든다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 골드맞추기(game, 1000);
      await 내가길드만들기(game, 길드이름);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('길드 창을 연다', async () => {
      const 창 = await 길드창.열기(game);
      await verify('길드 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', await 창.배치문제들(), []);
      await verify('길드 창 위쪽에 「「<길드>」 · 길드원 1명」이 보인다', (await 창.머리글()).includes(`「${길드이름}」 · 길드원 1명`), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
