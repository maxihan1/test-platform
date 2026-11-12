import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시험도메인 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 이메일도메인차단추가화면 } from './pages/email-domain-block-new.page.js';
import { 이메일도메인차단목록화면 } from './pages/email-domain-blocks.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-229',
  name: '새 이메일 도메인을 「도메인 추가하기」로 차단하면 「이메일 도메인 차단 규칙을 생성했습니다」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 이메일도메인차단목록화면(page);
  const 추가 = new 이메일도메인차단추가화면(page);
  const 도메인 = 시험도메인();

  try {
    await test.step('Owner 계정으로 로그인하고 이메일 도메인 차단 추가 화면을 연다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 추가.열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 추가.제목.isVisible(), true, { blocker: true });
    });

    await test.step('새 도메인으로 「도메인 검사」 뒤 「도메인 추가하기」를 누른다', async () => {
      await 추가.검사하기(도메인);
      await 추가.추가하기();
      await verify('새 이메일 도메인을 「도메인 추가하기」로 차단하면 「이메일 도메인 차단 규칙을 생성했습니다」가 보인다', await 목록.알림.글('이메일 도메인 차단 규칙을 생성했습니다').isVisible(), true);
    });
  } finally {
    await 목록.지우기(도메인);
  }
});
