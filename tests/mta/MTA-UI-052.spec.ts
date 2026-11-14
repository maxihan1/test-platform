import { defineCase, test, verify } from '@platform/kit';

import { 개인정보까지 } from './helpers/onboarding.helper.js';
import { 개인정보화면 } from './pages/privacy.page.js';
import { 가입양식화면 } from './pages/signup-form.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-052',
  name: '우리 서버 가입 양식에는 가입 사유 · 「생년월일」 칸이 보이지 않는다',
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
    const 사유 = await verify('가입 사유 칸이 보이지 않는다', await 양식.사유칸수(), 0);
    const 생년월일 = await verify('「생년월일」 칸이 보이지 않는다', await 양식.글자가보이나('생년월일'), false);
    await verify('우리 서버 가입 양식에는 가입 사유 · 「생년월일」 칸이 보이지 않는다', 사유 && 생년월일, true);
  }, { capture: true });
});
