import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정신고열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 신고화면 } from './pages/report.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-375',
  name: '규칙이 없는 우리 서버의 신고 이유 목록에 「서버 규칙을 위반합니다」가 보이지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    마지막이유: z.string().describe('신고 이유 목록의 마지막 줄').default('다른 문제가 있습니다'),
    규칙이유: z.string().describe('서버에 규칙이 있을 때만 나오는 신고 이유').default('서버 규칙을 위반합니다'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 신고 = new 신고화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('신고 첫 화면의 이유 목록을 확인한다', async () => {
    await verify('계정 신고 첫 화면이 열린다', await 계정신고열기(driver, 'cafe_moon'), true, { blocker: true });
    await verify('신고 이유 목록의 마지막 줄이 보인다', await 뜰때까지(driver, 신고.이유(expected.마지막이유), 10_000), true, { blocker: true });
    await verify('규칙이 없는 우리 서버의 신고 이유 목록에 「서버 규칙을 위반합니다」가 보이지 않는다', await 보이나(driver, 신고.이유(expected.규칙이유)), false);
  });
});
