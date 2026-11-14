import { defineCase, test, verify } from '@platform/kit';

import { 앱설치됐나 } from './helpers/onboarding.helper.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-641',
  name: 'Android 6.0 폰에 앱을 깔면 앱은 Android 6.0(API 23) 이상에서 설치된다',
  platforms: ['android'],
  held: '보류 — Android 6.0 폰',
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('Android 6.0 폰에 앱을 깐다', async () => {
    await verify('Android 6.0 폰에 앱을 깔면 앱은 Android 6.0(API 23) 이상에서 설치된다', await 앱설치됐나(driver), true);
  }, { capture: true });
});
