import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴, 로그인한아이디, type 회원정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 문의화면 } from './pages/support-inquiry.page.js';
import { 경로 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-413',
  name: '유형을 고르지 않고 「등록」을 누르면 「문의 유형을 선택하세요」가 보인다',
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page }) => {
  const 문의 = new 문의화면(page);
  let 정보!: 회원정보;

  try {
    await test.step('새 회원으로 가입해 로그인한다', async () => {
      await 방해막기(page);
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('새 회원으로 로그인했는지 확인한다', async () => {
      await verify('임시 회원으로 로그인해 있다', await 로그인한아이디(page.request), 정보.loginId, { blocker: true });
    });

    await test.step('1:1 문의 화면을 연다', async () => {
      await 문의.열기();
      await 문의.제목.waitFor();
      await verify('1:1 문의 화면이 열려 있다', 경로(page), 문의화면.주소, { blocker: true });
    });

    await test.step('1:1 문의 화면에서 제목과 내용만 적고 유형을 고르지 않은 채 「등록」을 누른다', async () => {
      await 문의.제목칸.fill('배송 문의');
      await 문의.내용칸.fill('주문한 상품이 언제 오나요');
      await 문의.등록.click();
      await 문의.알림.filter({ hasText: /\S/ }).first().waitFor();
      await verify('유형을 고르지 않고 「등록」을 누르면 「문의 유형을 선택하세요」가 보인다', await 문의.알림글('문의 유형을 선택하세요').isVisible(), true);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
