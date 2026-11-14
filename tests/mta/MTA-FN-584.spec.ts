import { defineCase, test, verify } from '@platform/kit';

import { 가입값만들기, 가입양식까지, 가입양식채우기, 사용자명만들기 } from './helpers/onboarding.helper.js';
import { 가입양식화면 } from './pages/signup-form.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-584',
  name: '사용자명 31자로 가입하면 사용자명 칸에 서버 오류 문구가 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);
  const 양식 = new 가입양식화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('가입 경로에서 우리 서버를 고르고 가입 양식을 연다', async () => {
    await verify('가입 양식이 보인다', await 가입양식까지(driver), true, { blocker: true });
  });
  await test.step('가입 양식 사용자명에 31자를 적고 「다음」을 누른다', async () => {
    await 가입양식채우기(양식, 가입값만들기({ 사용자명: 사용자명만들기(31) }));
    await 양식.다음누르기();
    await verify('사용자명 31자로 가입하면 사용자명 칸에 서버 오류 문구가 보인다', (await 양식.줄오류글('사용자명', 15_000)) !== '', true);
  }, { capture: true });
});
