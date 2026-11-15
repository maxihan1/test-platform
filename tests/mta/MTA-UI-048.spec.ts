import { defineCase, test, verify } from '@platform/kit';
import { 개인정보화면까지 } from './helpers/signup-flow.helper.js';
import { 개인정보화면 } from './pages/privacy-consent.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-048',
  name: '「당신의 개인정보」 화면에 서버 이용 약관 링크가 보이지 않는다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 개인정보 = new 개인정보화면(driver);

  await test.step('가입 경로에서 우리 서버를 고르고 「당신의 개인정보」 화면을 연다', async () => {
    await 개인정보화면까지(driver);
    await verify('「당신의 개인정보」 화면 안내 글이 보인다', await 개인정보.그려질때까지(), true, { blocker: true });
  });

  await test.step('「당신의 개인정보」 화면의 링크를 확인한다', async () => {
    await verify('「당신의 개인정보」 화면에 서버 이용 약관 링크가 보이지 않는다', await 개인정보.이용약관링크보이나(), false);
  });
});
