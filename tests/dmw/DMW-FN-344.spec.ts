import { defineCase, test, verify } from '@platform/kit';

import { 홈배너 } from './components/banner.component.js';
import { 일회용회원만들기 } from './helpers/account.helper.js';
import { 로그인한아이디, 화면으로로그인 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-344',
  name: '응답이 1.5초 늦어도 로그인하면 홈 화면으로 간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 홈 = new 홈배너(page);
  const 경로 = /\/api\/auth\/login/;
  let 회원 = { loginId: '', password: '' };

  await test.step('일회용 회원을 만든다', async () => {
    await 안내창막기(page);
    회원 = await 일회용회원만들기(request);
  });

  await test.step('비회원임을 확인한다', async () => {
    await verify('비회원이다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  try {
    await test.step('로그인 응답을 1.5초 늦춘 채 로그인한다', async () => {
      await page.context().route(경로, async (길) => {
        await new Promise((끝) => setTimeout(끝, 1500));
        await 길.continue();
      });
      await 화면으로로그인(page, 회원.loginId, 회원.password);
      await 홈.그려질때까지();
      await verify('응답이 1.5초 늦어도 로그인하면 홈 화면으로 간다', new URL(page.url()).pathname, '/');
    });
  } finally {
    await page.context().unroute(경로);
  }
});
