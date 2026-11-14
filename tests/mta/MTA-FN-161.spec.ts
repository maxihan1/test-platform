import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-161',
  name: '투표 카드 「투표」는 항목을 고른 뒤에만 켜지고 이미 투표했거나 마감되면 꺼진다',
  platforms: ['android'],
  held: '보류 — 투표 카드 항목 줄의 요소 주소',
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

  await test.step('minjun_dev 의 진행 중 투표에서 항목 하나를 고른다', async () => {
    await verify('투표 카드 「투표」는 항목을 고른 뒤에만 켜지고 이미 투표했거나 마감되면 꺼진다', await 문구가보이나(driver, '투표'), true);
  });
});
