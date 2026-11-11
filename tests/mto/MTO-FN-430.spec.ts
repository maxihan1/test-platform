import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-430',
  name: '권한 없는 사용자가 /admin/reports 를 주소로 열면 「이 페이지를 표시할 권한이 없습니다.」가 보이고 「신고」 제목은 보이지 않는다',
  precondition: ['역할이 없는 사용자(qa_user1) 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    userId: z.string().describe('역할 없는 사용자 아이디').optional().meta({ secret: true, account: '사용자' }),
    userPassword: z.string().describe('역할 없는 사용자 비밀번호').optional().meta({ secret: true, account: '사용자' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 프로필 = new 공개프로필화면(page);

  await test.step('역할이 없는 사용자 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.userId, params.userPassword);
    await 프로필.열기();
    await verify('역할이 없는 사용자(qa_user1) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('주소 /admin/reports 를 연다', async () => {
    await 관리.열기('/admin/reports');
    const 권한 = await verify('「이 페이지를 표시할 권한이 없습니다.」가 보인다', await 관리.오류.권한없음.isVisible(), true);
    const 제목 = await verify('「신고」 제목이 보이지 않는다', await 관리.제목이('신고').isVisible(), false);
    await verify('권한 없는 사용자가 /admin/reports 를 주소로 열면 「이 페이지를 표시할 권한이 없습니다.」가 보이고 「신고」 제목은 보이지 않는다', 권한 && 제목, true);
  });
});
