import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정줄, 글읽기 } from './helpers/app.helper.js';
import { 글이될때까지읽기, 설정줄열기, 계정설정열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-509',
  name: '게시 범위를 「팔로워」로 고르면 「공개 범위」가 꺼져 보인다',
  platforms: ['android'],
  precondition: ['프로필 고쳐도 되는 계정으로 로그인해 있다'],
  techniques: ['동등 분할', '상태 전이'],
  params: z.object({
    loginId: z.string().describe('프로필 고쳐도 되는 계정 아이디').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    loginPassword: z.string().describe('프로필 고쳐도 되는 계정 비밀번호').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
  }),
  expected: z.object({
    고른범위: z.string().describe('고르는 게시 범위').default('팔로워'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  let 원래범위 = '';
  let 바꿈 = false;
  try {
    await test.step('프로필 고쳐도 되는 계정으로 로그인해 홈 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    });
    await test.step('계정 설정을 연다', async () => {
      await verify('계정 설정이 열린다', await 계정설정열기(driver, 계정줄(params.loginId ?? '')), true, { blocker: true });
    });
    await test.step('계정 설정에서 「게시 기본값」을 연다', async () => {
      await verify('게시 기본값 화면이 열린다', await 설정줄열기(driver, '게시 기본값'), true, { blocker: true });
    });
    await test.step('게시 기본값에서 「게시 범위」를 「팔로워」로 고른다', async () => {
      원래범위 = await 글읽기(driver, 설정.부제);
      await 설정.줄누르기('게시 범위');
      await driver.$(설정.화면글정확히(expected.고른범위)).click();
      바꿈 = 원래범위 !== expected.고른범위;
      await verify('게시 범위 부제가 「팔로워」로 바뀐다', await 글이될때까지읽기(driver, 설정.부제, expected.고른범위), expected.고른범위, { blocker: true });
      await verify('게시 범위를 「팔로워」로 고르면 「공개 범위」가 꺼져 보인다', await 설정.줄켜졌나('공개 범위'), false);
    });
  } finally {
    if (바꿈) {
      await 설정.줄누르기('게시 범위');
      await driver.$(설정.화면글정확히(원래범위)).click();
      await 글이될때까지읽기(driver, 설정.부제, 원래범위);
      await driver.back();
    }
  }
});
