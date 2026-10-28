import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-055',
  name: '아이디 칸에 앞뒤 공백을 붙여 적으면 칸에는 공백 없이 「user1」만 들어간다',
  platforms: ['android'],
  precondition: ['로그인 화면이 떠 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면을 확인한다', async () => {
    await 로그인.열릴때까지().catch(() => undefined);
    await verify('로그인 화면에 「로그인」 버튼이 보인다', await 로그인.보이나(), true, { blocker: true });
  });

  await test.step('아이디 칸에 앞뒤로 공백을 붙여 「 user1 」을 적는다', async () => {
    await 로그인.아이디적기(' user1 ');
    await verify('아이디 칸에 앞뒤 공백을 붙여 적으면 칸에는 공백 없이 「user1」만 들어간다', await 로그인.아이디칸글(), 'user1');
  }, { capture: true });
});
