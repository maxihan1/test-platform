import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시험도메인, 이메일도메인차단만들기 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 이메일도메인차단추가화면 } from './pages/email-domain-block-new.page.js';
import { 이메일도메인차단목록화면 } from './pages/email-domain-blocks.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-231',
  name: '이미 차단한 이메일 도메인을 다시 추가하면 오류가 보이고 목록에 그 도메인이 하나만 있다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 차단한 이메일 도메인이 있다'],
  techniques: ['동등 분할'],
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
    await test.step('Owner 계정으로 로그인하고 이메일 도메인을 차단한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 이메일도메인차단만들기(page, 도메인);
      await 목록.열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
      await verify('케이스가 차단한 이메일 도메인이 있다', await 목록.도메인링크(도메인).isVisible(), true, { blocker: true });
    });

    await test.step('같은 도메인으로 다시 「도메인 추가하기」를 누른다', async () => {
      await 추가.열기();
      await 추가.검사하기(도메인);
      await 추가.추가하기();
      const 오류 = await verify('오류가 보인다', await 추가.알림.모두.first().isVisible(), true);
      await 목록.열기();
      await 목록.검색하기(도메인);
      const 하나 = await verify('목록에 그 도메인이 하나만 있다', await 목록.도메인링크(도메인).count(), 1);
      await verify('이미 차단한 이메일 도메인을 다시 추가하면 오류가 보이고 목록에 그 도메인이 하나만 있다', 오류 && 하나, true);
    });
  } finally {
    await 목록.지우기(도메인);
  }
});
