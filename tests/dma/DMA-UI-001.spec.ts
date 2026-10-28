import { defineCase, test, verify } from '@platform/kit';

import { 앱다시켜기 } from './helpers/app.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-001',
  name: '앱을 켜면 첫 화면으로 로그인 화면이 보인다',
  platforms: ['android'],
  precondition: ['앱을 새로 켰다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('앱을 켠다', async () => {
    await 앱다시켜기(driver);
    await 로그인.열릴때까지().catch(() => undefined);
    await verify('앱을 켜면 첫 화면으로 로그인 화면이 보인다', await 로그인.보이나(), true);
  }, { capture: true });
});
