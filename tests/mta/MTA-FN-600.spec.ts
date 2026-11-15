import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 글자들 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';

import { 알림화면 } from './pages/notifications.page.js';
import { 알림요청화면 } from './pages/notification-requests.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-600',
  name: '요청이 99건을 넘는 사람의 알림 요청 줄을 보면 개수 배지가 「99+」로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  held: '보류 — 알림 요청이 99건 넘는 시드 계정이 없다',
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    배지글: z.string().describe('99건을 넘는 요청의 개수 배지').default('99+'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 알림 = new 알림화면(driver);
  const 요청 = new 알림요청화면(driver);

  await test.step('일반 회원으로 로그인해 알림 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('알림 화면이 열린다', await 알림.열기(), true, { blocker: true });
  });

  await test.step('요청이 100건인 사람의 알림 요청 줄을 본다', async () => {
    await verify('「필터링된 알림」 줄이 보인다', await 뜰때까지(driver, 알림.필터링줄, 15_000), true, { blocker: true });
    await 알림.필터링줄열기();
    await verify('「필터링된 알림」 화면 줄이 보인다', await 요청.그려질때까지(), true, { blocker: true });
    await verify('요청이 99건을 넘는 사람의 알림 요청 줄을 보면 개수 배지가 「99+」로 보인다', (await 글자들(driver, 요청.배지들)).includes(expected.배지글), true);
  });
});
