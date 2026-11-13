import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임다시켜기 } from './helpers/device.helper.js';
import { 로그인화면까지 } from './helpers/login.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 로비 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-006',
  name: '로그인한 뒤 게임을 다시 켜면 아이디 칸에 마지막으로 넣은 아이디가 들어 있다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, params }) => {
  await test.step('로그인 화면을 연다', async () => {
    const 화면 = await 로그인화면까지(game);
    await verify('로그인 화면의 「게임 시작」이 보인다', await 화면.게임시작누를수있는지(), true, { blocker: true });
  });

  let 다시켠화면 = 로그인화면.지금(game);
  await test.step('아이디를 넣고 로그인한 뒤 게임을 끄고 다시 켠다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 화면.로그인(params.loginId ?? '', params.loginPassword ?? '');
    await 로비.열기(game);
    다시켠화면 = await 게임다시켜기(driver, game);
  });

  await test.step('아이디 칸을 확인한다', async () => {
    const 들어있다 = await 다시켠화면.아이디가될때까지(params.loginId ?? '');
    await verify('로그인한 뒤 게임을 다시 켜면 아이디 칸에 마지막으로 넣은 아이디가 들어 있다', 들어있다, true);
  });
});
