import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글읽기 } from './helpers/app.helper.js';
import { 계정신고열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 신고화면 } from './pages/report.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-373',
  name: '계정 신고 첫 화면에 「신고」 제목과 「에 어떠한 문제라도 있나요?」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    제목끝: z.string().describe('계정 신고 첫 화면 제목의 끝 글').default('신고'),
    질문끝: z.string().describe('계정 신고 첫 화면 질문의 끝 글').default('에 어떠한 문제라도 있나요?'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 신고 = new 신고화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('cafe_moon 프로필 메뉴에서 「Report account」를 누른다', async () => {
    await verify('계정 신고 첫 화면이 열린다', await 계정신고열기(driver, 'cafe_moon'), true, { blocker: true });
    const 제목 = await verify('계정 신고 첫 화면 제목이 「신고」로 끝난다', (await 글읽기(driver, 신고.제목)).endsWith(expected.제목끝), true);
    const 질문 = await verify('계정 신고 첫 화면 질문이 「에 어떠한 문제라도 있나요?」로 끝난다', (await 글읽기(driver, 신고.질문)).endsWith(expected.질문끝), true);
    await verify('계정 신고 첫 화면에 「신고」 제목과 「에 어떠한 문제라도 있나요?」가 보인다', 제목 && 질문, true);
  });
});
