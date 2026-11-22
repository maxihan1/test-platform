import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-490',
  name: '로그인 창을 읽으면 로그인 화면에 로그인 창 제목 「로그인」이 보인다',
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

  await test.step('로그인 창을 읽는다', async () => {
    await verify('로그인 창을 읽으면 로그인 화면에 로그인 창 제목 「로그인」이 보인다', await 화면.제목글(), '로그인');
  });
});
