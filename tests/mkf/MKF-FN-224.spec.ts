import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 문의화면 } from './pages/support-inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-224',
  name: '빈 1:1 문의에서 「등록」을 누르면 「문의 유형을 선택하세요」가 보인다',
  techniques: ['오류 추정'],
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 문의 = new 문의화면(page);
  const 토스 = new 토스트(page);

  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      await 방해막기(page);
      await 새회원으로로그인(page.request);
    });

    await test.step('새로 가입한 회원으로 로그인했는지 확인한다', async () => {
      await verify('새로 가입한 회원으로 로그인해 있다', (await 세션사용자(page.request)) !== null, true, { blocker: true });
    });

    await test.step('1:1 문의 화면을 연다', async () => {
      await 문의.열기();
      await 문의.제목.waitFor();
      await verify('1:1 문의 화면에 「등록」 버튼이 보인다', await 문의.등록.isVisible(), true, { blocker: true });
    });

    await test.step('1:1 문의에서 모든 칸을 비우고 「등록」을 누른다', async () => {
      await 문의.등록.click();
      await 토스.알림들.first().waitFor();
      await verify('빈 1:1 문의에서 「등록」을 누르면 「문의 유형을 선택하세요」가 보인다', await 토스.글('문의 유형을 선택하세요').first().isVisible(), true);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
