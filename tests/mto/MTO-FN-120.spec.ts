import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 승인대기계정만들기, type 일회용계정 } from './helpers/account.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정목록화면 } from './pages/account-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-120',
  name: '가입 방식이 승인 필요일 때 새로 가입하면 그 계정이 「대기 중」 목록에 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 계정목록화면(page);
  let 계정: 일회용계정 | undefined;

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 목록.열기();
      await verify('「계정」 화면 제목이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    });

    await test.step('가입 방식을 「가입하려면 승인이 필요함」으로 바꾸고 새 계정으로 가입한 뒤 「대기 중」 목록을 연다', async () => {
      계정 = await 승인대기계정만들기(page);
      await 목록.대기목록열기();
      await verify('가입 방식이 승인 필요일 때 새로 가입하면 그 계정이 「대기 중」 목록에 보인다', await 목록.행(계정.아이디).isVisible(), true);
    });
  } finally {
    if (계정 !== undefined) await 계정지우기(page, 계정.아이디);
  }
});
