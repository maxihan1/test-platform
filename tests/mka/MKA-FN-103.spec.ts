import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리줄 } from './components/top-bar.component.js';
import { 상품목록읽기 } from './helpers/api.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-103',
  name: '다른 화면에서 돌아오면 목록이 「전체」 분류 맨 위부터 다시 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 목록 = new 상품목록화면(driver);

  await test.step('로그인 화면에서 일반 회원으로 로그인한다', async () => {
    await verify('상품 목록이 보인다', await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? ''), true, { blocker: true });
  });

  await test.step('「도서」 칩을 누르고 장바구니에 다녀온다', async () => {
    const 전체 = await 상품목록읽기(request, { page: 1, size: 10 });
    const 도서 = await 상품목록읽기(request, { category: '도서', size: 50 });
    await 목록.칩누르기('도서');
    await 목록.총개수바뀔때까지(`총 ${도서.total}개`);
    await 목록.장바구니버튼.click();
    await new 장바구니화면(driver).열릴때까지();
    await new 머리줄(driver).뒤로누르기();
    await 목록.열릴때까지();
    const 총개수 = await verify('「총 {N}개」가 「전체」 분류 상품 수와 같다', await 목록.총개수바뀔때까지(`총 ${전체.total}개`), true);
    const 칩 = await verify('「전체」 칩이 골라진다', await 목록.칩골라졌나('전체'), true);
    const 맨위 = await verify('목록 맨 위 상품이 서버 목록의 첫 상품이다', (await 목록.보이는상품명())[0] ?? '', 전체.items[0]?.name ?? '');
    await verify('다른 화면에서 돌아오면 목록이 「전체」 분류 맨 위부터 다시 보인다', 총개수 && 칩 && 맨위, true);
  });
});
