import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-001',
  name: '앱을 켜면 로그인 화면의 「로그인」 버튼이 보인다',
  platforms: ['android'],
  precondition: ['앱이 켜져 있지 않다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('앱을 켠다', async () => {
    await 로그인.앱켜기();
    await verify('앱을 켜면 로그인 화면의 「로그인」 버튼이 보인다', await 로그인.로그인버튼보일때까지(), true);
  }, { capture: true });
});
