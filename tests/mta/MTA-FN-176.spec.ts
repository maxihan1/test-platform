import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 개인멘션글상세열기 } from './helpers/post-flow.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-176',
  name: '개인 멘션 글 상세를 열면 「부스트」 버튼이 꺼져 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  techniques: ['동등 분할'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상대: z.string().min(1).describe('개인 멘션을 주고받은 계정 이름').default('hana_photo'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 글상세 = new 글상세화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('hana_photo 와 주고받은 개인 멘션 글 상세를 연다', async () => {
    await verify('개인 멘션 글 상세가 열린다', await 개인멘션글상세열기(driver, params.상대), true, { blocker: true });
    await verify('개인 멘션 글 상세를 열면 「부스트」 버튼이 꺼져 보인다', await 글상세.부스트꺼져있나(), true);
  });
});
