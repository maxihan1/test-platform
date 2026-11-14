import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글카드 } from './components/status-card.component.js';
import { 글자들, 뜰때까지 } from './helpers/app.helper.js';
import { 시간꼴인가 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-126',
  name: '글 카드 시간이 「방금」 · 「n초 전」 · 「n분 전」 · 「n시간 전」 · 「n일 전」 꼴로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 카드 = new 글카드(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('앱에 로그인해 홈을 연다', async () => {
    await 뜰때까지(driver, 카드.시간과계정들);
    await verify('글 카드 시간이 「방금」 · 「n초 전」 · 「n분 전」 · 「n시간 전」 · 「n일 전」 꼴로 보인다', 시간꼴인가(await 글자들(driver, 카드.시간과계정들)), true);
  }, { capture: true });
});
