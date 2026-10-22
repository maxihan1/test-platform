import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-001',
  name: '앱을 켠 첫 화면에 「로그인」 버튼이 보인다',
  platforms: ['android'],
  precondition: ['앱이 새로 켜졌다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('앱을 켠다', async () => {
    await 로그인.제목나올때까지();
    await verify('앱을 켠 첫 화면에 「로그인」 버튼이 보인다', await 로그인.보이는가(), true);
  });
});
