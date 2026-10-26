import { defineCase, test, verify } from '@platform/kit';

import { 두프레임기다리기 } from './helpers/common-tools.helper.js';
import { 로그인한아이디, 일회용회원으로주문만들기 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문상세화면 } from './pages/my-order-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-541',
  name: '「기타」 사유를 비우고 「취소 신청」을 누르면 「취소 사유를 입력하세요」가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['동등 분할'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 주문상세화면(page);
  let 회원아이디 = '';
  let 주문번호 = '';

  await test.step('일회용 회원으로 로그인하고 결제완료 주문을 만든다', async () => {
    await 안내창막기(page);
    const 만듦 = await 일회용회원으로주문만들기(page);
    회원아이디 = 만듦.회원.loginId;
    주문번호 = 만듦.주문번호;
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원아이디, { blocker: true });
  });

  await test.step('결제완료 주문의 취소 모달을 연다', async () => {
    await 상세.열기(주문번호);
    await 상세.취소모달열기();
    await verify('취소 사유를 고르는 모달이 보인다', await 상세.취소모달.창.isVisible(), true, { blocker: true });
  });

  await test.step('「기타」를 고르고 사유를 비운 채 「취소 신청」을 누른 뒤 안내를 확인한다', async () => {
    await 상세.사유고르기('기타');
    await 상세.취소신청누르기();
    await 두프레임기다리기(page);
    const 안내 = (await 상세.모달오류.count()) > 0 ? (await 상세.모달오류.innerText()).trim() : '';
    await verify('「기타」 사유를 비우고 「취소 신청」을 누르면 「취소 사유를 입력하세요」가 보인다', 안내, '취소 사유를 입력하세요');
  });
});
