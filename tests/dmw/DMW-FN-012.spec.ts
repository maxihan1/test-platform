import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 알림글지우기, 읽지않은알림만들기 } from './helpers/member-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-012',
  name: '읽지 않은 알림이 있을 때 알림 목록을 열면 알림 수 배지가 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 홈 = new 홈화면(page);
  let 글번호: number | undefined;
  await 안내창막기(page);
  await 일회용회원으로로그인(page);

  try {
    await test.step('읽지 않은 알림이 있는 홈 화면을 연다', async () => {
      글번호 = await 읽지않은알림만들기(page.request, request);
      await 홈.열기();
      await 홈.머리.알림수.waitFor();
      await verify('읽지 않은 알림 수 「1」이 보인다', await 홈.머리.알림수.innerText(), '1', { blocker: true });
    });

    await test.step('읽지 않은 알림이 있을 때 알림 종을 누른다', async () => {
      const 읽음응답 = page.waitForResponse((r) => r.url().includes('/api/notifications/read'));
      await 홈.머리.알림종.click();
      await 읽음응답;
      await 홈.머리.알림목록.waitFor();
      await verify('읽지 않은 알림이 있을 때 알림 목록을 열면 알림 수 배지가 보이지 않는다', await 홈.머리.알림수.isVisible(), false);
    });
  } finally {
    await 알림글지우기(page.request, 글번호);
  }
});
