import { defineCase, test, verify } from '@platform/kit';

import { 개인정보까지 } from './helpers/onboarding.helper.js';
import { 개인정보화면 } from './pages/privacy.page.js';
import { 가입양식화면 } from './pages/signup-form.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-050',
  name: '가입 양식 제목은 「계정 만들기」이고 「이름」 · 「사용자명」 · 「이메일」 · 「암호」 · 「암호 확인」 칸과 「다음」이 보인다',
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
    const 제목 = await verify('양식 제목이 「계정 만들기」다', await 양식.제목이보이나(), true);
    const 이름 = await verify('「이름」 칸이 보인다', await 양식.칸이름('이름'), '이름');
    const 사용자명 = await verify('「사용자명」 칸이 보인다', await 양식.칸이름('사용자명'), '사용자명');
    const 이메일 = await verify('「이메일」 칸이 보인다', await 양식.칸이름('이메일'), '이메일');
    const 암호 = await verify('「암호」 칸이 보인다', await 양식.칸이름('암호'), '암호');
    const 암호확인 = await verify('「암호 확인」 칸이 보인다', await 양식.칸이름('암호확인'), '암호 확인');
    const 다음 = await verify('「다음」 버튼이 보인다', await 양식.다음글(), '다음');
    await verify('가입 양식 제목은 「계정 만들기」이고 「이름」 · 「사용자명」 · 「이메일」 · 「암호」 · 「암호 확인」 칸과 「다음」이 보인다', 제목 && 이름 && 사용자명 && 이메일 && 암호 && 암호확인 && 다음, true);
  }, { capture: true });
});
