import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-018',
  name: '로그인 화면의 「비밀번호」 입력칸은 글자가 가려지는 칸이다',
  platforms: ['android'],
  precondition: ['앱을 새로 깔아 처음 켠 상태다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면이 열렸는지 확인한다', async () => {
    await verify('로그인 화면이 보인다', await 로그인.열려있나(), true, { blocker: true });
  });

  await test.step('「비밀번호」 입력칸을 확인한다', async () => {
    await verify(
      '로그인 화면의 「비밀번호」 입력칸은 글자가 가려지는 칸이다',
      await 로그인.비밀번호칸.getAttribute('password'),
      'true',
    );
  });
});
