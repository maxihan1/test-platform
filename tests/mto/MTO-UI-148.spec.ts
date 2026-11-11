import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 이의제기화면 } from './pages/appeals.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-148',
  name: '이의제기 화면에 「대기 중 (N)」 · 「승인됨」 · 「거부됨」 필터가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 화면 = new 이의제기화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 화면.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 화면.제목.isVisible(), true, { blocker: true });
  });

  await test.step('「이의제기」 화면을 연다', async () => {
    await 화면.열기();
    const 대기 = await verify('「대기 중 (N)」 필터가 보인다', await 화면.대기중.isVisible(), true);
    const 승인 = await verify('「승인됨」 필터가 보인다', await 화면.승인됨.isVisible(), true);
    const 거부 = await verify('「거부됨」 필터가 보인다', await 화면.거부됨.isVisible(), true);
    await verify('이의제기 화면에 「대기 중 (N)」 · 「승인됨」 · 「거부됨」 필터가 보인다', 대기 && 승인 && 거부, true);
  });
});
