import { defineCase, test, verify } from '@platform/kit';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-560',
  name: 'Android 6.0 이상 폰에서 앱을 켜면 시작 화면이 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);

  await test.step('Android 13 폰에서 앱을 켠다', async () => {
    await 시작화면열기(driver);
    await verify('Android 6.0 이상 폰에서 앱을 켜면 시작 화면이 보인다', await 시작.그려질때까지(), true);
  });
});
