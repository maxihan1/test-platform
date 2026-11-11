import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시험도메인, 이메일도메인차단만들기 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정목록화면 } from './pages/account-list.page.js';
import { 이메일도메인차단목록화면 } from './pages/email-domain-blocks.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-386',
  name: '차단된 이메일 도메인 목록에서 도메인을 누르면 「계정」 화면 주소에 email=%@도메인이 붙어 열린다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 차단한 이메일 도메인이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 이메일도메인차단목록화면(page);
  const 계정 = new 계정목록화면(page);
  const 도메인 = 시험도메인();

  try {
    await test.step('Owner 계정으로 로그인하고 이메일 도메인을 차단한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 이메일도메인차단만들기(page, 도메인);
      await 목록.열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
      await verify('케이스가 차단한 이메일 도메인이 있다', await 목록.도메인링크(도메인).isVisible(), true, { blocker: true });
    });

    await test.step('차단된 이메일 도메인 목록에서 그 도메인을 누른다', async () => {
      await 목록.도메인링크(도메인).click();
      const 열림 = await verify('「계정」 화면이 열린다', await 계정.제목.waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
      const 조건 = await verify('주소에 email=%@도메인이 붙는다', new URL(page.url()).searchParams.get('email'), `%@${도메인}`);
      await verify('차단된 이메일 도메인 목록에서 도메인을 누르면 「계정」 화면 주소에 email=%@도메인이 붙어 열린다', 열림 && 조건, true);
    });
  } finally {
    await 목록.지우기(도메인);
  }
});
