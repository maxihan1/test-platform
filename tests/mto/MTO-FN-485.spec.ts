import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 사용자명규칙폼화면 } from './pages/username-block-form.page.js';
import { 사용자명규칙목록화면 } from './pages/username-blocks.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-485',
  name: '「일치할 단어」에 영문 · 숫자 · 밑줄 밖의 글자를 적으면 규칙이 만들어지지 않고 오류가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    잘못된단어: z.string().min(1).describe('일치할 단어 칸에 적을 글자 — 영문, 숫자, 밑줄 밖의 글자가 든 글자').default('mto-블록'),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 사용자명규칙목록화면(page);
  const 폼 = new 사용자명규칙폼화면(page);

  try {
    await test.step('Owner 계정으로 로그인하고 사용자명 규칙 만들기 화면을 연다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 폼.열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 폼.제목.isVisible(), true, { blocker: true });
    });

    await test.step('「일치할 단어」에 「mto-블록」을 적고 「규칙 만들기」를 누른다', async () => {
      await 폼.만들기(params.잘못된단어, '일치');
      const 오류 = await verify('오류가 보인다', await 폼.오류요약.isVisible(), true);
      await 목록.열기();
      const 안만들어짐 = await verify('규칙이 만들어지지 않는다', await 목록.행(params.잘못된단어).count(), 0);
      await verify('「일치할 단어」에 영문 · 숫자 · 밑줄 밖의 글자를 적으면 규칙이 만들어지지 않고 오류가 보인다', 오류 && 안만들어짐, true);
    });
  } finally {
    await 목록.지우기(params.잘못된단어);
  }
});
