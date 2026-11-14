import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 글자요소가보이나, 글자요소누르기, 글자요소찾기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-136',
  name: '투표 카드 「결과 보기」는 투표 전에만 보이고 누르면 「결과 숨기기」로 바뀐다',
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

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('minjun_dev 의 진행 중 투표에서 「결과 보기」를 누른다', async () => {
    await 프로필열기(driver, 'minjun_dev');
    const 있다 = await verify('투표 카드에 「결과 보기」가 보인다', await 글자요소찾기(driver, '결과 보기'), true);
    await 글자요소누르기(driver, '결과 보기');
    const 바뀜 = await verify('「결과 보기」를 누른 뒤 「결과 숨기기」가 보인다', await 글자요소가보이나(driver, '결과 숨기기'), true);
    await verify('투표 카드 「결과 보기」는 투표 전에만 보이고 누르면 「결과 숨기기」로 바뀐다', 있다 && 바뀜, true);
  }, { capture: true });
});
