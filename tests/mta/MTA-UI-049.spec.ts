import { defineCase, test, verify } from '@platform/kit';

import { 개인정보까지 } from './helpers/onboarding.helper.js';
import { 개인정보화면 } from './pages/privacy.page.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';
import { 서버규칙화면 } from './pages/server-rules.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-049',
  name: '개인정보 화면에서 「<서버>에 대해 비동의」를 누르면 규칙 화면까지 닫고 서버 고르기로 돌아간다',
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

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('가입 경로에서 우리 서버를 고르고 개인정보 화면을 연다', async () => {
    await verify('개인정보 화면이 보인다', await 개인정보까지(driver), true, { blocker: true });
  });
  await test.step('개인정보 화면에서 「mastodon.maxihan.com에 대해 비동의」를 누른다', async () => {
    await 개인.비동의누르기();
    const 고르기열림 = await verify('서버 고르기 화면이 보인다', await 서버화면.떴나(), true);
    const 규칙닫힘 = await verify('서버 규칙 화면이 닫혀 있다', await 규칙.닫혔나(), true);
    await verify('개인정보 화면에서 「<서버>에 대해 비동의」를 누르면 규칙 화면까지 닫고 서버 고르기로 돌아간다', 고르기열림 && 규칙닫힘, true);
  }, { capture: true });
});
