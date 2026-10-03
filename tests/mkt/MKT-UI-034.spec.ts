import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 문의화면 } from './pages/support-inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-034',
  name: '1:1 문의 화면의 내용 칸 아래에 입력한 글자 수 「0/1000」이 보인다',
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('로그인 아이디').default('user2'),
    password: z.string().min(1).describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  unconfirmed: '기획서와 다름 — 차이 D22: 기획서에 없는 글자 수 표시가 화면에 있다. 내용 칸 아래에 「0/1000」이 보인다 (작성 요청 5873)',
});

test(spec, async ({ page, params }) => {
  const 화면 = new 문의화면(page);
  const 머리 = new 머리글(page);
  await page.request.post('/api/auth/login', { data: { loginId: params.loginId, password: params.password ?? '' } });

  await test.step('1:1 문의 화면을 연다', async () => {
    await 화면.열기();
    await 화면.내역제목().waitFor();
    await 머리.로그아웃버튼().waitFor();
    await verify('회원으로 로그인해 있다', await 머리.로그아웃버튼().isVisible(), true, { blocker: true });
    await verify('1:1 문의 화면의 내용 칸 아래에 입력한 글자 수 「0/1000」이 보인다', await 화면.내용글자수('0/1000').isVisible(), true);
  });
});
