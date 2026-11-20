import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글자색, 로그인화면준비, 시작시도, 회색인가 } from './helpers/login-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-017',
  name: '「게임 시작」을 누르면 버튼 아래 상태 줄에 회색 「서버에 접속하는 중…」이 보인다',
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
  await test.cleanup('켜 둔 봇 끄기', () => 봇모두끄기(admin));
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.step('로그인 화면을 연다', async () => {
    await 로그인화면준비(game, driver);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('일반 회원 계정으로 「게임 시작」을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 시작시도(화면, 나);
    const 글 = await verify('상태 줄에 「서버에 접속하는 중…」이 보인다', await 화면.상태글이될때까지('서버에 접속하는 중…', 10_000), true);
    const 색 = await verify('상태 줄 글자색이 회색이다', 회색인가(await 글자색(game, 로그인화면.상태줄)), true);
    await verify('「게임 시작」을 누르면 버튼 아래 상태 줄에 회색 「서버에 접속하는 중…」이 보인다', 글 && 색, true);
  });
});
