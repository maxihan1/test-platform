import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 알림화면 } from './pages/notifications.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-601',
  name: '알림을 읽으면 읽은 위치가 서버 읽음 위치에 저장된다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  held: '보류 — 앱 밖에서 서버 읽음 위치를 읽을 길이 없다',
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    앱읽음위치: z.string().describe('알림 화면에서 읽은 마지막 알림 번호'),
    서버읽음위치: z.string().describe('서버에 저장된 알림 읽음 위치'),
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

  await test.step('알림을 읽은 뒤 서버 읽음 위치를 읽는다', async () => {
    await verify('알림을 읽으면 읽은 위치가 서버 읽음 위치에 저장된다', expected.서버읽음위치, expected.앱읽음위치);
  });
});
