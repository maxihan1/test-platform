import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면준비, 칸골라질때까지, 칸에서키치기 } from './helpers/login-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-595',
  name: '아이디 칸에서 엔터를 치면 비밀번호 칸으로 간다',
  platforms: ['android'],
  held: '보류 — 엔터 키를 보낼 길 없음',
  precondition: ['로그인 화면이 떠 있다'],
  elements: ['state:접속=로그아웃'],
  params: z.object({
    엔터키: z.string().describe('엔터로 보낼 키 이름 — Unity KeyCode 이름'),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  await test.cleanup('켜 둔 봇 끄기', () => 봇모두끄기(admin));
  await test.step('로그인 화면을 연다', async () => {
    await 로그인화면준비(game, driver);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('아이디 칸에서 엔터를 친다', async () => {
    await 칸에서키치기(game, 로그인화면.아이디칸, params.엔터키);
    await verify('아이디 칸에서 엔터를 치면 비밀번호 칸으로 간다', await 칸골라질때까지(game, 로그인화면.비밀번호칸, 10_000), true);
  });
});
