import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 임시회원가입, 임시회원정보, 임시회원지우기 } from './components/account.component.js';
import { 상품조회, 주문취소 } from './components/data.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 결제완료주문만들기 } from './components/member-helpers.component.js';
import { 주문상세화면 } from './pages/my-order-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-355',
  name: '결제완료 주문에서 「주문 취소」를 누르면 취소 사유 「단순 변심」 · 「상품 정보 상이」 · 「배송 지연」 · 「기타」를 고르는 모달이 뜬다',
  precondition: ['새로 만든 회원으로 로그인해 있다', '결제완료 주문이 하나 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 상세 = new 주문상세화면(page);
  const 헤더 = new 머리글(page);
  const 회원 = 임시회원정보();
  let 주문번호 = '';
  let 상품 = 0;
  let 재고전 = 0;

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
      const 만든 = await 결제완료주문만들기(page.request);
      주문번호 = 만든.주문번호;
      상품 = 만든.상품;
      재고전 = 만든.재고전;
    });

    await test.step('결제완료 주문이 하나 있는지 확인한다', async () => {
      await 상세.열기(주문번호);
      await 상세.불러오기기다리기();
      await verify('주문 상세의 상태가 「결제완료」로 보인다', await 상세.상태표시.innerText(), '결제완료', { blocker: true });
    });

    await test.step('그 주문 상세에서 「주문 취소」를 누른다', async () => {
      await 상세.취소모달열기();
      await verify(
        '결제완료 주문에서 「주문 취소」를 누르면 취소 사유 「단순 변심」 · 「상품 정보 상이」 · 「배송 지연」 · 「기타」를 고르는 모달이 뜬다',
        { 모달: await 상세.모달.창.isVisible(), 사유: await 상세.사유옵션들() },
        { 모달: true, 사유: ['단순 변심', '상품 정보 상이', '배송 지연', '기타'] },
      );
    });

    await test.step('취소 사유에서 「기타」를 고른다', async () => {
      await 상세.사유고르기('기타');
      await verify('「기타」를 고르면 사유 입력칸이 보인다', await 상세.사유입력칸.isVisible(), true);
    });

    await test.step('사유 입력칸에 「테스트 취소」를 적고 「취소 신청」을 누른다', async () => {
      await 상세.사유입력칸.fill('테스트 취소');
      await 상세.취소신청버튼.click();
      await 상세.주문취소버튼.waitFor({ state: 'detached' });
      await verify('「취소 신청」을 누르면 주문 상태가 「주문취소」로 바뀐다', await 상세.상태표시.innerText(), '주문취소');
    });

    await test.step('취소 뒤 그 상품의 재고를 확인한다', async () => {
      await verify('취소한 수량만큼 재고가 되돌아온다', (await 상품조회(page.request, 상품)).stock, 재고전);
    });
  } finally {
    if (주문번호) await 주문취소(page.request, 주문번호);
    await 임시회원지우기(page.request, 회원);
  }
});
