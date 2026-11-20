import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인창있나, 로그인화면준비, 시작시도, 틀린비밀번호 } from './helpers/login-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 안내창 } from './pages/popup.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-040',
  name: '로그인에 실패하면 접속 안내 창이 뜬 채 로그인 창이 남아 있다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  precondition: ['로그인 화면이 떠 있다'],
  elements: ['state:접속=로그아웃'],
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
    await 로그인화면준비(game, driver);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('일반 회원 아이디와 틀린 비밀번호로 「게임 시작」을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 시작시도(화면, 나, 틀린비밀번호(나));
    const 안내 = await verify('접속 안내 창이 뜬다', (await 안내창.뜰때까지(game, 30_000)) !== null, true, { blocker: true });
    const 로그인창 = await verify('로그인 창이 남아 있다', await 로그인창있나(game), true);
    await verify('로그인에 실패하면 접속 안내 창이 뜬 채 로그인 창이 남아 있다', 안내 && 로그인창, true);
  });
});
