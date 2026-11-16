import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정신고열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 신고화면 } from './pages/report.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-446',
  name: '「스팸입니다」를 고르고 「다음」을 누르면 「이 신고에 대해서 더 참고해야 할 게시물이 있나요?」 화면이 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    이유: z.string().describe('고르는 신고 이유').default('스팸입니다'),
    게시물묻는글: z.string().describe('글 고르기 화면 질문').default('이 신고에 대해서 더 참고해야 할 게시물이 있나요?'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 신고 = new 신고화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('프로필 메뉴에서 「Report account」를 눌러 신고 첫 화면을 연다', async () => {
    await verify('계정 신고 첫 화면이 열린다', await 계정신고열기(driver, 'cafe_moon'), true, { blocker: true });
  });
  await test.step('신고 이유 「스팸입니다」를 고르고 「다음」을 누른다', async () => {
    await 신고.이유고르기(expected.이유);
    await 신고.첫다음누르기();
    await verify('「스팸입니다」를 고르고 「다음」을 누르면 「이 신고에 대해서 더 참고해야 할 게시물이 있나요?」 화면이 보인다', await 뜰때까지(driver, 신고.화면글(expected.게시물묻는글), 15_000), true);
  });
});
