import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 상품상세열기 } from './helpers/cart.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';
import { 상품상세화면 } from './pages/product-detail.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-397',
  name: '토스트가 뜨고 정해 둔 시간이 지나면 사라진다',
  platforms: ['android'],
  precondition: ['옵션 있는 상품 상세 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    productName: z.string().describe('옵션 있는 상품 — 색상 · 사이즈 옵션이 있는 상품').default('데모 니트 가디건'),
    toastLimitSeconds: z.number().describe('토스트가 사라질 때까지의 상한(초)').default(10),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 상세 = new 상품상세화면(driver);
  const 알림 = new 토스트(driver);

  await test.step('일반 회원 계정으로 로그인한다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('옵션 있는 상품 상세 화면을 연다', async () => {
    await 상품상세열기(driver, params.productName);
    await verify('상품 상세에 옵션이 있다', await 상세.옵션있나(), true, { blocker: true });
  });

  await test.step('옵션을 고르지 않고 「장바구니 담기」를 눌러 토스트를 띄운다', async () => {
    await 상세.담기();
    await 알림.뜰때까지().catch(() => undefined);
    const 떴다 = await verify('토스트가 뜬다', await 알림.보이나(), true);
    await 알림.사라질때까지(params.toastLimitSeconds * 1000).catch(() => undefined);
    const 사라졌다 = await verify('정해 둔 시간이 지나면 토스트가 사라진다', !(await 알림.보이나()), true);
    await verify('토스트가 뜨고 정해 둔 시간이 지나면 사라진다', 떴다 && 사라졌다, true);
  }, { capture: true });
});
