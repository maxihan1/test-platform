import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-113',
  name: '목록을 보는 중이면 설정 아이콘 옆에 「목록 관리」(연필) 아이콘이 같이 보인다',
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
  await test.step('홈 드롭다운 「목록」에서 「개발 소식」을 고른다', async () => {
    await 홈.드롭다운열기();
    await verify('「목록」 하위 목록이 열린다', await 홈.드롭다운하위열기('목록'), true, { blocker: true });
    await 홈.드롭다운고르기('개발 소식');
    const 연필 = await verify('「목록 관리」 아이콘이 보인다', await 홈.목록관리아이콘이뜰때까지(), true);
    const 설정 = await verify('설정 아이콘이 보인다', await 홈.설정아이콘이보이나(), true);
    await verify('목록을 보는 중이면 설정 아이콘 옆에 「목록 관리」(연필) 아이콘이 같이 보인다', 연필 && 설정, true);
  }, { capture: true });
});
