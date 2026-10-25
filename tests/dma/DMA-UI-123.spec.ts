import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-123',
  name: '로그인 화면에서 「로그인」 버튼을 누를 수 있다',
  platforms: ['android'],
  precondition: ['앱을 새로 깔아 처음 켠 상태다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면의 「로그인」 버튼을 확인한다', async () => {
    await 로그인.열려있나();
    await verify('로그인 화면에서 「로그인」 버튼을 누를 수 있다', await 로그인.로그인버튼.isEnabled(), true);
  });
});
