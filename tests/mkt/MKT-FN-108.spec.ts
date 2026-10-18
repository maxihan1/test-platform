import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 머리글 } from './components/header.component.js';
import { 만료있는쿠키, 쿠키만옮긴새화면 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-108',
  name: '「로그인 상태 유지」로 로그인하면 로그인 쿠키 만료가 7일 뒤다',
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

  let 쿠키들: Awaited<ReturnType<typeof 만료있는쿠키>> = [];

  await test.step('「로그인 상태 유지」를 켜고 로그인한다', async () => {
    await 로그인.상태유지.check();
    await 로그인.로그인하기(params.loginId ?? '', params.loginPassword ?? '');
    await 로그인.머리글.로그인꼴일때까지();
    쿠키들 = await 만료있는쿠키(page);
    const 남은일수 = 쿠키들.map((쿠키) => Math.round((쿠키.expires - Date.now() / 1000) / 86400));
    await verify('「로그인 상태 유지」로 로그인하면 로그인 쿠키 만료가 7일 뒤다', 남은일수, [7]);
  });

  await test.step('로그인 쿠키만 옮긴 새 브라우저로 홈 화면을 연다', async () => {
    const 새브라우저 = await 쿠키만옮긴새화면(page, 쿠키들);
    try {
      const 새머리글 = new 머리글(새브라우저.화면);
      await 새브라우저.화면.goto('/');
      await 새머리글.그려질때까지();
      await verify('「로그인 상태 유지」로 로그인하면 브라우저를 닫았다 열어도 로그인 상태다', await 새머리글.로그아웃버튼.isVisible(), true);
    } finally {
      await 새브라우저.닫기();
    }
  });
});
