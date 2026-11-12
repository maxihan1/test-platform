import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시험아이피, 아이피규칙만들기, 아이피규칙지우기 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { IP규칙폼화면 } from './pages/ip-block-new.page.js';
import { IP규칙목록화면 } from './pages/ip-blocks.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-250',
  name: '같은 IP 로 규칙을 다시 만들면 저장되지 않고 오류가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 만든 IP 규칙이 있다'],
  techniques: ['동등 분할'],
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
    await test.step('Owner 계정으로 로그인하고 IP 규칙을 만든다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 아이피규칙만들기(page, 아이피, '가입 차단');
      await 목록.열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
      await verify('케이스가 만든 IP 규칙이 있다', await 목록.행(아이피).isVisible(), true, { blocker: true });
    });

    await test.step('같은 IP 로 규칙을 다시 만든다', async () => {
      await 폼.열기();
      await 폼.만들기(아이피, '가입 차단');
      const 오류 = await verify('오류가 보인다', await 폼.오류요약.isVisible(), true);
      await 목록.열기();
      const 하나 = await verify('같은 규칙이 하나만 있다', await 목록.행(아이피).count(), 1);
      await verify('같은 IP 로 규칙을 다시 만들면 저장되지 않고 오류가 보인다', 오류 && 하나, true);
    });
  } finally {
    await 아이피규칙지우기(page, 아이피);
  }
});
