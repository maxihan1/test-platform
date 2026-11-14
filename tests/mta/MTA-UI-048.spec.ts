import { defineCase, test, verify } from '@platform/kit';

import { 서버규칙까지 } from './helpers/onboarding.helper.js';
import { 개인정보화면 } from './pages/privacy.page.js';
import { 서버규칙화면 } from './pages/server-rules.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-048',
  name: '서버가 terms_of_service를 알려 주지 않으면(우리 서버는 null) 개인정보 화면에 서버 이용 약관 링크가 없다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);
  const 규칙 = new 서버규칙화면(driver);
  const 개인 = new 개인정보화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('가입 경로에서 우리 서버를 고르고 서버 규칙 화면을 연다', async () => {
    await verify('서버 규칙 화면이 보인다', await 서버규칙까지(driver), true, { blocker: true });
  });
  await test.step('서버 규칙 화면에서 「동의합니다」를 누른다', async () => {
    await 규칙.동의누르기();
    await verify('개인정보 화면이 보인다', await 개인.떴나(), true, { blocker: true });
    await verify('서버가 terms_of_service를 알려 주지 않으면(우리 서버는 null) 개인정보 화면에 서버 이용 약관 링크가 없다', (await 개인.링크제목글자들()).some((글) => /약관|terms/i.test(글)), false);
  }, { capture: true });
});
