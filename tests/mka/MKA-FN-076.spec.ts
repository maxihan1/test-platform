import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-076',
  name: '「로그아웃」을 누르면 확인 없이 로그인 화면으로 간다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);

  await test.step('로그인 화면에서 일반 회원으로 로그인한다', async () => {
    await verify('상품 목록이 보인다', await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? ''), true, { blocker: true });
  });

  await test.step('상품 목록에서 「로그아웃」을 누른다', async () => {
    await 목록.로그아웃버튼.click();
    const 로그인 = await verify('로그인 화면이 보인다', await new 로그인화면(driver).열릴때까지(), true);
    const 확인없음 = await verify('확인 창이 보이지 않는다', await new 확인창(driver).보이는가(), false);
    await verify('「로그아웃」을 누르면 확인 없이 로그인 화면으로 간다', 로그인 && 확인없음, true);
  });
});
