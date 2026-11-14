import { defineCase, test, verify } from '@platform/kit';

import { 가입값만들기, 가입양식까지, 가입양식채우기, 사용자명만들기 } from './helpers/onboarding.helper.js';
import { 이메일확인화면 } from './pages/email-confirm.page.js';
import { 가입양식화면 } from './pages/signup-form.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-084',
  name: '사용자명 30자로 가입하면 이메일 확인 화면으로 간다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
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
  await test.step('가입 양식 사용자명에 tc_signup 으로 시작하는 31자를 적고 「다음」을 누른다', async () => {
    await 가입양식채우기(양식, 가입값만들기({ 사용자명: 사용자명만들기(31) }));
    await 양식.다음누르기();
    await verify('사용자명 31자에서는 사용자명 칸에 오류가 붙는다', (await 양식.줄오류글('사용자명', 15_000)) !== '', true);
  });
  await test.step('가입 양식 사용자명에 tc_signup 으로 시작하는 30자를 적고 「다음」을 누른다', async () => {
    await 양식.적기('사용자명', 사용자명만들기(30));
    await 양식.다음누르기();
    await verify('사용자명 30자로 가입하면 이메일 확인 화면으로 간다', await 확인.떴나(), true);
  }, { capture: true });
});
