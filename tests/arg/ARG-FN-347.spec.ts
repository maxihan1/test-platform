import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드맞추기, 내가길드만들기, 메인메뉴로나갔다돌아오기 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-347',
  name: '길드가 있는 채 다시 접속하면 길드 창에 그 길드 이름과 「[길드장]」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 길드장인 길드가 있다'],
  techniques: ['상태 전이'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 길드이름 = '시험길드347';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 길드를 만든다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 골드맞추기(game, 1000);
      await 내가길드만들기(game, 길드이름);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('「메인 메뉴로」 나간 뒤 다시 로그인하고 길드 창을 연다', async () => {
      await 메인메뉴로나갔다돌아오기(game, 아이디, 비밀번호);
      const 창 = await 길드창.열기(game);
      const 이름 = await verify('길드 창에 길드 이름이 보인다', (await 창.머리글()).includes(`「${길드이름}」`), true);
      const 길드장 = await verify('「[길드장]」이 보인다', (await 창.줄글들()).some((줄) => 줄.includes('[길드장]')), true);
      await verify('길드가 있는 채 다시 접속하면 길드 창에 그 길드 이름과 「[길드장]」이 보인다', 이름 && 길드장, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
