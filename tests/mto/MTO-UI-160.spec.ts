import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 초대화면 } from './pages/invites.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-160',
  name: '초대 화면에 「모두」 · 「사용가능」 · 「만료됨」 필터가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 초대 = new 초대화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 초대.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 초대.제목.isVisible(), true, { blocker: true });
  });

  await test.step('「초대」 화면을 연다', async () => {
    await 초대.열기();
    const 모두 = await verify('「모두」 필터가 보인다', await 초대.모두.isVisible(), true);
    const 사용가능 = await verify('「사용가능」 필터가 보인다', await 초대.사용가능.isVisible(), true);
    const 만료 = await verify('「만료됨」 필터가 보인다', await 초대.만료됨.isVisible(), true);
    await verify('초대 화면에 「모두」 · 「사용가능」 · 「만료됨」 필터가 보인다', 모두 && 사용가능 && 만료, true);
  });
});
