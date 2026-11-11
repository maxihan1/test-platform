import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 도메인차단만들기, 도메인차단지우기, 시험도메인 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 연합화면 } from './pages/instances.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-209',
  name: '역할이 없는 사용자가 서버 상세 주소를 열면 「이 페이지를 표시할 권한이 없습니다.」가 보인다',
  precondition: ['역할이 없는 사용자(qa_user1) 계정으로 로그인해 있다', '케이스가 차단한 도메인이 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    userId: z.string().describe('역할 없는 사용자 아이디').optional().meta({ secret: true, account: '사용자' }),
    userPassword: z.string().describe('역할 없는 사용자 비밀번호').optional().meta({ secret: true, account: '사용자' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 연합 = new 연합화면(page);
  const 도메인 = 시험도메인();

  try {
    await test.step('Owner 계정으로 로그인하고 도메인을 차단한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 도메인차단만들기(page, 도메인, '제한');
      await 연합.열기();
      await verify('케이스가 차단한 도메인이 있다', await 연합.줄(도메인).isVisible(), true, { blocker: true });
    });

    await test.step('역할이 없는 사용자 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.userId, params.userPassword);
      await verify('역할이 없는 사용자(qa_user1) 계정으로 로그인해 있다', !new 로그인화면(page).로그인화면인가(), true, { blocker: true });
    });

    await test.step('그 서버 상세 주소를 연다', async () => {
      const 관리 = new 관리화면(page);
      await 관리.열기(`/admin/instances/${도메인}`);
      await verify('역할이 없는 사용자가 서버 상세 주소를 열면 「이 페이지를 표시할 권한이 없습니다.」가 보인다', await 관리.오류.권한없음.isVisible(), true);
    });
  } finally {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 도메인차단지우기(page, 도메인);
  }
});
