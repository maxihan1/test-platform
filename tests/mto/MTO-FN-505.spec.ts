import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 공지사항화면 } from './pages/announcements.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-505',
  name: '공지가 없을 때 공지사항 화면을 열면 「공지를 찾을 수 없습니다.」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '공지가 하나도 없다'],
  techniques: ['경계값 분석'],
  held: '보류 — 공지가 0개인 상태',
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 공지 = new 공지사항화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('공지가 하나도 없는지 확인한다', async () => {
    await 공지.열기();
    await verify('공지가 하나도 없다', await 공지.공지줄들.count(), 0, { blocker: true });
  });

  await test.step('「공지사항」 화면을 연다', async () => {
    await 공지.열기();
    await verify('공지가 없을 때 공지사항 화면을 열면 「공지를 찾을 수 없습니다.」가 보인다', await 공지.빈목록.isVisible(), true);
  });
});
