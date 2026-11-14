import { defineCase, test, verify } from '@platform/kit';

import { 서버 } from './helpers/app.helper.js';
import { 개인정보까지 } from './helpers/onboarding.helper.js';
import { 개인정보화면 } from './pages/privacy.page.js';
import { 가입양식화면 } from './pages/signup-form.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-051',
  name: '가입 양식 「사용자명」 칸 오른쪽에 @mastodon.maxihan.com이 붙어 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);
  const 개인 = new 개인정보화면(driver);
  const 양식 = new 가입양식화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('가입 경로에서 우리 서버를 고르고 개인정보 화면을 연다', async () => {
    await verify('개인정보 화면이 보인다', await 개인정보까지(driver), true, { blocker: true });
  });
  await test.step('개인정보 화면에서 「동의합니다」를 누른다', async () => {
    await 개인.동의누르기();
    await verify('가입 양식이 보인다', await 양식.떴나(), true, { blocker: true });
    await verify('가입 양식 「사용자명」 칸 오른쪽에 @mastodon.maxihan.com이 붙어 보인다', await 양식.도메인글(), '@' + 서버);
  }, { capture: true });
});
