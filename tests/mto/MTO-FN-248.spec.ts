import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시험아이피, 아이피규칙지우기 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { IP규칙폼화면 } from './pages/ip-block-new.page.js';
import { IP규칙목록화면 } from './pages/ip-blocks.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-248',
  name: '시험용 IP 로 규칙을 만들면 「성공적으로 새 IP 규칙을 만들었습니다」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new IP규칙목록화면(page);
  const 폼 = new IP규칙폼화면(page);
  const 아이피 = 시험아이피();

  try {
    await test.step('Owner 계정으로 로그인하고 IP 규칙 만들기 화면을 연다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 폼.열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 폼.제목.isVisible(), true, { blocker: true });
    });

    await test.step('「IP」에 시험용 IP 를 적고 「가입 차단」으로 「규칙 만들기」를 누른다', async () => {
      await 폼.만들기(아이피, '가입 차단');
      await verify('시험용 IP 로 규칙을 만들면 「성공적으로 새 IP 규칙을 만들었습니다」가 보인다', await 목록.알림.글('성공적으로 새 IP 규칙을 만들었습니다').isVisible(), true);
    });
  } finally {
    await 아이피규칙지우기(page, 아이피);
  }
});
