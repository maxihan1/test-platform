import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면준비, 시작시도 } from './helpers/login-tools.helper.js';
import { 게임다시켜기, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-014',
  name: '로그인한 뒤 게임을 다시 켜면 비밀번호 칸은 비어 있다',
  platforms: ['android'],
  precondition: ['로그인 화면이 떠 있다'],
  elements: ['state:접속=로그아웃'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('로그인 화면을 연다', async () => {
    await 로그인화면준비(game, driver);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('일반 회원 계정으로 로그인한 뒤 게임을 끄고 다시 켠다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 시작시도(화면, 나);
    const 로비 = await 로비화면.열기(game).then(
      () => true,
      () => false,
    );
    await verify('로그인해 로비가 보인다', 로비, true, { blocker: true });
    await 게임다시켜기(game, driver);
    const 다시 = await 로그인화면.열기(game);
    await 다시.아이디칸이될때까지(나.아이디);
    await verify('로그인한 뒤 게임을 다시 켜면 비밀번호 칸은 비어 있다', await 다시.비밀번호칸글(), '');
  });
});
