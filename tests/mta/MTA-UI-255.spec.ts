import { defineCase, test, verify } from '@platform/kit';
import { 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';

import { 알림화면 } from './pages/notifications.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-255',
  name: '부스트 알림에 「님이 부스트했습니다:」, 좋아요 알림에 「개의 즐겨찾기:」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    부스트글: z.string().describe('부스트 알림 글').default('님이 부스트했습니다:'),
    즐겨찾기글: z.string().describe('좋아요 알림 글').default('개의 즐겨찾기:'),
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

  await test.step('부스트 알림과 좋아요 알림을 찾는다', async () => {
    const 부스트 = await verify('부스트 알림 글이 보인다', await 보이나(driver, 알림.굴려서글자포함(expected.부스트글)), true);
    const 즐겨찾기 = await verify('좋아요 알림 글이 보인다', await 보이나(driver, 알림.굴려서글자포함(expected.즐겨찾기글)), true);
    await verify('부스트 알림에 「님이 부스트했습니다:」, 좋아요 알림에 「개의 즐겨찾기:」가 보인다', 부스트 && 즐겨찾기, true);
  });
});
