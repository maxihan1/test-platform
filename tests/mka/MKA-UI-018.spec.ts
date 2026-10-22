import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-018',
  name: '로그인 화면의 비밀번호 입력칸은 가려져 보인다',
  platforms: ['android'],
  precondition: ['앱을 켜 로그인 화면에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면이 떴는지 확인한다', async () => {
    await verify('로그인 화면이 떠 있다', await 로그인.로그인버튼보일때까지(), true, { blocker: true });
  });

  await test.step('비밀번호 입력칸에 글자를 적는다', async () => {
    await 로그인.비밀번호적기('abcd1234');
    await verify('로그인 화면의 비밀번호 입력칸은 가려져 보인다', await 로그인.비밀번호가림(), 'true');
  }, { capture: true });
});
