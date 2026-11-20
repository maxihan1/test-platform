import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임다시켜기, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-038',
  name: '「게임 시작」으로 로그인에 성공하면 로비 화면이 보인다',
  platforms: ['android'],
  smoke: true,
  precondition: ['로그인 화면이 떠 있다'],
  elements: ['zone:CharSelect'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  await test.cleanup('켜 둔 봇 끄기', () => 봇모두끄기(admin));
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.step('로그인 화면을 연다', async () => {
    if ((await 지금화면(game)) !== '로그인') await 게임다시켜기(game, driver);
    await 로그인화면.열기(game);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('일반 회원 계정으로 「게임 시작」을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 화면.아이디넣기(나.아이디);
    await 화면.비밀번호넣기(나.비밀번호);
    await 화면.시작누르기();
    const 로비 = await 로비화면.열기(game).then(
      () => true,
      () => false,
    );
    await verify('「게임 시작」으로 로그인에 성공하면 로비 화면이 보인다', 로비, true);
  });
});
