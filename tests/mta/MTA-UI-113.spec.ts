import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-113',
  name: '목록 「개발 소식」을 보는 중에는 상단에 「목록 관리」 아이콘과 설정 아이콘이 같이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('홈 드롭다운에서 목록 「개발 소식」을 고른다', async () => {
    await 홈.목록고르기('개발 소식');
    const 목록관리 = await verify('「목록 관리」 아이콘이 보인다', await 뜰때까지(driver, 홈.목록관리, 15_000), true);
    const 설정 = await verify('설정 아이콘이 보인다', await 뜰때까지(driver, 홈.설정, 10_000), true);
    await verify('목록 「개발 소식」을 보는 중에는 상단에 「목록 관리」 아이콘과 설정 아이콘이 같이 보인다', 목록관리 && 설정, true);
  });
});
