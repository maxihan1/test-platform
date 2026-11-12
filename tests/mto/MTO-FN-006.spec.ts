import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-006',
  name: '역할이 없는 사용자가 /admin/dashboard 를 열면 403 화면에 「이 페이지를 표시할 권한이 없습니다.」가 보인다',
  precondition: ['역할이 없는 사용자(qa_user1) 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    userId: z.string().describe('역할 없는 사용자 아이디').optional().meta({ secret: true, account: '사용자' }),
    userPassword: z.string().describe('역할 없는 사용자 비밀번호').optional().meta({ secret: true, account: '사용자' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 화면 = new 관리화면(page);

  await test.step('역할이 없는 사용자 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.userId, params.userPassword);
  });

  await test.step('주소 /admin/dashboard 를 연다', async () => {
    const 상태코드 = await 화면.열기('/admin/dashboard');
    const 코드 = await verify('응답 코드가 403 이다', 상태코드, 403);
    const 문구 = await verify('「이 페이지를 표시할 권한이 없습니다.」가 보인다', await 화면.오류.권한없음.isVisible(), true);
    await verify('역할이 없는 사용자가 /admin/dashboard 를 열면 403 화면에 「이 페이지를 표시할 권한이 없습니다.」가 보인다', 코드 && 문구, true);
  });
});
