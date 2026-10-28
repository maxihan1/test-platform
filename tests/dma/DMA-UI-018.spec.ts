import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-018',
  name: '비밀번호 칸은 적은 글자가 가려지는 칸이다',
  platforms: ['android'],
  precondition: ['로그인 화면이 떠 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면을 연다', async () => {
    await 로그인.열릴때까지().catch(() => undefined);
    await verify('로그인 화면이 보인다', await 로그인.보이나(), true, { blocker: true });
  });

  await test.step('로그인 화면에서 비밀번호 칸을 확인한다', async () => {
    await verify('비밀번호 칸은 적은 글자가 가려지는 칸이다', await 로그인.비밀번호가려지나(), true);
  }, { capture: true });
});
