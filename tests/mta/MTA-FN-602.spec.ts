import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정신고열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 신고화면 } from './pages/report.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-602',
  name: '「서버 규칙을 위반합니다」를 고르면 「어떤 규칙을 위반했나요?」 화면이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  held: '보류 — 우리 서버에 규칙이 없어 이 선택지가 나오지 않는다',
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    규칙이유: z.string().describe('서버에 규칙이 있을 때만 나오는 신고 이유').default('서버 규칙을 위반합니다'),
    규칙묻는글: z.string().describe('규칙 고르기 화면 질문').default('어떤 규칙을 위반했나요?'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 신고 = new 신고화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('신고 이유에서 「서버 규칙을 위반합니다」를 고른다', async () => {
    await verify('계정 신고 첫 화면이 열린다', await 계정신고열기(driver, 'cafe_moon'), true, { blocker: true });
    await 신고.이유고르기(expected.규칙이유);
    await 신고.첫다음누르기();
    await verify('「서버 규칙을 위반합니다」를 고르면 「어떤 규칙을 위반했나요?」 화면이 보인다', await 뜰때까지(driver, 신고.화면글(expected.규칙묻는글), 10_000), true);
  });
});
