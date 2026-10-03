import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 게시글상세 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-023',
  name: '없는 글 번호나 남의 글 수정 주소로 들어가면 안내 문구가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '작성자가 아닌 회원이 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
    missingPostId: z.number().describe('없는 글 번호').default(9999),
    otherPostId: z.number().describe('남이 쓴 글 번호').default(47),
  }),
  expected: z.object({
    missingText: z.string().describe('없는 글 안내').default('삭제되었거나 존재하지 않는 게시글입니다'),
    forbiddenText: z.string().describe('권한 없음 안내').default('권한이 없습니다'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 로그인 = new 로그인폼(page);
  const 머리 = new 머리글(page);
  const 상세 = new 게시글상세(page);

  await test.step('없는 글 번호의 상세 주소를 연다', async () => {
    await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
    await 상세.열기(params.missingPostId);
    await verify('없는 글 번호로 들어가면 「삭제되었거나 존재하지 않는 게시글입니다」가 보인다', await 상세.없는글안내.innerText(), expected.missingText);
  });

  await test.step('작성자가 아닌 회원으로 로그인한다', async () => {
    await 로그인.로그인한다(params.loginId, params.password ?? '');
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await 머리.로그아웃.waitFor();
    await verify('작성자가 아닌 회원이 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
  });

  await test.step('남의 글의 수정 주소를 연다', async () => {
    await page.goto(`/board/${params.otherPostId}/edit`);
    await verify('작성자가 아닌 사람이 수정 주소로 들어오면 「권한이 없습니다」 화면이 보인다', await 상세.권한없음제목.innerText(), expected.forbiddenText);
  });
});
