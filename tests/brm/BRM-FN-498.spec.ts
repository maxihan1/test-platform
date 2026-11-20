import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로그인화면준비 } from './helpers/login-tools.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-498',
  name: '비밀번호 칸이 비어 있으면 안내 글 「비밀번호」가 보인다',
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
  const 화면 = await 로그인화면준비(game, driver);
  await test.step('로그인 화면을 연다', async () => {
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
    await 화면.비밀번호넣기('');
    await verify('비밀번호 칸이 비어 있다', await 화면.비밀번호칸글(), '', { blocker: true });
  });
  await test.step('비밀번호 칸 안내 글을 읽는다', async () => {
    await verify('비밀번호 칸이 비어 있으면 안내 글 「비밀번호」가 보인다', await 화면.비밀번호안내글(), '비밀번호');
  });
  await test.step('비밀번호 칸에 비밀번호를 넣는다', async () => {
    await 화면.비밀번호넣기(나.비밀번호);
    await verify('비밀번호 칸에 넣은 글자는 가려져 보인다', /^\*+$/.test(await 화면.비밀번호칸글()), true);
  });
});
