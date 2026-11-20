import { defineCase, test, verify } from '@platform/kit';

import { 지금화면 } from './helpers/game-enter.helper.js';
import { 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로그인화면준비 } from './helpers/login-tools.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-497',
  name: '아이디 칸이 비어 있으면 안내 글 「아이디」가 보인다',
  platforms: ['android'],
  precondition: ['로그인 화면이 떠 있다'],
  elements: ['state:접속=로그아웃'],
  params: null,
  expected: null,
});

test(spec, async ({ game, driver, admin }) => {
  await test.cleanup('켜 둔 봇 끄기', () => 봇모두끄기(admin));
  const 화면 = await 로그인화면준비(game, driver);
  await test.step('로그인 화면을 연다', async () => {
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
    await 화면.아이디넣기('');
    await verify('아이디 칸이 비어 있다', await 화면.아이디칸글(), '', { blocker: true });
  });
  await test.step('아이디 칸 안내 글을 읽는다', async () => {
    await verify('아이디 칸이 비어 있으면 안내 글 「아이디」가 보인다', await 화면.아이디안내글(), '아이디');
  });
});
