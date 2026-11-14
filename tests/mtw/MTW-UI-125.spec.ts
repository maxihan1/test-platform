import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 작성화면 } from './pages/publish.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-125',
  name: '작성 상자에 예약 게시 버튼과 임시 저장 목록이 없다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 글쓰기 = new 작성화면(page);

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    const 예약 = await verify('예약 게시 버튼이 없다', await 글쓰기.예약버튼.count(), 0);
    const 임시 = await verify('임시 저장 목록이 없다', await 글쓰기.임시저장.count(), 0);
    await verify('작성 상자에 예약 게시 버튼과 임시 저장 목록이 없다', 예약 && 임시, true);
  });
});
