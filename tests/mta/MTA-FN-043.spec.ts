import { defineCase, test, verify } from '@platform/kit';

import { 가입서버고르기 } from './helpers/onboarding.helper.js';
import { 개인정보화면 } from './pages/privacy.page.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';
import { 서버규칙화면 } from './pages/server-rules.page.js';
import { 가입양식화면 } from './pages/signup-form.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-043',
  name: '가입 경로에서 우리 서버를 고르고 진행하면 서버 규칙 · 개인정보 동의를 거쳐 앱 안 가입 양식으로 이어진다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);
  const 서버화면 = new 서버고르기화면(driver);
  const 규칙 = new 서버규칙화면(driver);
  const 개인 = new 개인정보화면(driver);
  const 양식 = new 가입양식화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('가입 경로에서 우리 서버를 고르고 「동의합니다」를 두 번 누른다', async () => {
    await 가입서버고르기(driver);
    await 서버화면.다음누르기();
    const 규칙열림 = await verify('서버 규칙 화면이 열린다', await 규칙.떴나(), true, { blocker: true });
    await 규칙.동의누르기();
    const 개인열림 = await verify('개인정보 화면이 열린다', await 개인.떴나(), true, { blocker: true });
    await 개인.동의누르기();
    const 양식열림 = await verify('가입 양식이 열린다', await 양식.떴나(), true);
    await verify('가입 경로에서 우리 서버를 고르고 진행하면 서버 규칙 · 개인정보 동의를 거쳐 앱 안 가입 양식으로 이어진다', 규칙열림 && 개인열림 && 양식열림, true);
  }, { capture: true });
});
