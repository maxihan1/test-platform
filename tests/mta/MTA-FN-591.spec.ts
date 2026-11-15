import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 첫줄앞부분 } from './helpers/timeline.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-591',
  name: '홈 탭을 가리면 읽던 맨 위 글 위치가 서버 읽음 위치에 저장된다',
  platforms: ['android'],
  held: '보류 — 앱 밖에서 서버 읽음 위치를 읽을 길이 없다',
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

  await test.step('홈 탭을 가린 뒤 서버 읽음 위치를 읽는다', async () => {
    const 맨위글 = 첫줄앞부분(await 홈.첫글본문());
    await driver.$(홈.탭.둘러보기).click();
    await driver.$(홈.탭.홈).click();
    await verify('홈 탭을 가리면 읽던 맨 위 글 위치가 서버 읽음 위치에 저장된다', await 뜰때까지(driver, 홈.목록글자포함(맨위글), 10_000), true);
  });
});
