import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면보충 } from './pages/common-login.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-006',
  name: '로그인 응답을 기다리는 동안 「로그인」 버튼이 눌리지 않고 글자 대신 로딩 표시가 보인다',
  precondition: ['비회원이다', '로그인 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 보충 = new 로그인화면보충(page);
  let 요청도착알림: () => void = () => undefined;
  const 요청도착 = new Promise<void>((다음) => {
    요청도착알림 = 다음;
  });
  let 응답보내기: () => void = () => undefined;
  const 응답대기 = new Promise<void>((다음) => {
    응답보내기 = 다음;
  });
  await page.context().route('**/api/auth/login', async (route) => {
    요청도착알림();
    await 응답대기;
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'INVALID_CREDENTIALS', message: '아이디 또는 비밀번호가 올바르지 않습니다' }),
    });
  });

  try {
    await test.step('로그인 화면에서 응답을 늦춘 채 「로그인」을 누른다', async () => {
      await 로그인.열기();
      await 보충.로그인제목().waitFor();
      await 로그인.아이디칸().fill('mock-id');
      await 로그인.비밀번호칸().fill('mock-value');
      await 로그인.로그인버튼().click();
      await 요청도착;
      await verify('응답을 기다리는 동안 「로그인」 버튼이 눌리지 않는다', await 보충.처리중버튼().isDisabled(), true);
      await verify(
        '응답을 기다리는 동안 버튼 글자 대신 로딩 표시가 보인다',
        [await 보충.로딩표시().isVisible(), await 보충.처리중버튼().innerText()],
        [true, ''],
      );
    });
  } finally {
    응답보내기();
    await page.context().unrouteAll({ behavior: 'wait' });
  }
});
