import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-012',
  name: '맞는 아이디와 비밀번호로 「게임 시작」을 누르면 로비로 넘어간다',
  platforms: ['android'],
  smoke: true,
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  let 화면 = 로그인화면.지금(game);
  await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인 화면을 기다린다', async () => {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    화면 = await 로그인화면.열기(game);
  });
  await test.step('로그인 화면을 확인한다', async () => {
    await verify('로그인 화면에 「게임 시작」 버튼이 보인다', await 화면.보이나(로그인화면.게임시작), true, { blocker: true });
  });

  await test.step('맞는 아이디와 비밀번호를 넣고 「게임 시작」을 누른다', async () => {
    await 화면.로그인(아이디, 비밀번호);
    const 넘어갔다 = await game.waitFor(로비화면.준비, { timeoutMs: 60_000 }).then(
      () => true,
      () => false,
    );
    await verify('맞는 아이디와 비밀번호로 「게임 시작」을 누르면 로비로 넘어간다', 넘어갔다, true);
  });
});
