import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-591',
  name: 'minjun_dev 의 마감된 투표 글을 보면 마감된 투표 카드의 「투표」는 꺼져 있다',
  platforms: ['android'],
  held: '보류 — 마감된 투표 카드 「투표」 버튼의 요소 주소',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('minjun_dev 의 마감된 투표 글을 본다', async () => {
    await verify('minjun_dev 의 마감된 투표 글을 보면 마감된 투표 카드의 「투표」는 꺼져 있다', await 문구가보이나(driver, '투표'), true);
  });
});
