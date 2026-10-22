import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-018',
  name: '로그인 화면의 「비밀번호」 입력칸은 글자가 가려져 보인다',
  platforms: ['android'],
  precondition: ['앱이 새로 켜졌다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면을 연다', async () => {
    await 로그인.제목나올때까지();
    await verify('로그인 화면의 「비밀번호」 입력칸은 글자가 가려져 보인다', await 로그인.비밀번호가려졌나(), true);
  });
});
