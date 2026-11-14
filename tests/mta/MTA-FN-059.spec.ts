import { defineCase, test, verify } from '@platform/kit';

import { 가입값만들기, 가입양식까지, 가입양식채우기 } from './helpers/onboarding.helper.js';
import { 가입양식화면 } from './pages/signup-form.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-059',
  name: '가입 양식 이메일 끝 글자가 1자면 「다음」이 꺼져 있다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
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
  await test.step('가입 양식 이메일 끝을 1자(tc@maxihan.c)로 적는다', async () => {
    await 가입양식채우기(양식, 가입값만들기({ 이메일: 'tc@maxihan.c' }));
    await verify('가입 양식 이메일 끝 글자가 1자면 「다음」이 꺼져 있다', await 양식.다음켜졌나(), false);
  });
  await test.step('가입 양식 이메일 끝을 2자(tc@maxihan.co)로 적는다', async () => {
    await 양식.적기('이메일', 'tc@maxihan.co');
    await verify('끝 글자 2자에서는 「다음」이 켜진다', await 양식.다음켜졌나(), true);
  }, { capture: true });
});
