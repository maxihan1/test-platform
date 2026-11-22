import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';
import { 설정창 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'BRP-UI-463',
  name: '로그인 화면에서 소리 설정 톱니바퀴를 누르면 설정 창이 뜬다',
  platforms: ['windows'],
  precondition: ['일반 회원이 로그인 화면에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ game }) => {
  await 로그인화면.열림(game);
  const 설정 = new 설정창(game);

  await test.step('로그인 화면에서 소리 설정 톱니바퀴를 누른다', async () => {
    await 설정.톱니누르기();
    await verify('로그인 화면에서 소리 설정 톱니바퀴를 누르면 설정 창이 뜬다', await 설정.뜰때까지(), true);
  });
});
