import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 문의화면 } from './pages/support-inquiry.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-219',
  name: '1:1 문의 유형 선택 상자에 「주문」 · 「배송」 · 「상품」 · 「기타」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 문의화면(page);
  let 회원아이디 = '';

  await test.step('일회용 회원으로 로그인한다', async () => {
    await 안내창막기(page);
    회원아이디 = (await 일회용회원으로로그인(page)).loginId;
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원아이디, { blocker: true });
  });

  await test.step('1:1 문의 화면을 연다', async () => {
    await 화면.열기();
    await verify('1:1 문의 화면이 보인다', await 화면.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('1:1 문의 유형 선택 상자를 확인한다', async () => {
    const 고른것 = (await 화면.유형.getByRole('option').allInnerTexts()).filter((글) => 글 !== '유형을 선택하세요');
    await verify('1:1 문의 유형 선택 상자에 「주문」 · 「배송」 · 「상품」 · 「기타」가 보인다', 고른것.join(', '), '주문, 배송, 상품, 기타');
  });
});
