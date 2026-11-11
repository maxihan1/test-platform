import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 연합화면 } from './pages/instances.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-479',
  name: '연합 제한 모드에서 「연합」 화면을 열면 「도메인 허용」 버튼이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  held: '보류 — 연합 제한 모드인 서버',
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 연합 = new 연합화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 연합.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 연합.제목.isVisible(), true, { blocker: true });
  });

  await test.step('연합 제한 모드 서버에서 「연합」 화면을 연다', async () => {
    await 연합.열기();
    await verify('연합 제한 모드에서 「연합」 화면을 열면 「도메인 허용」 버튼이 보인다', await 연합.도메인허용.isVisible(), true);
  });
});
