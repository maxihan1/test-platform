import { defineCase, test, verify } from '@platform/kit';

import { 가입값만들기, 가입양식까지, 가입양식채우기 } from './helpers/onboarding.helper.js';
import { 가입양식화면 } from './pages/signup-form.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-056',
  name: '가입 양식에 이름을 비우고 나머지 칸을 맞게 적으면 가입 양식 「이름」(표시 이름)은 비워도 되고 「다음」이 켜지는 조건이 아니다',
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
  await test.step('가입 양식에 이름을 비우고 나머지 칸을 맞게 적는다', async () => {
    await 가입양식채우기(양식, 가입값만들기({ 이름: '' }));
    await verify('가입 양식에 이름을 비우고 나머지 칸을 맞게 적으면 가입 양식 「이름」(표시 이름)은 비워도 되고 「다음」이 켜지는 조건이 아니다', await 양식.다음켜졌나(), true);
  }, { capture: true });
});
