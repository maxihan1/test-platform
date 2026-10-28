import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 맨위줄 } from './components/top-bar.component.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 주문내역열기 } from './helpers/order.helper.js';
import { 주문내역화면 } from './pages/order-list.page.js';
import { 주문상세화면 } from './pages/order-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-138',
  name: '주문 내역 버튼 반응',
  platforms: ['android'],
  precondition: ['주문이 하나 이상 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 내역 = new 주문내역화면(driver);
  const 상세 = new 주문상세화면(driver);

  await test.step('일반 회원 계정으로 로그인해 주문 내역을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await 주문내역열기(driver);
    await verify('주문이 하나 이상 있다', (await 내역.카드들()).length > 0, true, { blocker: true });
  });

  await test.step('주문 내역에서 주문 카드를 누른다', async () => {
    const 카드 = (await 내역.카드들())[0];
    if (카드 !== undefined) await 내역.주문열기(카드);
    await 상세.열릴때까지().catch(() => undefined);
    await verify('주문 내역에서 주문 카드를 누르면 주문 상세로 간다', await 상세.보이나(), true);
    await driver.back();
    await 내역.열릴때까지();
  });

  await test.step('주문 내역에서 「←」를 누른다', async () => {
    await new 맨위줄(driver).뒤로();
    await 목록.열릴때까지().catch(() => undefined);
    await verify('주문 내역에서 「←」를 누르면 상품 목록으로 돌아간다', await 목록.보이나(), true);
  });
});
