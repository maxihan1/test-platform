import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 문의화면 } from './pages/support-inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-272',
  name: '1:1 문의에 「답변 알림 이메일 받기」 체크박스가 보인다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 문의 = new 문의화면(page);

  try {
    await test.step('회원으로 로그인한다', async () => {
      await 방해막기(page);
      await 새회원으로로그인(page.request);
    });

    await test.step('회원으로 로그인했는지 확인한다', async () => {
      await verify('회원으로 로그인해 있다', (await 세션사용자(page.request)) !== null, true, { blocker: true });
    });

    await test.step('1:1 문의 화면을 연다', async () => {
      await 문의.열기();
      await 문의.제목.waitFor();
      await verify('1:1 문의에 「답변 알림 이메일 받기」 체크박스가 보인다', await 문의.알림메일.isVisible(), true);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
