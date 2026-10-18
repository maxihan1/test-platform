import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 기본회원으로로그인, 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-399',
  name: '주문 상태 「결제완료」 · 「배송중」 · 「배송완료」 · 「주문취소」가 서로 다른 색으로 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['주문 목록 응답은 가짜 응답(모킹)이다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 주문내역 = new 주문내역화면(page);
  const 주문목록주소 = /\/api\/orders\?period=/;

  try {
    await test.step('회원으로 로그인한다', async () => {
      await 방해창막기(page);
      await 기본회원으로로그인(page.request, params.loginId ?? '', params.loginPassword ?? '');
    });

    await test.step('로그인한 상태를 확인한다', async () => {
      await verify('세션에 회원이 있다', await 세션회원있는가(page.request), true, { blocker: true });
    });

    await test.step('주문 목록 응답을 네 상태 주문이 든 가짜 응답으로 바꾼다', async () => {
      const 지금 = Date.now();
      const 상태들 = ['결제완료', '배송중', '배송완료', '주문취소'];
      const 주문들 = 상태들.map((상태, i) => ({ id: `DM20260101-000${i + 1}`, createdAt: 지금 - i * 86400000, status: 상태, total: 10000 * (i + 1), title: `시험 상품 ${i + 1}` }));
      await page.context().route(주문목록주소, (경로) =>
        경로.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: 주문들, total: 4, page: 1, size: 4 }) }),
      );
    });

    await test.step('네 상태 주문이 든 주문 내역을 연다', async () => {
      await 주문내역.열기();
      await verify('주문 내역에 네 줄이 보인다', await 주문내역.줄들.count(), 4, { blocker: true });
      const 색들 = await 주문내역.상태색들();
      await verify('주문 상태 「결제완료」 · 「배송중」 · 「배송완료」 · 「주문취소」가 서로 다른 색으로 보인다', new Set(색들).size, 4);
    });
  } finally {
    await page.context().unroute(주문목록주소);
  }
});
