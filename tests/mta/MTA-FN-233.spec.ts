import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 될때까지, 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-233',
  name: '투표 항목을 「투표 옵션 추가」로 4개까지 더하면 칸 4개가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    칸수: z.number().int().describe('투표 항목 칸 수').default(4),
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

  await test.step('투표 항목을 4개까지 더한다', async () => {
    await verify('투표 영역이 보인다', await 글쓰기.투표열기(), true, { blocker: true });
    await 글쓰기.투표칸더하기();
    await 글쓰기.투표칸더하기();
    await 뜰때까지(driver, 글쓰기.투표항목(3), 10_000);
    await verify('투표 항목을 「투표 옵션 추가」로 4개까지 더하면 칸 4개가 보인다', await 글쓰기.투표항목수(), expected.칸수);
  });

  await test.step('투표 항목이 4개일 때 다섯 번째를 더하려 한다', async () => {
    if (await 보이나(driver, 글쓰기.투표옵션추가)) await 글쓰기.투표칸더하기();
    const 늘었다 = await 될때까지(driver, async () => (await 글쓰기.투표항목수()) > expected.칸수, 3_000);
    await verify('다섯 번째 칸을 더할 수 없다', 늘었다, false);
  });
});
