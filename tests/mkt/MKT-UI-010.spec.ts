import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 로그인요청 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 이동한화면, 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-010',
  name: '회원 머리글에 알림 종 아이콘이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 이동 = new 이동한화면(page);

  await test.step('회원으로 로그인한다', async () => {
    await 방해창막기(page);
    const 상태 = await 로그인요청(page.request, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로그인 응답 코드가 200 이다', 상태, 200, { blocker: true });
  });

  await test.step('회원으로 상품 목록 화면을 연다', async () => {
    await 이동.상품목록열기();
    await 홈.머리글.로그인꼴일때까지();
    await verify('상품 목록 화면 제목 「쇼핑」이 보인다', await 이동.상품목록제목.isVisible(), true, { blocker: true });
    await verify('회원 머리글에 알림 종 아이콘이 보인다', await 홈.머리글.알림종.isVisible(), true);
  });
});
