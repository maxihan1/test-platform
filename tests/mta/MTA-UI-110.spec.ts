import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-110',
  name: '홈 드롭다운 「팔로우 중인 해시태그」 아래에 「#오늘의사진」 · 「#카페」와 「해시태그 관리」가 보인다',
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

  await test.step('홈 드롭다운에서 「팔로우 중인 해시태그」를 누른다', async () => {
    await 홈.드롭다운열기();
    await 홈.메뉴.고르기('팔로우 중인 해시태그');
    const 오늘의사진 = await verify('「#오늘의사진」이 보인다', await 홈.메뉴.뜰때까지('#오늘의사진'), true);
    const 카페 = await verify('「#카페」가 보인다', await 홈.메뉴.뜰때까지('#카페'), true);
    const 관리 = await verify('「해시태그 관리」가 보인다', await 홈.메뉴.뜰때까지('해시태그 관리'), true);
    await verify('홈 드롭다운 「팔로우 중인 해시태그」 아래에 「#오늘의사진」 · 「#카페」와 「해시태그 관리」가 보인다', 오늘의사진 && 카페 && 관리, true);
  });
});
