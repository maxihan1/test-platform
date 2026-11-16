import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 알림화면 } from './pages/notifications.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-500',
  name: '중재 경고 알림에 설명과 「더 학습하기」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  held: '보류 — 중재 경고를 받은 시드 계정이 없다',
  params: z.object({
    loginId: z.string().describe('중재 경고를 받은 계정 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('중재 경고를 받은 계정 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    더학습: z.string().describe('중재 경고 알림의 안내 링크 글').default('더 학습하기'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 알림 = new 알림화면(driver);

  await test.step('일반 회원으로 로그인해 알림 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('알림 화면이 열린다', await 알림.열기(), true, { blocker: true });
  });

  await test.step('중재 경고 알림을 찾는다', async () => {
    await verify('중재 경고 알림에 설명과 「더 학습하기」가 보인다', await 뜰때까지(driver, 알림.굴려서글자포함(expected.더학습), 25_000), true);
  });
});
