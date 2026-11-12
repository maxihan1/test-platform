import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시험아이피, 아이피규칙만들기, 아이피규칙지우기 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { IP규칙목록화면 } from './pages/ip-blocks.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-486',
  name: 'IP 규칙 목록에 맞는 규칙이 없으면 「아무 것도 없습니다!」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 만든 IP 규칙이 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    없는아이피: z.string().min(1).describe('검색칸에 적을 IP — 규칙이 없는 문서용 대역 주소').default('203.0.113.254'),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new IP규칙목록화면(page);
  const 아이피 = 시험아이피();

  try {
    await test.step('Owner 계정으로 로그인하고 IP 규칙을 만든다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 아이피규칙만들기(page, 아이피, '가입 차단');
      await 목록.열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
      await verify('케이스가 만든 IP 규칙이 있다', await 목록.행(아이피).isVisible(), true, { blocker: true });
    });

    await test.step('검색칸에 규칙이 없는 IP 를 적고 「검색」을 누른다', async () => {
      await 목록.검색하기(params.없는아이피);
      await verify('IP 규칙 목록에 맞는 규칙이 없으면 「아무 것도 없습니다!」가 보인다', await 목록.비어있음.isVisible(), true);
    });

    await test.step('검색칸에 그 IP 를 적고 「검색」을 누른다', async () => {
      await 목록.열기();
      await 목록.검색하기(아이피);
      await verify('케이스가 만든 IP 의 검색 결과에 그 규칙 줄이 보인다', await 목록.행(아이피).isVisible(), true);
    });
  } finally {
    await 아이피규칙지우기(page, 아이피);
  }
});
