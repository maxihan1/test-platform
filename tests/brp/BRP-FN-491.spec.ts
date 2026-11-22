import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-491',
  name: '아이디 칸을 읽으면 로그인 화면의 빈 아이디 칸에 안내 글 「아이디」가 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원이 로그인 화면에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ game }) => {
  const 화면 = await 로그인화면.열림(game);
  await test.step('로그인 화면이 뜬 것을 확인한다', async () => {
    await verify('로그인 화면에 「게임 시작」 버튼이 보인다', (await game.find(로그인화면.게임시작)) !== null, true, { blocker: true });
  });

  await test.step('아이디 칸을 읽는다', async () => {
    await 화면.아이디칸비우기();
    await verify('아이디 칸이 비어 있다', await 화면.아이디칸글(), '', { blocker: true });
    await verify('아이디 칸을 읽으면 로그인 화면의 빈 아이디 칸에 안내 글 「아이디」가 보인다', await 화면.아이디안내글(), '아이디');
  });
});
