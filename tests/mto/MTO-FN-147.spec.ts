import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 만든신고, 신고들만들기, 신고정리 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-147',
  name: '역할이 없는 사용자가 신고 상세 주소를 열면 「이 페이지를 표시할 권한이 없습니다.」가 보인다',
  precondition: ['역할이 없는 사용자(qa_user1) 계정으로 로그인해 있다', '케이스가 만든 qa_user2 신고가 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    userId: z.string().describe('신고자 아이디').optional().meta({ secret: true, account: '사용자' }),
    userPassword: z.string().describe('신고자 비밀번호').optional().meta({ secret: true, account: '사용자' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  let 신고들: 만든신고[] = [];
  let 번호 = '';

  try {
    await test.step('신고자 qa_user1 로 qa_user2 신고를 만든다', async () => {
      신고들 = await 신고들만들기(page, params.userId, params.userPassword, 1, { 게시물: '없음' });
      번호 = 신고들[0]?.번호 ?? '';
    });

    await test.step('역할이 없는 사용자 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.userId, params.userPassword);
      await verify('역할이 없는 사용자(qa_user1) 계정으로 로그인해 있다', !new 로그인화면(page).로그인화면인가(), true, { blocker: true });
      await verify('케이스가 만든 qa_user2 신고가 있다', 번호 !== '', true, { blocker: true });
    });

    await test.step('그 신고 상세 주소를 연다', async () => {
      await 관리.열기(`/admin/reports/${번호}`);
      await verify('역할이 없는 사용자가 신고 상세 주소를 열면 「이 페이지를 표시할 권한이 없습니다.」가 보인다', await 관리.오류.권한없음.isVisible(), true);
    });
  } finally {
    await 신고정리(page, 신고들.map((항목) => 항목.번호), params.loginId, params.loginPassword, false);
  }
});
