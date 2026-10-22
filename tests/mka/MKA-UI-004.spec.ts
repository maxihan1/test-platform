import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리줄 } from './components/top-bar.component.js';
import { 뒤로버튼글, 왼쪽에있나 } from './helpers/screen-tools.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-004',
  name: '장바구니 화면 맨 위 줄 왼쪽에 「←」 버튼이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 머리 = new 머리줄(driver);
  const 목록 = new 상품목록화면(driver);
  const 장바구니 = new 장바구니화면(driver);

  await test.step('일반 회원으로 로그인한다', async () => {
    await verify('상품 목록이 보인다', await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? ''), true, {
      blocker: true,
    });
  });

  await test.step('상품 목록에서 「장바구니」를 누른다', async () => {
    await 목록.장바구니버튼.click();
    await 장바구니.열릴때까지();
    const 버튼 = await verify('「←」 버튼이 보인다', await 뒤로버튼글(driver), '←');
    const 왼쪽 = await verify('「←」 버튼이 맨 위 줄 왼쪽에 있다', await 왼쪽에있나(머리.뒤로, 머리.제목), true);
    await verify('장바구니 화면 맨 위 줄 왼쪽에 「←」 버튼이 보인다', 버튼 && 왼쪽, true);
  });
});
