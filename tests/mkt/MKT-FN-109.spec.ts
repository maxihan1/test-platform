import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 머리글 } from './components/header.component.js';
import { 만료있는쿠키, 쿠키만옮긴새화면 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-109',
  name: '「로그인 상태 유지」 없이 로그인하면 브라우저를 닫았다 열 때 로그아웃돼 있다',
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

  await test.step('「로그인 상태 유지」를 끄고 로그인한 뒤 만료 있는 쿠키만 옮긴 새 브라우저로 연다', async () => {
    await 로그인.상태유지.uncheck();
    await 로그인.로그인하기(params.loginId ?? '', params.loginPassword ?? '');
    await 로그인.머리글.로그인꼴일때까지();
    const 새브라우저 = await 쿠키만옮긴새화면(page, await 만료있는쿠키(page));
    try {
      const 새머리글 = new 머리글(새브라우저.화면);
      await 새브라우저.화면.goto('/');
      await 새머리글.그려질때까지();
      await verify('「로그인 상태 유지」 없이 로그인하면 브라우저를 닫았다 열 때 로그아웃돼 있다', await 새머리글.로그인링크.isVisible(), true);
    } finally {
      await 새브라우저.닫기();
    }
  });
});
