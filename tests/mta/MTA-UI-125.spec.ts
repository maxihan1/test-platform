import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글카드 } from './components/status-card.component.js';
import { 뜰때까지, 문구가보이나, 보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-125',
  name: '글 카드 머리에 표시 이름 · 「<시간> · @<계정>」 · 더보기(…)가 보인다',
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
    await 뜰때까지(driver, 카드.이름들);
    const 이름 = await verify('글 카드 머리에 표시 이름이 보인다', await 보이나(driver, 카드.이름들), true);
    const 시간계정 = await verify('글 카드 머리에 「<시간> · @<계정>」이 보인다', await 문구가보이나(driver, '<시간> · @<계정>'), true);
    const 더보기 = await verify('글 카드 머리에 더보기(…)가 보인다', await 보이나(driver, 카드.더보기들), true);
    await verify('글 카드 머리에 표시 이름 · 「<시간> · @<계정>」 · 더보기(…)가 보인다', 이름 && 시간계정 && 더보기, true);
  }, { capture: true });
});
