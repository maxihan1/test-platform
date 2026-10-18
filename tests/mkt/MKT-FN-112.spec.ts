import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-112',
  name: '비밀번호 칸에서 Enter 를 치면 로그인돼 홈 화면 머리글에 「로그아웃」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['로그인 화면이 열려 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 방해창막기(page);
    await 로그인.열기();
    await verify('로그인 화면 제목 「로그인」이 보인다', await 로그인.제목.isVisible(), true, { blocker: true });
  });

  await test.step('아이디와 비밀번호를 적고 비밀번호 칸에서 Enter 를 친다', async () => {
    await 로그인.엔터로로그인하기(params.loginId ?? '', params.loginPassword ?? '');
    await 로그인.로그인결과나올때까지();
    await 로그인.머리글.좁으면메뉴열기();
    await verify('비밀번호 칸에서 Enter 를 치면 로그인돼 홈 화면 머리글에 「로그아웃」이 보인다', await 로그인.머리글.로그아웃버튼.isVisible(), true);
  });
});
