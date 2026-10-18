import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 로그인요청 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-006',
  name: '회원 홈 화면 머리글에 「<이름>님」 · 「마이페이지」 · 「로그아웃」이 보인다',
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

  await test.step('회원으로 로그인한다', async () => {
    await 방해창막기(page);
    const 상태 = await 로그인요청(page.request, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로그인 응답 코드가 200 이다', 상태, 200, { blocker: true });
  });

  await test.step('회원으로 홈 화면을 연다', async () => {
    await 홈.열기();
    await 홈.머리글.로그인꼴일때까지();
    const 세션 = (await (await page.request.get('/api/session')).json()) as { user: { name: string } | null };
    await 홈.머리글.좁으면메뉴열기();
    await verify(
      '회원 홈 화면 머리글에 「<이름>님」 · 「마이페이지」 · 「로그아웃」이 보인다',
      {
        인사: (await 홈.머리글.인사.isVisible()) ? await 홈.머리글.인사.innerText() : '',
        마이페이지: await 홈.머리글.마이페이지링크.isVisible(),
        로그아웃: await 홈.머리글.로그아웃버튼.isVisible(),
      },
      { 인사: `${세션.user?.name ?? ''}님`, 마이페이지: true, 로그아웃: true },
    );
  });
});
