import { defineCase, test, verify } from '@platform/kit';

import { 뒤로, 문구가보이나, 서버 } from './helpers/app.helper.js';
import { 가입값만들기, 가입양식까지, 가입양식채우기 } from './helpers/onboarding.helper.js';
import { 이메일확인화면 } from './pages/email-confirm.page.js';
import { 가입양식화면 } from './pages/signup-form.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-069',
  name: '가입에 성공하면 이메일 확인 화면으로 가며 비활성 상태의 로그인 계정이 생긴다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);
  const 양식 = new 가입양식화면(driver);
  const 확인 = new 이메일확인화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('가입 경로에서 우리 서버를 고르고 가입 양식을 연다', async () => {
    await verify('가입 양식이 보인다', await 가입양식까지(driver), true, { blocker: true });
  });
  await test.step('가입 양식에 tc_signup 으로 시작하는 새 사용자명과 맞는 값을 적고 「다음」을 누른다', async () => {
    const 값 = 가입값만들기();
    await 가입양식채우기(양식, 값);
    await 양식.다음누르기();
    const 확인화면 = await verify('이메일 확인 화면이 보인다', await 확인.떴나(), true);
    await 뒤로(driver);
    const 계정 = await verify('로그인 계정 목록에 새 사용자명이 올라 있다', await 문구가보이나(driver, '@' + 값.사용자명 + '@' + 서버), true);
    await verify('가입에 성공하면 이메일 확인 화면으로 가며 비활성 상태의 로그인 계정이 생긴다', 확인화면 && 계정, true);
  }, { capture: true });
});
