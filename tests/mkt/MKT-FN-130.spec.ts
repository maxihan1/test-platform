import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 로그인화면 } from './pages/login.page.js';
import { 테스트계정값 } from './components/account.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-130',
  name: '비밀번호 칸에서 Enter 를 치면 「로그인」을 누른 것처럼 로그인되어 머리글에 「로그아웃」이 보인다',
  precondition: ['비회원이다'],
  params: z.object({
    loginId: z.string().describe('테스트 계정 아이디').optional().meta({ secret: true }),
    password: z.string().describe('테스트 계정 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 계정 = 테스트계정값(params);
  const 화면 = new 로그인화면(page);
  const 헤더 = new 머리글(page);

  await test.step('로그인 화면에 테스트 계정을 적고 비밀번호 칸에서 Enter 를 친다', async () => {
    await 안내창끄기(page);
    await 화면.열기();
    await verify('로그인 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await 화면.적기(계정.loginId, 계정.password);
    await 화면.비밀번호칸.press('Enter');
    await 헤더.인사.waitFor();
    await verify(
      '비밀번호 칸에서 Enter 를 치면 「로그인」을 누른 것처럼 로그인되어 머리글에 「로그아웃」이 보인다',
      await 헤더.로그아웃버튼.isVisible(),
      true,
    );
  });
});
