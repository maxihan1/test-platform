import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 게시글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-104',
  name: '글쓰기 화면의 제목 칸은 50자까지 본문 칸은 2000자까지만 입력된다',
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('로그인 아이디').default('user2'),
    password: z.string().min(1).describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  unconfirmed:
    '기획서와 다름 — 차이 D10·D11: 기획서에 없는 글자 수 제한이 화면에 있다. 제목 칸은 50자까지 본문 칸은 2000자까지만 받는다 (작성 요청 5873)',
});

test(spec, async ({ page, params }) => {
  const 쓰기 = new 게시글쓰기화면(page);
  const 머리 = new 머리글(page);

  await test.step('글쓰기 화면에서 제목에 51자를 적는다', async () => {
    await page.request.post('/api/auth/login', { data: { loginId: params.loginId, password: params.password ?? '' } });
    await 쓰기.열기();
    await 쓰기.준비된폼().waitFor();
    await verify('회원으로 로그인해 있다', await 머리.로그아웃버튼().isVisible(), true, { blocker: true });
    await 쓰기.제목칸().fill('가'.repeat(51));
    await verify('제목 칸에는 51자를 적어도 50자까지만 들어간다', (await 쓰기.제목칸().inputValue()).length, 50);
  });

  await test.step('글쓰기 화면에서 본문에 2001자를 적는다', async () => {
    await 쓰기.본문칸().fill('나'.repeat(2001));
    await verify('본문 칸에는 2001자를 적어도 2000자까지만 들어간다', (await 쓰기.본문칸().inputValue()).length, 2000);
  });
});
