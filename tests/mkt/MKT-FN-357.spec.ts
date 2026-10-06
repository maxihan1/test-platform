import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 임시회원가입, 임시회원정보, 임시회원지우기 } from './components/account.component.js';
import { 주문취소 } from './components/data.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 결제완료주문만들기, 주문상태 } from './components/member-helpers.component.js';
import { 주문상세화면 } from './pages/my-order-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-357',
  name: '「기타」 사유를 비우고 「취소 신청」을 누르면 주문이 취소되지 않는다',
  techniques: ['동등 분할', '상태 전이'],
  precondition: ['새로 만든 회원으로 로그인해 있다', '결제완료 주문이 하나 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 상세 = new 주문상세화면(page);
  const 헤더 = new 머리글(page);
  const 회원 = 임시회원정보();
  let 주문번호 = '';

  try {
    await test.step('로그인 요청으로 새 회원을 만들어 로그인한다', async () => {
      await 임시회원가입(page.request, 회원);
      await API로그인(page.request, 회원.loginId, 회원.password);
    });

    await test.step('새로 만든 회원으로 로그인해 있는지 확인한다', async () => {
      await 안내창끄기(page);
      await page.goto('/');
      await 헤더.로그아웃버튼.waitFor();
      await verify('로그인한 머리글에 인사말이 보인다', await 헤더.인사.isVisible(), true, { blocker: true });
    });

    await test.step('장바구니에 상품을 담아 주문한다', async () => {
      주문번호 = (await 결제완료주문만들기(page.request)).주문번호;
    });

    await test.step('결제완료 주문이 하나 있는지 확인한다', async () => {
      await 상세.열기(주문번호);
      await 상세.불러오기기다리기();
      await verify('주문 상세의 상태가 「결제완료」로 보인다', await 상세.상태표시.innerText(), '결제완료', { blocker: true });
    });

    await test.step('「주문 취소」 모달에서 「기타」를 고르고 사유를 비운 채 「취소 신청」을 누른다', async () => {
      await 상세.취소모달열기();
      await 상세.사유고르기('기타');
      await 상세.취소신청버튼.click();
      await 상세.모달오류.waitFor();
      await verify('「기타」 사유를 비우고 「취소 신청」을 누르면 주문이 취소되지 않는다', await 주문상태(page.request, 주문번호), '결제완료');
    });

    await test.step('주문을 취소한 뒤 그 주문 상세를 다시 연다', async () => {
      await 주문취소(page.request, 주문번호);
      await 상세.열기(주문번호);
      await 상세.불러오기기다리기();
      await verify('취소한 주문의 상태는 「주문취소」다', await 상세.상태표시.innerText(), '주문취소', { blocker: true });
      await verify('결제완료가 아닌 주문에는 「주문 취소」 버튼이 보이지 않는다', await 상세.주문취소버튼.isVisible(), false);
    });
  } finally {
    if (주문번호) await 주문취소(page.request, 주문번호);
    await 임시회원지우기(page.request, 회원);
  }
});
