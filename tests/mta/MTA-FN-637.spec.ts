import { defineCase, test, verify } from '@platform/kit';

import { 서버 } from './helpers/app.helper.js';
import { 앱주소열기 } from './helpers/onboarding.helper.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-637',
  name: '로그인된 활성 계정이 없으면 링크 열기는 아무 일도 하지 않는다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('로그인 없이 앱에 hana_photo 프로필 주소를 연다', async () => {
    await 앱주소열기(driver, 'https://' + 서버 + '/@hana_photo');
    await verify('로그인된 활성 계정이 없으면 링크 열기는 아무 일도 하지 않는다', await 시작.떴나(10_000), true);
  }, { capture: true });
});
