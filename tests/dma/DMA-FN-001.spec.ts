import { defineCase, test, verify } from '@platform/kit';

import { 앱켜기 } from './helpers/app.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-001',
  name: '앱을 켜면 로그인 화면이 보인다',
  platforms: ['android'],
  smoke: true,
  precondition: ['앱을 새로 깔아 처음 켠 상태다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('앱을 켠다', async () => {
    await 앱켜기(driver);
    await verify('앱을 켜면 로그인 화면이 보인다', await 로그인.열려있나(), true);
  }, { capture: true });
});
