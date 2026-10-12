import { defineCase, test, verify } from '@platform/kit';

import { 내정보, 새회원으로로그인, 탈퇴, type 회원정보 } from './helpers/account.helper.js';
import { 주문목록모킹 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 내주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-343',
  name: '주문 내역에 「결제완료」 · 「배송중」 · 「배송완료」 · 「주문취소」 상태가 서로 다른 색으로 보인다',
  precondition: ['주문 목록 응답은 네 상태 주문이 든 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 정보: 회원정보 | undefined;
  const 내주문 = new 내주문내역화면(page);

  try {
    await test.step('회원으로 로그인한다', async () => {
      await 방해막기(page);
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('회원으로 로그인했는지 확인한다', async () => {
      await verify('회원으로 로그인해 있다', (await 내정보(page.request)).loginId === 정보?.loginId, true, { blocker: true });
    });

    await test.step('마이페이지 주문 내역을 연다', async () => {
      const 해제 = await 주문목록모킹(page, [
        { id: 'DM20260101-0001', createdAt: Date.now(), status: '결제완료', total: 10000, title: '모킹 상품 가' },
        { id: 'DM20260101-0002', createdAt: Date.now(), status: '배송중', total: 20000, title: '모킹 상품 나' },
        { id: 'DM20260101-0003', createdAt: Date.now(), status: '배송완료', total: 30000, title: '모킹 상품 다' },
        { id: 'DM20260101-0004', createdAt: Date.now(), status: '주문취소', total: 40000, title: '모킹 상품 라' },
      ]);
      try {
        await 내주문.열기();
        const 색들 = await 내주문.상태색들();
        await verify(
          '주문 내역에 「결제완료」 · 「배송중」 · 「배송완료」 · 「주문취소」 상태가 서로 다른 색으로 보인다',
          [색들.map((색) => 색.split('|')[0]).join(','), new Set(색들.map((색) => 색.split('|').slice(1).join('|'))).size],
          ['결제완료,배송중,배송완료,주문취소', 4],
        );
      } finally {
        await 해제();
      }
    });
  } finally {
    if (정보 !== undefined) await 탈퇴(page.request);
  }
});
