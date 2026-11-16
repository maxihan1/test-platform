import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정신고열기, 신고의견칸까지 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 신고화면 } from './pages/report.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-380',
  name: '신고 의견 쓰기 화면에 「우리가 더 알아야 할 내용이 있나요?」와 힌트 「추가 의견」이 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    묻는글: z.string().describe('신고 의견 쓰기 화면 질문').default('우리가 더 알아야 할 내용이 있나요?'),
    힌트글: z.string().describe('신고 의견 칸 힌트').default('추가 의견'),
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
  await test.step('신고 의견 쓰기 화면까지 간다', async () => {
    await verify('신고 의견 쓰기 화면이 열린다', await 신고의견칸까지(driver, '스팸입니다'), true, { blocker: true });
    const 묻기 = await verify('신고 의견 쓰기 화면에 「우리가 더 알아야 할 내용이 있나요?」가 보인다', await 뜰때까지(driver, 신고.화면글(expected.묻는글), 10_000), true);
    const 힌트 = await verify('신고 의견 칸에 힌트 「추가 의견」이 보인다', await 뜰때까지(driver, 신고.화면글(expected.힌트글), 10_000), true);
    await verify('신고 의견 쓰기 화면에 「우리가 더 알아야 할 내용이 있나요?」와 힌트 「추가 의견」이 보인다', 묻기 && 힌트, true);
  });
});
