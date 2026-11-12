import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시험도메인, 이메일도메인차단만들기 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 이메일도메인차단목록화면 } from './pages/email-domain-blocks.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-484',
  name: '차단된 이메일 도메인 목록에 맞는 것이 없으면 「아무 것도 없습니다!」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 차단한 이메일 도메인이 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 이메일도메인차단목록화면(page);
  const 도메인 = 시험도메인();
  const 없는도메인 = 시험도메인();

  try {
    await test.step('Owner 계정으로 로그인하고 이메일 도메인을 차단한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 이메일도메인차단만들기(page, 도메인);
      await 목록.열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
      await verify('케이스가 차단한 이메일 도메인이 있다', await 목록.도메인링크(도메인).isVisible(), true, { blocker: true });
    });

    await test.step('「도메인」 칸에 없는 도메인을 적고 「검색」을 누른다', async () => {
      await 목록.검색하기(없는도메인);
      await verify('차단된 이메일 도메인 목록에 맞는 것이 없으면 「아무 것도 없습니다!」가 보인다', await 목록.비어있음.isVisible(), true);
    });

    await test.step('「도메인」 칸에 그 도메인을 적고 「검색」을 누른다', async () => {
      await 목록.열기();
      await 목록.검색하기(도메인);
      const 줄 = await verify('그 도메인 줄이 보인다', await 목록.도메인링크(도메인).isVisible(), true);
      const 시도 = await verify('「지난 주 동안 N건의 가입 시도가 있었습니다」가 보인다', await 목록.시도수(도메인).isVisible(), true);
      await verify('케이스가 차단한 이메일 도메인의 검색 결과에는 그 도메인 줄과 「지난 주 동안 N건의 가입 시도가 있었습니다」가 보인다', 줄 && 시도, true);
    });
  } finally {
    await 목록.지우기(도메인);
  }
});
