import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-535',
  name: '역할 편집을 없는 역할 번호로 열면 404 화면 「찾으려는 페이지가 존재하지 않습니다.」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  techniques: ['오류 추정'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await 관리.사이드바.그려질때까지();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.중재.isVisible(), true, { blocker: true });
  });

  await test.step('주소 /admin/roles/999999999/edit 를 연다', async () => {
    const 상태코드 = await 관리.열기('/admin/roles/999999999/edit');
    const 코드 = await verify('응답 코드가 404 다', 상태코드, 404);
    const 문구 = await verify('「찾으려는 페이지가 존재하지 않습니다.」가 보인다', await 관리.오류.없는페이지.isVisible(), true);
    await verify('역할 편집을 없는 역할 번호로 열면 404 화면 「찾으려는 페이지가 존재하지 않습니다.」가 보인다', 코드 && 문구, true);
  });
});
