import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 기본회원으로로그인, 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상태별주문번호 } from './helpers/my-page.helper.js';
import { 주문상세화면 } from './pages/order-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-245',
  name: '「주문 취소」를 누르면 모달에 취소 사유 「단순 변심」 · 「상품 정보 상이」 · 「배송 지연」 · 「기타」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 주문상세 = new 주문상세화면(page);

  await test.step('회원으로 로그인한다', async () => {
    await 방해창막기(page);
    await 기본회원으로로그인(page.request, params.loginId ?? '', params.loginPassword ?? '');
  });

  await test.step('로그인한 상태를 확인한다', async () => {
    await verify('세션에 회원이 있다', await 세션회원있는가(page.request), true, { blocker: true });
  });

  await test.step('결제완료 주문 상세 화면을 연다', async () => {
    await 주문상세.열기(await 상태별주문번호(page.request, '결제완료'));
  });

  await test.step('결제완료 주문 상세가 열렸는지 확인한다', async () => {
    await verify('주문 상태가 「결제완료」다', await 주문상세.상태글자(), '결제완료', { blocker: true });
  });

  await test.step('「결제완료」 주문 상세에서 「주문 취소」를 누른다', async () => {
    await 주문상세.취소모달열기();
    await verify(
      '「주문 취소」를 누르면 모달에 취소 사유 「단순 변심」 · 「상품 정보 상이」 · 「배송 지연」 · 「기타」가 보인다',
      (await 주문상세.사유목록()).join(', '),
      '단순 변심, 상품 정보 상이, 배송 지연, 기타',
    );
  });
});
