import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정게시물화면 } from './pages/account-statuses.page.js';
import { 관리화면 } from './pages/admin.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-471',
  name: '역할이 없는 사용자가 계정 게시물 주소를 열면 「이 페이지를 표시할 권한이 없습니다.」가 보인다',
  precondition: ['역할이 없는 사용자(qa_user1) 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    userId: z.string().describe('역할 없는 사용자 아이디').optional().meta({ secret: true, account: '사용자' }),
    userPassword: z.string().describe('역할 없는 사용자 비밀번호').optional().meta({ secret: true, account: '사용자' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 게시 = new 계정게시물화면(page);
  const 관리 = new 관리화면(page);

  await test.step('역할이 없는 사용자 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.userId, params.userPassword);
    await verify('역할이 없는 사용자(qa_user1) 계정으로 로그인해 있다', new 로그인화면(page).로그인화면인가(), false, { blocker: true });
  });

  await test.step('qa_user2 의 계정 게시물 주소를 연다', async () => {
    await 게시.열기(await 계정번호(page, 'qa_user2'));
    await verify('역할이 없는 사용자가 계정 게시물 주소를 열면 「이 페이지를 표시할 권한이 없습니다.」가 보인다', await 관리.오류.권한없음.isVisible(), true);
  });
});
