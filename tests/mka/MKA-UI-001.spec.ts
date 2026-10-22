import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-001',
  name: '앱을 켜면 첫 화면에 「로그인」 버튼이 보인다',
  platforms: ['android'],
  precondition: ['앱을 막 설치했다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 화면 = new 로그인화면(driver);

  await test.step(
    '앱을 켠다',
    async () => {
      await verify('앱을 켜면 첫 화면에 「로그인」 버튼이 보인다', await 화면.열릴때까지(), true);
    },
    { capture: true },
  );
});
