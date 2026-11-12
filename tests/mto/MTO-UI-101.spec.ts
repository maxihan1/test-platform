import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정목록화면 } from './pages/account-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-101',
  name: '「대기 중」 목록에 newbie_wait 의 가입 이유 「친구 추천으로 왔어요」 인용문이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '가입 이유가 있는 승인 대기 계정(newbie_wait)이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 계정목록화면(page);

  await test.step('Owner 계정으로 로그인하고 승인 대기 계정을 확인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 목록.대기목록열기();
    await verify('가입 이유가 있는 승인 대기 계정(newbie_wait)이 있다', await 목록.행('newbie_wait').isVisible(), true, { blocker: true });
  });

  await test.step('「계정」 화면에서 「관리」를 「대기 중」으로 고른다', async () => {
    await 목록.열기();
    await 목록.필터고르기(목록.관리필터, 'status', 'pending');
    await verify('「대기 중」 목록에 newbie_wait 의 가입 이유 「친구 추천으로 왔어요」 인용문이 보인다', await 목록.가입이유인용('newbie_wait').filter({ hasText: '친구 추천으로 왔어요' }).isVisible(), true);
  });
});
