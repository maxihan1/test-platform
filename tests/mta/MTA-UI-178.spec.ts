import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-178',
  name: '글쓰기에서 「투표 추가」를 누르면 「옵션 1」 · 「옵션 2」 칸과 「투표 옵션 추가」 · 「설문 길이」 · 「스타일」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    첫칸힌트: z.string().describe('첫째 항목 칸 힌트').default('옵션 1'),
    둘째칸힌트: z.string().describe('둘째 항목 칸 힌트').default('옵션 2'),
    설문길이: z.string().describe('설문 길이 이름').default('설문 길이'),
    스타일: z.string().describe('스타일 이름').default('스타일'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
  });

  await test.step('글쓰기에서 「투표 추가」를 누른다', async () => {
    await verify('투표 영역이 보인다', await 글쓰기.투표열기(), true, { blocker: true });
    const 첫칸 = await verify('첫째 항목 칸 힌트가 기대값과 같다', await 글쓰기.투표항목글(0), expected.첫칸힌트);
    const 둘째칸 = await verify('둘째 항목 칸 힌트가 기대값과 같다', await 글쓰기.투표항목글(1), expected.둘째칸힌트);
    const 추가 = await verify('「투표 옵션 추가」 버튼이 보인다', await 뜰때까지(driver, 글쓰기.투표옵션추가이름, 10_000), true);
    const 길이 = await verify('설문 길이 이름이 기대값과 같다', await driver.$(글쓰기.설문길이이름).getText(), expected.설문길이);
    const 스타일 = await verify('스타일 이름이 기대값과 같다', await driver.$(글쓰기.스타일이름).getText(), expected.스타일);
    await verify('글쓰기에서 「투표 추가」를 누르면 「옵션 1」 · 「옵션 2」 칸과 「투표 옵션 추가」 · 「설문 길이」 · 「스타일」이 보인다', 첫칸 && 둘째칸 && 추가 && 길이 && 스타일, true);
  });
});
