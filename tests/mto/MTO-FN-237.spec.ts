import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 사용자명규칙만들기 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 사용자명규칙목록화면 } from './pages/username-blocks.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-237',
  name: '「포함」 규칙을 만들면 사용자명 규칙 목록에 「mtoblock 포함」과 「가입 차단」이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    규칙단어: z.string().min(1).describe('일치할 단어 칸에 적을 글자 — 영문 소문자와 숫자, 밑줄').default('mtoblock'),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 사용자명규칙목록화면(page);

  try {
    await test.step('Owner 계정으로 로그인하고 지난 실행이 남긴 같은 규칙을 지운다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 목록.지우기(params.규칙단어);
      await 목록.열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
    });

    await test.step('「일치할 단어」 「mtoblock」 · 「포함」으로 규칙을 만들고 목록을 연다', async () => {
      await 사용자명규칙만들기(page, params.규칙단어, '포함');
      await 목록.열기();
      const 포함 = await verify('「mtoblock 포함」이 보인다', await 목록.행에글(params.규칙단어, `${params.규칙단어} 포함`).isVisible(), true);
      const 차단 = await verify('「가입 차단」이 보인다', await 목록.행에글(params.규칙단어, '가입 차단').isVisible(), true);
      await verify('「포함」 규칙을 만들면 사용자명 규칙 목록에 「mtoblock 포함」과 「가입 차단」이 보인다', 포함 && 차단, true);
    });
  } finally {
    await 목록.지우기(params.규칙단어);
  }
});
