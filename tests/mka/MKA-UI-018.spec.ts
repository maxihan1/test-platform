import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-018',
  name: '로그인 화면에 비밀번호 입력칸이 가려진 칸으로 보인다',
  platforms: ['android'],
  precondition: ['앱이 로그인 화면에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 화면 = new 로그인화면(driver);

  await test.step('로그인 화면의 비밀번호 입력칸을 확인한다', async () => {
    await 화면.제목이보일때까지();
    await verify('로그인 화면에 비밀번호 입력칸이 가려진 칸으로 보인다', await 화면.비밀번호칸.getAttribute('password'), 'true');
  });
});
