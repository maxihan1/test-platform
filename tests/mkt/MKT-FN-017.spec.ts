import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 나타났나 } from './helpers/visual.helper.js';
import { 이동한화면 } from './pages/home.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-017',
  name: '장바구니로 가다 로그인하면 장바구니 화면으로 돌아간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);
  const 이동 = new 이동한화면(page);

  await test.step('장바구니 화면 주소로 가서 나온 로그인 화면에서 로그인한다', async () => {
    await 방해창막기(page);
    await 이동.주소열기('/cart');
    await 로그인.제목.waitFor();
    await 로그인.머리글.그려질때까지();
    await verify('머리글에 「로그인」 링크가 보인다', await 로그인.머리글.로그인링크.isVisible(), true, { blocker: true });
    await 로그인.로그인하기(params.loginId ?? '', params.loginPassword ?? '');
    await verify('장바구니로 가다 로그인하면 장바구니 화면으로 돌아간다', await 나타났나(이동.장바구니제목), true);
  });
});
