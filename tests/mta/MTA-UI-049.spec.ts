import { defineCase, test, verify } from '@platform/kit';
import { 개인정보화면까지 } from './helpers/signup-flow.helper.js';
import { 개인정보화면 } from './pages/privacy-consent.page.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-049',
  name: '「당신의 개인정보」 화면에서 「mastodon.maxihan.com에 대해 비동의」를 누르면 서버 고르기 화면으로 돌아간다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 개인정보 = new 개인정보화면(driver);
  const 고르기 = new 서버고르기화면(driver);

  await test.step('가입 경로에서 우리 서버를 고르고 「당신의 개인정보」 화면을 연다', async () => {
    await 개인정보화면까지(driver);
    await verify('「당신의 개인정보」 화면 안내 글이 보인다', await 개인정보.그려질때까지(), true, { blocker: true });
  });

  await test.step('「당신의 개인정보」 화면에서 「mastodon.maxihan.com에 대해 비동의」를 누른다', async () => {
    await 개인정보.비동의누르기();
    await verify('「당신의 개인정보」 화면에서 「mastodon.maxihan.com에 대해 비동의」를 누르면 서버 고르기 화면으로 돌아간다', await 고르기.그려질때까지(), true);
  });
});
