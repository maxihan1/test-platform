import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 새주문모두취소, 서버로그인, 주문만들기, 주문목록읽기, 주문읽기 } from './helpers/api.helper.js';
import { 원 } from './helpers/app.helper.js';
import { 주문내역열기, 한국날짜, 여러상품주문번호 } from './helpers/cart-order.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문내역화면 } from './pages/order-list.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-092',
  name: '주문 내역 카드마다 주문번호 · 대표 상품명 · 「{주문일} · {결제 금액}」 · 상태가 보인다',
  platforms: ['android'],
  precondition: ['회원의 주문이 있다', '상품이 여러 개인 주문이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    주문상품번호: z.number().describe('주문할 상품 번호 — 옵션이 없고 품절이 아닌 상품').default(34),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  let 앞번호들 = null as string[] | null;
  let 주문번호 = '';
  let 여러번호: string | undefined;
  try {
    await test.step('서버에서 주문을 만든다', async () => {
      await 서버로그인(request, params.loginId ?? '', params.loginPassword ?? '');
      앞번호들 = (await 주문목록읽기(request)).map((주문) => 주문.id);
      주문번호 = await 주문만들기(request, { productId: params.주문상품번호 });
      여러번호 = await 여러상품주문번호(request);
    });

    await test.step('서버에서 상품이 여러 개인 주문을 확인한다', async () => {
      await verify('상품이 여러 개인 주문이 있다', 여러번호 !== undefined, true, { blocker: true });
    });

    await test.step('앱에서 로그인한다', async () => {
      await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? '');
    });

    await test.step('로그인 뒤 화면을 확인한다', async () => {
      await verify('상품 목록이 보인다', await new 상품목록화면(driver).열릴때까지(), true, { blocker: true });
    });

    await test.step('주문 내역을 연다', async () => {
      const 열림 = await 주문내역열기(driver);
      await verify('주문 내역에 카드가 보인다', 열림, true, { blocker: true });
      const 목록 = new 주문내역화면(driver);

      await 목록.카드찾기(주문번호);
      const 주문 = await 주문읽기(request, 주문번호);
      const 번호 = await verify('주문 내역 카드에 주문번호가 보인다', await 목록.카드에글있나(주문번호, 주문.id), true);
      const 상품명 = await verify('주문 내역 카드에 대표 상품명이 보인다', await 목록.카드에글있나(주문번호, 주문.lines[0].name), true);
      const 주문일금액 = await verify('주문 내역 카드에 「{주문일} · {결제 금액}」이 보인다', await 목록.카드에글있나(주문번호, `${한국날짜(주문.createdAt)} · ${원(주문.total)}`), true);
      const 상태 = await verify('주문 내역 카드에 상태가 보인다', await 목록.카드에글있나(주문번호, 주문.status), true);
      await verify('주문 내역 카드마다 주문번호 · 대표 상품명 · 「{주문일} · {결제 금액}」 · 상태가 보인다', 번호 && 상품명 && 주문일금액 && 상태, true);

      const 여러 = await 주문읽기(request, 여러번호 ?? '');
      await 목록.카드찾기(여러.id);
      await verify(
        '상품이 여러 개인 주문 카드의 대표 상품명 뒤에 「외 {N}건」이 보인다',
        await 목록.카드에글있나(여러.id, `${여러.lines[0].name} 외 ${여러.lines.length - 1}건`),
        true,
      );
    });
  } finally {
    if (앞번호들 !== null) await 새주문모두취소(request, 앞번호들);
  }
});
